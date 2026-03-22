import { submitCredibilityVoteAction } from '@/app/post/[id]/actions'
import type { ViewerProfile, WitnessPost } from '@/lib/domain'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { VoteMeter } from '@/components/feed/vote-meter'

interface CredibilityVotePanelProps {
  post: WitnessPost
  viewer: ViewerProfile | null
}

export function CredibilityVotePanel({ post, viewer }: CredibilityVotePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Credibility score</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <VoteMeter score={post.credibilityScore} totalVotes={post.credibility.totalVotes} />
        <p className='text-sm text-muted-foreground'>
          Vote on whether this record captures a real prediction that is worth tracking.
        </p>
        {viewer ? (
          <div className='flex flex-wrap gap-3'>
            <form action={submitCredibilityVoteAction}>
              <input name='postId' type='hidden' value={post.id} />
              <input name='returnPath' type='hidden' value={`/post/${post.id}`} />
              <input name='value' type='hidden' value='true' />
              <Button
                type='submit'
                variant={post.credibility.viewerValue === true ? 'default' : 'outline'}>
                Worth verifying
              </Button>
            </form>
            <form action={submitCredibilityVoteAction}>
              <input name='postId' type='hidden' value={post.id} />
              <input name='returnPath' type='hidden' value={`/post/${post.id}`} />
              <input name='value' type='hidden' value='false' />
              <Button
                type='submit'
                variant={post.credibility.viewerValue === false ? 'default' : 'outline'}>
                Not worth verifying
              </Button>
            </form>
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>
            Sign in to vote on the credibility of this prediction record.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
