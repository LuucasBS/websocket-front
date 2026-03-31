import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-online-badge',
  templateUrl: './online-badge.component.html',
  styleUrl: './online-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnlineBadgeComponent {
  readonly online = input(false);
}
