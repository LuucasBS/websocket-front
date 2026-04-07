import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

interface NativeNotificationData {
  chatUserId?: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  body: string;
  userId?: string;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  private readonly _toasts = signal<ToastNotification[]>([]);
  private readonly _unreadByUser = signal<Record<string, number>>({});
  private readonly _pendingRequests = signal<Record<string, boolean>>({});

  readonly toasts = this._toasts.asReadonly();
  readonly unreadByUser = this._unreadByUser.asReadonly();
  readonly pendingRequests = this._pendingRequests.asReadonly();
  readonly totalUnread = computed(() => Object.values(this._unreadByUser()).reduce((acc, value) => acc + value, 0));

  solicitarPermissao(): void {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }

  mostrarToast(title: string, body: string, userId?: string): void {
    const id = this.gerarIdAleatorio();
    const toast: ToastNotification = {
      id,
      title,
      body,
      userId,
      createdAt: Date.now()
    };

    this._toasts.update((value) => [toast, ...value].slice(0, 4));

    window.setTimeout(() => {
      this.dispensarToast(id);
    }, 4500);
  }

  dispensarToast(id: string): void {
    this._toasts.update((value) => value.filter((toast) => toast.id !== id));
  }

  adicionarNaoLidas(userId: string): void {
    this._unreadByUser.update((value) => ({
      ...value,
      [userId]: (value[userId] ?? 0) + 1
    }));
  }

  limparNaoLidas(userId: string): void {
    this._unreadByUser.update((value) => {
      const next = { ...value };
      delete next[userId];
      return next;
    });
  }

  marcarSolicitacaoPendente(userId: string): void {
    this._pendingRequests.update((value) => ({ ...value, [userId]: true }));
  }

  limparSolicitacaoPendente(userId: string): void {
    this._pendingRequests.update((value) => {
      const next = { ...value };
      delete next[userId];
      return next;
    });
  }

  notificarMensagem(senderName: string, body: string, userId: string): void {
    this.mostrarToast(`Mensagem de ${senderName}`, body, userId);
    this.adicionarNaoLidas(userId);

    if (document.hidden) {
      this.dispararNotificacaoNativa(`Mensagem de ${senderName}`, body, { chatUserId: userId });
    }
  }

  notificarSolicitacaoDeChat(senderName: string, userId: string): void {
    this.mostrarToast('Novo pedido de conversa', `${senderName} quer conversar com voce.`, userId);
    this.marcarSolicitacaoPendente(userId);

    if (document.hidden) {
      this.dispararNotificacaoNativa('Pedido de conversa', `${senderName} enviou um pedido. Clique para aceitar.`, {
        chatUserId: userId
      });
    }
  }

  private dispararNotificacaoNativa(title: string, body: string, data: NativeNotificationData): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const options: NotificationOptions = {
      body,
      tag: data.chatUserId ?? title,
      data
    };

    const notification = new Notification(title, options);

    notification.onclick = () => {
      window.focus();
      const payload = notification.data as NativeNotificationData | null;
      const targetUserId = payload?.chatUserId;

      this.ngZone.run(() => {
        if (targetUserId) {
          void this.router.navigate(['/chat', targetUserId]);
          this.limparNaoLidas(targetUserId);
          this.limparSolicitacaoPendente(targetUserId);
        }
      });

      notification.close();
    };
  }

  private gerarIdAleatorio(): string {
    return `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  }
}
