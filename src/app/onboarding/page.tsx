import { redirect } from 'next/navigation'
import { completeProfileAction } from '@/app/onboarding/actions'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { getViewerProfile } from '@/lib/data/posts'

interface OnboardingPageProps {
  searchParams?: Promise<{
    error?: string
  }>
}

const errorMessages: Record<string, string> = {
  'missing-supabase-env': 'Supabase environment variables are missing.',
  'invalid-username': 'Use 3-32 letters, numbers, or underscores for your username.',
  'username-taken': 'That username is already taken.',
  'save-failed': 'Your profile could not be saved. Check that the profiles table exists.',
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const [viewer, params] = await Promise.all([getViewerProfile(), searchParams])

  if (!viewer) {
    redirect('/login?next=/onboarding')
  }

  if (viewer.username) {
    redirect('/')
  }

  const errorMessage = params?.error ? errorMessages[params.error] : null

  return (
    <div className='mx-auto max-w-lg'>
      <Card>
        <CardHeader>
          <CardTitle className='text-3xl tracking-tight'>Choose your username</CardTitle>
          <CardDescription>
            Google login is the only auth method in MVP. Finish this step to unlock profile
            and post creation routes.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {errorMessage ? (
            <div className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {errorMessage}
            </div>
          ) : null}
          <form action={completeProfileAction} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='username'>Username</Label>
              <Input
                defaultValue={viewer.displayName?.toLowerCase().replace(/\s+/g, '_') ?? ''}
                id='username'
                name='username'
                placeholder='witness_archive'
                required
              />
            </div>
            <Button type='submit'>Save profile</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
