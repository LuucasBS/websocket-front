import { HttpClient } from '@angular/common/http';
import { Injectable, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject, Subscription, catchError, map, of, switchMap, tap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatMessage } from '../../shared/models/message.model';
import { User } from '../../shared/models/user.model';
import { WsEvent } from '../../shared/models/ws-event.model';
import { AuthService } from './auth.service';

type OutboundWsEvent = WsEvent | { type: 'PING' };

interface ConversationResponse {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: string;
}

interface MessageResponse {
  id: string;
  conversationId: string;
  fromUserId: string;
  content: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  sentAt: string;
}

interface UserResponse {
  id: string;
  username: string;
  status: string;
  lastSeen?: string;
}

interface BackendMessageEvent {
  type: string;
  conversationId: string;
  fromUserId: string;
  content: string;
  sentAt: string;
  messageId: string;
}

interface BackendTypingEvent {
  type: string;
  conversationId: string;
  fromUserId: string;
  typing: boolean;
}

interface BackendChatRequestEvent {
  type: string;
  fromUserId: string;
  toUserId: string;
}

@Injectable({ providedIn: 'root' })
export class ChatWebSocketService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly eventBus = new Subject<WsEvent>();
  private stompClient: Client | null = null;
  private heartbeatSubscription?: Subscription;
  private reconnectSubscription?: Subscription;
  private onlineUsersSubscription?: Subscription;
  private userMessagesSubscription?: StompSubscription;
  private userNotificationsSubscription?: StompSubscription;

  private reconnectAttempts = 0;
  private readonly maxBackoffMs = 30000;
  private readonly pendingQueue: OutboundWsEvent[] = [];
  private readonly conversationSubscriptions = new Set<string>();
  private readonly conversationByUserId = signal<Record<string, string>>({});
  private readonly userByConversationId = signal<Record<string, string>>({});

  private readonly _connected = signal(false);
  private readonly _usersOnline = signal<User[]>([]);
  private readonly _typingByUserId = signal<Record<string, boolean>>({});
  private readonly _conversationStreams = signal<Map<string, WritableSignal<ChatMessage[]>>>(new Map());

  readonly connected = this._connected.asReadonly();
  readonly usersOnline = this._usersOnline.asReadonly();
  readonly typingByUserId = this._typingByUserId.asReadonly();
  readonly events$ = this.eventBus.asObservable();
  readonly isDisconnected = computed(() => !this._connected());

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!user) {
        this.desconectar();
      }
    });
  }

  conectar(): void {
    if (this.stompClient?.active) {
      return;
    }

    const token = this.authService.obterToken();
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 0,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      onConnect: () => {
        this._connected.set(true);
        this.reconnectAttempts = 0;
        this.iniciarTentativaDeConexão();
        this.verificarQuantidadeUsuariosOnline();
        this.adicionarRequisicoesEmFila();
        this.descarregarFila();
        this.stompClient?.publish({ destination: '/app/user.online', body: '{}' });
      },
      onWebSocketClose: () => this.desconectarWebSocketComErro(),
      onStompError: () => this.desconectarWebSocketComErro()
    });
    this.stompClient.activate();
  }

  desconectar(): void {
    this.heartbeatSubscription?.unsubscribe();
    this.reconnectSubscription?.unsubscribe();
    this.onlineUsersSubscription?.unsubscribe();
    this.userMessagesSubscription?.unsubscribe();
    this.userNotificationsSubscription?.unsubscribe();
    this.userMessagesSubscription = undefined;
    this.userNotificationsSubscription = undefined;
    this.conversationSubscriptions.clear();
    this.stompClient?.deactivate();
    this.stompClient = null;
    this._connected.set(false);
    this._usersOnline.set([]);
    this._typingByUserId.set({});
  }

  obterSinalDeConversa(comUsuarioId: string): WritableSignal<ChatMessage[]> {
    const known = this._conversationStreams().get(comUsuarioId);
    if (known) {
      return known;
    }

    const nextSignal = signal<ChatMessage[]>([]);
    this._conversationStreams.update((value) => {
      const updated = new Map(value);
      updated.set(comUsuarioId, nextSignal);
      return updated;
    });

    return nextSignal;
  }

  mesclarHistoricoDeConversa(comUsuarioId: string, historico: ChatMessage[]): void {
    const stream = this.obterSinalDeConversa(comUsuarioId);
    const orderedHistory = [...historico].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    stream.set(orderedHistory.slice(-50));
  }

  resolverNomeExibicao(usuarioId: string): string {
    if (!usuarioId) {
      return 'Contato';
    }

    const currentUser = this.authService.currentUser();
    if (currentUser?.id === usuarioId) {
      return currentUser.displayName ?? currentUser.username;
    }

    const knownUser = this._usersOnline().find((user) => user.id === usuarioId);
    if (knownUser) {
      return knownUser.displayName || knownUser.username || 'Contato';
    }

    return 'Contato';
  }

  carregarHistorico(comUsuarioId: string, limite = 50): Observable<ChatMessage[]> {
    return this.garantirConversa(comUsuarioId).pipe(
      switchMap((conversationId) =>
        this.http.get<MessageResponse[]>(`${environment.apiUrl}/conversations/${conversationId}/messages?page=0&size=${limite}`).pipe(
          map((history) => history.map((message) => this.mapearRespostaDeMsg(message, comUsuarioId))),
          tap((history) => this.mesclarHistoricoDeConversa(comUsuarioId, history))
        )
      ),
      catchError(() => of([]))
    );
  }

  enviarMensagem(payload: ChatMessage): void {
    this.emitirOuEnfileirar({ type: 'MESSAGE', payload });
  }

  enviarSolicitacaoDeChat(de: User, paraUsuarioId: string): void {
    this.emitirOuEnfileirar({
      type: 'CHAT_REQUEST',
      payload: { from: de, toUserId: paraUsuarioId }
    });
  }

  enviarEscrita(paraUsuarioId: string, usuarioId: string, estaEscrevendo: boolean): void {
    this.emitirOuEnfileirar({
      type: 'TYPING',
      payload: { userId: usuarioId, isTyping: estaEscrevendo, toUserId: paraUsuarioId }
    });
  }

  private emitirOuEnfileirar(evento: OutboundWsEvent): void {
    if (!this.stompClient || !this.stompClient.connected || !this._connected()) {
      this.pendingQueue.push(evento);
      this.conectar();
      return;
    }

    this.publicarEvento(evento);
  }

  private descarregarFila(): void {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    while (this.pendingQueue.length > 0) {
      const evento = this.pendingQueue.shift();
      if (evento) {
        this.publicarEvento(evento);
      }
    }
  }

  private publicarEvento(evento: OutboundWsEvent): void {
    if (evento.type === 'PING' || !this.stompClient?.connected) {
      return;
    }

    if (evento.type === 'MESSAGE') {
      if (!evento.payload.toUserId) {
        return;
      }

      void this.garantirConversa(evento.payload.toUserId).subscribe((conversationId) => {
        this.inscreverEmConversa(conversationId, evento.payload.toUserId);
        this.stompClient?.publish({
          destination: '/app/chat.send',
          body: JSON.stringify({
            type: 'MESSAGE',
            conversationId,
            fromUserId: evento.payload.fromUserId,
            toUserId: evento.payload.toUserId,
            content: evento.payload.content,
            sentAt: evento.payload.timestamp,
            messageId: evento.payload.id
          })
        });
      });
      return;
    }

    if (evento.type === 'CHAT_REQUEST') {
      if (!evento.payload.toUserId) {
        return;
      }
      void this.garantirConversa(evento.payload.toUserId).subscribe(() => {
        this.stompClient?.publish({
          destination: '/app/chat.request',
          body: JSON.stringify({
            type: 'CHAT_REQUEST',
            fromUserId: evento.payload.from.id,
            toUserId: evento.payload.toUserId
          })
        });
      });
      return;
    }

    if (evento.type === 'TYPING') {
      if (!evento.payload.toUserId) {
        return;
      }
      void this.garantirConversa(evento.payload.toUserId).subscribe((conversationId) => {
        this.stompClient?.publish({
          destination: '/app/chat.typing',
          body: JSON.stringify({
            type: 'TYPING',
            conversationId,
            fromUserId: evento.payload.userId,
            typing: evento.payload.isTyping
          })
        });
      });
    }
  }

  private inscreverEmConversa(idConversa: string, comUsuarioId: string): void {
    if (!this.stompClient?.connected || this.conversationSubscriptions.has(idConversa)) {
      return;
    }

    this.conversationByUserId.update((value) => ({ ...value, [comUsuarioId]: idConversa }));
    this.userByConversationId.update((value) => ({ ...value, [idConversa]: comUsuarioId }));
    this.conversationSubscriptions.add(idConversa);
  }

  private garantirConversa(comUsuarioId: string): Observable<string> {
    const known = this.conversationByUserId()[comUsuarioId];
    if (known) {
      this.inscreverEmConversa(known, comUsuarioId);
      return of(known);
    }

    const me = this.authService.currentUser();
    if (!me) {
      return of('');
    }

    return this.http
      .post<ConversationResponse>(`${environment.apiUrl}/conversations`, {
        userAId: me.id,
        userBId: comUsuarioId
      })
      .pipe(
        map((conversation) => conversation.id),
        tap((conversationId) => this.inscreverEmConversa(conversationId, comUsuarioId))
      );
  }

  private verificarQuantidadeUsuariosOnline(): void {
    this.onlineUsersSubscription?.unsubscribe();
    this.onlineUsersSubscription = timer(0, 10000)
      .pipe(
        switchMap(() => this.http.get<UserResponse[]>(`${environment.apiUrl}/users/online`).pipe(catchError(() => of([]))))
      )
      .subscribe((usuarios) => {
        this._usersOnline.set(
          usuarios.map((usuario) => ({
            id: usuario.id,
            username: usuario.username,
            displayName: usuario.username,
            online: usuario.status === 'ONLINE'
          }))
        );
      });
  }

  private adicionarRequisicoesEmFila(): void {
    if (!this.stompClient?.connected) {
      return;
    }

    if (!this.userMessagesSubscription) {
      this.userMessagesSubscription = this.stompClient.subscribe('/user/queue/messages', (frame) => {
        const raw = JSON.parse(frame.body) as BackendMessageEvent;
        const me = this.authService.currentUser();
        const knownWithUserId = this.userByConversationId()[raw.conversationId];
        const withUserId = raw.fromUserId === me?.id ? knownWithUserId : raw.fromUserId;

        if (!withUserId) {
          return;
        }

        this.conversationByUserId.update((value) => ({ ...value, [withUserId]: raw.conversationId }));
        this.userByConversationId.update((value) => ({ ...value, [raw.conversationId]: withUserId }));

        const mensagem = this.mapearMensagemRecebida(raw, withUserId);
        this.inserirMensagemEmFluxo(mensagem);
        this.eventBus.next({ type: 'MESSAGE', payload: mensagem });
      });
    }

    if (!this.userNotificationsSubscription) {
      this.userNotificationsSubscription = this.stompClient.subscribe('/user/queue/notifications', (frame) => {
        const event = JSON.parse(frame.body) as unknown;

        if (this.ehEventoDeSolicitacaoDeChat(event)) {
          this.tratarSolicitacaoDeChat(event);
          return;
        }

        if (this.ehEventoDeEscrita(event)) {
          this.tratarEventoDeEscrita(event);
        }
      });
    }
  }

  private ehEventoDeSolicitacaoDeChat(evento: unknown): evento is BackendChatRequestEvent {
    if (!evento || typeof evento !== 'object') {
      return false;
    }

    const payload = evento as Record<string, unknown>;
    return (
      payload['type'] === 'CHAT_REQUEST' &&
      typeof payload['fromUserId'] === 'string' &&
      typeof payload['toUserId'] === 'string'
    );
  }

  private ehEventoDeEscrita(evento: unknown): evento is BackendTypingEvent {
    if (!evento || typeof evento !== 'object') {
      return false;
    }

    const payload = evento as Record<string, unknown>;
    return (
      payload['type'] === 'TYPING' &&
      typeof payload['conversationId'] === 'string' &&
      typeof payload['fromUserId'] === 'string' &&
      typeof payload['typing'] === 'boolean'
    );
  }

  private tratarSolicitacaoDeChat(evento: BackendChatRequestEvent): void {
    const me = this.authService.currentUser();
    if (!me || evento.toUserId !== me.id || evento.fromUserId === me.id) {
      return;
    }

    const usuarioDe = this._usersOnline().find((user) => user.id === evento.fromUserId) ?? {
      id: evento.fromUserId,
      username: this.resolverNomeExibicao(evento.fromUserId),
      displayName: this.resolverNomeExibicao(evento.fromUserId),
      online: true
    };

    this.eventBus.next({
      type: 'CHAT_REQUEST',
      payload: { from: usuarioDe, toUserId: evento.toUserId }
    });
  }

  private tratarEventoDeEscrita(evento: BackendTypingEvent): void {
    const me = this.authService.currentUser();
    if (!me || evento.fromUserId === me.id) {
      return;
    }

    const usuarioConhecidoId = this.userByConversationId()[evento.conversationId];
    const comUsuarioId = usuarioConhecidoId ?? evento.fromUserId;

    this.conversationByUserId.update((value) => ({ ...value, [comUsuarioId]: evento.conversationId }));
    this.userByConversationId.update((value) => ({ ...value, [evento.conversationId]: comUsuarioId }));
    this._typingByUserId.update((value) => ({
      ...value,
      [evento.fromUserId]: evento.typing
    }));
    this.eventBus.next({ type: 'TYPING', payload: { userId: evento.fromUserId, isTyping: evento.typing } });
  }

  private inserirMensagemEmFluxo(mensagem: ChatMessage): void {
    const meuId = this.authService.currentUser()?.id;
    if (!meuId) {
      return;
    }

    const comUsuarioId = mensagem.fromUserId === meuId ? mensagem.toUserId : mensagem.fromUserId;
    const stream = this.obterSinalDeConversa(comUsuarioId);
    stream.update((value) => {
      const withoutSameId = value.filter((item) => item.id !== mensagem.id);
      return [...withoutSameId, mensagem].slice(-200);
    });
  }

  private iniciarTentativaDeConexão(): void {
    this.heartbeatSubscription?.unsubscribe();
    this.heartbeatSubscription = timer(30000, 30000).subscribe(() => {
      if (!this.stompClient?.connected) {
        this.desconectarWebSocketComErro();
      }
    });
  }

  private desconectarWebSocketComErro(): void {
    this._connected.set(false);
    this.heartbeatSubscription?.unsubscribe();
    this.onlineUsersSubscription?.unsubscribe();
    this.userMessagesSubscription?.unsubscribe();
    this.userNotificationsSubscription?.unsubscribe();
    this.userMessagesSubscription = undefined;
    this.userNotificationsSubscription = undefined;
    this.conversationSubscriptions.clear();

    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.reconnectAttempts += 1;
    const backoff = Math.min(2 ** (this.reconnectAttempts - 1) * 1000, this.maxBackoffMs);

    this.reconnectSubscription?.unsubscribe();
    this.reconnectSubscription = timer(backoff).subscribe(() => {
      this.conectar();
    });
  }

  private mapearRespostaDeMsg(mensagem: MessageResponse, comUsuarioId: string): ChatMessage {
    const me = this.authService.currentUser();
    return {
      id: mensagem.id,
      fromUserId: mensagem.fromUserId,
      toUserId: mensagem.fromUserId === me?.id ? comUsuarioId : me?.id ?? comUsuarioId,
      content: mensagem.content,
      timestamp: mensagem.sentAt,
      status: mensagem.status
    };
  }

  private mapearMensagemRecebida(mensagem: BackendMessageEvent, comUsuarioId: string): ChatMessage {
    const me = this.authService.currentUser();
    return {
      id: mensagem.messageId,
      fromUserId: mensagem.fromUserId,
      toUserId: mensagem.fromUserId === me?.id ? comUsuarioId : me?.id ?? comUsuarioId,
      content: mensagem.content,
      timestamp: mensagem.sentAt,
      status: 'SENT'
    };
  }
}
