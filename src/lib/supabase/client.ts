'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/supabase/env'

let client:
  | ReturnType<typeof createBrowserClient>
  | null = null

export function createBrowserSupabaseClient() {
  if (client) {
    return client
  }

  const env = getSupabaseEnv()

  if (!env) {
    return null
  }

  client = createBrowserClient(env.url, env.anonKey)

  return client
}
