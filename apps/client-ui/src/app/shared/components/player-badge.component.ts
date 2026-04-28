import { Component, Input } from '@angular/core'
import { TPipe } from '../pipes/t.pipe'

@Component({
  selector: 'poker-player-badge',
  standalone: true,
  imports: [TPipe],
  template: `
    <div
      class="panel"
      [class.compact]="compact"
      [style.outline]="active ? '3px solid #d4a72c' : '1px solid var(--border)'"
      [style.outlineOffset]="active ? '0' : '0'"
    >
      <div class="spread">
        <strong class="name-wrap">
          <span>{{ name }}</span>
          @if (showDealerIndicator) {
            <span class="dealer-indicator" [attr.title]="'tooltip.dealer' | t"
              >D</span
            >
          }
        </strong>
        <span class="status-pill" [class]="statusClass">{{
          statusText | t
        }}</span>
      </div>

      <div class="row" style="margin-top: 8px; flex-wrap: wrap;">
        <span class="muted">{{ 'table.seat' | t }} {{ seatIndex + 1 }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .name-wrap {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .cloud-indicator {
        font-size: 14px;
        line-height: 1;
        color: #4a90d9;
      }

      .dealer-indicator {
        font-size: 11px;
        line-height: 1;
        color: #fff;
        background: #7c3aed;
        border-radius: 3px;
        padding: 1px 4px;
        font-weight: 700;
      }

      .prediction-start-indicator {
        font-size: 13px;
        line-height: 1;
        color: #d4a72c;
        font-weight: 700;
      }

      .panel.compact {
        padding: 10px;
      }

      .panel.compact .name-wrap {
        font-size: 13px;
      }

      .panel.compact .row {
        gap: 8px;
        margin-top: 6px !important;
      }

      .panel.compact .status-pill,
      .panel.compact .muted {
        font-size: 11px;
      }
    `,
  ],
})
export class PlayerBadgeComponent {
  @Input({ required: true }) name!: string
  @Input({ required: true }) presence!: 'online' | 'away' | 'offline'
  @Input({ required: true }) seatIndex!: number
  @Input() active = false
  @Input() showDealerIndicator = false
  @Input() compact = false

  get statusClass() {
    return this.presence === 'online'
      ? 'status-online'
      : this.presence === 'away'
        ? 'status-away'
        : 'status-offline'
  }

  get statusText() {
    return this.presence === 'online'
      ? 'presence.online'
      : this.presence === 'away'
        ? 'presence.notInGame'
        : 'presence.offline'
  }
}
