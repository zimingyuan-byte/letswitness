import {
  submitEventTriggerConfirmAction,
  submitVerificationVoteAction,
} from '@/app/post/[id]/actions'
import type { VerificationEvent, ViewerProfile } from '@/lib/domain'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

interface VerificationVotePanelProps {
  event: VerificationEvent
  postId: string
  viewer: ViewerProfile | null
}

export function VerificationVotePanel({
  event,
  postId,
  viewer,
}: VerificationVotePanelProps) {
  const returnPath = `/post/${postId}`

  if (!viewer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Community verification</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          Sign in to confirm trigger events and vote on final verification results.
        </CardContent>
      </Card>
    )
  }

  if (event.type === 'event_trigger' && event.status === 'waiting') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Trigger this verification event</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-sm text-muted-foreground'>
            Confirm that the event has happened. It will enter verification after enough
            confirmations or when the post author confirms it.
          </p>
          <form action={submitEventTriggerConfirmAction} className='space-y-3'>
            <input name='verificationEventId' type='hidden' value={event.id} />
            <input name='returnPath' type='hidden' value={returnPath} />
            <div className='space-y-2'>
              <Input name='evidenceUrl' placeholder='Evidence link (optional)' type='url' />
            </div>
            <Button type='submit' variant={event.viewerConfirmed ? 'default' : 'outline'}>
              {event.viewerConfirmed ? 'Confirmed' : 'Confirm event happened'}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  if (event.status !== 'triggered') {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Vote on the verification result</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-2 text-sm text-muted-foreground'>
          <p>{event.votes.fulfilled} fulfilled votes</p>
          <p>{event.votes.unfulfilled} unfulfilled votes</p>
          <p>{event.votes.partiallyFulfilled} partially fulfilled votes</p>
          <p>{event.votes.totalVotes} total result votes</p>
        </div>
        <div className='flex flex-wrap gap-3'>
          {[
            ['fulfilled', 'Fulfilled'],
            ['partially_fulfilled', 'Partially fulfilled'],
            ['unfulfilled', 'Unfulfilled'],
          ].map(([value, label]) => (
            <form action={submitVerificationVoteAction} key={value}>
              <input name='verificationEventId' type='hidden' value={event.id} />
              <input name='returnPath' type='hidden' value={returnPath} />
              <input name='result' type='hidden' value={value} />
              <Button
                type='submit'
                variant={event.votes.viewerResult === value ? 'default' : 'outline'}>
                {label}
              </Button>
            </form>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
