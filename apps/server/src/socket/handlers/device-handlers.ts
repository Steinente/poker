import { z } from 'zod'
import { prisma } from '../../db/prisma.js'
import { DeviceSwitchService } from '../../services/device-switch-service.js'
import {
  emitError,
  emitStateForCode,
  type SocketHandlerContext,
} from '../utils/socket-handler-utils.js'

type PendingSwitchRequest = {
  requestSocketId: string
  lobbyCode: string
  oldSessionToken: string
}

const pendingSwitchRequests = new Map<string, PendingSwitchRequest>()

const deviceGenerateSwitchTokenSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1),
})

const deviceCompleteSwitchSchema = z.object({
  token: z.string().trim().min(1),
  newSessionToken: z.string().trim().min(1),
})

const deviceConfirmSwitchSchema = z.object({
  token: z.string().trim().min(1),
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1),
  confirmed: z.boolean(),
})

export const registerDeviceHandlers = ({
  io,
  socket,
  lobbyService,
  gameService,
  sessionStore,
}: SocketHandlerContext) => {
  socket.on('device:generateSwitchToken', async (payload) => {
    try {
      const input = deviceGenerateSwitchTokenSchema.parse(payload)

      const lobby = await prisma.lobby.findFirst({
        where: { code: input.code.trim().toUpperCase() },
        include: {
          players: {
            where: { sessionToken: input.sessionToken },
          },
        },
      })

      if (!lobby || lobby.players.length === 0) {
        throw new Error('error.playerNotFound')
      }

      const player = lobby.players[0]
      const tokenResponse = await DeviceSwitchService.generateSwitchToken(
        player.id,
        input.sessionToken,
        lobby.code,
      )

      socket.emit('device:switchTokenGenerated', tokenResponse)
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.deviceSwitchFailed',
      )
    }
  })

  socket.on('device:completeSwitch', async (payload) => {
    try {
      const input = deviceCompleteSwitchSchema.parse(payload)

      const switchToken = await DeviceSwitchService.validateAndGetToken(
        input.token,
      )

      const sourceSocketIds = sessionStore.findSocketIdsBySessionToken(
        switchToken.lobbyCode,
        switchToken.sessionToken,
      )

      if (!sourceSocketIds.length) {
        throw new Error('error.deviceSwitchSourceUnavailable')
      }

      await DeviceSwitchService.reserveSwitchToken(
        input.token,
        input.newSessionToken,
      )

      const existingPending = pendingSwitchRequests.get(input.token)
      if (existingPending) {
        const existingSocket = io.sockets.sockets.get(
          existingPending.requestSocketId,
        )
        existingSocket?.emit('device:switchCompleted', {
          success: false,
          reason: 'superseded',
        })
      }

      pendingSwitchRequests.set(input.token, {
        requestSocketId: socket.id,
        lobbyCode: switchToken.lobbyCode,
        oldSessionToken: switchToken.sessionToken,
      })

      for (const sourceSocketId of sourceSocketIds) {
        const sourceSocket = io.sockets.sockets.get(sourceSocketId)

        if (!sourceSocket) {
          continue
        }

        sourceSocket.emit('device:requestConfirmation', {
          token: input.token,
          code: switchToken.lobbyCode,
          message: 'deviceSwitch.confirmMessage',
        })
      }
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.deviceSwitchFailed',
      )
    }
  })

  socket.on('device:confirmSwitch', async (payload) => {
    try {
      const input = deviceConfirmSwitchSchema.parse(payload)
      const pendingRequest = pendingSwitchRequests.get(input.token)

      if (!pendingRequest) {
        throw new Error('error.deviceSwitchNotPending')
      }

      if (
        pendingRequest.lobbyCode !== input.code.trim().toUpperCase() ||
        pendingRequest.oldSessionToken !== input.sessionToken
      ) {
        throw new Error('error.deviceSwitchMismatch')
      }

      const requestSocket = io.sockets.sockets.get(
        pendingRequest.requestSocketId,
      )

      if (!requestSocket) {
        pendingSwitchRequests.delete(input.token)
        throw new Error('error.deviceSwitchTargetUnavailable')
      }

      if (!input.confirmed) {
        requestSocket.emit('device:switchCompleted', { success: false })
        pendingSwitchRequests.delete(input.token)
        return
      }

      const switchToken = await DeviceSwitchService.validateAndGetToken(
        input.token,
      )

      if (!switchToken.newSessionToken) {
        throw new Error('error.deviceSwitchNotPrepared')
      }

      await prisma.player.update({
        where: { id: switchToken.playerId },
        data: {
          sessionToken: switchToken.newSessionToken,
          connected: true,
          disconnectedAt: null,
        },
      })

      const reconnectResult = await lobbyService.reconnectLobby({
        code: switchToken.lobbyCode,
        sessionToken: switchToken.newSessionToken,
      })

      sessionStore.set(requestSocket.id, {
        code: switchToken.lobbyCode,
        sessionToken: switchToken.newSessionToken,
      })

      await requestSocket.join(switchToken.lobbyCode)

      requestSocket.emit('lobby:joined', {
        lobby: reconnectResult.lobby,
        playerId: reconnectResult.playerId,
      })
      requestSocket.emit('device:switchCompleted', { success: true })

      io.to(switchToken.lobbyCode).emit('lobby:updated', {
        lobby: reconnectResult.lobby,
      })

      if (
        reconnectResult.lobby.status === 'running' ||
        reconnectResult.lobby.status === 'finished'
      ) {
        await emitStateForCode(
          io,
          switchToken.lobbyCode,
          sessionStore,
          gameService,
        )
      }

      const sourceSocketIds = sessionStore.findSocketIdsBySessionToken(
        switchToken.lobbyCode,
        switchToken.sessionToken,
      )

      for (const sourceSocketId of sourceSocketIds) {
        const sourceSocket = io.sockets.sockets.get(sourceSocketId)
        sessionStore.delete(sourceSocketId)

        if (!sourceSocket) {
          continue
        }

        sourceSocket.emit('device:disconnected', {
          reason: 'deviceSwitch',
        })
        sourceSocket.disconnect(true)
      }

      await DeviceSwitchService.markTokenUsed(input.token)
      pendingSwitchRequests.delete(input.token)
    } catch (error) {
      emitError(
        socket,
        error instanceof Error ? error.message : 'error.deviceSwitchFailed',
      )
    }
  })
}
