import Link from 'next/link'
import { togglePostFollowAction } from '@/app/post/[id]/actions'
import { buttonVariants } from '@/components/ui/Button'

interface FollowPostButtonProps {
  postId: string
  returnPath: string
  isFollowing: boolean
  followerCount: number
  isAuthor: boolean
  isViewerSignedIn: boolean
}

export function FollowPostButton({
  postId,
  returnPath,
  isFollowing,
  followerCount,
  isAuthor,
  isViewerSignedIn,
}: FollowPostButtonProps) {
  if (isAuthor) {
    return <p className='text-xs text-muted-foreground'>{followerCount} followers</p>
  }

  if (!isViewerSignedIn) {
    return (
      <Link
        className={buttonVariants({
          variant: 'outline',
          className: 'h-8 px-3 text-xs',
        })}
        href={`/login?next=${encodeURIComponent(returnPath)}`}>
        Follow ({followerCount})
      </Link>
    )
  }

  return (
    <form action={togglePostFollowAction}>
      <input name='postId' type='hidden' value={postId} />
      <input name='returnPath' type='hidden' value={returnPath} />
      <button
        className={buttonVariants({
          variant: isFollowing ? 'outline' : 'default',
          className: 'h-8 px-3 text-xs',
        })}
        type='submit'>
        {isFollowing ? `Following (${followerCount})` : `Follow (${followerCount})`}
      </button>
    </form>
  )
}
