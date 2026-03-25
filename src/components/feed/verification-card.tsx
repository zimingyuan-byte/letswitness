import { CalendarClock, FlagTriangleRight } from 'lucide-react'
import type { VerificationEvent } from '@/lib/domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatTimeToNow } from '@/lib/utils'

interface VerificationCardProps {
  event: VerificationEvent
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

export function VerificationCard({ event }: VerificationCardProps) {
  const Icon = event.type === 'time_point' ? CalendarClock : FlagTriangleRight

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Icon className='h-4 w-4 text-muted-foreground' />
          {event.title}
        </CardTitle>
      </CardHeader>
      <CardContent className='grid gap-4 text-sm md:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]'>
        <div className='rounded-xl border border-sky-200 bg-sky-50/70 p-4'>
          <p className='font-medium text-zinc-900'>Verification Standards</p>
          <p className='mt-2 text-muted-foreground'>{event.description}</p>
        </div>

        <div className='rounded-xl border border-zinc-200 bg-white p-4'>
          <div className='space-y-3 text-muted-foreground'>
            {event.targetDate ? <p>Check Date: {event.targetDate}</p> : null}
            {event.deadline ? <p>Deadline: {event.deadline}</p> : null}
            {event.triggeredAt ? <p>Triggered: {formatReadableDateTime(event.triggeredAt)}</p> : null}
            {event.evidenceUrl ? (
              <p>
                Evidence:{' '}
                <a
                  className='font-medium text-zinc-900 underline'
                  href={event.evidenceUrl}
                  rel='noreferrer'
                  target='_blank'>
                  Open link
                </a>
              </p>
            ) : null}
            {event.type === 'event_trigger' ? (
              <p>{event.confirmCount} trigger confirmations</p>
            ) : null}
            <p>{event.votes.totalVotes} verification votes</p>
            <p>Status: {event.status}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
