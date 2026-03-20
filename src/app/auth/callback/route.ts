import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/'

  const supabase = await createServerSupabaseClient()

  if (!supabase || !code) {
    return NextResponse.redirect(new URL(`/login?error=oauth-failed`, url.origin))
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=oauth-failed`, url.origin))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=oauth-failed', url.origin))
  }

  const { data: profile } = await supabase
    .from('letswitness_profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    await supabase.from('letswitness_profiles').upsert({
      id: user.id,
      email: user.email ?? null,
      username: null,
      display_name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email ??
        'LetsWitness user',
      avatar_url: user.user_metadata?.avatar_url ?? null,
    })
  }

  const destination = profile?.username ? next : '/onboarding'

  return NextResponse.redirect(new URL(destination, url.origin))
}
