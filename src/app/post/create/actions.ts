'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getMediaByteLimit,
  getMediaTypeFromFile,
  LETSWITNESS_MEDIA_BUCKET,
  LETSWITNESS_MEDIA_LIMITS,
  sanitizeStorageName,
} from '@/lib/supabase/storage'
import { LETSWITNESS_TABLES } from '@/lib/supabase/tables'
import { createPostSchema, postTagSchema } from '@/lib/validators/post'
import {
  timePointVerificationSchema,
} from '@/lib/validators/verification'

type CreatePredictionField =
  | 'title'
  | 'sourceName'
  | 'sourceUrl'
  | 'description'
  | 'tags'
  | 'verificationStandards'
  | 'verificationDeadline'

const DEFAULT_VERIFICATION_TITLE = 'Verification Deadline'

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

function redirectToCreatePost(
  formData: FormData,
  options: {
    error?: string
    fieldErrors?: Partial<Record<CreatePredictionField, string>>
  }
) {
  const params = new URLSearchParams()

  if (options.error) {
    params.set('error', options.error)
  }

  const fieldsToPersist = [
    'title',
    'sourceName',
    'sourceUrl',
    'description',
    'tags',
    'verificationStandards',
    'verificationDeadline',
  ] as const

  for (const field of fieldsToPersist) {
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
  redirect(query ? `/post/create?${query}` : '/post/create')
}

function getPostFieldErrors(formData: FormData) {
  const title = getStringValue(formData, 'title').trim()
  const sourceName = getStringValue(formData, 'sourceName').trim()
  const sourceUrl = getStringValue(formData, 'sourceUrl').trim()
  const description = getStringValue(formData, 'description').trim()

  return {
    title:
      title.length < 8 || title.length > 120
        ? 'Use 8-120 characters and summarize the claim in one clear sentence.'
        : undefined,
    sourceName:
      sourceName.length < 2 || sourceName.length > 120
        ? 'Enter the person or organization that made the prediction.'
        : /^https?:\/\//i.test(sourceName)
          ? 'Enter the speaker or organization name here, not a URL. Put links in Description.'
          : undefined,
    sourceUrl:
      sourceUrl && !/^https?:\/\/.+/i.test(sourceUrl)
        ? 'Enter a full URL starting with http:// or https://.'
        : undefined,
    description:
      description.length < 30 || description.length > 5000
        ? 'Add at least 30 characters of context, including what was said, when, and any useful source link.'
        : undefined,
  } satisfies Partial<Record<CreatePredictionField, string>>
}

function getVerificationFieldErrors(formData: FormData) {
  const verificationStandards = getStringValue(formData, 'verificationStandards').trim()
  const verificationDeadline = getStringValue(formData, 'verificationDeadline').trim()

  return {
    verificationStandards:
      verificationStandards.length < 5 || verificationStandards.length > 500
        ? 'Explain what outcome should happen so other users can verify this prediction fairly.'
        : undefined,
    verificationDeadline:
      !verificationDeadline
        ? 'Choose the date when this prediction should be checked.'
        : undefined,
  } satisfies Partial<Record<CreatePredictionField, string>>
}

export async function createPredictionAction(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    redirectToCreatePost(formData, {
      error: 'missing-supabase-env',
    })
  }

  const client = supabase!

  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    redirect('/login?next=/post/create')
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
    redirectToCreatePost(formData, {
      error: 'invalid-tags',
      fieldErrors: {
        tags: 'Choose 1-5 tags with letters, numbers, or hyphens only.',
      },
    })
  }

  const parsedPost = createPostSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    sourceName: formData.get('sourceName'),
    sourceUrl: formData.get('sourceUrl'),
    tags: parsedTags.data,
  })

  if (!parsedPost.success) {
    redirectToCreatePost(formData, {
      error: 'invalid-post',
      fieldErrors: getPostFieldErrors(formData),
    })
  }

  const postInput = parsedPost.data!
  const verificationInput =
    timePointVerificationSchema.safeParse({
      type: 'time_point',
      title: DEFAULT_VERIFICATION_TITLE,
      description: formData.get('verificationStandards'),
      targetDate: formData.get('verificationDeadline'),
    })

  if (!verificationInput.success) {
    redirectToCreatePost(formData, {
      error: 'invalid-event',
      fieldErrors: getVerificationFieldErrors(formData),
    })
  }

  const verificationData = verificationInput.data!

  const files = getValidFiles(formData)

  if (files.length > LETSWITNESS_MEDIA_LIMITS.maxFiles) {
    redirectToCreatePost(formData, {
      error: 'invalid-media',
    })
  }

  const mediaPayload = files.map((file) => {
    const mediaType = getMediaTypeFromFile(file)

    if (!mediaType) {
      return null
    }

    const maxBytes = getMediaByteLimit(mediaType)

    if (file.size > maxBytes) {
      return null
    }

    return {
      file,
      mediaType,
    }
  })

  if (mediaPayload.some((item) => !item)) {
    redirectToCreatePost(formData, {
      error: 'invalid-media',
    })
  }

  const basePostPayload = {
    author_id: profile.id,
    title: postInput.title,
    description: postInput.description,
    source_name: postInput.sourceName,
    status: 'pending',
    credibility_score: 50,
  }

  let postResult = await client
    .from(LETSWITNESS_TABLES.posts)
    .insert({
      ...basePostPayload,
      source_url: postInput.sourceUrl || null,
    })
    .select('id')
    .single()

  if (postResult.error?.message?.includes('source_url')) {
    postResult = await client
      .from(LETSWITNESS_TABLES.posts)
      .insert(basePostPayload)
      .select('id')
      .single()
  }

  const { data: post, error: postError } = postResult

  if (postError || !post) {
    redirectToCreatePost(formData, {
      error: 'create-post-failed',
    })
  }

  const createdPost = post!
  const createdPostId = createdPost.id

  try {
    if (postInput.tags.length) {
      await client.from(LETSWITNESS_TABLES.tags).upsert(
        postInput.tags.map((tag) => ({
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
        .in('slug', postInput.tags)

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

    const verificationPayload = {
      post_id: createdPostId,
      type: verificationData.type,
      title: verificationData.title,
      description: verificationData.description,
      target_date: verificationData.targetDate,
      deadline: null,
      status: 'waiting',
    }

    const { error: verificationError } = await client
      .from(LETSWITNESS_TABLES.verificationEvents)
      .insert(verificationPayload)

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
    redirectToCreatePost(formData, {
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
