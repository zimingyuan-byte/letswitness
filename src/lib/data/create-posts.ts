'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { PostType } from '@/lib/domain'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getMediaByteLimit,
  getMediaTypeFromFile,
  LETSWITNESS_MEDIA_BUCKET,
  LETSWITNESS_MEDIA_LIMITS,
  sanitizeStorageName,
} from '@/lib/supabase/storage'
import { LETSWITNESS_TABLES } from '@/lib/supabase/tables'
import {
  createPredictionSchema,
  createTrackingSchema,
  postTagSchema,
} from '@/lib/validators/post'
import { timePointVerificationSchema } from '@/lib/validators/verification'

type CreateFormField =
  | 'title'
  | 'sourceName'
  | 'predictionContent'
  | 'sourceUrl'
  | 'description'
  | 'tags'
  | 'verificationStandards'
  | 'verificationDeadline'

interface CreatePostOptions {
  mode: PostType
  createPath: string
  formData: FormData
}

const DEFAULT_VERIFICATION_TITLE = 'Verification'

const TRACKING_FIELDS_TO_PERSIST = [
  'title',
  'sourceName',
  'predictionContent',
  'sourceUrl',
  'description',
  'tags',
  'verificationStandards',
  'verificationDeadline',
] as const satisfies readonly CreateFormField[]

const PREDICTION_FIELDS_TO_PERSIST = [
  'title',
  'predictionContent',
  'sourceUrl',
  'description',
  'tags',
  'verificationStandards',
  'verificationDeadline',
] as const satisfies readonly CreateFormField[]

function normalizeTags(rawValue: FormDataEntryValue | null) {
  const raw = typeof rawValue === 'string' ? rawValue : ''

  if (!raw.trim()) {
    return []
  }

  const uniqueTags = [...new Set(raw.split(',').map((tag) => tag.trim()).filter(Boolean))]
  return uniqueTags.map((tag) => tag.toLowerCase().replace(/\s+/g, '-'))
}

function getValidFiles(formData: FormData) {
  return formData
    .getAll('mediaFiles')
    .filter((value): value is File => value instanceof File && value.size > 0)
}

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function getFieldsToPersist(mode: PostType) {
  return mode === 'tracking' ? TRACKING_FIELDS_TO_PERSIST : PREDICTION_FIELDS_TO_PERSIST
}

function redirectToCreateForm(
  createPath: string,
  mode: PostType,
  formData: FormData,
  options: {
    error?: string
    fieldErrors?: Partial<Record<CreateFormField, string>>
  }
) {
  const params = new URLSearchParams()

  if (options.error) {
    params.set('error', options.error)
  }

  for (const field of getFieldsToPersist(mode)) {
    const value = getStringValue(formData, field)

    if (value) {
      params.set(field, value)
    }
  }

  for (const [field, message] of Object.entries(options.fieldErrors ?? {})) {
    if (message) {
      params.set(`${field}Error`, message)
    }
  }

  const query = params.toString()
  redirect(query ? `${createPath}?${query}` : createPath)
}

function getPostFieldErrors(formData: FormData, mode: PostType) {
  const title = getStringValue(formData, 'title').trim()
  const sourceName = getStringValue(formData, 'sourceName').trim()
  const predictionContent = getStringValue(formData, 'predictionContent').trim()
  const sourceUrl = getStringValue(formData, 'sourceUrl').trim()
  const description = getStringValue(formData, 'description').trim()

  return {
    title:
      !title
        ? 'Enter a title.'
        : undefined,
    sourceName:
      mode !== 'tracking'
        ? undefined
        : !sourceName
          ? 'Enter the person or organization that made the prediction.'
          : /^https?:\/\//i.test(sourceName)
            ? 'Enter the speaker or organization name here, not a URL. Put links in the Link field instead.'
            : undefined,
    predictionContent:
      !predictionContent
        ? 'Enter the prediction content.'
        : undefined,
    sourceUrl:
      sourceUrl && !/^https?:\/\/.+/i.test(sourceUrl)
        ? 'Enter a full URL starting with http:// or https://.'
        : undefined,
    description:
      !description
        ? 'Enter a description.'
        : undefined,
  } satisfies Partial<Record<CreateFormField, string>>
}

function getVerificationFieldErrors(formData: FormData) {
  const verificationDeadline = getStringValue(formData, 'verificationDeadline').trim()

  return {
    verificationDeadline:
      !verificationDeadline
        ? 'Choose the date when this prediction should be checked.'
        : undefined,
  } satisfies Partial<Record<CreateFormField, string>>
}

function buildBasePostPayload(
  mode: PostType,
  authorId: string,
  input: {
    title: string
    description: string
    predictionContent: string
    sourceUrl: string
    sourceName?: string
  }
) {
  return {
    author_id: authorId,
    post_type: mode,
    title: input.title,
    description: input.description,
    source_name: mode === 'tracking' ? input.sourceName ?? null : null,
    prediction_content: input.predictionContent,
    source_url: input.sourceUrl || null,
    status: 'pending' as const,
    credibility_score: 50,
  }
}

async function insertPostRecord(
  client: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  mode: PostType,
  createPath: string,
  formData: FormData,
  payload: ReturnType<typeof buildBasePostPayload>
) {
  let includePostTypeColumn = true
  let postResult = await client
    .from(LETSWITNESS_TABLES.posts)
    .insert(payload)
    .select('id')
    .single()

  if (postResult.error?.message?.includes('post_type')) {
    if (mode === 'prediction') {
      redirectToCreateForm(createPath, mode, formData, {
        error: 'missing-post-type-column',
      })
    }

    includePostTypeColumn = false
    postResult = await client
      .from(LETSWITNESS_TABLES.posts)
      .insert({
        author_id: payload.author_id,
        title: payload.title,
        description: payload.description,
        source_name: payload.source_name,
        prediction_content: payload.prediction_content,
        source_url: payload.source_url,
        status: payload.status,
        credibility_score: payload.credibility_score,
      })
      .select('id')
      .single()
  }

  if (postResult.error?.message?.includes('prediction_content')) {
    redirectToCreateForm(createPath, mode, formData, {
      error: 'missing-prediction-content-column',
    })
  }

  if (postResult.error?.message?.includes('source_url')) {
    postResult = await client
      .from(LETSWITNESS_TABLES.posts)
      .insert({
        author_id: payload.author_id,
        ...(includePostTypeColumn ? { post_type: payload.post_type } : {}),
        title: payload.title,
        description: payload.description,
        source_name: payload.source_name,
        prediction_content: payload.prediction_content,
        status: payload.status,
        credibility_score: payload.credibility_score,
      })
      .select('id')
      .single()
  }

  return postResult
}

export async function createPostRecord({ mode, createPath, formData }: CreatePostOptions) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    redirectToCreateForm(createPath, mode, formData, {
      error: 'missing-supabase-env',
    })
  }

  const client = supabase!
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(createPath)}`)
  }

  const { data: profile } = await client
    .from(LETSWITNESS_TABLES.profiles)
    .select('id, username')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.username) {
    redirect('/onboarding')
  }

  const tags = normalizeTags(formData.get('tags'))
  const parsedTags = postTagSchema.array().min(1).max(5).safeParse(tags)

  if (!parsedTags.success) {
    redirectToCreateForm(createPath, mode, formData, {
      error: 'invalid-tags',
      fieldErrors: {
        tags: 'Choose 1-5 tags with letters, numbers, or hyphens only.',
      },
    })
  }

  const postInput =
    mode === 'tracking'
      ? createTrackingSchema.safeParse({
          title: formData.get('title'),
          description: formData.get('description'),
          sourceName: formData.get('sourceName'),
          predictionContent: formData.get('predictionContent'),
          sourceUrl: formData.get('sourceUrl'),
          tags: parsedTags.data,
        })
      : createPredictionSchema.safeParse({
          title: formData.get('title'),
          description: formData.get('description'),
          predictionContent: formData.get('predictionContent'),
          sourceUrl: formData.get('sourceUrl'),
          tags: parsedTags.data,
        })

  if (!postInput.success) {
    redirectToCreateForm(createPath, mode, formData, {
      error: 'invalid-post',
      fieldErrors: getPostFieldErrors(formData, mode),
    })
  }

  const verificationInput = timePointVerificationSchema.safeParse({
    type: 'time_point',
    title: DEFAULT_VERIFICATION_TITLE,
    description: formData.get('verificationStandards'),
    targetDate: formData.get('verificationDeadline'),
  })

  if (!verificationInput.success) {
    redirectToCreateForm(createPath, mode, formData, {
      error: 'invalid-event',
      fieldErrors: getVerificationFieldErrors(formData),
    })
  }

  const files = getValidFiles(formData)

  if (files.length > LETSWITNESS_MEDIA_LIMITS.maxFiles) {
    redirectToCreateForm(createPath, mode, formData, {
      error: 'invalid-media',
    })
  }

  const mediaPayload = files.map((file) => {
    const mediaType = getMediaTypeFromFile(file)

    if (!mediaType) {
      return null
    }

    if (file.size > getMediaByteLimit(mediaType)) {
      return null
    }

    return {
      file,
      mediaType,
    }
  })

  if (mediaPayload.some((item) => !item)) {
    redirectToCreateForm(createPath, mode, formData, {
      error: 'invalid-media',
    })
  }

  const parsedPost = postInput.data!
  const verificationData = verificationInput.data!
  const basePostPayload = buildBasePostPayload(mode, profile.id, {
    title: parsedPost.title,
    description: parsedPost.description,
    predictionContent: parsedPost.predictionContent,
    sourceUrl: parsedPost.sourceUrl,
    sourceName:
      mode === 'tracking'
        ? (parsedPost as unknown as { sourceName: string }).sourceName
        : undefined,
  })

  const { data: post, error: postError } = await insertPostRecord(
    client,
    mode,
    createPath,
    formData,
    basePostPayload
  )

  if (postError || !post) {
    redirectToCreateForm(createPath, mode, formData, {
      error: 'create-post-failed',
    })
  }

  const createdPostId = post!.id

  try {
    if (parsedPost.tags.length) {
      await client.from(LETSWITNESS_TABLES.tags).upsert(
        parsedPost.tags.map((tag) => ({
          slug: tag,
          name: tag,
        })),
        {
          onConflict: 'slug',
        }
      )

      const { data: storedTags, error: tagLookupError } = await client
        .from(LETSWITNESS_TABLES.tags)
        .select('id, slug')
        .in('slug', parsedPost.tags)

      if (tagLookupError) {
        throw tagLookupError
      }

      if (storedTags?.length) {
        await client.from(LETSWITNESS_TABLES.postTags).insert(
          storedTags.map((tag) => ({
            post_id: createdPostId,
            tag_id: tag.id,
          }))
        )
      }
    }

    const { error: verificationError } = await client
      .from(LETSWITNESS_TABLES.verificationEvents)
      .insert({
        post_id: createdPostId,
        type: verificationData.type,
        title: verificationData.title,
        description: verificationData.description,
        target_date: verificationData.targetDate,
        deadline: null,
        status: 'waiting',
      })

    if (verificationError) {
      throw verificationError
    }

    if (mediaPayload.length) {
      const uploadedMedia = []

      for (const [index, item] of mediaPayload.entries()) {
        if (!item) {
          continue
        }

        const storagePath = `${profile.id}/${createdPostId}/${Date.now()}-${index}-${sanitizeStorageName(item.file.name)}`
        const { error: uploadError } = await client.storage
          .from(LETSWITNESS_MEDIA_BUCKET)
          .upload(storagePath, item.file, {
            cacheControl: '3600',
            contentType: item.file.type,
            upsert: false,
          })

        if (uploadError) {
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = client.storage.from(LETSWITNESS_MEDIA_BUCKET).getPublicUrl(storagePath)

        uploadedMedia.push({
          post_id: createdPostId,
          media_type: item.mediaType,
          storage_path: storagePath,
          public_url: publicUrl,
          file_size: item.file.size,
        })
      }

      if (uploadedMedia.length) {
        const { error: mediaError } = await client
          .from(LETSWITNESS_TABLES.postMedia)
          .insert(uploadedMedia)

        if (mediaError) {
          throw mediaError
        }
      }
    }
  } catch {
    await client.from(LETSWITNESS_TABLES.posts).delete().eq('id', createdPostId)
    redirectToCreateForm(createPath, mode, formData, {
      error: 'create-related-records-failed',
    })
  }

  revalidatePath('/')
  revalidatePath('/explore')
  revalidatePath('/search')
  revalidatePath(`/post/${createdPostId}`)
  revalidatePath(`/user/${profile.username}`)

  redirect(`/post/${createdPostId}?created=1`)
}
