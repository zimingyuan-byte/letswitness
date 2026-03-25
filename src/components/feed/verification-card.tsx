import { CalendarClock, FlagTriangleRight } from 'lucide-react'
import type { VerificationEvent } from '@/lib/domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatTimeToNow } from '@/lib/utils'

interface VerificationCardProps {
  event: VerificationEvent
  predictionSource: string
  predictionContent: string
}

function formatReadableDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)} (${formatTimeToNow(date)})`
}

export function VerificationCard({
  event,
  predictionSource,
  predictionContent,
}: VerificationCardProps) {
  const Icon = event.type === 'time_point' ? CalendarClock : FlagTriangleRight
  const displayTitle = event.title === 'Verification Deadline' ? 'Verification' : event.title

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Icon className='h-4 w-4 text-muted-foreground' />
          {displayTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4 text-sm'>
        <div className='rounded-xl border border-zinc-200 bg-white p-4'>
          <div className='space-y-3'>
            <p>
              <span className='text-zinc-400'>Prediction Source:</span>{' '}
              <span className='font-semibold text-zinc-950'>{predictionSource}</span>
            </p>
            <p>
              <span className='text-zinc-400'>Prediction Content:</span>{' '}
              <span className='font-semibold text-zinc-950'>{predictionContent}</span>
            </p>
          </div>
        </div>

        <div className='rounded-xl border border-sky-200 bg-sky-50/70 p-4'>
          <p className='text-zinc-400'>Verification Standards</p>
          <p className='mt-2 font-semibold text-zinc-950'>{event.description}</p>
        </div>

        <div className='rounded-xl border border-zinc-200 bg-white p-4'>
          <div className='space-y-3'>
            {event.targetDate ? (
              <p>
                <span className='text-zinc-400'>Verification Deadline:</span>{' '}
                <span className='text-zinc-950'>{event.targetDate}</span>
              </p>
            ) : null}
            {event.deadline ? (
              <p>
                <span className='text-zinc-400'>Deadline:</span>{' '}
                <span className='text-zinc-950'>{event.deadline}</span>
              </p>
            ) : null}
            {event.triggeredAt ? (
              <p>
                <span className='text-zinc-400'>Triggered:</span>{' '}
                <span className='text-zinc-950'>{formatReadableDateTime(event.triggeredAt)}</span>
              </p>
            ) : null}
            {event.evidenceUrl ? (
              <p>
                <span className='text-zinc-400'>Evidence:</span>{' '}
                <a
                  className='text-zinc-950 underline'
                  href={event.evidenceUrl}
                  rel='noreferrer'
                  target='_blank'>
                  Open link
                </a>
              </p>
            ) : null}
            {event.type === 'event_trigger' ? (
              <p>
                <span className='text-zinc-400'>Trigger Confirmations:</span>{' '}
                <span className='text-zinc-950'>{event.confirmCount}</span>
              </p>
            ) : null}
            <p>
              <span className='text-zinc-400'>Verification Votes:</span>{' '}
              <span className='text-zinc-950'>{event.votes.totalVotes}</span>
            </p>
            <p>
              <span className='text-zinc-400'>Status:</span>{' '}
              <span className='text-zinc-950'>{event.status}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
