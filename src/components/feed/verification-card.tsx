import { CalendarClock, FlagTriangleRight } from 'lucide-react'
import type { VerificationEvent } from '@/lib/domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface VerificationCardProps {
  event: VerificationEvent
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
        <p>{event.description}</p>
        {event.targetDate ? <p>Target date: {event.targetDate}</p> : null}
        {event.deadline ? <p>Deadline: {event.deadline}</p> : null}
        <p>Status: {event.status}</p>
      </CardContent>
    </Card>
  )
}
