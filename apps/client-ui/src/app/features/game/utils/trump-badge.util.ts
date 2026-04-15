import type { Card, Suit } from '@poker/shared'
import type { TranslationKey } from '../../../core/i18n/translations'
import { SUIT_BACKGROUNDS } from '../../../shared/utils/suit-colors.util'
import { translateCardLabel, translateSuitValue } from './log-params.util'

type TranslateFn = (key: TranslationKey) => string

export interface TrumpBadgeViewModel {
  displayText: string
  background: string
  foreground: string
  border: string
}

const appendReason = (base: string, reason: string) => `${base} (${reason})`

const translatedTrumpText = (input: {
  trumpSuit: Suit | null
  trumpCard: Card | null
  t: TranslateFn
}) => {
  const { trumpSuit, trumpCard, t } = input

  if (!trumpSuit) {
    if (!trumpCard || trumpCard.type === 'number') {
      return ''
    }

    const reason = translateCardLabel(
      trumpCard.type === 'special' ? trumpCard.special : trumpCard.type,
      t,
    )

    return reason
  }

  const translatedSuit = translateSuitValue(trumpSuit, t)
  let base = translatedSuit

  if (trumpCard?.type === 'number') {
    base = `${translatedSuit} ${trumpCard.value}`
  }

  return base
}

export const buildTrumpBadgeViewModel = (input: {
  trumpSuit: Suit | null
  trumpCard: Card | null
  t: TranslateFn
}): TrumpBadgeViewModel => {
  const translatedTrump = translatedTrumpText(input)
  const displayText = translatedTrump
  const background = input.trumpSuit
    ? SUIT_BACKGROUNDS[input.trumpSuit]
    : '#334155'
  const foreground = '#ffffff'

  return {
    displayText,
    background,
    foreground,
    border: background,
  }
}
