import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatWebSocketService } from './core/services/chat-ws.service';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { NotificationToastComponent } from './shared/components/notification-toast/notification-toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly wsService = inject(ChatWebSocketService);
  private readonly notifications = inject(NotificationService);

  private readonly eventsSubscription = new Subscription();

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.wsService.conectar();
      }
    });

    this.eventsSubscription.add(
      this.wsService.events$.subscribe((event) => {
        const me = this.authService.currentUser();

        if (!me) {
          return;
        }

        if (event.type === 'MESSAGE' && event.payload.fromUserId !== me.id) {
          const senderName = this.wsService.resolverNomeExibicao(event.payload.fromUserId);
          this.notifications.notificarMensagem(senderName, event.payload.content, event.payload.fromUserId);
        }

        if (event.type === 'CHAT_REQUEST' && event.payload.from.id !== me.id) {
          this.notifications.notificarSolicitacaoDeChat(event.payload.from.displayName, event.payload.from.id);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.eventsSubscription.unsubscribe();
  }
}
