import { z } from 'zod'

export const credibilityVoteSchema = z.object({
  postId: z.string(),
  value: z.boolean(),
})

export const verificationVoteSchema = z.object({
  verificationEventId: z.string(),
  result: z.enum(['fulfilled', 'unfulfilled', 'partially_fulfilled']),
})

export type CredibilityVoteInput = z.infer<typeof credibilityVoteSchema>
export type VerificationVoteInput = z.infer<typeof verificationVoteSchema>
