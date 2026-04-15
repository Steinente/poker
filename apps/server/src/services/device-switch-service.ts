import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { prisma } from '../db/prisma.js'

const SWITCH_TOKEN_LENGTH = 16
const SWITCH_TOKEN_EXPIRY_MINUTES = 5

export class DeviceSwitchService {
  static async generateSwitchToken(
    playerId: string,
    sessionToken: string,
    lobbyCode: string,
  ) {
    const token = crypto.randomBytes(SWITCH_TOKEN_LENGTH).toString('hex')
    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + SWITCH_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    )

    await prisma.deviceSwitchToken.deleteMany({
      where: {
        playerId,
        usedAt: null,
      },
    })

    await prisma.deviceSwitchToken.create({
      data: {
        token,
        playerId,
        sessionToken,
        lobbyCode,
        expiresAt,
      },
    })

    const url = new URL(
      `/join/${encodeURIComponent(lobbyCode)}`,
      env.CLIENT_UI_URL,
    )
    url.searchParams.set('deviceSwitch', token)

    return {
      token,
      url: url.toString(),
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: SWITCH_TOKEN_EXPIRY_MINUTES * 60,
    }
  }

  static async validateAndGetToken(token: string) {
    const switchToken = await prisma.deviceSwitchToken.findUnique({
      where: { token },
    })

    if (!switchToken) {
      throw new Error('error.deviceSwitchInvalidToken')
    }

    if (new Date() > switchToken.expiresAt) {
      await prisma.deviceSwitchToken.delete({ where: { id: switchToken.id } })
      throw new Error('error.deviceSwitchExpired')
    }

    if (switchToken.usedAt) {
      throw new Error('error.deviceSwitchAlreadyUsed')
    }

    return switchToken
  }

  static async reserveSwitchToken(token: string, newSessionToken: string) {
    const switchToken = await this.validateAndGetToken(token)

    return prisma.deviceSwitchToken.update({
      where: { id: switchToken.id },
      data: {
        newSessionToken,
      },
    })
  }

  static async markTokenUsed(token: string) {
    return prisma.deviceSwitchToken.update({
      where: { token },
      data: {
        usedAt: new Date(),
      },
    })
  }

  static async cleanupExpiredTokens(lobbyCode?: string) {
    const where = {
      expiresAt: { lt: new Date() },
      ...(lobbyCode && { lobbyCode }),
    }

    await prisma.deviceSwitchToken.deleteMany({ where })
  }

  static async cleanupTokensForLobby(lobbyCode: string) {
    await prisma.deviceSwitchToken.deleteMany({
      where: { lobbyCode },
    })
  }
}
