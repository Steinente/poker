import { SUITS, type Suit, type PokerGameViewState } from '@poker/shared'
import type { TranslationKey } from '../../../core/i18n/translations'

type TranslateFn = (key: TranslationKey) => string

export type LogParams = Record<string, string | number | boolean | null>

export type CloudPredictionDeltaFormat = 'visible' | 'speech'

type NormalizeLogParamsOptions = {
  includeSwappedCardLabel?: boolean
  includeSpecial?: boolean
  cardsFormat?: 'display' | 'speech' | 'html'
}

const SUIT_SYMBOLS: Record<string, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

const VALUE_DISPLAY: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

const formatSingleCardDisplay = (suit: string, value: number): string => {
  const symbol = SUIT_SYMBOLS[suit] ?? suit
  const valStr = VALUE_DISPLAY[value] ?? String(value)
  return `${symbol}${valStr}`
}

const escapeHtmlAttribute = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const escapeHtmlText = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const formatSingleCardHtml = (
  suit: string,
  value: number,
  t: TranslateFn,
): string => {
  const display = formatSingleCardDisplay(suit, value)
  const colorClass = suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black'
  const tooltip = escapeHtmlAttribute(formatSingleCardSpeech(suit, value, t))

  return `<span class="log-card-chip log-card-chip-${colorClass}" title="${tooltip}" aria-label="${tooltip}">${display}</span>`
}

const formatSingleCardSpeech = (
  suit: string,
  value: number,
  t: TranslateFn,
): string => {
  const suitName = t(`suit.${suit}` as TranslationKey)
  const valueName = t(`card.value.${value}` as TranslationKey)
  return `${suitName} ${valueName}`
}

const formatCommunityCardsParam = (
  cards: string,
  mode: 'display' | 'speech' | 'html',
  t: TranslateFn,
): string => {
  const tokens = cards
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const formatted = tokens.map((token) => {
    const colonIdx = token.indexOf(':')
    if (colonIdx === -1) return token
    const suit = token.slice(0, colonIdx).trim()
    const value = Number(token.slice(colonIdx + 1).trim())
    if (!Number.isFinite(value)) return token
    if (mode === 'display') {
      return formatSingleCardDisplay(suit, value)
    }

    if (mode === 'html') {
      return formatSingleCardHtml(suit, value, t)
    }

    return formatSingleCardSpeech(suit, value, t)
  })

  if (formatted.length === 0) return ''
  if (formatted.length === 1) return formatted[0]

  const conjunction = t('common.conjunction.and')
  const last = formatted[formatted.length - 1]
  const rest = formatted.slice(0, -1)
  return `${rest.join(', ')} ${conjunction} ${last}`
}

const formatHoleCardsSummaryParam = (
  hands: string,
  mode: 'display' | 'speech' | 'html',
  t: TranslateFn,
): string => {
  const entries = hands
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)

  return entries
    .map((entry) => {
      const separatorIndex = entry.indexOf('=')
      if (separatorIndex === -1) return entry

      const playerName = entry.slice(0, separatorIndex).trim()
      const cards = entry.slice(separatorIndex + 1).trim()
      const formattedCards = formatCommunityCardsParam(cards, mode, t)

      if (mode === 'html') {
        return `<strong>${escapeHtmlText(playerName)}</strong>: ${formattedCards}`
      }

      return `${playerName}: ${formattedCards}`
    })
    .join(mode === 'html' ? '<br>' : '; ')
}

const formatWinnerSummaryParam = (
  summary: string,
  mode: 'display' | 'speech' | 'html',
  t: TranslateFn,
): string => {
  const entries = summary
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)

  return entries
    .map((entry) => {
      const separatorIndex = entry.indexOf('=')
      if (separatorIndex === -1) return entry

      const playerName = entry.slice(0, separatorIndex).trim()
      const rankKey = entry.slice(separatorIndex + 1).trim()
      const rankLabel = t(`game.handRankNoun.${rankKey}` as TranslationKey)
      const safePlayerName =
        mode === 'html' ? escapeHtmlText(playerName) : playerName

      return t('game.showdownWinnerWithRank' as TranslationKey)
        .replace('{playerName}', safePlayerName)
        .replace('{handRank}', rankLabel)
    })
    .join(mode === 'html' ? '<br>' : '; ')
}

const isSuit = (value: string): value is Suit =>
  (SUITS as readonly string[]).includes(value)

export const translateCardLabel = (value: string, t: TranslateFn): string => {
  const lower = value.toLowerCase()
  const parts = value.split(' ')

  if (parts.length === 2) {
    const suit = parts[0].toLowerCase()
    const number = parts[1]

    if (isSuit(suit)) {
      return `${t(`suit.${suit}` as TranslationKey)} ${number}`
    }
  }

  return value
}

export const replacePlayerReferences = (
  params: LogParams | undefined,
  players: PokerGameViewState['players'],
) => {
  if (!params) {
    return params
  }

  const next = { ...params }

  for (const key of ['playerId', 'targetPlayerId', 'sourcePlayerId']) {
    const value = next[key]

    if (typeof value === 'string') {
      const player = players.find((entry) => entry.playerId === value)

      if (player) {
        next[key] = player.name
      }
    }
  }

  return next
}

export const translateSuitValue = (value: string, t: TranslateFn): string => {
  const lower = value.toLowerCase()

  if (isSuit(lower)) {
    return t(`suit.${lower}` as TranslationKey)
  }
  return value
}

export const normalizeLogParams = (
  params: LogParams | undefined,
  players: PokerGameViewState['players'],
  t: TranslateFn,
  options?: NormalizeLogParamsOptions,
) => {
  const next = replacePlayerReferences(params, players)

  if (!next) {
    return next
  }

  if (typeof next.suit === 'string') {
    next.suit = translateSuitValue(next.suit, t)
  }

  if (typeof next.cardLabel === 'string') {
    next.cardLabel = translateCardLabel(next.cardLabel, t)
  }

  if (typeof next.givenCardLabel === 'string') {
    next.givenCardLabel = translateCardLabel(next.givenCardLabel, t)
  }

  if (typeof next.takenCardLabel === 'string') {
    next.takenCardLabel = translateCardLabel(next.takenCardLabel, t)
  }

  if (typeof next.copiedCardLabel === 'string') {
    next.copiedCardLabel = translateCardLabel(next.copiedCardLabel, t)
  }

  if (typeof next.currentTrump === 'string') {
    next.currentTrump = translateCardLabel(next.currentTrump, t)
  }

  if (typeof next.cards === 'string') {
    const fmt = options?.cardsFormat ?? 'display'
    next.cards = formatCommunityCardsParam(next.cards, fmt, t)
  }

  if (typeof next.hands === 'string') {
    const fmt = options?.cardsFormat ?? 'display'
    next.hands = formatHoleCardsSummaryParam(next.hands, fmt, t)
  }

  if (typeof next.winnerSummary === 'string') {
    const fmt = options?.cardsFormat ?? 'display'
    next.winnerSummary = formatWinnerSummaryParam(next.winnerSummary, fmt, t)
  }

  if (
    options?.includeSwappedCardLabel &&
    typeof next.swappedCardLabel === 'string'
  ) {
    next.swappedCardLabel = translateCardLabel(next.swappedCardLabel, t)
  }

  if (options?.includeSpecial && typeof next.special === 'string') {
    next.special = translateCardLabel(next.special, t)
  }

  return next
}

export const formatCloudPredictionAdjustedParams = (
  messageKey: string,
  params: LogParams | undefined,
  format: CloudPredictionDeltaFormat,
) => {
  if (!params) {
    return params
  }

  const canonical = messageKey.startsWith('log.')
    ? messageKey.slice(4)
    : messageKey

  if (canonical !== 'special.cloud.predictionAdjusted') {
    return params
  }

  const next = { ...params }

  if (typeof next.delta === 'number' && next.delta > 0) {
    next.delta = format === 'speech' ? `plus ${next.delta}` : `+${next.delta}`
  }

  return next
}
