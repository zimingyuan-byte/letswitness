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
  'missing-supabase-env': 'Sign-in is temporarily unavailable. Please try again later.',
  'oauth-failed': 'We could not start sign-in. Please try again.',
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
            Continue to publish predictions, manage your profile, and follow records you care
            about.
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
            New here? We will create your account and help you finish setting up your
            profile.
          </p>
          <p className='text-sm text-muted-foreground'>
            You can review and update your public profile after sign-in.
          </p>
          <Link className='text-sm font-medium text-zinc-900 hover:underline' href='/signup'>
            Need the sign-up entry point?
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
