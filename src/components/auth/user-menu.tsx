'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Bell, LogOut, PlusSquare, UserCircle2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { NotificationItem, ViewerProfile } from '@/lib/domain'
import { formatTimeToNow } from '@/lib/utils'

interface UserMenuProps {
  viewer: ViewerProfile
  notifications: NotificationItem[]
  unreadCount: number
}

export function UserMenu({ viewer, notifications, unreadCount }: UserMenuProps) {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const initials = useMemo(() => {
    const seed = viewer.username || viewer.displayName || viewer.email || 'LW'
    return seed.slice(0, 2).toUpperCase()
  }, [viewer])

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient()

    if (!supabase) {
      router.push('/login')
      return
    }

    setIsSigningOut(true)
    const { error } = await supabase.auth.signOut()

    if (error) {
      setIsSigningOut(false)
      router.push('/login')
      return
    }

    window.location.assign('/')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className='rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'>
        <div className='relative'>
          <Avatar className='h-9 w-9 border border-border'>
            <AvatarImage alt={viewer.username ?? 'Viewer avatar'} src={viewer.avatarUrl ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {unreadCount ? (
            <span className='absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-[10px] font-semibold text-white'>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-72'>
        <DropdownMenuLabel className='space-y-1'>
          <div className='font-medium'>{viewer.displayName ?? viewer.username ?? 'Signed in'}</div>
          <div className='text-xs text-muted-foreground'>
            @{viewer.username ?? 'finish-profile'}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className='space-y-2 px-2 py-1.5'>
          <div className='flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            <Bell className='h-3.5 w-3.5' />
            Notifications
          </div>
          {notifications.length ? (
            <div className='space-y-2 px-2 pb-1'>
              {notifications.map((notification) => (
                <div key={notification.id} className='rounded-md bg-zinc-50 px-3 py-2'>
                  <p className='text-xs font-medium text-zinc-900'>{notification.message}</p>
                  <p className='mt-1 text-[11px] text-muted-foreground'>
                    {formatTimeToNow(new Date(notification.createdAt))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className='px-2 pb-1 text-xs text-muted-foreground'>No notifications yet.</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={viewer.username ? `/user/${viewer.username}` : '/onboarding'}>
            <UserCircle2 className='mr-2 h-4 w-4' />
            {viewer.username ? 'Profile' : 'Finish profile'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href='/post/create'>
            <PlusSquare className='mr-2 h-4 w-4' />
            Create Tracking
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href='/prediction/create'>
            <PlusSquare className='mr-2 h-4 w-4' />
            Create Prediction
          </Link>
        </DropdownMenuItem>
        {!viewer.username ? (
          <DropdownMenuItem asChild>
            <Link href='/onboarding'>Finish profile</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isSigningOut} onSelect={handleSignOut}>
          <LogOut className='mr-2 h-4 w-4' />
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
