import type { GameLogColorKey, Suit } from '@poker/shared'

export const ALL_SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

// Akzentfarbe je Farbe: Rot für Herz/Karo, Dunkel für Pik/Kreuz
export const SUIT_BACKGROUNDS: Record<Suit, string> = {
  clubs: '#1e293b',
  diamonds: '#dc2626',
  hearts: '#dc2626',
  spades: '#1e293b',
}

// Vordergrundfarbe auf weißem Kartenuntergrund
export const SUIT_FOREGROUNDS: Record<Suit, string> = {
  clubs: '#111827',
  diamonds: '#dc2626',
  hearts: '#dc2626',
  spades: '#111827',
}

// Unicode-Symbole der Kartenfarben
export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

export const getSuitBackground = (suit: Suit): string => SUIT_BACKGROUNDS[suit]

export const GAME_LOG_BACKGROUNDS: Record<GameLogColorKey, string> = {
  red: 'var(--card-red)',
  redAlt: 'var(--log-red-alt)',
  yellow: 'var(--card-yellow)',
  yellowAlt: 'var(--log-yellow-alt)',
  green: 'var(--card-green)',
  greenAlt: 'var(--log-green-alt)',
  blue: 'var(--card-blue)',
  blueAlt: 'var(--log-blue-alt)',
  gray: 'var(--log-gray)',
  grayAlt: 'var(--log-gray-alt)',
}

export const getGameLogBackground = (colorKey: GameLogColorKey): string =>
  GAME_LOG_BACKGROUNDS[colorKey]
