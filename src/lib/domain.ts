export type PostStatus =
  | 'pending'
  | 'verifying'
  | 'fulfilled'
  | 'unfulfilled'
  | 'partially_fulfilled'
  | 'expired'

export type VerificationEventType = 'time_point' | 'event_trigger'

export type VerificationResult =
  | 'fulfilled'
  | 'unfulfilled'
  | 'partially_fulfilled'

export interface PostAuthor {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
}

export interface VerificationEvent {
  id: string
  type: VerificationEventType
  title: string
  description: string
  targetDate?: string | null
  deadline?: string | null
  status: 'waiting' | 'triggered' | 'resolved' | 'expired'
}

export interface WitnessPost {
  id: string
  title: string
  description: string
  sourceName: string
  status: PostStatus
  credibilityScore: number
  commentCount: number
  createdAt: string
  tags: string[]
  author: PostAuthor
  verificationEvents: VerificationEvent[]
}

export interface ViewerProfile {
  id: string
  email: string | null
  username: string | null
  avatarUrl: string | null
  displayName: string | null
}
