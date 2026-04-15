import type {
  GameConfig,
  LobbySummary,
  PlayerIdentity,
  PlayerLobbyState,
} from '@poker/shared'
import type { Lobby, Player, PlayerRole } from '../generated/prisma/client.js'
import { parseSpecialCardSettings } from './special-card-settings.js'

type LobbyWithPlayers = Lobby & {
  players: Player[]
}

const mapPlayerRole = (role: PlayerRole): 'host' | 'player' | 'spectator' =>
  role === 'HOST' ? 'host' : role === 'SPECTATOR' ? 'spectator' : 'player'

export const mapLobbyToSummary = (lobby: LobbyWithPlayers): LobbySummary => {
  const specialCardSettings = parseSpecialCardSettings(
    lobby.includedSpecialCards,
  )

  const config: GameConfig = {
    gameType: specialCardSettings.gameType,
    pokerVariant: specialCardSettings.pokerVariant,
    holdemLimitMode: specialCardSettings.holdemLimitMode,
    maxPlayers: specialCardSettings.maxPlayers,
    buyIn: specialCardSettings.buyIn,
    smallBlind: specialCardSettings.smallBlind,
    bigBlind: specialCardSettings.bigBlind,
    allowSpectatorChat: specialCardSettings.allowSpectatorChat,
    readLogEnabledByDefault: lobby.readLogEnabledByDefault,
    languageDefault: lobby.languageDefault === 'de' ? 'de' : 'en',
    includedSpecialCards: [],
  }

  const players = lobby.players.map((player) => {
    const identity: PlayerIdentity = {
      id: player.id,
      sessionToken: player.sessionToken,
      name: player.name,
      role: mapPlayerRole(player.role),
    }

    const state: PlayerLobbyState = {
      playerId: player.id,
      connected: player.connected,
      inGame: player.inGame,
      joinedAt: player.joinedAt.toISOString(),
      disconnectedAt: player.disconnectedAt?.toISOString() ?? null,
    }

    return {
      ...identity,
      ...state,
    }
  })

  return {
    code: lobby.code,
    hostPlayerId: lobby.hostPlayerId ?? '',
    status:
      lobby.status === 'WAITING'
        ? 'waiting'
        : lobby.status === 'RUNNING'
          ? 'running'
          : lobby.status === 'FINISHED'
            ? 'finished'
            : 'closed',
    hasPassword: false,
    config,
    players,
    chatMessages: [],
    createdAt: lobby.createdAt.toISOString(),
    updatedAt: lobby.updatedAt.toISOString(),
  }
}
