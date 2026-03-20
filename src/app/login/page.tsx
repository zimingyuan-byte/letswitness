import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { GoogleAuthButton } from '@/components/auth/google-auth-button'

interface LoginPageProps {
  searchParams?: Promise<{
    error?: string
    next?: string
  }>
}

const errorMessages: Record<string, string> = {
  'missing-supabase-env': 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before testing Google sign-in.',
  'oauth-failed': 'Google sign-in could not start. Check your Supabase provider settings and callback URL.',
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {}
  const errorMessage = params.error ? errorMessages[params.error] : null
  const nextPath = params.next || '/'

  return (
    <div className='mx-auto max-w-lg'>
      <Card>
        <CardHeader>
          <CardTitle className='text-3xl tracking-tight'>Sign in to LetsWitness</CardTitle>
          <CardDescription>
            The MVP uses Supabase Auth with Google as the single login method.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {errorMessage ? (
            <div className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {errorMessage}
            </div>
          ) : null}
          <GoogleAuthButton className='w-full' nextPath={nextPath} />
          <p className='text-sm text-muted-foreground'>
            New here? Google login will create your account and route you to username setup
            if needed.
          </p>
          <p className='text-sm text-muted-foreground'>
            The MVP now uses a single `/login` entry point backed by Supabase Auth.
          </p>
          <Link className='text-sm font-medium text-zinc-900 hover:underline' href='/signup'>
            Need the sign-up entry point?
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
