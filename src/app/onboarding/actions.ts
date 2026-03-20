'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { usernameSchema } from '@/lib/validators/username'

export async function completeProfileAction(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    redirect('/onboarding?error=missing-supabase-env')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/onboarding')
  }

  const parsed = usernameSchema.safeParse({
    username: formData.get('username'),
  })

  if (!parsed.success) {
    redirect('/onboarding?error=invalid-username')
  }

  const username = parsed.data.username.toLowerCase()

  const { data: existing } = await supabase
    .from('letswitness_profiles')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .maybeSingle()

  if (existing) {
    redirect('/onboarding?error=username-taken')
  }

  const payload = {
    id: user.id,
    email: user.email ?? null,
    username,
    display_name:
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      username,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  }

  const { error } = await supabase.from('letswitness_profiles').upsert(payload)

  if (error) {
    redirect('/onboarding?error=save-failed')
  }

  redirect('/')
}
