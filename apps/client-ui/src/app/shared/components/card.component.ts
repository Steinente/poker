import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  inject,
} from '@angular/core'
import {
  SPECIAL_CARD_KEY,
  type Card,
  type ResolvedCardRuntimeEffect,
  type Suit,
} from '@poker/shared'
import { I18nService } from '../../core/i18n/i18n.service'
import type { TranslationKey } from '../../core/i18n/translations'
import {
  getCardAccent,
  getCardPrimaryText,
  getCardSubtitleKey,
  getCardSuitSymbol,
  getCardTitleKey,
  getCardValueTranslationKey,
} from '../utils/card-label.util'
import { SUIT_BACKGROUNDS, SUIT_FOREGROUNDS } from '../utils/suit-colors.util'

@Component({
  selector: 'poker-card',
  standalone: true,
  host: {
    '[class.poker-card-host-showing-info]': 'cardInfoVisible',
  },
  template: `
    <button
      class="poker-card"
      [class.poker-card-showing-info]="cardInfoVisible"
      type="button"
      [attr.aria-disabled]="disabled"
      [attr.aria-label]="cardAriaLabel"
      [style.border-color]="accent"
      [style.background]="background"
      [style.color]="foreground"
      [style.opacity]="disabled || dimmed ? '0.45' : '1'"
      [style.filter]="disabled || dimmed ? 'grayscale(0.4)' : 'none'"
      [style.box-shadow]="playable ? '0 0 0 2px rgba(212,167,44,0.4)' : 'none'"
      (pointerdown)="onCardPointerDown($event)"
      (pointerup)="onCardPointerRelease()"
      (pointercancel)="onCardPointerRelease()"
      (pointerleave)="onCardPointerRelease()"
      (click)="handlePlay($event)"
    >
      @if (showSpecialInfo && specialInfoText) {
        <span class="info-icon poker-card-info" [title]="specialInfoText"
          >?</span
        >
      }
      @if (primaryText) {
        <div
          class="poker-card-value"
          [class.poker-card-value-compact]="isCompactSpecialValue"
        >
          {{ primaryText }}
        </div>
      }
      @if (middleLabel) {
        <div class="poker-card-middle-label">{{ middleLabel }}</div>
      }
      @if (!middleLabel && suitSymbol) {
        <div class="poker-card-middle-label poker-card-suit-symbol">
          {{ suitSymbol }}
        </div>
      }
      <div
        class="poker-card-bottom-text"
        [class.poker-card-bottom-text-centered]="shouldCenterBottomText"
        [class.poker-card-bottom-text-top]="
          !primaryText &&
          card.type !== 'special' &&
          card.type !== 'wild' &&
          card.type !== 'jester'
        "
      >
        <div
          class="poker-card-title"
          [class.poker-card-title-top]="pinTitleTop"
          [class.poker-card-title-top-left]="isTopTitleLeftAligned"
        >
          {{ title }}
        </div>
        @if (pinTitleTop && vampireCopiedValueLabel) {
          <div class="poker-card-top-value">{{ vampireCopiedValueLabel }}</div>
        }
        @if (subtitle) {
          <div class="poker-card-subtitle">
            {{ subtitle }}
          </div>
        }
        @if (selectedOptionLabel) {
          <div
            class="poker-card-subtitle"
            style="margin-top: 4px; font-size: 11px; font-weight: 600;"
          >
            ({{ selectedOptionLabel }})
          </div>
        }
        @if (vampireCopiedBaseLabel) {
          <div
            class="poker-card-title poker-card-copied-title"
            style="margin-top: 4px;"
          >
            {{ vampireCopiedBaseLabel }}
          </div>
        }
        @if (vampireCopiedOptionLabel) {
          <div
            class="poker-card-subtitle"
            style="margin-top: 2px; font-size: 11px; font-weight: 600;"
          >
            ({{ vampireCopiedOptionLabel }})
          </div>
        }
      </div>
    </button>
    @if (showSpecialInfo && specialInfoText) {
      @if (cardInfoVisible) {
        <div
          class="poker-card-info-popover"
          [style.left.px]="cardInfoLeftPx"
          [style.width.px]="cardInfoWidthPx"
        >
          {{ specialInfoText }}
        </div>
      }
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: inline-block;
        z-index: 0;
      }

      :host(.poker-card-host-showing-info) {
        z-index: 40;
      }

      :host(.previous-round-card) .poker-card {
        width: 100%;
        height: auto;
        min-height: auto;
        padding: 6px;
        aspect-ratio: 96 / 150;
      }

      :host(.previous-round-card) .poker-card-value {
        font-size: 18px;
      }

      :host(.previous-round-card) .poker-card-value-compact {
        font-size: 16px;
      }

      :host(.previous-round-card) .poker-card-title {
        font-size: 11px;
      }

      :host(.previous-round-card) .poker-card-subtitle {
        font-size: 10px;
      }

      :host(.previous-round-card) .poker-card-middle-label {
        font-size: 8px;
      }

      :host(.previous-round-card) .poker-card-suit-symbol {
        font-size: 34px;
      }

      .poker-card {
        --poker-card-radius: 14px;
        width: 96px;
        min-height: 150px;
        position: relative;
        overflow: visible;
        border: 2px solid var(--border);
        border-radius: var(--poker-card-radius);
        padding: 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: left;
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
      }

      .poker-card-showing-info {
        z-index: 20;
      }

      .poker-card-value {
        font-size: 28px;
        font-weight: 700;
        line-height: 1;
      }

      .poker-card-value-compact {
        font-size: 24px;
      }

      .poker-card-info {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 22px;
        height: 22px;
        margin-left: 0;
        font-size: 18px;
        font-weight: bold;
        color: #fff;
        background: #1e293bcc;
        border-radius: 50%;
        box-shadow: 0 2px 6px 0 #0008;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #fbbf24;
        z-index: 2;
        text-shadow:
          0 1px 4px #000a,
          0 0 2px #fbbf24;
      }
      .poker-card-info-popover {
        position: absolute;
        left: 0;
        bottom: 8px;
        transform: none;
        max-width: 260px;
        min-width: 170px;
        z-index: 50;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: rgb(15 23 42 / 0.9);
        color: var(--text);
        padding: 7px 8px;
        font-size: 11px;
        line-height: 1.25;
        text-align: left;
      }

      .poker-card-title {
        font-size: 14px;
        font-weight: 700;
        line-height: 1.1;
        white-space: normal;
        hyphens: auto;
        overflow-wrap: break-word;
        word-break: normal;
      }

      .poker-card-title-top {
        position: absolute;
        top: 10px;
        left: 10px;
        right: 10px;
      }

      .poker-card-top-value {
        position: absolute;
        top: 26px;
        left: 10px;
        right: 10px;
        font-size: 16px;
        font-weight: 600;
        line-height: 1.1;
        text-align: left;
      }

      .poker-card-title-top-left {
        text-align: left;
      }

      .poker-card-subtitle {
        font-size: 12px;
        line-height: 1.1;
        white-space: normal;
        hyphens: auto;
        overflow-wrap: break-word;
        word-break: normal;
      }

      .poker-card-bottom-text {
        margin-top: auto;
      }

      .poker-card-bottom-text-top {
        margin-top: 0;
      }

      .poker-card-bottom-text-centered {
        text-align: center;
      }

      .poker-card-middle-label {
        position: absolute;
        left: 8px;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        text-align: center;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.1;
        pointer-events: none;
        text-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
        z-index: 1;
      }

      .poker-card-suit-symbol {
        font-size: 44px;
        line-height: 1;
        text-shadow: none;
        opacity: 0.25;
      }

      @media (max-width: 700px) {
        .poker-card {
          --poker-card-radius: 12px;
          width: 92px;
          min-height: 144px;
          padding: 8px;
        }

        .poker-card-value {
          font-size: 23px;
        }

        .poker-card-value-compact {
          font-size: 20px;
        }

        .poker-card-title {
          font-size: 12px;
        }

        .poker-card-subtitle {
          font-size: 10px;
        }

        .poker-card-middle-label {
          font-size: 10px;
        }
      }

      @media (max-width: 460px) {
        .poker-card {
          width: 78px;
          min-height: 122px;
          padding: 7px;
        }

        .poker-card-value {
          font-size: 19px;
        }

        .poker-card-value-compact {
          font-size: 17px;
        }

        .poker-card-title {
          font-size: 11px;
        }

        .poker-card-subtitle {
          font-size: 9px;
        }

        .poker-card-middle-label {
          font-size: 9px;
        }

        .poker-card-title-top {
          top: 8px;
          left: 8px;
          right: 8px;
        }

        .poker-card-top-value {
          top: 22px;
          left: 8px;
          right: 8px;
          font-size: 14px;
        }

        .poker-card-info {
          width: 14px;
          height: 14px;
          font-size: 10px;
        }

        .poker-card-info-popover {
          max-width: 230px;
          min-width: 150px;
          font-size: 10px;
        }
      }
    `,
  ],
})
export class CardComponent {
  private readonly i18n = inject(I18nService)
  private readonly hostElement =
    inject<ElementRef<HTMLButtonElement>>(ElementRef)
  private readonly cdr = inject(ChangeDetectorRef)
  private longPressTimerId: ReturnType<typeof setTimeout> | null = null
  private hideInfoTimerId: ReturnType<typeof setTimeout> | null = null
  private longPressHandled = false
  private readonly dismissPopover = () => {
    this.hideInfo()
    this.cdr.detectChanges()
  }
  cardInfoVisible = false
  cardInfoLeftPx = 0
  cardInfoWidthPx = 260

  @Input({ required: true }) card!: Card
  @Input() middleLabel: string | null = null
  @Input() playable = false
  @Input() disabled = false
  @Input() dimmed = false
  @Input() play!: (card: Card) => void
  @Input() resolvedEffect?: ResolvedCardRuntimeEffect
  @Input() showSpecialInfo = false

  get accent() {
    if (this.displaySuit) {
      return SUIT_BACKGROUNDS[this.displaySuit]
    }

    return getCardAccent(this.card)
  }

  get primaryText() {
    return getCardPrimaryText(this.card)
  }

  get isCompactSpecialValue(): boolean {
    return (
      this.card.type === 'special' &&
      (this.card.special === SPECIAL_CARD_KEY.cloud ||
        this.card.special === SPECIAL_CARD_KEY.juggler)
    )
  }

  get suitSymbol(): string | null {
    return getCardSuitSymbol(this.card)
  }

  get title() {
    const key = getCardTitleKey(this.card)
    return key ? this.i18n.t(key) : ''
  }

  get subtitle() {
    const key = getCardSubtitleKey(this.card)
    return key ? this.i18n.t(key) : ''
  }

  get cardAriaLabel() {
    if (this.card.type === 'number') {
      return `${this.getSuitLabel(this.card.suit)} ${this.getCardValueLabel(
        this.card.value,
      )}`
    }

    return [
      this.title,
      this.primaryText,
      this.subtitle,
      this.selectedOptionLabel ?? '',
      this.vampireCopiedBaseLabel ?? '',
      this.vampireCopiedOptionLabel ?? '',
    ]
      .filter((value) => value.trim().length > 0)
      .join(' ')
  }

  get shapeShifterMode(): string | null {
    if (
      this.resolvedEffect &&
      this.resolvedEffect.special === SPECIAL_CARD_KEY.shapeShifter &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.getShapeShifterModeLabel(this.resolvedEffect.shapeShifterMode)
    }

    if (
      this.resolvedEffect &&
      this.resolvedEffect.special === SPECIAL_CARD_KEY.vampire &&
      this.resolvedEffect.copiedCard?.type === 'special' &&
      this.resolvedEffect.copiedCard.special ===
        SPECIAL_CARD_KEY.shapeShifter &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.getShapeShifterModeLabel(this.resolvedEffect.shapeShifterMode)
    }

    return null
  }

  get vampireCopiedLabel(): string | null {
    if (
      this.resolvedEffect?.special === SPECIAL_CARD_KEY.vampire &&
      this.resolvedEffect.copiedCard
    ) {
      return this.translateCard(this.resolvedEffect.copiedCard)
    }

    return null
  }

  get selectedOptionLabel(): string | null {
    if (!this.resolvedEffect) {
      return null
    }

    if (
      this.resolvedEffect.special === SPECIAL_CARD_KEY.shapeShifter &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.i18n.t(
        this.getShapeShifterModeLabel(
          this.resolvedEffect.shapeShifterMode,
        ) as TranslationKey,
      )
    }

    if (
      this.isCloudOrJugglerSpecial(this.resolvedEffect.special) &&
      this.resolvedEffect.chosenSuit
    ) {
      return this.getSuitLabel(this.resolvedEffect.chosenSuit)
    }

    return null
  }

  get vampireCopiedBaseLabel(): string | null {
    return this.vampireCopiedLabel
  }

  get vampireCopiedOptionLabel(): string | null {
    if (this.resolvedEffect?.special !== SPECIAL_CARD_KEY.vampire) {
      return null
    }

    if (
      this.vampireCopiedSpecial === SPECIAL_CARD_KEY.shapeShifter &&
      this.resolvedEffect.shapeShifterMode
    ) {
      return this.i18n.t(
        this.getShapeShifterModeLabel(
          this.resolvedEffect.shapeShifterMode,
        ) as TranslationKey,
      )
    }

    if (
      this.isCloudOrJugglerSpecial(this.vampireCopiedSpecial) &&
      this.resolvedEffect.chosenSuit
    ) {
      return this.getSuitLabel(this.resolvedEffect.chosenSuit)
    }

    return null
  }

  get vampireCopiedValueLabel(): string | null {
    if (
      this.resolvedEffect?.special !== 'vampire' ||
      this.resolvedEffect.copiedCard?.type !== 'special'
    ) {
      return null
    }

    if (this.isCloudOrJugglerSpecial(this.vampireCopiedSpecial)) {
      return getCardPrimaryText(this.resolvedEffect.copiedCard)
    }

    return null
  }

  get shouldCenterBottomText(): boolean {
    return !!this.selectedOptionLabel || !!this.vampireCopiedBaseLabel
  }

  private get vampireCopiedSpecial(): string | null {
    if (
      this.resolvedEffect?.special === SPECIAL_CARD_KEY.vampire &&
      this.resolvedEffect.copiedCard?.type === 'special'
    ) {
      return this.resolvedEffect.copiedCard.special
    }

    return null
  }

  private get displaySuit(): Suit | null {
    if (
      this.resolvedEffect &&
      this.isCloudOrJugglerSpecial(this.resolvedEffect.special) &&
      this.resolvedEffect.chosenSuit
    ) {
      return this.resolvedEffect.chosenSuit
    }

    if (this.resolvedEffect?.special !== SPECIAL_CARD_KEY.vampire) {
      return null
    }

    if (
      this.isCloudOrJugglerSpecial(this.vampireCopiedSpecial) &&
      this.resolvedEffect.chosenSuit
    ) {
      return this.resolvedEffect.chosenSuit
    }

    if (this.resolvedEffect.copiedCard?.type === 'number') {
      return this.resolvedEffect.copiedCard.suit
    }

    return null
  }

  private isCloudOrJugglerSpecial(special: string | null | undefined): boolean {
    return (
      special === SPECIAL_CARD_KEY.cloud || special === SPECIAL_CARD_KEY.juggler
    )
  }

  private getSuitLabel(suit: string): string {
    return this.i18n.t(`suit.${suit}` as TranslationKey)
  }

  private getCardValueLabel(value: number): string {
    const key = getCardValueTranslationKey(value)
    return key ? this.i18n.t(key) : String(value)
  }

  private getShapeShifterModeLabel(
    mode: 'wild' | 'jester',
  ): 'card.wild' | 'card.jester' {
    return mode === 'wild' ? 'card.wild' : 'card.jester'
  }

  get isTopTitleLeftAligned(): boolean {
    return (
      this.pinTitleTop &&
      ((this.card.type === 'special' &&
        this.card.special === SPECIAL_CARD_KEY.shapeShifter) ||
        !!this.vampireCopiedBaseLabel)
    )
  }

  get pinTitleTop(): boolean {
    if (!this.middleLabel || this.card.type !== 'special') {
      return false
    }

    return (
      this.card.special === SPECIAL_CARD_KEY.shapeShifter ||
      !!this.vampireCopiedLabel
    )
  }

  get specialInfoText(): string {
    if (this.card.type !== 'special') {
      return ''
    }

    const key = `card.special.${this.card.special}.info` as TranslationKey
    return this.i18n.t(key)
  }

  get background() {
    if (this.displaySuit) {
      return SUIT_BACKGROUNDS[this.displaySuit] ?? this.accent
    }

    if (this.card.type === 'number') {
      return '#f8fafc'
    }

    return '#f8fafc'
  }

  get foreground() {
    if (this.displaySuit) {
      return SUIT_FOREGROUNDS[this.displaySuit] ?? '#0f172a'
    }

    if (this.card.type === 'number') {
      return SUIT_FOREGROUNDS[this.card.suit]
    }

    return '#0f172a'
  }

  private translateCard(card: Card): string {
    if (card.type === 'number') {
      return `${this.i18n.t(`suit.${card.suit}` as TranslationKey)} ${card.value}`
    }

    return ''
  }

  ngOnDestroy() {
    this.clearLongPressTimer()
    this.hideInfo()
  }

  onCardPointerDown(event: PointerEvent) {
    if (!this.showSpecialInfo || !this.specialInfoText) {
      return
    }

    if (event.pointerType !== 'touch') {
      return
    }

    this.longPressHandled = false
    this.clearLongPressTimer()
    this.longPressTimerId = setTimeout(() => {
      this.longPressHandled = true
      this.showInfoTemporarily()
    }, 500)
  }

  onCardPointerRelease() {
    this.clearLongPressTimer()
  }

  handlePlay(event: MouseEvent) {
    if (this.longPressHandled) {
      event.preventDefault()
      event.stopPropagation()
      this.longPressHandled = false
      return
    }

    if (!this.disabled) {
      this.play(this.card)
    }
  }

  private showInfoTemporarily() {
    this.updateCardInfoLayout()
    this.cardInfoVisible = true
    this.clearHideInfoTimer()
    this.hideInfoTimerId = setTimeout(() => this.hideInfo(), 2600)
    document.addEventListener('touchstart', this.dismissPopover, {
      capture: true,
    })
    window.addEventListener('scroll', this.dismissPopover, {
      capture: true,
      passive: true,
    })
  }

  private hideInfo() {
    this.clearHideInfoTimer()
    this.cardInfoVisible = false
    document.removeEventListener('touchstart', this.dismissPopover, {
      capture: true,
    })
    window.removeEventListener('scroll', this.dismissPopover, { capture: true })
  }

  private clearLongPressTimer() {
    if (this.longPressTimerId) {
      clearTimeout(this.longPressTimerId)
      this.longPressTimerId = null
    }
  }

  private clearHideInfoTimer() {
    if (this.hideInfoTimerId) {
      clearTimeout(this.hideInfoTimerId)
      this.hideInfoTimerId = null
    }
  }

  private updateCardInfoLayout() {
    const viewportWidth = window.innerWidth
    const viewportMargin = viewportWidth <= 460 ? 10 : 12
    const preferredWidth = viewportWidth <= 460 ? 230 : 260
    const minWidth = viewportWidth <= 460 ? 150 : 170
    const maxAllowedWidth = Math.max(
      minWidth,
      viewportWidth - viewportMargin * 2,
    )
    const tooltipWidth = Math.min(preferredWidth, maxAllowedWidth)
    const cardRect = this.hostElement.nativeElement.getBoundingClientRect()
    const centeredLeft = cardRect.width / 2 - tooltipWidth / 2
    const minLeft = viewportMargin - cardRect.left
    const maxLeft =
      viewportWidth - viewportMargin - cardRect.left - tooltipWidth

    this.cardInfoWidthPx = tooltipWidth
    this.cardInfoLeftPx = Math.min(Math.max(centeredLeft, minLeft), maxLeft)
  }
}
