import {
  allInSchema,
  callSchema,
  checkSchema,
  foldSchema,
  gameStartSchema,
  raiseSchema,
  sendChatMessageSchema,
} from '../schemas/game-schemas.js'
import {
  emitLobbyList,
  emitStateForCode,
  runSocketAction,
  type SocketHandlerContext,
} from '../utils/socket-handler-utils.js'

export const registerGameHandlers = ({
  io,
  socket,
  lobbyService,
  gameService,
  sessionStore,
}: SocketHandlerContext) => {
  socket.on('game:start', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      gameStartSchema.parse,
      async (input) => {
        const { lobby } = await gameService.startGame(input)

        io.to(lobby.code).emit('lobby:updated', { lobby })
        await emitLobbyList(io, lobbyService)
        await emitStateForCode(io, lobby.code, sessionStore, gameService)
      },
      'error.gameStartFailed',
    )
  })

  socket.on('game:fold', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      foldSchema.parse,
      async (input) => {
        const state = await gameService.fold(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
        if (state.phase === 'showdown') {
          await new Promise((resolve) => setTimeout(resolve, 3000))
          await gameService.advanceFromShowdown(input.code)
          await emitStateForCode(io, input.code, sessionStore, gameService)
        }
      },
      'error.actionFailed',
    )
  })

  socket.on('game:check', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      checkSchema.parse,
      async (input) => {
        const state = await gameService.check(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
        if (state.phase === 'showdown') {
          await new Promise((resolve) => setTimeout(resolve, 3000))
          await gameService.advanceFromShowdown(input.code)
          await emitStateForCode(io, input.code, sessionStore, gameService)
        }
      },
      'error.actionFailed',
    )
  })

  socket.on('game:call', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      callSchema.parse,
      async (input) => {
        const state = await gameService.call(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
        if (state.phase === 'showdown') {
          await new Promise((resolve) => setTimeout(resolve, 3000))
          await gameService.advanceFromShowdown(input.code)
          await emitStateForCode(io, input.code, sessionStore, gameService)
        }
      },
      'error.actionFailed',
    )
  })

  socket.on('game:raise', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      raiseSchema.parse,
      async (input) => {
        const state = await gameService.raise(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
        if (state.phase === 'showdown') {
          await new Promise((resolve) => setTimeout(resolve, 3000))
          await gameService.advanceFromShowdown(input.code)
          await emitStateForCode(io, input.code, sessionStore, gameService)
        }
      },
      'error.actionFailed',
    )
  })

  socket.on('game:allIn', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      allInSchema.parse,
      async (input) => {
        const state = await gameService.allIn(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
        if (state.phase === 'showdown') {
          await new Promise((resolve) => setTimeout(resolve, 3000))
          await gameService.advanceFromShowdown(input.code)
          await emitStateForCode(io, input.code, sessionStore, gameService)
        }
      },
      'error.actionFailed',
    )
  })

  socket.on('game:sendChatMessage', async (payload) => {
    await runSocketAction(
      socket,
      payload,
      sendChatMessageSchema.parse,
      async (input) => {
        await gameService.sendChatMessage(input)
        await emitStateForCode(io, input.code, sessionStore, gameService)
      },
      'error.chatMessageFailed',
    )
  })
}
