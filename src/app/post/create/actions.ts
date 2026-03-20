'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
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
  } catch {
    await supabase.from(LETSWITNESS_TABLES.posts).delete().eq('id', createdPostId)
    redirect('/post/create?error=create-related-records-failed')
  }

  revalidatePath('/')
  revalidatePath('/explore')
  revalidatePath(`/post/${createdPostId}`)
  revalidatePath(`/user/${profile.username}`)

  redirect(`/post/${createdPostId}?created=1`)
}
