import { z } from 'zod'

export const postStatusSchema = z.enum([
  'pending',
  'verifying',
  'fulfilled',
  'unfulfilled',
  'partially_fulfilled',
  'expired',
])

export const postTagSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9-]+$/i, 'Tags can contain letters, numbers, and hyphens only.')

export const createPostSchema = z.object({
  title: z.string().trim().min(8).max(120),
  description: z.string().trim().min(30).max(5000),
  sourceName: z.string().trim().min(2).max(120),
  predictionContent: z.string().trim().min(8).max(280),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), {
      message: 'Source link must start with http:// or https://.',
    }),
  tags: z.array(postTagSchema).min(1).max(5).default([]),
})

export const postSupplementSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().trim().min(5).max(2000),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type PostStatus = z.infer<typeof postStatusSchema>
