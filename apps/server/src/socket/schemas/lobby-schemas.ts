import { z } from 'zod'

const PLAYER_NAME_MAX_LENGTH = 15
const PLAYER_NAME_EMOJI_PATTERN =
  /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Regional_Indicator}\u200D\uFE0F]/u

const playerNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'error.playerNameRequired' })
  .max(PLAYER_NAME_MAX_LENGTH, { message: 'error.playerNameTooLong' })
  .refine((value) => !PLAYER_NAME_EMOJI_PATTERN.test(value), {
    message: 'error.playerNameNoEmoji',
  })

const specialCardKeySchema = z.enum([
  'shapeShifter',
  'bomb',
  'werewolf',
  'vampire',
  'darkEye',
  'cloud',
  'juggler',
  'dragon',
  'fairy',
  'witch',
])

const pokerConfigPatchSchema = z.object({
  gameType: z.literal('poker').optional(),
  pokerVariant: z.literal('texasHoldem').optional(),
  holdemLimitMode: z.enum(['noLimit', 'fixedLimit', 'potLimit']).optional(),
  maxPlayers: z.number().int().min(2).max(10).optional(),
  buyIn: z.number().int().min(1).optional(),
  smallBlind: z.number().int().min(1).optional(),
  bigBlind: z.number().int().min(1).optional(),
  automaticBlindIncreaseEnabled: z.boolean().optional(),
  automaticBlindIncreaseMode: z.enum(['time', 'dealerRounds']).optional(),
  automaticBlindIncreaseValue: z.number().int().min(1).optional(),
  automaticBlindIncreaseAmount: z.number().int().min(1).optional(),
})

export const createLobbySchema = z.object({
  playerName: playerNameSchema,
  sessionToken: z.string().trim().min(1).max(200),
  password: z.string().trim().max(64).optional(),
  config: z
    .object({
      gameType: pokerConfigPatchSchema.shape.gameType,
      pokerVariant: pokerConfigPatchSchema.shape.pokerVariant,
      holdemLimitMode: pokerConfigPatchSchema.shape.holdemLimitMode,
      maxPlayers: pokerConfigPatchSchema.shape.maxPlayers,
      buyIn: pokerConfigPatchSchema.shape.buyIn,
      smallBlind: pokerConfigPatchSchema.shape.smallBlind,
      bigBlind: pokerConfigPatchSchema.shape.bigBlind,
      automaticBlindIncreaseEnabled:
        pokerConfigPatchSchema.shape.automaticBlindIncreaseEnabled,
      automaticBlindIncreaseMode:
        pokerConfigPatchSchema.shape.automaticBlindIncreaseMode,
      automaticBlindIncreaseValue:
        pokerConfigPatchSchema.shape.automaticBlindIncreaseValue,
      automaticBlindIncreaseAmount:
        pokerConfigPatchSchema.shape.automaticBlindIncreaseAmount,
      predictionVisibility: z.enum(['open', 'hidden', 'secret']).optional(),
      openPredictionRestriction: z
        .enum(['none', 'mustEqualTricks', 'mustNotEqualTricks'])
        .optional(),
      cloudRuleTiming: z.enum(['endOfRound', 'immediateAfterTrick']).optional(),
      allowSpectatorChat: z.boolean().optional(),
      specialCardsRandomizerEnabled: z.boolean().optional(),
      extendedPlayerRangeEnabled: z.boolean().optional(),
      languageDefault: z.enum(['en', 'de']).optional(),
      includedSpecialCards: z.array(specialCardKeySchema).optional(),
    })
    .optional(),
})

export const joinLobbySchema = z.object({
  code: z.string().trim().min(4).max(12),
  playerName: playerNameSchema,
  sessionToken: z.string().trim().min(1).max(200),
  password: z.string().trim().max(64).optional(),
})

export const spectateLobbySchema = z.object({
  code: z.string().trim().min(4).max(12),
  playerName: playerNameSchema,
  sessionToken: z.string().trim().min(1).max(200),
  password: z.string().trim().max(64).optional(),
})

export const listLobbiesSchema = z.object({}).optional()

export const reconnectLobbySchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
})

export const reopenLobbySchema = reconnectLobbySchema

export const joinReplayLobbySchema = reconnectLobbySchema

export const updateConfigSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  config: z.object({
    gameType: pokerConfigPatchSchema.shape.gameType,
    pokerVariant: pokerConfigPatchSchema.shape.pokerVariant,
    holdemLimitMode: pokerConfigPatchSchema.shape.holdemLimitMode,
    maxPlayers: pokerConfigPatchSchema.shape.maxPlayers,
    buyIn: pokerConfigPatchSchema.shape.buyIn,
    smallBlind: pokerConfigPatchSchema.shape.smallBlind,
    bigBlind: pokerConfigPatchSchema.shape.bigBlind,
    automaticBlindIncreaseEnabled:
      pokerConfigPatchSchema.shape.automaticBlindIncreaseEnabled,
    automaticBlindIncreaseMode:
      pokerConfigPatchSchema.shape.automaticBlindIncreaseMode,
    automaticBlindIncreaseValue:
      pokerConfigPatchSchema.shape.automaticBlindIncreaseValue,
    automaticBlindIncreaseAmount:
      pokerConfigPatchSchema.shape.automaticBlindIncreaseAmount,
    predictionVisibility: z.enum(['open', 'hidden', 'secret']).optional(),
    openPredictionRestriction: z
      .enum(['none', 'mustEqualTricks', 'mustNotEqualTricks'])
      .optional(),
    cloudRuleTiming: z.enum(['endOfRound', 'immediateAfterTrick']).optional(),
    allowSpectatorChat: z.boolean().optional(),
    specialCardsRandomizerEnabled: z.boolean().optional(),
    extendedPlayerRangeEnabled: z.boolean().optional(),
    languageDefault: z.enum(['en', 'de']).optional(),
    includedSpecialCards: z.array(specialCardKeySchema).optional(),
  }),
})

export const kickPlayerSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  targetPlayerId: z.string().trim().min(1),
})

export const endLobbySchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
})

export const sendLobbyChatMessageSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(300),
})
