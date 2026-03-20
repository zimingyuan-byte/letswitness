'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/Icons'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

interface GoogleAuthButtonProps {
  className?: string
  nextPath?: string
}

export function GoogleAuthButton({ className, nextPath = '/' }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSignIn() {
    const supabase = createBrowserSupabaseClient()

    if (!supabase) {
      window.location.href = '/login?error=missing-supabase-env'
      return
    }

    setIsLoading(true)

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    if (error) {
      setIsLoading(false)
      window.location.href = '/login?error=oauth-failed'
      return
    }

    if (data.url) {
      window.location.href = data.url
    }
  }

  return (
    <Button className={className} isLoading={isLoading} onClick={handleSignIn}>
      {!isLoading ? <Icons.google className='mr-2 h-4 w-4' /> : null}
      Continue with Google
    </Button>
  )
}
