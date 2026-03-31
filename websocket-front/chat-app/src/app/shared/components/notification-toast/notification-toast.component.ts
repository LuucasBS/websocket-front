import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-toast',
  templateUrl: './notification-toast.component.html',
  styleUrl: './notification-toast.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationToastComponent {
  protected readonly notifications = inject(NotificationService);
}
