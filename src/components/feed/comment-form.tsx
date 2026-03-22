import { submitCommentAction } from '@/app/post/[id]/actions'
import type { ViewerProfile } from '@/lib/domain'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

interface CommentFormProps {
  postId: string
  viewer: ViewerProfile | null
  parentId?: string
  submitLabel?: string
}

export function CommentForm({
  postId,
  viewer,
  parentId,
  submitLabel = 'Post comment',
}: CommentFormProps) {
  if (!viewer) {
    return (
      <p className='text-sm text-muted-foreground'>
        Sign in to join the discussion and add verification context.
      </p>
    )
  }

  return (
    <form action={submitCommentAction} className='space-y-3'>
      <input name='postId' type='hidden' value={postId} />
      <input name='returnPath' type='hidden' value={`/post/${postId}`} />
      {parentId ? <input name='parentId' type='hidden' value={parentId} /> : null}
      <Textarea
        maxLength={1000}
        minLength={1}
        name='content'
        placeholder='Add context, links, or evidence that helps verify this prediction.'
        required
      />
      <Button type='submit'>{submitLabel}</Button>
    </form>
  )
}
