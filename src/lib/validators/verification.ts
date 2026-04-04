import { z } from 'zod'

export const verificationEventTypeSchema = z.enum(['time_point', 'event_trigger'])

export const timePointVerificationSchema = z.object({
  type: z.literal('time_point'),
  title: z.string().trim().min(1),
  description: z.string().trim(),
  targetDate: z.string().min(1),
})

export const eventTriggerVerificationSchema = z.object({
  type: z.literal('event_trigger'),
  title: z.string().trim().min(1),
  description: z.string().trim(),
  deadline: z.string().min(1),
})

export const verificationEventSchema = z.discriminatedUnion('type', [
  timePointVerificationSchema,
  eventTriggerVerificationSchema,
])

export type VerificationEventInput = z.infer<typeof verificationEventSchema>
