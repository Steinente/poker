import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  ViewChild,
  ViewEncapsulation,
  inject,
} from '@angular/core'
import type { PokerGameViewState } from '@poker/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import { TPipe } from '../../../shared/pipes/t.pipe'
import { getLogTranslationKey } from '../utils/log-label.util'
import { normalizeLogParams } from '../utils/log-params.util'

@Component({
  selector: 'poker-log-panel',
  standalone: true,
  imports: [TPipe],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="panel">
      <h3 style="margin-top: 0;">{{ 'panel.logs' | t }}</h3>

      <div
        #scrollContainer
        class="panel-scroll panel-scroll-compact"
        (scroll)="onScroll()"
      >
        <div class="grid" style="gap: 5px;">
          @for (entry of logs; track entry.id; let index = $index) {
            <div
              class="panel log-entry"
              [style.borderLeftColor]="borderAccentColor(index)"
              [style.background]="roundTintColor(index)"
            >
              <div
                class="log-message"
                [style.color]="logMessageColor(index)"
                [innerHTML]="formatHtml(entry.messageKey, entry.messageParams)"
              ></div>
              @if (showTimestamp) {
                <div class="log-time" [style.color]="logTimeColor(index)">
                  {{ formatDate(entry.createdAt) }}
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .log-entry {
        padding: 6px 8px;
        border-left: 3px solid transparent;
      }

      .log-message {
        font-size: 12px;
        line-height: 1.15;
      }

      .log-message .log-card-chip {
        display: inline-block;
        padding: 0.08rem 0.3rem;
        border-radius: 0.32rem;
        background: #ffffff;
        cursor: help;
        font-weight: 900;
        letter-spacing: 0.015em;
        box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.08);
      }

      .log-message .log-card-chip-red {
        color: #dc2626;
      }

      .log-message .log-card-chip-black {
        color: #111827;
      }

      .log-time {
        margin-top: 2px;
        font-size: 9px;
      }
    `,
  ],
})
export class LogPanelComponent implements OnChanges {
  private readonly i18n = inject(I18nService)
  private readonly roundGrayPair = ['#475569', '#6f7377'] as const

  @ViewChild('scrollContainer')
  private scrollContainer?: ElementRef<HTMLElement>

  @Input({ required: true }) logs: PokerGameViewState['logs'] = []
  @Input({ required: true }) players: PokerGameViewState['players'] = []
  @Input({ required: true }) showTimestamp = true

  private isAtBottom = true

  onScroll() {
    const el = this.scrollContainer?.nativeElement
    if (!el) return
    const threshold = 8
    this.isAtBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
  }

  ngOnChanges() {
    if (!this.isAtBottom) return
    setTimeout(() => {
      const el = this.scrollContainer?.nativeElement
      if (el) {
        el.scrollTop = el.scrollHeight
      }
    }, 0)
  }

  private replacePlayerIds(
    params?: Record<string, string | number | boolean | null>,
  ) {
    return normalizeLogParams(params, this.players, (key) => this.i18n.t(key))
  }

  private formatLogParams(
    params?: Record<string, string | number | boolean | null>,
    cardsFormat: 'display' | 'speech' | 'html' = 'display',
  ) {
    return normalizeLogParams(params, this.players, (key) => this.i18n.t(key), {
      cardsFormat,
    })
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  formatDate(value: string) {
    const date = new Date(value)
    const pad = (n: number) => String(n).padStart(2, '0')

    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

  formatHtml(
    messageKey: string,
    params?: Record<string, string | number | boolean | null>,
  ): string {
    const translationKey = getLogTranslationKey(messageKey)

    if (!translationKey) {
      return this.escapeHtml(messageKey)
    }

    const normalizedParams = this.formatLogParams(params, 'html')
    const safeParams = Object.fromEntries(
      Object.entries(normalizedParams ?? {}).map(([key, value]) => {
        if (value === null || value === undefined) {
          return [key, value]
        }

        if (
          (key === 'cards' || key === 'hands' || key === 'winnerSummary') &&
          typeof value === 'string'
        ) {
          return [key, value]
        }

        return [key, this.escapeHtml(String(value))]
      }),
    )

    return this.i18n.format(translationKey, safeParams)
  }

  borderAccentColor(logIndex: number) {
    const index = this.roundBackgroundIndex(logIndex)
    return this.roundGrayPair[(index + 1) % this.roundGrayPair.length]
  }

  logMessageColor(logIndex: number) {
    return '#ffffff'
  }

  logTimeColor(logIndex: number) {
    return '#ffffff'
  }

  private roundBackgroundIndex(logIndex: number) {
    let handStartCount = 0

    for (let index = 0; index <= logIndex; index += 1) {
      if (this.logs[index]?.messageKey === 'game.hand.started') {
        handStartCount += 1
      }
    }

    return Math.max(0, handStartCount - 1) % this.roundGrayPair.length
  }

  roundTintColor(logIndex: number) {
    return this.roundGrayPair[this.roundBackgroundIndex(logIndex)]
  }
}
