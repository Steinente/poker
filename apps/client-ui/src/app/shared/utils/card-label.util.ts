import { SPECIAL_CARD_KEY, type Card } from '@poker/shared'
import type { TranslationKey } from '../../core/i18n/translations'
import { SUIT_BACKGROUNDS, SUIT_SYMBOLS } from './suit-colors.util'

export const getCardTitleKey = (card: Card): TranslationKey | null => {
  return null
}

export const getCardSubtitleKey = (card: Card): TranslationKey | null => {
  return null
}

/** Gibt das Unicode-Symbol der Kartenfarbe zurück (♠ ♥ ♣ ♦), oder null. */
export const getCardSuitSymbol = (card: Card): string | null => {
  if (card.type === 'number') {
    return SUIT_SYMBOLS[card.suit]
  }
  return null
}

const FACE_CARD_LABELS: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

export const getCardPrimaryText = (card: Card): string => {
  if (card.type === 'number') {
    return FACE_CARD_LABELS[card.value] ?? String(card.value)
  }

  if (card.type === 'special' && card.special === SPECIAL_CARD_KEY.juggler) {
    return '7 ½'
  }

  if (card.type === 'special' && card.special === SPECIAL_CARD_KEY.cloud) {
    return '9 ¾'
  }

  return ''
}

export const getCardAccent = (card: Card): string => {
  if (card.type === 'number') {
    return SUIT_BACKGROUNDS[card.suit]
  }

  if (card.type === 'wild') {
    return '#7c3aed'
  }

  if (card.type === 'jester') {
    return '#6b7280'
  }

  return '#d4a72c'
}
