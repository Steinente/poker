import { GameService } from '../../services/game/game-service.js'
import { LobbyService } from '../../services/lobby-service.js'
import { registerGameHandlers } from './game-handlers.js'
import { registerLobbyHandlers } from './lobby-handlers.js'
import { registerPlayerHandlers } from './player-handlers.js'
import { registerDeviceHandlers } from './device-handlers.js'
import { SocketSessionStore } from '../socket-session-store.js'
import {
  emitStateForCode,
  type PokerIoServer,
} from '../utils/socket-handler-utils.js'
import type { PokerSocket } from '../types.js'

export const registerHandlers = (
  io: PokerIoServer,
  socket: PokerSocket,
  lobbyService: LobbyService,
  gameService: GameService,
  sessionStore: SocketSessionStore,
) => {
  registerLobbyHandlers({ io, socket, lobbyService, gameService, sessionStore })
  registerGameHandlers({ io, socket, lobbyService, gameService, sessionStore })
  registerPlayerHandlers({
    io,
    socket,
    lobbyService,
    gameService,
    sessionStore,
  })
  registerDeviceHandlers({ io, socket, lobbyService, gameService, sessionStore })

  socket.on('disconnect', async () => {
    const session = sessionStore.get(socket.id)

    if (!session) {
      return
    }

    sessionStore.delete(socket.id)

    const updatedLobby = await lobbyService.markDisconnected({
      code: session.code,
      sessionToken: session.sessionToken,
    })

    if (!updatedLobby) {
      return
    }

    io.to(updatedLobby.code).emit('lobby:updated', { lobby: updatedLobby })

    if (updatedLobby.status === 'running') {
      await emitStateForCode(io, updatedLobby.code, sessionStore, gameService)
    }
  })
}

