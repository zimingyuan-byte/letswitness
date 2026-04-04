export type PostStatus =
  | 'draft'
  | 'pending'
  | 'verifying'
  | 'fulfilled'
  | 'unfulfilled'
  | 'partially_fulfilled'
  | 'expired'

export type PostType = 'tracking' | 'prediction'

export type VerificationEventType = 'time_point' | 'event_trigger'

export type VerificationResult =
  | 'fulfilled'
  | 'unfulfilled'
  | 'partially_fulfilled'

export type VerificationEventStatus = 'waiting' | 'triggered' | 'resolved' | 'expired'

export type PostMediaType = 'image' | 'audio' | 'video'

export interface PostAuthor {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
}

export interface PostMediaItem {
  id: string
  type: PostMediaType
  storagePath: string
  url: string | null
  fileSize?: number | null
}

export interface CredibilityVoteSummary {
  upvotes: number
  downvotes: number
  totalVotes: number
  viewerValue: boolean | null
}

export interface VerificationVoteSummary {
  fulfilled: number
  unfulfilled: number
  partiallyFulfilled: number
  totalVotes: number
  viewerResult: VerificationResult | null
}

export interface VerificationEvent {
  id: string
  type: VerificationEventType
  title: string
  description: string
  targetDate?: string | null
  deadline?: string | null
  status: VerificationEventStatus
  triggeredAt?: string | null
  evidenceUrl?: string | null
  confirmCount: number
  viewerConfirmed: boolean
  votes: VerificationVoteSummary
}

export interface PostComment {
  id: string
  postId: string
  parentId?: string | null
  content: string
  score: number
  createdAt: string
  author: PostAuthor
  replies: PostComment[]
}

export interface NotificationItem {
  id: string
  type: string
  referenceId?: string | null
  message: string
  isRead: boolean
  createdAt: string
}

export interface WitnessPost {
  id: string
  postType: PostType
  title: string
  description: string
  sourceName?: string | null
  predictionContent?: string | null
  sourceUrl?: string | null
  status: PostStatus
  credibilityScore: number
  credibility: CredibilityVoteSummary
  follow: {
    followerCount: number
    viewerFollowing: boolean
  }
  commentCount: number
  createdAt: string
  tags: string[]
  media: PostMediaItem[]
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
