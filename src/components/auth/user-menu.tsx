'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { LogOut, PlusSquare, UserCircle2 } from 'lucide-react'
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
import type { ViewerProfile } from '@/lib/domain'

interface UserMenuProps {
  viewer: ViewerProfile
}

export function UserMenu({ viewer }: UserMenuProps) {
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
    await supabase.auth.signOut()
    router.refresh()
    router.push('/')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className='rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'>
        <Avatar className='h-9 w-9 border border-border'>
          <AvatarImage alt={viewer.username ?? 'Viewer avatar'} src={viewer.avatarUrl ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-64'>
        <DropdownMenuLabel className='space-y-1'>
          <div className='font-medium'>{viewer.displayName ?? viewer.username ?? 'Signed in'}</div>
          <div className='text-xs text-muted-foreground'>
            @{viewer.username ?? 'finish-profile'}
          </div>
        </DropdownMenuLabel>
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
            Create prediction
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
