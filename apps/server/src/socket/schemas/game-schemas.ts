import { z } from 'zod'

export const gameStartSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
})

export const foldSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
})

export const checkSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
})

export const callSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  amount: z.number().int().positive().optional(),
})

export const raiseSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  amount: z.number().int().positive(),
})

export const allInSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
})

export const sendChatMessageSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(300),
})
