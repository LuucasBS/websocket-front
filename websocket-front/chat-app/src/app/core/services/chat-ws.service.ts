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
  private chatRequestsSubscription?: StompSubscription;

  private reconnectAttempts = 0;
  private readonly maxBackoffMs = 30000;
  private readonly pendingQueue: OutboundWsEvent[] = [];
  private readonly conversationSubscriptions = new Map<string, { messages: StompSubscription; typing: StompSubscription }>();
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
        this.disconnect();
      }
    });
  }

  connect(): void {
    if (this.stompClient?.active) {
      return;
    }

    const token = this.authService.getToken();
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 0,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      onConnect: () => {
        this._connected.set(true);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.startOnlineUsersPolling();
        this.subscribeChatRequests();
        this.flushQueue();
        this.stompClient?.publish({ destination: '/app/user.online', body: '{}' });
      },
      onWebSocketClose: () => this.handleDisconnected(),
      onStompError: () => this.handleDisconnected()
    });
    this.stompClient.activate();
  }

  disconnect(): void {
    this.heartbeatSubscription?.unsubscribe();
    this.reconnectSubscription?.unsubscribe();
    this.onlineUsersSubscription?.unsubscribe();
    this.chatRequestsSubscription?.unsubscribe();
    this.chatRequestsSubscription = undefined;

    this.conversationSubscriptions.forEach((subscription) => {
      subscription.messages.unsubscribe();
      subscription.typing.unsubscribe();
    });
    this.conversationSubscriptions.clear();
    this.stompClient?.deactivate();
    this.stompClient = null;
    this._connected.set(false);
    this._usersOnline.set([]);
    this._typingByUserId.set({});
  }

  conversationSignal(withUserId: string): WritableSignal<ChatMessage[]> {
    const known = this._conversationStreams().get(withUserId);
    if (known) {
      return known;
    }

    const nextSignal = signal<ChatMessage[]>([]);
    this._conversationStreams.update((value) => {
      const updated = new Map(value);
      updated.set(withUserId, nextSignal);
      return updated;
    });

    return nextSignal;
  }

  mergeConversationHistory(withUserId: string, history: ChatMessage[]): void {
    const stream = this.conversationSignal(withUserId);
    stream.set(history.slice(-50));
  }

  loadHistory(withUserId: string, limit = 50): Observable<ChatMessage[]> {
    return this.ensureConversation(withUserId).pipe(
      switchMap((conversationId) =>
        this.http.get<MessageResponse[]>(`${environment.apiUrl}/conversations/${conversationId}/messages?page=0&size=${limit}`).pipe(
          map((history) => history.map((message) => this.mapMessageResponse(message, withUserId))),
          tap((history) => this.mergeConversationHistory(withUserId, history))
        )
      ),
      catchError(() => of([]))
    );
  }

  sendMessage(payload: ChatMessage): void {
    this.emitOrQueue({ type: 'MESSAGE', payload });
    this.pushMessageIntoStream(payload);
  }

  sendChatRequest(from: User, toUserId: string): void {
    this.emitOrQueue({
      type: 'CHAT_REQUEST',
      payload: { from, toUserId }
    });
  }

  sendTyping(toUserId: string, userId: string, isTyping: boolean): void {
    this.emitOrQueue({
      type: 'TYPING',
      payload: { userId, isTyping, toUserId }
    });
  }

  private emitOrQueue(event: OutboundWsEvent): void {
    if (!this.stompClient || !this.stompClient.connected || !this._connected()) {
      this.pendingQueue.push(event);
      this.connect();
      return;
    }

    this.publishEvent(event);
  }

  private flushQueue(): void {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    while (this.pendingQueue.length > 0) {
      const event = this.pendingQueue.shift();
      if (event) {
        this.publishEvent(event);
      }
    }
  }

  private publishEvent(event: OutboundWsEvent): void {
    if (event.type === 'PING' || !this.stompClient?.connected) {
      return;
    }

    if (event.type === 'MESSAGE') {
      void this.ensureConversation(event.payload.toUserId).subscribe((conversationId) => {
        this.subscribeConversation(conversationId, event.payload.toUserId);
        this.stompClient?.publish({
          destination: '/app/chat.send',
          body: JSON.stringify({
            type: 'MESSAGE',
            conversationId,
            fromUserId: event.payload.fromUserId,
            content: event.payload.content,
            sentAt: event.payload.timestamp,
            messageId: event.payload.id
          })
        });
      });
      return;
    }

    if (event.type === 'CHAT_REQUEST') {
      if (!event.payload.toUserId) {
        return;
      }
      void this.ensureConversation(event.payload.toUserId).subscribe(() => {
        this.stompClient?.publish({
          destination: '/app/chat.request',
          body: JSON.stringify({
            type: 'CHAT_REQUEST',
            fromUserId: event.payload.from.id,
            toUserId: event.payload.toUserId
          })
        });
      });
      return;
    }

    if (event.type === 'TYPING') {
      if (!event.payload.toUserId) {
        return;
      }
      void this.ensureConversation(event.payload.toUserId).subscribe((conversationId) => {
        this.stompClient?.publish({
          destination: '/app/chat.typing',
          body: JSON.stringify({
            type: 'TYPING',
            conversationId,
            fromUserId: event.payload.userId,
            typing: event.payload.isTyping
          })
        });
      });
    }
  }

  private subscribeConversation(conversationId: string, withUserId: string): void {
    if (!this.stompClient?.connected || this.conversationSubscriptions.has(conversationId)) {
      return;
    }

    this.conversationByUserId.update((value) => ({ ...value, [withUserId]: conversationId }));
    this.userByConversationId.update((value) => ({ ...value, [conversationId]: withUserId }));

    const messagesSubscription = this.stompClient.subscribe(`/topic/conversations/${conversationId}`, (frame) => {
      const raw = JSON.parse(frame.body) as BackendMessageEvent;
      const message = this.mapIncomingMessage(raw, withUserId);
      this.pushMessageIntoStream(message);
      this.eventBus.next({ type: 'MESSAGE', payload: message });
    });

    const typingSubscription = this.stompClient.subscribe(`/topic/conversations/${conversationId}/typing`, (frame) => {
      const raw = JSON.parse(frame.body) as BackendTypingEvent;
      this._typingByUserId.update((value) => ({
        ...value,
        [raw.fromUserId]: raw.typing
      }));
      this.eventBus.next({ type: 'TYPING', payload: { userId: raw.fromUserId, isTyping: raw.typing } });
    });

    this.conversationSubscriptions.set(conversationId, {
      messages: messagesSubscription,
      typing: typingSubscription
    });
  }

  private ensureConversation(withUserId: string): Observable<string> {
    const known = this.conversationByUserId()[withUserId];
    if (known) {
      this.subscribeConversation(known, withUserId);
      return of(known);
    }

    const me = this.authService.currentUser();
    if (!me) {
      return of('');
    }

    return this.http
      .post<ConversationResponse>(`${environment.apiUrl}/conversations`, {
        userAId: me.id,
        userBId: withUserId
      })
      .pipe(
        map((conversation) => conversation.id),
        tap((conversationId) => this.subscribeConversation(conversationId, withUserId))
      );
  }

  private startOnlineUsersPolling(): void {
    this.onlineUsersSubscription?.unsubscribe();
    this.onlineUsersSubscription = timer(0, 10000)
      .pipe(
        switchMap(() => this.http.get<UserResponse[]>(`${environment.apiUrl}/users/online`).pipe(catchError(() => of([]))))
      )
      .subscribe((users) => {
        this._usersOnline.set(
          users.map((user) => ({
            id: user.id,
            username: user.username,
            displayName: user.username,
            online: user.status === 'ONLINE'
          }))
        );
      });
  }

  private subscribeChatRequests(): void {
    if (!this.stompClient?.connected || this.chatRequestsSubscription) {
      return;
    }

    this.chatRequestsSubscription = this.stompClient.subscribe('/topic/chat.requests', (frame) => {
      const event = JSON.parse(frame.body) as BackendChatRequestEvent;
      const me = this.authService.currentUser();
      if (!me || event.toUserId !== me.id || event.fromUserId === me.id) {
        return;
      }

      const fromUser = this._usersOnline().find((user) => user.id === event.fromUserId) ?? {
        id: event.fromUserId,
        username: event.fromUserId,
        displayName: event.fromUserId,
        online: true
      };

      this.eventBus.next({
        type: 'CHAT_REQUEST',
        payload: { from: fromUser, toUserId: event.toUserId }
      });
    });
  }

  private pushMessageIntoStream(message: ChatMessage): void {
    const selfId = this.authService.currentUser()?.id;
    if (!selfId) {
      return;
    }

    const withUserId = message.fromUserId === selfId ? message.toUserId : message.fromUserId;
    const stream = this.conversationSignal(withUserId);
    stream.update((value) => [...value, message].slice(-200));
  }

  private startHeartbeat(): void {
    this.heartbeatSubscription?.unsubscribe();
    this.heartbeatSubscription = timer(30000, 30000).subscribe(() => {
      if (!this.stompClient?.connected) {
        this.handleDisconnected();
      }
    });
  }

  private handleDisconnected(): void {
    this._connected.set(false);
    this.heartbeatSubscription?.unsubscribe();
    this.onlineUsersSubscription?.unsubscribe();
    this.chatRequestsSubscription?.unsubscribe();
    this.chatRequestsSubscription = undefined;
    this.conversationSubscriptions.forEach((subscription) => {
      subscription.messages.unsubscribe();
      subscription.typing.unsubscribe();
    });
    this.conversationSubscriptions.clear();

    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.reconnectAttempts += 1;
    const backoff = Math.min(2 ** (this.reconnectAttempts - 1) * 1000, this.maxBackoffMs);

    this.reconnectSubscription?.unsubscribe();
    this.reconnectSubscription = timer(backoff).subscribe(() => {
      this.connect();
    });
  }

  private mapMessageResponse(message: MessageResponse, withUserId: string): ChatMessage {
    const me = this.authService.currentUser();
    return {
      id: message.id,
      fromUserId: message.fromUserId,
      toUserId: message.fromUserId === me?.id ? withUserId : me?.id ?? withUserId,
      content: message.content,
      timestamp: message.sentAt,
      status: message.status
    };
  }

  private mapIncomingMessage(message: BackendMessageEvent, withUserId: string): ChatMessage {
    const me = this.authService.currentUser();
    return {
      id: message.messageId,
      fromUserId: message.fromUserId,
      toUserId: message.fromUserId === me?.id ? withUserId : me?.id ?? withUserId,
      content: message.content,
      timestamp: message.sentAt,
      status: 'SENT'
    };
  }
}
