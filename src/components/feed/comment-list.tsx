import { formatTimeToNow } from '@/lib/utils'
import type { PostComment, ViewerProfile } from '@/lib/domain'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { CommentForm } from '@/components/feed/comment-form'

interface CommentListProps {
  comments: PostComment[]
  postId: string
  viewer: ViewerProfile | null
}

function CommentItem({
  comment,
  postId,
  viewer,
}: {
  comment: PostComment
  postId: string
  viewer: ViewerProfile | null
}) {
  const initials = (comment.author.displayName || comment.author.username || 'LW')
    .slice(0, 2)
    .toUpperCase()
  const displayName = comment.author.displayName || comment.author.username || 'LetsWitness user'

  return (
    <div className='space-y-4 rounded-lg border bg-white p-4'>
      <div className='flex items-start gap-3'>
        <Avatar className='h-10 w-10 border border-border'>
          <AvatarImage
            alt={comment.author.displayName ?? comment.author.username}
            src={comment.author.avatarUrl ?? undefined}
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className='space-y-1'>
          <p className='text-sm font-medium text-zinc-900'>
            {displayName}{' '}
            <span className='text-muted-foreground'>@{comment.author.username}</span>
          </p>
          <p className='text-xs text-muted-foreground'>
            {formatTimeToNow(new Date(comment.createdAt))}
          </p>
        </div>
      </div>
      <p className='whitespace-pre-wrap text-sm leading-6 text-zinc-700'>{comment.content}</p>
      <div className='rounded-lg bg-zinc-50 p-3'>
        <CommentForm
          parentId={comment.id}
          postId={postId}
          submitLabel='Reply'
          viewer={viewer}
        />
      </div>
      {comment.replies.length ? (
        <div className='space-y-3 pl-4'>
          {comment.replies.map((reply) => (
            <div key={reply.id} className='rounded-lg border border-dashed bg-zinc-50 p-3'>
              <p className='text-sm font-medium text-zinc-900'>
                {reply.author.displayName || reply.author.username || 'LetsWitness user'}{' '}
                <span className='text-muted-foreground'>@{reply.author.username}</span>
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {formatTimeToNow(new Date(reply.createdAt))}
              </p>
              <p className='mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700'>
                {reply.content}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CommentList({ comments, postId, viewer }: CommentListProps) {
  if (!comments.length) {
    return (
      <div className='rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
        No comments yet. Be the first to add evidence or context.
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {comments.map((comment) => (
        <CommentItem
          comment={comment}
          key={comment.id}
          postId={postId}
          viewer={viewer}
        />
      ))}
    </div>
  )
}
