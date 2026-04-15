import type { ClientToServerEvents, ServerToClientEvents } from '@poker/shared'
import type { Server } from 'socket.io'
import { GameService } from '../../services/game/game-service.js'
import { LobbyService } from '../../services/lobby-service.js'
import { SocketSessionStore } from '../socket-session-store.js'
import type { PokerSocket } from '../types.js'

export type PokerIoServer = Server<ClientToServerEvents, ServerToClientEvents>

export type SocketHandlerContext = {
  io: PokerIoServer
  socket: PokerSocket
  lobbyService: LobbyService
  gameService: GameService
  sessionStore: SocketSessionStore
}

export const emitError = (
  socket: PokerSocket,
  message: string,
  code?: string,
) => {
  socket.emit('error:message', { message, code })
}

export const normalizeRoomCode = (code: string) => code.trim().toUpperCase()

export const emitStateToLobby = async (
  io: PokerIoServer,
  roomCode: string,
  sockets: Set<string>,
  sessionStore: SocketSessionStore,
  gameService: GameService,
) => {
  for (const socketId of sockets) {
    const socket = io.sockets.sockets.get(socketId)

    if (!socket) {
      continue
    }

    const session = sessionStore.get(socketId)

    if (!session) {
      continue
    }

    try {
      const state = await gameService.getViewState({
        code: roomCode,
        sessionToken: session.sessionToken,
      })

      socket.emit('game:state', { state })
    } catch {
      // stale sockets ignored
    }
  }
}

export const emitStateForCode = async (
  io: PokerIoServer,
  code: string,
  sessionStore: SocketSessionStore,
  gameService: GameService,
) => {
  const roomCode = normalizeRoomCode(code)
  const room = io.sockets.adapter.rooms.get(roomCode)

  if (!room) {
    return
  }

  await emitStateToLobby(io, roomCode, room, sessionStore, gameService)
}

export const emitLobbyList = async (
  io: PokerIoServer,
  lobbyService: LobbyService,
  socket?: PokerSocket,
) => {
  const lobbies = await lobbyService.listLobbies()

  if (socket) {
    socket.emit('lobby:list', { lobbies })
    return
  }

  io.emit('lobby:list', { lobbies })
}

export const resolveCompletedTrickAfterDelay = async (
  io: PokerIoServer,
  code: string,
  stateAfterAction: {
    currentRound: { currentTrick: { plays: unknown[] } | null } | null
    players: unknown[]
  },
  sessionStore: SocketSessionStore,
  gameService: GameService,
) => {
  const roomCode = normalizeRoomCode(code)
  const room = io.sockets.adapter.rooms.get(roomCode)

  if (!room) {
    return
  }

  await emitStateToLobby(io, roomCode, room, sessionStore, gameService)

  const trick = stateAfterAction.currentRound?.currentTrick
  const playerCount = stateAfterAction.players.length
  const isTrickComplete = !!trick && trick.plays.length === playerCount

  if (!isTrickComplete) {
    return
  }

  await new Promise((resolve) => setTimeout(resolve, 3000))
  await gameService.resolvePendingCompletedTrick(code)
  await emitStateToLobby(io, roomCode, room, sessionStore, gameService)
}

export const runSocketAction = async <TInput>(
  socket: PokerSocket,
  payload: unknown,
  parse: (payload: unknown) => TInput,
  run: (input: TInput) => Promise<void>,
  fallbackErrorMessage: string,
) => {
  try {
    const input = parse(payload)
    await run(input)
  } catch (error) {
    emitError(
      socket,
      error instanceof Error ? error.message : fallbackErrorMessage,
    )
  }
}


