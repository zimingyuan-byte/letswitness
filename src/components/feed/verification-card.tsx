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
      <CardContent className='space-y-2 text-sm text-muted-foreground'>
        <div className='space-y-1'>
          <p className='font-medium text-zinc-900'>Verification Standards</p>
          <p>{event.description}</p>
        </div>
        {event.targetDate ? <p>Verification Deadline: {event.targetDate}</p> : null}
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
      </CardContent>
    </Card>
  )
}
