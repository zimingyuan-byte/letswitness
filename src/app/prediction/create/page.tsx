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

interface CreatePredictionPageProps {
  searchParams?: Promise<{
    error?: string
    title?: string
    predictionContent?: string
    sourceUrl?: string
    description?: string
    tags?: string
    verificationStandards?: string
    verificationDeadline?: string
    titleError?: string
    predictionContentError?: string
    sourceUrlError?: string
    descriptionError?: string
    tagsError?: string
    verificationStandardsError?: string
    verificationDeadlineError?: string
  }>
}

const errorMessages: Record<string, string> = {
  'missing-supabase-env': 'Posting is temporarily unavailable. Please try again later.',
  'missing-post-type-column':
    'Post Type is not ready in the database yet. Please apply the latest Supabase migration and try again.',
  'missing-prediction-content-column':
    'Prediction Content is not ready in the database yet. Please apply the latest Supabase migration and try again.',
  'invalid-tags': 'Tags must use letters, numbers, or hyphens only, with up to 5 tags total.',
  'invalid-media': 'Please upload up to 5 valid image, audio, or video files within the size limits.',
  'invalid-post': 'Please review the highlighted fields before publishing.',
  'invalid-event': 'Please provide a valid verification deadline.',
  'create-post-failed': 'Your prediction could not be published. Please try again.',
  'create-related-records-failed': 'We could not save all prediction details. Please try again.',
}

export default async function CreatePredictionPage({ searchParams }: CreatePredictionPageProps) {
  const viewer = await getViewerProfile()
  const params = (await searchParams) ?? {}

  if (!viewer) {
    redirect('/login?next=/prediction/create')
  }

  if (!viewer.username) {
    redirect('/onboarding')
  }

  const errorMessage = params.error ? errorMessages[params.error] : null
  const values = {
    title: params.title ?? '',
    predictionContent: params.predictionContent ?? '',
    sourceUrl: params.sourceUrl ?? '',
    description: params.description ?? '',
    tags: (params.tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    verificationStandards: params.verificationStandards ?? '',
    verificationDeadline: params.verificationDeadline ?? '',
  } as const
  const fieldErrors = {
    title: params.titleError ?? null,
    predictionContent: params.predictionContentError ?? null,
    sourceUrl: params.sourceUrlError ?? null,
    description: params.descriptionError ?? null,
    tags: params.tagsError ?? null,
    verificationStandards: params.verificationStandardsError ?? null,
    verificationDeadline: params.verificationDeadlineError ?? null,
  } as const

  return (
    <div className='mx-auto max-w-3xl space-y-4'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Create Prediction</h1>
        <p className='text-sm text-muted-foreground'>
          Publish your own prediction, add supporting context, and define how it should be checked later.
        </p>
      </div>
      <CreatePredictionShell
        errorMessage={errorMessage}
        fieldErrors={fieldErrors}
        values={values}
      />
    </div>
  )
}
