import { Component, Input } from '@angular/core'

@Component({
  selector: 'poker-pending-decision-panel',
  standalone: true,
  imports: [],
  template: `
    <div class="panel">
      <h3 style="margin-top: 0;">Pending Decision</h3>
      <p class="muted" style="margin: 0;">{{ message }}</p>
    </div>
  `,
})
export class PendingDecisionPanelComponent {
  @Input() message = 'Keine Sonderentscheidung offen.'
}
