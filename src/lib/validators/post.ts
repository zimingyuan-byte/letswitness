import { z } from 'zod'

export const postStatusSchema = z.enum([
  'draft',
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

const createBasePostSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  predictionContent: z.string().trim().min(1),
  sourceUrl: z
    .string()
    .trim()
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), {
      message: 'Source link must start with http:// or https://.',
    }),
  tags: z.array(postTagSchema).min(1).max(5).default([]),
})

export const createTrackingSchema = createBasePostSchema.extend({
  sourceName: z.string().trim().min(1),
})

export const createPredictionSchema = createBasePostSchema

export const postTypeSchema = z.enum(['tracking', 'prediction'])

export const postSupplementSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().trim().min(5).max(2000),
})

export type CreateTrackingInput = z.infer<typeof createTrackingSchema>
export type CreatePredictionInput = z.infer<typeof createPredictionSchema>
export type PostStatus = z.infer<typeof postStatusSchema>
export type PostType = z.infer<typeof postTypeSchema>
