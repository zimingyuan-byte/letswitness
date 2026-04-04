import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { CreateTrackingShell } from '@/components/shell/create-tracking-shell'
import { getViewerProfile } from '@/lib/data/posts'

export const metadata: Metadata = {
  title: 'Create Tracking',
  robots: {
    index: false,
    follow: false,
  },
}

interface CreatePostPageProps {
  searchParams?: Promise<{
    error?: string
    title?: string
    sourceName?: string
    predictionContent?: string
    sourceUrl?: string
    description?: string
    tags?: string
    verificationStandards?: string
    verificationDeadline?: string
    titleError?: string
    sourceNameError?: string
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
  'create-post-failed': 'Your tracking record could not be published. Please try again.',
  'create-related-records-failed': 'We could not save all tracking details. Please try again.',
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
  const values = {
    title: params.title ?? '',
    sourceName: params.sourceName ?? '',
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
    sourceName: params.sourceNameError ?? null,
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
        <h1 className='text-3xl font-bold tracking-tight'>Create Tracking</h1>
        <p className='text-sm text-muted-foreground'>
          Share the original claim, add supporting context, and define how it should be
          checked later.
        </p>
      </div>
      <CreateTrackingShell
        errorMessage={errorMessage}
        fieldErrors={fieldErrors}
        values={values}
      />
    </div>
  )
}
