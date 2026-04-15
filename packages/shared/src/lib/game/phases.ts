export const GAME_PHASES = [
  'waiting',
  'dealing',
  'preflop',
  'flop',
  'turn',
  'river',
  'showdown',
  'finished',
] as const

export type GamePhase = (typeof GAME_PHASES)[number]
