import type { PostStatus } from '@/lib/domain'
import { cn } from '@/lib/utils'

const statusLabels: Record<PostStatus, string> = {
  pending: 'Pending',
  verifying: 'Verifying',
  fulfilled: 'Fulfilled',
  unfulfilled: 'Unfulfilled',
  partially_fulfilled: 'Partially fulfilled',
  expired: 'Expired',
}

const statusClasses: Record<PostStatus, string> = {
  pending: 'bg-sky-50 text-sky-700 ring-sky-200',
  verifying: 'bg-amber-50 text-amber-700 ring-amber-200',
  fulfilled: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  unfulfilled: 'bg-rose-50 text-rose-700 ring-rose-200',
  partially_fulfilled: 'bg-violet-50 text-violet-700 ring-violet-200',
  expired: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
}

interface StatusPillProps {
  status: PostStatus
}

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        statusClasses[status]
      )}>
      {statusLabels[status]}
    </span>
  )
}
