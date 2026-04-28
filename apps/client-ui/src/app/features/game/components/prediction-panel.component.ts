import { Component, Input, OnChanges, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { PlayerActionAvailability } from '@poker/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import type { RaiseInputMode } from '../../../core/services/session.service'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'poker-prediction-panel',
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <div class="panel">
      <h3 style="margin: 0 0 12px;">{{ 'game.actions' | t }}</h3>

      @if (!availability) {
        <p class="muted" style="margin: 0;">{{ 'game.waitNextTurn' | t }}</p>
      } @else {
        <div class="action-grid">
          @if (availability.canFold) {
            <button class="btn" type="button" (click)="onFold()">
              {{ 'game.fold' | t }}
            </button>
          }

          @if (availability.canCheck) {
            <button class="btn" type="button" (click)="onCheck()">
              {{ 'game.check' | t }}
            </button>
          } @else if (showCallButton()) {
            <button class="btn" type="button" (click)="onCall()">
              {{
                i18n.format('game.callAmount', {
                  amount: availability.callAmount,
                })
              }}
            </button>
          }

          @if (availability.canAllIn) {
            <button
              class="btn btn-danger"
              type="button"
              [class.all-in-confirming]="confirmingAllIn"
              (click)="handleAllInClick()"
            >
              {{ allInButtonLabel() }}
            </button>
          }
        </div>

        @if (availability.canRaise && availability.minRaiseTo !== null) {
          <div class="raise-controls">
            <label class="label">{{ raiseLabelKey() | t }}</label>
            <div class="raise-input-group">
              <button
                class="btn"
                type="button"
                [disabled]="!canStepDownRaise()"
                (click)="stepRaiseDown()"
              >
                -
              </button>
              <input
                class="input"
                type="number"
                [min]="minimumRaiseInput()"
                [max]="maximumRaiseInput()"
                [step]="raiseStep()"
                [ngModel]="raiseAmountInput"
                (ngModelChange)="raiseAmountInput = normalizeRaiseValue($event)"
              />
              <button
                class="btn"
                type="button"
                [disabled]="!canStepUpRaise()"
                (click)="stepRaiseUp()"
              >
                +
              </button>
            </div>
            <button
              class="btn btn-primary"
              type="button"
              [disabled]="!isRaiseValid()"
              (click)="emitRaise()"
            >
              {{ 'game.raiseBtn' | t }}
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .action-grid,
      .raise-controls {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }

      .raise-controls {
        margin-top: 12px;
      }

      .raise-controls .input {
        width: 120px;
      }

      .raise-input-group {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .raise-input-group .btn {
        min-width: 36px;
      }

      .all-in-confirming {
        outline: 2px solid #fbbf24;
        outline-offset: 2px;
      }
    `,
  ],
})
export class PredictionPanelComponent implements OnChanges {
  readonly i18n = inject(I18nService)

  @Input() availability: PlayerActionAvailability | null = null
  @Input() stack = 0
  @Input() buyIn = 0
  @Input() currentBet = 0
  @Input() raiseInputMode: RaiseInputMode = 'to'
  @Input({ required: true }) onFold!: () => void
  @Input({ required: true }) onCheck!: () => void
  @Input({ required: true }) onCall!: () => void
  @Input({ required: true }) onRaise!: (amount: number) => void
  @Input({ required: true }) onAllIn!: () => void

  raiseAmountInput = 0
  confirmingAllIn = false

  ngOnChanges() {
    const minimum = this.minimumRaiseInput()

    if (minimum > 0) {
      this.raiseAmountInput = minimum
    }

    this.confirmingAllIn = false
  }

  normalizeRaiseValue(value: number | string) {
    const numericValue = Number(value)
    const minimum = this.minimumRaiseInput()
    const maximum = this.maximumRaiseInput()

    if (!Number.isFinite(numericValue)) {
      return minimum
    }

    return Math.max(minimum, Math.min(maximum, Math.floor(numericValue)))
  }

  minimumRaiseBy() {
    const minRaiseTo = this.availability?.minRaiseTo
    if (minRaiseTo === null || minRaiseTo === undefined) {
      return 0
    }

    return Math.max(0, minRaiseTo - this.currentBet)
  }

  maximumRaiseBy() {
    const maxRaiseTo = this.availability?.maxRaiseTo
    if (maxRaiseTo === null || maxRaiseTo === undefined) {
      return this.minimumRaiseBy()
    }

    return Math.max(this.minimumRaiseBy(), maxRaiseTo - this.currentBet)
  }

  minimumRaiseInput() {
    return this.raiseInputMode === 'by'
      ? this.minimumRaiseBy()
      : (this.availability?.minRaiseTo ?? 0)
  }

  maximumRaiseInput() {
    return this.raiseInputMode === 'by'
      ? this.maximumRaiseBy()
      : (this.availability?.maxRaiseTo ?? this.minimumRaiseInput())
  }

  raiseLabelKey() {
    return this.raiseInputMode === 'by' ? 'game.raiseBy' : 'game.raiseTo'
  }

  showCallButton() {
    if (!this.availability || this.availability.callAmount <= 0) {
      return false
    }

    return !(this.availability.canAllIn && this.availability.callAmount >= this.stack)
  }

  private buttonStep() {
    if (this.buyIn <= 100) {
      return 1
    }

    const baseStep = Math.max(5, Math.floor(this.buyIn / 100))
    const roundedToFive = Math.max(5, Math.round(baseStep / 5) * 5)

    return roundedToFive
  }

  raiseStep() {
    return this.buttonStep()
  }

  canStepUpRaise() {
    if (!this.availability?.canRaise || this.availability.minRaiseTo === null) {
      return false
    }

    return this.raiseAmountInput + this.raiseStep() <= this.maximumRaiseInput()
  }

  canStepDownRaise() {
    if (!this.availability?.canRaise || this.availability.minRaiseTo === null) {
      return false
    }

    return this.raiseAmountInput - this.raiseStep() >= this.minimumRaiseInput()
  }

  stepRaiseUp() {
    if (!this.canStepUpRaise()) {
      return
    }

    this.confirmingAllIn = false
    this.raiseAmountInput = this.normalizeRaiseValue(
      this.raiseAmountInput + this.raiseStep(),
    )
  }

  stepRaiseDown() {
    if (!this.canStepDownRaise()) {
      return
    }

    this.confirmingAllIn = false
    this.raiseAmountInput = this.normalizeRaiseValue(
      this.raiseAmountInput - this.raiseStep(),
    )
  }

  isRaiseValid() {
    if (!this.availability?.canRaise || this.availability.minRaiseTo === null) {
      return false
    }

    return (
      this.raiseAmountInput >= this.minimumRaiseInput() &&
      this.raiseAmountInput <= this.maximumRaiseInput()
    )
  }

  emitRaise() {
    if (!this.isRaiseValid()) {
      return
    }

    this.confirmingAllIn = false
    const raiseBy =
      this.raiseInputMode === 'by'
        ? this.raiseAmountInput
        : Math.max(0, this.raiseAmountInput - this.currentBet)

    this.onRaise(raiseBy)
  }

  allInButtonLabel() {
    const key = this.confirmingAllIn
      ? 'game.confirmAllInAmount'
      : 'game.allInAmount'

    return this.i18n.format(key, { amount: this.stack })
  }

  handleAllInClick() {
    if (!this.confirmingAllIn) {
      this.confirmingAllIn = true
      return
    }

    this.confirmingAllIn = false
    this.onAllIn()
  }
}
