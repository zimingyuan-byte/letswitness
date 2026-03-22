import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { CreatePredictionShell } from '@/components/shell/create-prediction-shell'
import { getViewerProfile } from '@/lib/data/posts'

export const metadata: Metadata = {
  title: 'Create Prediction',
  robots: {
    index: false,
    follow: false,
  },
}

interface CreatePostPageProps {
  searchParams?: Promise<{
    error?: string
  }>
}

const errorMessages: Record<string, string> = {
  'missing-supabase-env': 'Posting is temporarily unavailable. Please try again later.',
  'invalid-tags': 'Tags must use letters, numbers, or hyphens only, with up to 5 tags total.',
  'invalid-media': 'Please upload up to 5 valid image, audio, or video files within the size limits.',
  'invalid-post': 'Please review the title, source, and description fields.',
  'invalid-event': 'Please provide a valid verification event for the selected event type.',
  'create-post-failed': 'Your prediction could not be published. Please try again.',
  'create-related-records-failed': 'We could not save all post details. Please try again.',
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
          Share the original claim, add supporting context, and define how it should be
          checked later.
        </p>
      </div>
      <CreatePredictionShell errorMessage={errorMessage} />
    </div>
  )
}
