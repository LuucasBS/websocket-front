import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-chat-header',
  templateUrl: './chat-header.component.html',
  styleUrl: './chat-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly connected = input(false);
  readonly onBack = output<void>();

  protected back(): void {
    this.onBack.emit();
  }
}
