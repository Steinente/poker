import type { GameConfig } from '@poker/shared'

export const defaultGameConfig: GameConfig = {
  gameType: 'poker',
  pokerVariant: 'texasHoldem',
  holdemLimitMode: 'noLimit',
  maxPlayers: 9,
  buyIn: 1000,
  smallBlind: 10,
  bigBlind: 20,
  automaticBlindIncreaseEnabled: false,
  automaticBlindIncreaseMode: 'time',
  automaticBlindIncreaseValue: 5,
  automaticBlindIncreaseAmount: 20,
  allowSpectatorChat: true,
  readLogEnabledByDefault: false,
  languageDefault: 'de',
  includedSpecialCards: [],
}
