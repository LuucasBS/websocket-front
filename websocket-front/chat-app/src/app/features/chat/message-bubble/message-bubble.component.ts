import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChatMessage } from '../../../shared/models/message.model';

@Component({
  selector: 'app-message-bubble',
  imports: [DatePipe],
  templateUrl: './message-bubble.component.html',
  styleUrl: './message-bubble.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageBubbleComponent {
  readonly message = input.required<ChatMessage>();
  readonly isOwn = input(false);
}
