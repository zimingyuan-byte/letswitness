import { redirect } from 'next/navigation'
import { CreatePredictionShell } from '@/components/shell/create-prediction-shell'
import { getViewerProfile } from '@/lib/data/posts'

interface CreatePostPageProps {
  searchParams?: Promise<{
    error?: string
  }>
}

const errorMessages: Record<string, string> = {
  'missing-supabase-env': 'Set your Supabase environment variables before creating posts.',
  'invalid-tags': 'Tags must use letters, numbers, or hyphens only, with up to 5 tags total.',
  'invalid-post': 'Please review the title, source, and description fields.',
  'invalid-event': 'Please provide a valid verification event for the selected event type.',
  'create-post-failed': 'The post record could not be saved.',
  'create-related-records-failed': 'The verification event or tag links could not be saved.',
}

export default async function CreatePostPage({ searchParams }: CreatePostPageProps) {
  const viewer = await getViewerProfile()
  const params = (await searchParams) ?? {}

  if (!viewer) {
    redirect('/login?next=/post/create')
  }

  if (!viewer.username) {
    redirect('/onboarding')
  }

  const errorMessage = params.error ? errorMessages[params.error] : null

  return (
    <div className='mx-auto max-w-3xl space-y-4'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Create prediction</h1>
        <p className='text-sm text-muted-foreground'>
          Publish a real prediction record and attach the first verification event required by
          the MVP.
        </p>
      </div>
      <CreatePredictionShell errorMessage={errorMessage} />
    </div>
  )
}
