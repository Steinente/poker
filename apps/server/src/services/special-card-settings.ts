import type { GameConfig } from '@poker/shared'

export type SpecialCardSettings = Pick<
  GameConfig,
  | 'allowSpectatorChat'
  | 'gameType'
  | 'pokerVariant'
  | 'holdemLimitMode'
  | 'maxPlayers'
  | 'buyIn'
  | 'smallBlind'
  | 'bigBlind'
  | 'automaticBlindIncreaseEnabled'
  | 'automaticBlindIncreaseMode'
  | 'automaticBlindIncreaseValue'
  | 'automaticBlindIncreaseAmount'
>

const DEFAULT_SPECIAL_CARD_SETTINGS: SpecialCardSettings = {
  allowSpectatorChat: true,
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
}

export const parseSpecialCardSettings = (
  value: string | null,
): SpecialCardSettings => {
  if (value === null) return { ...DEFAULT_SPECIAL_CARD_SETTINGS }

  try {
    const parsed = JSON.parse(value)

    if (parsed && typeof parsed === 'object') {
      const maybeAllowSpectatorChat = (
        parsed as { allowSpectatorChat?: unknown }
      ).allowSpectatorChat
      const maybeGameType = (parsed as { gameType?: unknown }).gameType
      const maybePokerVariant = (parsed as { pokerVariant?: unknown })
        .pokerVariant
      const maybeHoldemLimitMode = (parsed as { holdemLimitMode?: unknown })
        .holdemLimitMode
      const maybeMaxPlayers = (parsed as { maxPlayers?: unknown }).maxPlayers
      const maybeBuyIn = (parsed as { buyIn?: unknown }).buyIn
      const maybeSmallBlind = (parsed as { smallBlind?: unknown }).smallBlind
      const maybeBigBlind = (parsed as { bigBlind?: unknown }).bigBlind
      const maybeAutomaticBlindIncreaseEnabled = (
        parsed as { automaticBlindIncreaseEnabled?: unknown }
      ).automaticBlindIncreaseEnabled
      const maybeAutomaticBlindIncreaseMode = (
        parsed as { automaticBlindIncreaseMode?: unknown }
      ).automaticBlindIncreaseMode
      const maybeAutomaticBlindIncreaseValue = (
        parsed as { automaticBlindIncreaseValue?: unknown }
      ).automaticBlindIncreaseValue
      const maybeAutomaticBlindIncreaseAmount = (
        parsed as { automaticBlindIncreaseAmount?: unknown }
      ).automaticBlindIncreaseAmount

      const maxPlayers =
        typeof maybeMaxPlayers === 'number' && Number.isFinite(maybeMaxPlayers)
          ? Math.max(2, Math.min(10, Math.floor(maybeMaxPlayers)))
          : DEFAULT_SPECIAL_CARD_SETTINGS.maxPlayers

      const holdemLimitMode =
        maybeHoldemLimitMode === 'fixedLimit' ||
        maybeHoldemLimitMode === 'potLimit' ||
        maybeHoldemLimitMode === 'noLimit'
          ? maybeHoldemLimitMode
          : DEFAULT_SPECIAL_CARD_SETTINGS.holdemLimitMode

      const parsedSmallBlind =
        typeof maybeSmallBlind === 'number' && Number.isFinite(maybeSmallBlind)
          ? Math.max(1, Math.floor(maybeSmallBlind))
          : DEFAULT_SPECIAL_CARD_SETTINGS.smallBlind

      const smallBlind =
        holdemLimitMode === 'fixedLimit'
          ? Math.max(2, parsedSmallBlind + (parsedSmallBlind % 2))
          : parsedSmallBlind

      const parsedBigBlind =
        typeof maybeBigBlind === 'number' && Number.isFinite(maybeBigBlind)
          ? Math.max(1, Math.floor(maybeBigBlind))
          : DEFAULT_SPECIAL_CARD_SETTINGS.bigBlind

      const bigBlind =
        holdemLimitMode === 'fixedLimit'
          ? smallBlind * 2
          : Math.max(smallBlind, parsedBigBlind)

      const buyIn =
        typeof maybeBuyIn === 'number' && Number.isFinite(maybeBuyIn)
          ? Math.max(bigBlind, Math.floor(maybeBuyIn))
          : DEFAULT_SPECIAL_CARD_SETTINGS.buyIn

      const automaticBlindIncreaseMode =
        maybeAutomaticBlindIncreaseMode === 'time' ||
        maybeAutomaticBlindIncreaseMode === 'dealerRounds'
          ? maybeAutomaticBlindIncreaseMode
          : DEFAULT_SPECIAL_CARD_SETTINGS.automaticBlindIncreaseMode

      const automaticBlindIncreaseValue =
        typeof maybeAutomaticBlindIncreaseValue === 'number' &&
        Number.isFinite(maybeAutomaticBlindIncreaseValue)
          ? Math.max(1, Math.floor(maybeAutomaticBlindIncreaseValue))
          : DEFAULT_SPECIAL_CARD_SETTINGS.automaticBlindIncreaseValue

      const automaticBlindIncreaseAmount =
        typeof maybeAutomaticBlindIncreaseAmount === 'number' &&
        Number.isFinite(maybeAutomaticBlindIncreaseAmount)
          ? Math.max(1, Math.floor(maybeAutomaticBlindIncreaseAmount))
          : DEFAULT_SPECIAL_CARD_SETTINGS.automaticBlindIncreaseAmount

      return {
        allowSpectatorChat: maybeAllowSpectatorChat !== false,
        gameType: maybeGameType === 'poker' ? 'poker' : 'poker',
        pokerVariant:
          maybePokerVariant === 'texasHoldem'
            ? 'texasHoldem'
            : DEFAULT_SPECIAL_CARD_SETTINGS.pokerVariant,
        holdemLimitMode,
        maxPlayers,
        buyIn,
        smallBlind,
        bigBlind,
        automaticBlindIncreaseEnabled:
          maybeAutomaticBlindIncreaseEnabled === true,
        automaticBlindIncreaseMode,
        automaticBlindIncreaseValue,
        automaticBlindIncreaseAmount,
      }
    }

    return { ...DEFAULT_SPECIAL_CARD_SETTINGS }
  } catch {
    return { ...DEFAULT_SPECIAL_CARD_SETTINGS }
  }
}

export const serializeSpecialCardSettings = (
  settings: SpecialCardSettings,
): string => JSON.stringify(settings)
