import { cn } from '@/lib/utils'

interface VoteMeterProps {
  score: number
  totalVotes?: number
}

function getMeterTone(score: number) {
  if (score >= 80) {
    return 'bg-emerald-500'
  }
  if (score >= 50) {
    return 'bg-amber-400'
  }
  if (score >= 20) {
    return 'bg-orange-400'
  }
  return 'bg-rose-500'
}

export function VoteMeter({ score, totalVotes }: VoteMeterProps) {
  const clamped = Math.max(0, Math.min(100, score))

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between text-xs font-medium text-muted-foreground'>
        <span>Low credibility</span>
        <span>High credibility</span>
      </div>
      <div className='h-3 overflow-hidden rounded-full bg-zinc-100'>
        <div
          className={cn('h-full rounded-full transition-all', getMeterTone(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className='space-y-1'>
        <div className='text-sm font-medium'>{clamped}% worth verifying</div>
        {typeof totalVotes === 'number' ? (
          <div className='text-xs text-muted-foreground'>{totalVotes} total credibility votes</div>
        ) : null}
      </div>
    </div>
  )
}
