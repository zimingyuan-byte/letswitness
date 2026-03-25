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
  const canVote = event.status === 'triggered'
  const voteAvailabilityMessage =
    event.status === 'waiting'
      ? 'Voting will open after this verification is triggered.'
      : event.status === 'resolved'
        ? 'Voting is closed because this verification has already been resolved.'
        : event.status === 'expired'
          ? 'Voting is unavailable because this verification expired.'
          : null

  if (!viewer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Community Verification</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          Sign in to confirm trigger events and vote on final verification results.
        </CardContent>
      </Card>
    )
  }

  const voteItems = [
    {
      value: 'fulfilled',
      label: 'Fulfilled',
      count: event.votes.fulfilled,
      color: '#22c55e',
      bgClassName: 'bg-emerald-50',
      borderClassName: 'border-emerald-200',
      textClassName: 'text-emerald-900',
      dotClassName: 'bg-emerald-500',
    },
    {
      value: 'partially_fulfilled',
      label: 'Partially fulfilled',
      count: event.votes.partiallyFulfilled,
      color: '#f59e0b',
      bgClassName: 'bg-amber-50',
      borderClassName: 'border-amber-200',
      textClassName: 'text-amber-900',
      dotClassName: 'bg-amber-500',
    },
    {
      value: 'unfulfilled',
      label: 'Unfulfilled',
      count: event.votes.unfulfilled,
      color: '#ef4444',
      bgClassName: 'bg-rose-50',
      borderClassName: 'border-rose-200',
      textClassName: 'text-rose-900',
      dotClassName: 'bg-rose-500',
    },
  ] as const

  const totalVotes = event.votes.totalVotes
  const percentages = voteItems.map((item) =>
    totalVotes ? Math.round((item.count / totalVotes) * 100) : 0
  )

  const chartStops = voteItems.reduce<string[]>((segments, item, index) => {
    const start = voteItems.slice(0, index).reduce((sum, current) => sum + current.count, 0)
    const end = start + item.count
    const startPercent = totalVotes ? (start / totalVotes) * 100 : 0
    const endPercent = totalVotes ? (end / totalVotes) * 100 : 0

    segments.push(`${item.color} ${startPercent}% ${endPercent}%`)
    return segments
  }, [])

  const pieChartStyle = {
    background:
      totalVotes > 0
        ? `conic-gradient(${chartStops.join(', ')})`
        : 'conic-gradient(#e5e7eb 0% 100%)',
  }

  const voteCard = (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Vote on the Verification Result</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {!canVote ? (
          <p className='text-sm text-muted-foreground'>
            {voteAvailabilityMessage ?? 'Voting is not available for this verification yet.'}
          </p>
        ) : null}
        <div className={canVote ? 'space-y-4' : 'space-y-4 opacity-50'}>
          <div className='grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center'>
            <div className='mx-auto flex flex-col items-center gap-3'>
              <div
                aria-label='Verification result vote breakdown'
                className='relative h-40 w-40 rounded-full border border-zinc-200 shadow-sm'
                role='img'
                style={pieChartStyle}>
                <div className='absolute inset-[22%] flex items-center justify-center rounded-full border border-white/80 bg-white text-center shadow-sm'>
                  <div>
                    <p className='text-2xl font-semibold text-zinc-900'>{totalVotes}</p>
                    <p className='text-xs text-muted-foreground'>Votes</p>
                  </div>
                </div>
              </div>
              <p className='text-xs text-muted-foreground'>
                {totalVotes ? 'Live community result distribution' : 'No votes yet'}
              </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-3'>
              {voteItems.map((item, index) => (
                <div
                  className={`rounded-xl border p-4 ${item.bgClassName} ${item.borderClassName}`}
                  key={item.value}>
                  <div className='mb-3 flex items-center gap-2'>
                    <span className={`h-2.5 w-2.5 rounded-full ${item.dotClassName}`} />
                    <p className={`text-sm font-medium ${item.textClassName}`}>{item.label}</p>
                  </div>
                  <p className={`text-2xl font-semibold ${item.textClassName}`}>{percentages[index]}%</p>
                  <p className='text-sm text-muted-foreground'>{item.count} people</p>
                </div>
              ))}
            </div>
          </div>
          <p className='text-sm text-muted-foreground'>Total voters: {totalVotes}</p>
          <div className='flex flex-wrap gap-3'>
            {voteItems.map((item) => (
              <form action={submitVerificationVoteAction} key={item.value}>
                <input name='verificationEventId' type='hidden' value={event.id} />
                <input name='returnPath' type='hidden' value={returnPath} />
                <input name='result' type='hidden' value={item.value} />
                <Button
                  disabled={!canVote}
                  type='submit'
                  variant={event.votes.viewerResult === item.value ? 'default' : 'outline'}>
                  {item.label}
                </Button>
              </form>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (event.type === 'event_trigger' && event.status === 'waiting') {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Trigger This Verification Event</CardTitle>
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
        {voteCard}
      </>
    )
  }

  return voteCard
}
