import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { env } from '../config/env.js'
import { PrismaClient } from '../generated/prisma/client.js'

declare global {
  var __pokerPrisma__: PrismaClient | undefined
  var __pokerPgPool__: Pool | undefined
}

const pool =
  globalThis.__pokerPgPool__ ??
  new Pool({
    connectionString: env.DATABASE_URL,
  })

const adapter = new PrismaPg(pool)

export const prisma =
  globalThis.__pokerPrisma__ ??
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pokerPgPool__ = pool
  globalThis.__pokerPrisma__ = prisma
}
