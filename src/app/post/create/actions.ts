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
  eventTriggerVerificationSchema,
  timePointVerificationSchema,
  verificationEventTypeSchema,
} from '@/lib/validators/verification'

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

export async function createPredictionAction(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    redirect('/post/create?error=missing-supabase-env')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/post/create')
  }

  const { data: profile } = await supabase
    .from(LETSWITNESS_TABLES.profiles)
    .select('id, username')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.username) {
    redirect('/onboarding')
  }

  const tags = normalizeTags(formData.get('tags'))
  const parsedTags = postTagSchema.array().max(5).safeParse(tags)

  if (!parsedTags.success) {
    redirect('/post/create?error=invalid-tags')
  }

  const parsedPost = createPostSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    sourceName: formData.get('sourceName'),
    tags: parsedTags.data,
  })

  if (!parsedPost.success) {
    redirect('/post/create?error=invalid-post')
  }

  const eventTypeResult = verificationEventTypeSchema.safeParse(formData.get('eventType'))

  if (!eventTypeResult.success) {
    redirect('/post/create?error=invalid-event')
  }

  const verificationInput =
    eventTypeResult.data === 'time_point'
      ? timePointVerificationSchema.safeParse({
          type: 'time_point',
          title: formData.get('verificationTitle'),
          description: formData.get('verificationDescription'),
          targetDate: formData.get('targetDate'),
        })
      : eventTriggerVerificationSchema.safeParse({
          type: 'event_trigger',
          title: formData.get('verificationTitle'),
          description: formData.get('verificationDescription'),
          deadline: formData.get('deadline'),
        })

  if (!verificationInput.success) {
    redirect('/post/create?error=invalid-event')
  }

  const files = getValidFiles(formData)

  if (files.length > LETSWITNESS_MEDIA_LIMITS.maxFiles) {
    redirect('/post/create?error=invalid-media')
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
    redirect('/post/create?error=invalid-media')
  }

  const { data: post, error: postError } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .insert({
      author_id: profile.id,
      title: parsedPost.data.title,
      description: parsedPost.data.description,
      source_name: parsedPost.data.sourceName,
      status: 'pending',
      credibility_score: 50,
    })
    .select('id')
    .single()

  if (postError || !post) {
    redirect('/post/create?error=create-post-failed')
  }

  const createdPostId = post.id

  try {
    if (parsedPost.data.tags.length) {
      await supabase.from(LETSWITNESS_TABLES.tags).upsert(
        parsedPost.data.tags.map((tag) => ({
          slug: tag,
          name: tag,
        })),
        {
          onConflict: 'slug',
        }
      )

      const { data: storedTags, error: tagLookupError } = await supabase
        .from(LETSWITNESS_TABLES.tags)
        .select('id, slug')
        .in('slug', parsedPost.data.tags)

      if (tagLookupError) {
        throw tagLookupError
      }

      if (storedTags?.length) {
        await supabase.from(LETSWITNESS_TABLES.postTags).insert(
          storedTags.map((tag) => ({
            post_id: createdPostId,
            tag_id: tag.id,
          }))
        )
      }
    }

    const verificationPayload =
      verificationInput.data.type === 'time_point'
        ? {
            post_id: createdPostId,
            type: verificationInput.data.type,
            title: verificationInput.data.title,
            description: verificationInput.data.description,
            target_date: verificationInput.data.targetDate,
            deadline: null,
            status: 'waiting',
          }
        : {
            post_id: createdPostId,
            type: verificationInput.data.type,
            title: verificationInput.data.title,
            description: verificationInput.data.description,
            target_date: null,
            deadline: verificationInput.data.deadline,
            status: 'waiting',
          }

    const { error: verificationError } = await supabase
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
        const { error: uploadError } = await supabase.storage
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
        } = supabase.storage.from(LETSWITNESS_MEDIA_BUCKET).getPublicUrl(storagePath)

        uploadedMedia.push({
          post_id: createdPostId,
          media_type: item.mediaType,
          storage_path: storagePath,
          public_url: publicUrl,
          file_size: item.file.size,
        })
      }

      if (uploadedMedia.length) {
        const { error: mediaError } = await supabase
          .from(LETSWITNESS_TABLES.postMedia)
          .insert(uploadedMedia)

        if (mediaError) {
          throw mediaError
        }
      }
    }
  } catch {
    await supabase.from(LETSWITNESS_TABLES.posts).delete().eq('id', createdPostId)
    redirect('/post/create?error=create-related-records-failed')
  }

  revalidatePath('/')
  revalidatePath('/explore')
  revalidatePath('/search')
  revalidatePath(`/post/${createdPostId}`)
  revalidatePath(`/user/${profile.username}`)

  redirect(`/post/${createdPostId}?created=1`)
}
