import { z } from 'zod'

export const createCommentSchema = z.object({
  postId: z.string(),
  content: z.string().trim().min(1).max(1000),
  parentId: z.string().optional(),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
