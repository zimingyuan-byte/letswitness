import { MessageSquareMore } from 'lucide-react'
import type { PostComment, ViewerProfile } from '@/lib/domain'
import { CommentForm } from '@/components/feed/comment-form'
import { CommentList } from '@/components/feed/comment-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface CommentThreadShellProps {
  comments: PostComment[]
  postId: string
  viewer: ViewerProfile | null
}

export function CommentThreadShell({
  comments,
  postId,
  viewer,
}: CommentThreadShellProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <MessageSquareMore className='h-4 w-4 text-muted-foreground' />
          Comment thread
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6 text-sm text-muted-foreground'>
        <p>
          Comments help add missing context, challenge weak evidence, and highlight details
          that matter for verification.
        </p>
        <CommentForm postId={postId} viewer={viewer} />
        <CommentList comments={comments} postId={postId} viewer={viewer} />
      </CardContent>
    </Card>
  )
}
