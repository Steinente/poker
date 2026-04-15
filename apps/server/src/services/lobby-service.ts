import type { GameChatMessage, GameConfig, LobbySummary } from '@poker/shared'
import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { prisma } from '../db/prisma.js'
import { LobbyStatus, PlayerRole } from '../generated/prisma/client.js'
import { defaultGameConfig } from '../utils/default-game-config.js'
import {
  clearLobbyChatMessages,
  getLobbyChatMessages,
  LOBBY_CHAT_MESSAGE_LIMIT,
  setLobbyChatMessages,
} from './lobby-chat-store.js'
import { mapLobbyToSummary } from './lobby-mapper.js'
import {
  parseSpecialCardSettings,
  serializeSpecialCardSettings,
} from './special-card-settings.js'

const normalizeCode = (code: string) => code.trim().toUpperCase()

const CODE_LENGTH = 6
const lobbyPasswordHashes = new Map<string, string>()

const normalizePassword = (password: string | undefined) =>
  password?.trim() ?? ''
const hashPassword = (password: string) =>
  crypto.createHash('sha256').update(password).digest('hex')
const now = () => new Date()
type ClosableLobby = { id: string; code: string }
type LobbyForSummary = Parameters<typeof mapLobbyToSummary>[0]
type LobbyWithOrderedPlayers = NonNullable<
  Awaited<ReturnType<typeof loadLobbyByCodeWithPlayers>>
>

const closableLobbySelect = {
  id: true,
  code: true,
} as const

const includePlayersByJoinOrder = () => ({
  players: {
    orderBy: {
      joinedAt: 'asc' as const,
    },
  },
})

const includePlayers = () => ({
  players: true as const,
})

const reconnectPlayerData = (playerName: string, inGame: boolean) => ({
  connected: true,
  inGame,
  name: playerName.trim(),
  disconnectedAt: null,
})

const disconnectPlayerData = (disconnectedAt: Date) => ({
  connected: false,
  inGame: false,
  disconnectedAt,
})

const getHostDisconnectedLobbyData = (disconnectedAt: Date) => ({
  hostDisconnectedAt: disconnectedAt,
  hostDisconnectDeadline: new Date(
    disconnectedAt.getTime() + env.HOST_DISCONNECT_TIMEOUT_MS,
  ),
})

const getHostReconnectedLobbyData = () => ({
  hostDisconnectedAt: null,
  hostDisconnectDeadline: null,
})

const findPlayerBySessionToken = <T extends { sessionToken: string }>(
  players: T[],
  sessionToken: string,
) => players.find((entry) => entry.sessionToken === sessionToken)

const validateLobbyPassword = (code: string, password?: string) => {
  const requiredHash = lobbyPasswordHashes.get(normalizeCode(code))

  if (!requiredHash) {
    return
  }

  const normalizedPassword = normalizePassword(password)

  if (!normalizedPassword) {
    throw new Error('error.lobbyPasswordRequired')
  }

  if (hashPassword(normalizedPassword) !== requiredHash) {
    throw new Error('error.lobbyPasswordInvalid')
  }
}

const getLastKnownReadLogEnabled = async (
  sessionToken: string,
): Promise<boolean> => {
  const previousPlayer = await prisma.player.findFirst({
    where: { sessionToken },
    orderBy: { updatedAt: 'desc' },
  })

  return previousPlayer?.readLogEnabled ?? false
}

const getLastKnownHostedConfig = async (
  sessionToken: string,
): Promise<Partial<GameConfig>> => {
  const previousLobby = await prisma.lobby.findFirst({
    where: {
      players: {
        some: {
          sessionToken,
          role: PlayerRole.HOST,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  if (!previousLobby) {
    return {}
  }

  return {
    readLogEnabledByDefault: previousLobby.readLogEnabledByDefault,
    languageDefault: previousLobby.languageDefault === 'de' ? 'de' : 'en',
    ...parseSpecialCardSettings(previousLobby.includedSpecialCards),
  }
}

const loadLobbyByCodeWithPlayers = (code: string) =>
  prisma.lobby.findUnique({
    where: { code: normalizeCode(code) },
    include: includePlayersByJoinOrder(),
  })

const loadLobbyByCodeWithUnorderedPlayers = (code: string) =>
  prisma.lobby.findUnique({
    where: { code: normalizeCode(code) },
    include: includePlayers(),
  })

const loadLobbyByIdWithPlayersOrThrow = (id: string) =>
  prisma.lobby.findUniqueOrThrow({
    where: { id },
    include: includePlayersByJoinOrder(),
  })

const loadJoinableLobbiesWithPlayers = () =>
  prisma.lobby.findMany({
    where: {
      status: { in: [LobbyStatus.WAITING, LobbyStatus.RUNNING] },
    },
    include: {
      ...includePlayersByJoinOrder(),
      gameState: {
        select: {
          createdAt: true,
        },
      },
    },
  })

type JoinableLobby = Awaited<
  ReturnType<typeof loadJoinableLobbiesWithPlayers>
>[number]

const activePlayersCount = (lobby: JoinableLobby) =>
  lobby.players.filter(
    (player) => player.role !== PlayerRole.SPECTATOR && !player.inGame,
  ).length

const runningStartTime = (lobby: JoinableLobby) =>
  (lobby.gameState?.createdAt ?? lobby.updatedAt).getTime()

const compareJoinableLobbies = (a: JoinableLobby, b: JoinableLobby) => {
  const aWaiting = a.status === LobbyStatus.WAITING
  const bWaiting = b.status === LobbyStatus.WAITING

  // Waiting lobbies are always shown first.
  if (aWaiting !== bWaiting) {
    return aWaiting ? -1 : 1
  }

  if (aWaiting) {
    // Fewer active players first.
    const byPlayers = activePlayersCount(a) - activePlayersCount(b)
    if (byPlayers !== 0) {
      return byPlayers
    }

    // If player count is equal, newest lobby first.
    return b.createdAt.getTime() - a.createdAt.getTime()
  }

  // Running lobbies: newest started game first (least time elapsed).
  const byStartTime = runningStartTime(b) - runningStartTime(a)
  if (byStartTime !== 0) {
    return byStartTime
  }

  return b.createdAt.getTime() - a.createdAt.getTime()
}

const generateLobbyCode = async (): Promise<string> => {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  while (true) {
    let code = ''
    for (let i = 0; i < CODE_LENGTH; i++) {
      const index = Math.floor(Math.random() * CHARS.length)
      code += CHARS[index]
    }

    const existing = await prisma.lobby.findUnique({
      where: { code },
    })

    if (!existing) {
      return code
    }
  }
}

const withPasswordFlag = (summary: LobbySummary): LobbySummary => ({
  ...summary,
  hasPassword: lobbyPasswordHashes.has(summary.code),
})

export class LobbyService {
  private appendLobbyChatMessage(code: string, message: GameChatMessage) {
    const chatMessages = getLobbyChatMessages(code)

    chatMessages.push(message)

    if (chatMessages.length > LOBBY_CHAT_MESSAGE_LIMIT) {
      chatMessages.splice(0, chatMessages.length - LOBBY_CHAT_MESSAGE_LIMIT)
    }

    setLobbyChatMessages(code, chatMessages)
  }

  private appendLobbySystemMessage(input: {
    code: string
    messageKey: string
    messageParams?: Record<string, string | number | boolean | null>
  }) {
    this.appendLobbyChatMessage(input.code, {
      id: crypto.randomUUID(),
      createdAt: now().toISOString(),
      senderPlayerId: 'system',
      senderName: 'System',
      senderRole: 'system',
      text: '',
      systemMessageKey: input.messageKey,
      systemMessageParams: input.messageParams,
    })
  }

  private toLobbySummary(lobby: LobbyForSummary): LobbySummary {
    const summary = withPasswordFlag(mapLobbyToSummary(lobby))

    return {
      ...summary,
      chatMessages: getLobbyChatMessages(summary.code),
    }
  }

  private async refreshLobbySummary(lobbyId: string): Promise<LobbySummary> {
    const refreshed = await loadLobbyByIdWithPlayersOrThrow(lobbyId)
    return this.toLobbySummary(refreshed)
  }

  private async upsertJoinedPlayer(input: {
    lobby: LobbyWithOrderedPlayers
    playerName: string
    sessionToken: string
    role: PlayerRole
    inGame: boolean
  }): Promise<string> {
    const existingByToken = findPlayerBySessionToken(
      input.lobby.players,
      input.sessionToken,
    )

    if (existingByToken) {
      const updated = await prisma.player.update({
        where: { id: existingByToken.id },
        data: reconnectPlayerData(input.playerName, input.inGame),
      })

      return updated.id
    }

    const readLogEnabledFromPrevious = await getLastKnownReadLogEnabled(
      input.sessionToken,
    )

    const created = await prisma.player.create({
      data: {
        lobbyId: input.lobby.id,
        name: input.playerName.trim(),
        sessionToken: input.sessionToken,
        role: input.role,
        connected: true,
        inGame: input.inGame,
        readLogEnabled: readLogEnabledFromPrevious,
      },
    })

    return created.id
  }

  private async closeLobbies(lobbies: ClosableLobby[]): Promise<string[]> {
    if (!lobbies.length) {
      return []
    }

    const codes = lobbies.map((entry) => entry.code)

    for (const code of codes) {
      lobbyPasswordHashes.delete(code)
      clearLobbyChatMessages(code)
    }

    await prisma.lobby.updateMany({
      where: {
        id: {
          in: lobbies.map((entry) => entry.id),
        },
      },
      data: {
        status: LobbyStatus.CLOSED,
      },
    })

    return codes
  }

  async createLobby(input: {
    playerName: string
    sessionToken: string
    password?: string
    config?: Partial<GameConfig>
  }): Promise<{ lobby: LobbySummary; playerId: string }> {
    const lastKnownHostedConfig = await getLastKnownHostedConfig(
      input.sessionToken,
    )

    const mergedConfig = {
      ...defaultGameConfig,
      ...lastKnownHostedConfig,
      ...input.config,
    }

    const code = await generateLobbyCode()
    const password = normalizePassword(input.password)

    const readLogEnabledFromPrevious = await getLastKnownReadLogEnabled(
      input.sessionToken,
    )

    const created = await prisma.lobby.create({
      data: {
        code,
        status: LobbyStatus.WAITING,
        predictionVisibility: 'OPEN',
        openPredictionRestriction: 'NONE',
        readLogEnabledByDefault: mergedConfig.readLogEnabledByDefault,
        languageDefault: mergedConfig.languageDefault,
        includedSpecialCards: serializeSpecialCardSettings({
          allowSpectatorChat: mergedConfig.allowSpectatorChat,
          gameType: mergedConfig.gameType,
          pokerVariant: mergedConfig.pokerVariant,
          holdemLimitMode: mergedConfig.holdemLimitMode,
          maxPlayers: mergedConfig.maxPlayers,
          buyIn: mergedConfig.buyIn,
          smallBlind: mergedConfig.smallBlind,
          bigBlind: mergedConfig.bigBlind,
        }),
        players: {
          create: {
            name: input.playerName.trim(),
            sessionToken: input.sessionToken,
            role: PlayerRole.HOST,
            connected: true,
            inGame: false,
            readLogEnabled: readLogEnabledFromPrevious,
          },
        },
      },
      include: includePlayersByJoinOrder(),
    })

    clearLobbyChatMessages(created.code)

    const hostPlayer = created.players[0]

    const lobby = await prisma.lobby.update({
      where: { id: created.id },
      data: {
        hostPlayerId: hostPlayer.id,
      },
      include: includePlayersByJoinOrder(),
    })

    if (password) {
      lobbyPasswordHashes.set(code, hashPassword(password))
    } else {
      lobbyPasswordHashes.delete(code)
    }

    this.appendLobbySystemMessage({
      code: lobby.code,
      messageKey: 'chat.system.hostOpenedLobby',
      messageParams: { name: hostPlayer.name },
    })

    return {
      lobby: this.toLobbySummary(lobby),
      playerId: hostPlayer.id,
    }
  }

  async joinLobby(input: {
    code: string
    playerName: string
    sessionToken: string
    password?: string
  }): Promise<{ lobby: LobbySummary; playerId: string }> {
    const lobby = await loadLobbyByCodeWithPlayers(input.code)

    if (!lobby || lobby.status === LobbyStatus.CLOSED) {
      throw new Error('error.lobbyNotFound')
    }

    if (lobby.status !== LobbyStatus.WAITING) {
      throw new Error('error.lobbyNotAccepting')
    }

    validateLobbyPassword(input.code, input.password)

    const specialCardSettings = parseSpecialCardSettings(
      lobby.includedSpecialCards,
    )

    if (lobby.players.length >= specialCardSettings.maxPlayers) {
      throw new Error('error.lobbyFull')
    }

    const hadExistingPlayer =
      findPlayerBySessionToken(lobby.players, input.sessionToken) !== undefined

    const playerId = await this.upsertJoinedPlayer({
      lobby,
      playerName: input.playerName,
      sessionToken: input.sessionToken,
      role: PlayerRole.PLAYER,
      inGame: false,
    })

    if (!hadExistingPlayer) {
      this.appendLobbySystemMessage({
        code: lobby.code,
        messageKey: 'chat.system.playerJoinedLobby',
        messageParams: { name: input.playerName.trim() },
      })
    }

    return {
      lobby: await this.refreshLobbySummary(lobby.id),
      playerId,
    }
  }

  async spectateLobby(input: {
    code: string
    playerName: string
    sessionToken: string
    password?: string
  }): Promise<{
    lobby: LobbySummary
    playerId: string
    announceInGameSpectatorJoin: boolean
  }> {
    const lobby = await loadLobbyByCodeWithPlayers(input.code)

    if (!lobby || lobby.status === LobbyStatus.CLOSED) {
      throw new Error('error.lobbyNotFound')
    }

    if (lobby.status !== LobbyStatus.RUNNING) {
      throw new Error('error.lobbyNotRunning')
    }

    validateLobbyPassword(input.code, input.password)

    const hadExistingPlayer =
      findPlayerBySessionToken(lobby.players, input.sessionToken) !== undefined

    const playerId = await this.upsertJoinedPlayer({
      lobby,
      playerName: input.playerName,
      sessionToken: input.sessionToken,
      role: PlayerRole.SPECTATOR,
      inGame: true,
    })

    if (!hadExistingPlayer) {
      this.appendLobbySystemMessage({
        code: lobby.code,
        messageKey: 'chat.system.spectatorJoinedLobby',
        messageParams: { name: input.playerName.trim() },
      })
    }

    return {
      lobby: await this.refreshLobbySummary(lobby.id),
      playerId,
      announceInGameSpectatorJoin: !hadExistingPlayer,
    }
  }

  async listLobbies(): Promise<LobbySummary[]> {
    const lobbies = await loadJoinableLobbiesWithPlayers()

    lobbies.sort(compareJoinableLobbies)

    return lobbies.map((lobby) => this.toLobbySummary(lobby))
  }

  async reconnectLobby(input: {
    code: string
    sessionToken: string
  }): Promise<{ lobby: LobbySummary; playerId: string }> {
    const lobby = await loadLobbyByCodeWithPlayers(input.code)

    if (!lobby || lobby.status === LobbyStatus.CLOSED) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      throw new Error('error.lobbyNotFound')
    }

    await prisma.player.update({
      where: { id: player.id },
      data: {
        connected: true,
        inGame:
          lobby.status === LobbyStatus.RUNNING &&
          player.role !== PlayerRole.SPECTATOR,
        disconnectedAt: null,
      },
    })

    const data =
      player.id === lobby.hostPlayerId ? getHostReconnectedLobbyData() : {}

    const refreshed = await prisma.lobby.update({
      where: { id: lobby.id },
      data,
      include: includePlayersByJoinOrder(),
    })

    return {
      lobby: this.toLobbySummary(refreshed),
      playerId: player.id,
    }
  }

  async reopenFinishedLobby(input: {
    code: string
    sessionToken: string
  }): Promise<LobbySummary> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby || lobby.status === LobbyStatus.CLOSED) {
      throw new Error('error.lobbyNotFound')
    }

    if (lobby.status !== LobbyStatus.FINISHED) {
      throw new Error('error.lobbyNotAccepting')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player || player.id !== lobby.hostPlayerId) {
      throw new Error('error.onlyHostCanStart')
    }

    await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        status: LobbyStatus.WAITING,
        hostDisconnectedAt: null,
        hostDisconnectDeadline: null,
      },
    })

    await prisma.player.update({
      where: { id: player.id },
      data: {
        connected: true,
        inGame: false,
        disconnectedAt: null,
      },
    })

    await prisma.player.updateMany({
      where: {
        lobbyId: lobby.id,
        id: {
          not: player.id,
        },
      },
      data: {
        inGame: true,
      },
    })

    return this.refreshLobbySummary(lobby.id)
  }

  async joinReplayLobby(input: {
    code: string
    sessionToken: string
  }): Promise<LobbySummary> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby || lobby.status === LobbyStatus.CLOSED) {
      throw new Error('error.lobbyNotFound')
    }

    if (lobby.status !== LobbyStatus.WAITING || !lobby.hostPlayerId) {
      throw new Error('error.lobbyNotAccepting')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      throw new Error('error.playerNotFound')
    }

    if (player.role === PlayerRole.SPECTATOR) {
      throw new Error('error.lobbyNotAccepting')
    }

    await prisma.player.update({
      where: { id: player.id },
      data: {
        connected: true,
        inGame: false,
        disconnectedAt: null,
      },
    })

    return this.refreshLobbySummary(lobby.id)
  }

  async leaveLobby(input: {
    code: string
    sessionToken: string
  }): Promise<LobbySummary> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      throw new Error('error.playerNotFound')
    }

    const isHost = player.id === lobby.hostPlayerId

    if (isHost && lobby.status !== LobbyStatus.FINISHED) {
      throw new Error('error.hostCannotLeave')
    }

    if (isHost) {
      lobbyPasswordHashes.delete(lobby.code)

      await prisma.lobby.update({
        where: { id: lobby.id },
        data: {
          hostPlayerId: null,
          hostDisconnectedAt: null,
          hostDisconnectDeadline: null,
        },
      })

      await prisma.player.delete({
        where: { id: player.id },
      })

      return this.refreshLobbySummary(lobby.id)
    }

    await prisma.player.delete({
      where: { id: player.id },
    })

    this.appendLobbySystemMessage({
      code: lobby.code,
      messageKey: 'chat.system.playerLeftLobby',
      messageParams: { name: player.name },
    })

    return this.refreshLobbySummary(lobby.id)
  }

  async updateConfig(input: {
    code: string
    sessionToken: string
    config: Partial<GameConfig>
  }): Promise<LobbySummary> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player || player.id !== lobby.hostPlayerId) {
      throw new Error('error.onlyHostCanUpdateConfig')
    }

    const previousSpecialCardSettings = parseSpecialCardSettings(
      lobby.includedSpecialCards,
    )
    const nextVariant =
      input.config.pokerVariant ?? previousSpecialCardSettings.pokerVariant
    const nextHoldemLimitMode =
      nextVariant === 'texasHoldem'
        ? input.config.holdemLimitMode === 'fixedLimit' ||
          input.config.holdemLimitMode === 'potLimit' ||
          input.config.holdemLimitMode === 'noLimit'
          ? input.config.holdemLimitMode
          : previousSpecialCardSettings.holdemLimitMode
        : 'noLimit'

    const updated = await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        readLogEnabledByDefault: input.config.readLogEnabledByDefault,
        languageDefault: input.config.languageDefault,
        includedSpecialCards:
          typeof input.config.allowSpectatorChat === 'boolean' ||
          typeof input.config.maxPlayers === 'number' ||
          typeof input.config.buyIn === 'number' ||
          typeof input.config.smallBlind === 'number' ||
          typeof input.config.bigBlind === 'number' ||
          input.config.holdemLimitMode !== undefined ||
          input.config.gameType === 'poker' ||
          input.config.pokerVariant === 'texasHoldem'
            ? serializeSpecialCardSettings({
                allowSpectatorChat:
                  input.config.allowSpectatorChat ??
                  previousSpecialCardSettings.allowSpectatorChat,
                gameType:
                  input.config.gameType ?? previousSpecialCardSettings.gameType,
                pokerVariant: nextVariant,
                holdemLimitMode: nextHoldemLimitMode,
                maxPlayers:
                  input.config.maxPlayers ??
                  previousSpecialCardSettings.maxPlayers,
                buyIn: input.config.buyIn ?? previousSpecialCardSettings.buyIn,
                smallBlind:
                  input.config.smallBlind ??
                  previousSpecialCardSettings.smallBlind,
                bigBlind:
                  input.config.bigBlind ?? previousSpecialCardSettings.bigBlind,
              })
            : undefined,
      },
      include: includePlayersByJoinOrder(),
    })

    return this.toLobbySummary(updated)
  }

  async kickPlayer(input: {
    code: string
    sessionToken: string
    targetPlayerId: string
  }): Promise<{ lobby: LobbySummary; kickedSessionToken: string }> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player || player.id !== lobby.hostPlayerId) {
      throw new Error('error.onlyHostCanKick')
    }

    if (input.targetPlayerId === lobby.hostPlayerId) {
      throw new Error('error.hostCannotKickSelf')
    }

    const targetPlayer = lobby.players.find(
      (entry) => entry.id === input.targetPlayerId,
    )

    if (!targetPlayer) {
      throw new Error('error.targetPlayerNotFound')
    }

    await prisma.player.delete({
      where: { id: input.targetPlayerId },
    })

    return {
      lobby: await this.refreshLobbySummary(lobby.id),
      kickedSessionToken: targetPlayer.sessionToken,
    }
  }

  async endLobby(input: { code: string; sessionToken: string }) {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player || player.id !== lobby.hostPlayerId) {
      throw new Error('error.onlyHostCanCloseLobby')
    }

    await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        status: LobbyStatus.CLOSED,
      },
    })

    await prisma.player.deleteMany({
      where: {
        lobbyId: lobby.id,
      },
    })

    lobbyPasswordHashes.delete(lobby.code)
    clearLobbyChatMessages(lobby.code)

    return lobby.code
  }

  async sendChatMessage(input: {
    code: string
    sessionToken: string
    text: string
  }): Promise<LobbySummary> {
    const lobby = await loadLobbyByCodeWithPlayers(input.code)

    if (!lobby || lobby.status === LobbyStatus.CLOSED) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      throw new Error('error.playerNotFound')
    }

    const text = input.text.trim()

    if (!text.length) {
      throw new Error('error.chatMessageEmpty')
    }

    if (text.length > 300) {
      throw new Error('error.chatMessageTooLong')
    }

    if (
      player.role === PlayerRole.SPECTATOR &&
      !parseSpecialCardSettings(lobby.includedSpecialCards).allowSpectatorChat
    ) {
      throw new Error('error.spectatorChatDisabled')
    }

    const senderRole: 'host' | 'player' | 'spectator' =
      player.role === PlayerRole.HOST
        ? 'host'
        : player.role === PlayerRole.SPECTATOR
          ? 'spectator'
          : 'player'

    this.appendLobbyChatMessage(lobby.code, {
      id: crypto.randomUUID(),
      createdAt: now().toISOString(),
      senderPlayerId: player.id,
      senderName: player.name,
      senderRole,
      text,
    })

    return this.toLobbySummary(lobby)
  }

  async markDisconnected(input: {
    code: string
    sessionToken: string
  }): Promise<LobbySummary | null> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      return null
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      return null
    }

    const disconnectedAt = now()

    await prisma.player.update({
      where: { id: player.id },
      data: disconnectPlayerData(disconnectedAt),
    })

    const data =
      player.id === lobby.hostPlayerId && lobby.status !== LobbyStatus.FINISHED
        ? getHostDisconnectedLobbyData(disconnectedAt)
        : {}

    const refreshed = await prisma.lobby.update({
      where: { id: lobby.id },
      data,
      include: includePlayersByJoinOrder(),
    })

    return this.toLobbySummary(refreshed)
  }

  async setPlayerInGame(input: {
    code: string
    sessionToken: string
    inGame: boolean
  }): Promise<void> {
    const lobby = await loadLobbyByCodeWithUnorderedPlayers(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = findPlayerBySessionToken(lobby.players, input.sessionToken)

    if (!player) {
      throw new Error('error.playerNotFound')
    }

    if (player.role === PlayerRole.SPECTATOR) {
      return
    }

    await prisma.player.update({
      where: { id: player.id },
      data: {
        inGame: input.inGame,
      },
    })
  }

  async closeExpiredHostLobbies(): Promise<string[]> {
    const current = now()

    const expired = await prisma.lobby.findMany({
      where: {
        status: {
          in: [LobbyStatus.WAITING, LobbyStatus.RUNNING],
        },
        hostDisconnectDeadline: {
          not: null,
          lte: current,
        },
      },
      select: closableLobbySelect,
    })

    return this.closeLobbies(expired)
  }

  async closeInactiveRunningGames(): Promise<string[]> {
    const cutoff = new Date(Date.now() - env.LOBBY_INACTIVITY_TIMEOUT_MS)

    const expired = await prisma.lobby.findMany({
      where: {
        status: LobbyStatus.RUNNING,
        gameState: {
          is: {
            updatedAt: {
              lte: cutoff,
            },
          },
        },
      },
      select: closableLobbySelect,
    })

    return this.closeLobbies(expired)
  }

  async closeInactiveWaitingLobbies(): Promise<string[]> {
    const cutoff = new Date(Date.now() - env.LOBBY_INACTIVITY_TIMEOUT_MS)

    const expired = await prisma.lobby.findMany({
      where: {
        status: LobbyStatus.WAITING,
        updatedAt: {
          lte: cutoff,
        },
      },
      select: closableLobbySelect,
    })

    return this.closeLobbies(expired)
  }
}
