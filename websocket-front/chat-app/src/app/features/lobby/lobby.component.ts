import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OnlineBadgeComponent } from '../../shared/components/online-badge/online-badge.component';
import { AuthService } from '../../core/services/auth.service';
import { ChatWebSocketService } from '../../core/services/chat-ws.service';
import { NotificationService } from '../../core/services/notification.service';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-lobby',
  imports: [OnlineBadgeComponent],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LobbyComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly wsService = inject(ChatWebSocketService);
  protected readonly notifications = inject(NotificationService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly isConnected = this.wsService.connected;

  protected readonly users = computed(() => {
    const currentUserId = this.currentUser()?.id;
    return this.wsService.usersOnline().filter((user) => user.id !== currentUserId);
  });

  constructor() {
    this.wsService.conectar();
  }

  protected trackByUserId(index: number, user: User): string {
    return user.id;
  }

  protected openChat(user: User): void {
    this.notifications.limparSolicitacaoPendente(user.id);
    void this.router.navigate(['/chat', user.id]);
  }

  protected requestChat(user: User): void {
    const me = this.currentUser();
    if (!me) {
      return;
    }

    this.wsService.enviarSolicitacaoDeChat(me, user.id);
    this.openChat(user);
  }

  protected logout(): void {
    this.authService.sair();
    void this.router.navigate(['/login']);
  }

  protected avatarColor(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 45%)`;
  }
}
