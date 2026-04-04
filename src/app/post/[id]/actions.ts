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
import { createCommentSchema } from '@/lib/validators/comment'
import { postTagSchema } from '@/lib/validators/post'
import {
  credibilityVoteSchema,
  verificationVoteSchema,
} from '@/lib/validators/vote'
import {
  insertNotification,
  recalculateCredibilityScore,
  syncVerificationStates,
  triggerVerificationEvent,
} from '@/lib/data/workflows'

function getReturnPath(formData: FormData, fallback = '/') {
  const value = formData.get('returnPath')

  if (typeof value === 'string' && value.startsWith('/')) {
    return value
  }

  return fallback
}

async function requireViewer() {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    redirect('/login?error=missing-supabase-env')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from(LETSWITNESS_TABLES.profiles)
    .select('id, username, display_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.id) {
    redirect('/onboarding')
  }

  return {
    supabase,
    profile,
  }
}

function revalidatePostSurface(postId: string) {
  revalidatePath('/')
  revalidatePath('/explore')
  revalidatePath('/search')
  revalidatePath(`/post/${postId}`)
}

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

export async function submitCredibilityVoteAction(formData: FormData) {
  const returnPath = getReturnPath(formData)
  const { supabase, profile } = await requireViewer()

  const parsed = credibilityVoteSchema.safeParse({
    postId: formData.get('postId'),
    value: formData.get('value') === 'true',
  })

  if (!parsed.success) {
    redirect(returnPath)
  }

  const { error } = await supabase
    .from(LETSWITNESS_TABLES.credibilityVotes)
    .upsert(
      {
        post_id: parsed.data.postId,
        user_id: profile.id,
        value: parsed.data.value,
      },
      {
        onConflict: 'post_id,user_id',
      }
    )

  if (!error) {
    await recalculateCredibilityScore(supabase, parsed.data.postId)
  }

  revalidatePostSurface(parsed.data.postId)
  redirect(returnPath)
}

export async function submitVerificationVoteAction(formData: FormData) {
  const returnPath = getReturnPath(formData)
  const { supabase, profile } = await requireViewer()

  const parsed = verificationVoteSchema.safeParse({
    verificationEventId: formData.get('verificationEventId'),
    result: formData.get('result'),
  })

  if (!parsed.success) {
    redirect(returnPath)
  }

  const { data: event } = await supabase
    .from(LETSWITNESS_TABLES.verificationEvents)
    .select('id, post_id, status')
    .eq('id', parsed.data.verificationEventId)
    .maybeSingle()

  if (!event || event.status !== 'triggered') {
    redirect(returnPath)
  }

  await supabase
    .from(LETSWITNESS_TABLES.verificationVotes)
    .upsert(
      {
        verification_event_id: parsed.data.verificationEventId,
        user_id: profile.id,
        result: parsed.data.result,
      },
      {
        onConflict: 'verification_event_id,user_id',
      }
    )

  await syncVerificationStates(supabase, [event.post_id])

  const { data: updatedPost } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select('id, status, author_id, title')
    .eq('id', event.post_id)
    .maybeSingle()

  if (
    updatedPost &&
    ['fulfilled', 'unfulfilled', 'partially_fulfilled'].includes(updatedPost.status) &&
    updatedPost.author_id !== profile.id
  ) {
    await insertNotification(supabase, {
      userId: updatedPost.author_id,
      type: 'vote_result',
      referenceId: updatedPost.id,
      message: `"${updatedPost.title}" now has a final verification result.`,
    })
  }

  revalidatePostSurface(event.post_id)
  redirect(returnPath)
}

export async function submitEventTriggerConfirmAction(formData: FormData) {
  const returnPath = getReturnPath(formData)
  const { supabase, profile } = await requireViewer()
  const verificationEventId = formData.get('verificationEventId')
  const evidenceUrl = formData.get('evidenceUrl')

  if (typeof verificationEventId !== 'string' || !verificationEventId) {
    redirect(returnPath)
  }

  const { data: event } = await supabase
    .from(LETSWITNESS_TABLES.verificationEvents)
    .select('id, post_id, status, type, title')
    .eq('id', verificationEventId)
    .maybeSingle()

  if (!event || event.type !== 'event_trigger' || event.status !== 'waiting') {
    redirect(returnPath)
  }

  const { data: post } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select('author_id')
    .eq('id', event.post_id)
    .maybeSingle()

  const authorId = post?.author_id ?? null

  await supabase
    .from(LETSWITNESS_TABLES.eventTriggerConfirms)
    .upsert(
      {
        verification_event_id: verificationEventId,
        user_id: profile.id,
        confirmed: true,
      },
      {
        onConflict: 'verification_event_id,user_id',
      }
    )

  const { count } = await supabase
    .from(LETSWITNESS_TABLES.eventTriggerConfirms)
    .select('id', { count: 'exact', head: true })
    .eq('verification_event_id', verificationEventId)

  const shouldTrigger = (count ?? 0) >= 10 || authorId === profile.id

  if (shouldTrigger) {
    await triggerVerificationEvent(
      supabase,
      verificationEventId,
      profile.id,
      typeof evidenceUrl === 'string' ? evidenceUrl : null
    )

    if (authorId && authorId !== profile.id) {
      await insertNotification(supabase, {
        userId: authorId,
        type: 'event_triggered',
        referenceId: event.post_id,
        message: `"${event.title}" has entered verification.`,
      })
    }
  }

  await syncVerificationStates(supabase, [event.post_id])
  revalidatePostSurface(event.post_id)
  redirect(returnPath)
}

export async function submitCommentAction(formData: FormData) {
  const returnPath = getReturnPath(formData)
  const { supabase, profile } = await requireViewer()

  const parsed = createCommentSchema.safeParse({
    postId: formData.get('postId'),
    content: formData.get('content'),
    parentId: formData.get('parentId') || undefined,
  })

  if (!parsed.success) {
    redirect(returnPath)
  }

  let parentAuthorId: string | null = null

  if (parsed.data.parentId) {
    const { data: parent } = await supabase
      .from(LETSWITNESS_TABLES.comments)
      .select('id, post_id, parent_id, author_id')
      .eq('id', parsed.data.parentId)
      .maybeSingle()

    if (!parent || parent.post_id !== parsed.data.postId || parent.parent_id) {
      redirect(returnPath)
    }

    parentAuthorId = parent.author_id
  }

  const { error } = await supabase.from(LETSWITNESS_TABLES.comments).insert({
    post_id: parsed.data.postId,
    author_id: profile.id,
    parent_id: parsed.data.parentId ?? null,
    content: parsed.data.content,
  })

  if (!error && parentAuthorId && parentAuthorId !== profile.id) {
    await insertNotification(supabase, {
      userId: parentAuthorId,
      type: 'comment_reply',
      referenceId: parsed.data.postId,
      message: `${profile.display_name ?? profile.username ?? 'A contributor'} replied to your comment.`,
    })
  }

  revalidatePostSurface(parsed.data.postId)
  redirect(returnPath)
}

export async function togglePostFollowAction(formData: FormData) {
  const returnPath = getReturnPath(formData, '/')
  const { supabase, profile } = await requireViewer()
  const postId = formData.get('postId')

  if (typeof postId !== 'string' || !postId) {
    redirect(returnPath)
  }

  const { data: post } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select('id, author_id')
    .eq('id', postId)
    .maybeSingle()

  if (!post) {
    redirect(returnPath)
  }

  if (post.author_id === profile.id) {
    redirect(returnPath)
  }

  const { data: existingFollow, error: followLookupError } = await supabase
    .from(LETSWITNESS_TABLES.postFollows)
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', profile.id)
    .maybeSingle()

  if (followLookupError && followLookupError.code !== 'PGRST116') {
    redirect(returnPath)
  }

  if (existingFollow) {
    const { error: deleteError } = await supabase
      .from(LETSWITNESS_TABLES.postFollows)
      .delete()
      .eq('post_id', postId)
      .eq('user_id', profile.id)

    if (deleteError) {
      redirect(returnPath)
    }
  } else {
    const { error: insertError } = await supabase
      .from(LETSWITNESS_TABLES.postFollows)
      .insert({
        post_id: postId,
        user_id: profile.id,
      })

    if (insertError) {
      redirect(returnPath)
    }
  }

  revalidatePostSurface(postId)

  if (profile.username) {
    revalidatePath(`/user/${profile.username}`)
  }

  const { data: authorProfile } = await supabase
    .from(LETSWITNESS_TABLES.profiles)
    .select('username')
    .eq('id', post.author_id)
    .maybeSingle()

  if (authorProfile?.username) {
    revalidatePath(`/user/${authorProfile.username}`)
  }

  redirect(returnPath)
}

export async function updatePostAction(formData: FormData) {
  const returnPath = getReturnPath(formData, '/')
  const { supabase, profile } = await requireViewer()

  const postId = formData.get('postId')
  const postType = formData.get('postType')
  const verificationEventId = formData.get('verificationEventId')

  if (
    typeof postId !== 'string' ||
    !postId ||
    (postType !== 'tracking' && postType !== 'prediction')
  ) {
    redirect(returnPath)
  }

  const { data: post } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select('id, author_id')
    .eq('id', postId)
    .maybeSingle()

  if (!post || post.author_id !== profile.id) {
    redirect(returnPath)
  }

  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? ''
  const predictionContent = (formData.get('predictionContent') as string | null)?.trim() ?? ''
  const sourceName = (formData.get('sourceName') as string | null)?.trim() ?? ''
  const sourceUrl = (formData.get('sourceUrl') as string | null)?.trim() ?? ''
  const verificationStandards =
    (formData.get('verificationStandards') as string | null)?.trim() ?? ''
  const verificationDeadline =
    (formData.get('verificationDeadline') as string | null)?.trim() ?? ''
  const tags = normalizeTags(formData.get('tags'))
  const parsedTags = postTagSchema.array().min(1).max(5).safeParse(tags)
  const files = getValidFiles(formData)
  const removeMediaIds = formData
    .getAll('removeMediaIds')
    .filter((value): value is string => typeof value === 'string' && value.length > 0)

  if (files.length > LETSWITNESS_MEDIA_LIMITS.maxFiles) {
    redirect(`${returnPath}?error=update-media-failed`)
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
    redirect(`${returnPath}?error=update-media-failed`)
  }

  if (
    !title ||
    !description ||
    !predictionContent ||
    !verificationDeadline ||
    (postType === 'tracking' && !sourceName) ||
    !parsedTags.success ||
    (sourceUrl && !/^https?:\/\/.+/i.test(sourceUrl))
  ) {
    redirect(`${returnPath}?error=invalid-update`)
  }

  const postPayload = {
    title,
    description,
    prediction_content: predictionContent,
    source_name: postType === 'tracking' ? sourceName : null,
    source_url: sourceUrl || null,
  }

  const { error: updatePostError } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .update(postPayload)
    .eq('id', postId)

  if (updatePostError) {
    redirect(`${returnPath}?error=update-post-failed`)
  }

  if (typeof verificationEventId === 'string' && verificationEventId) {
    const { error: updateEventError } = await supabase
      .from(LETSWITNESS_TABLES.verificationEvents)
      .update({
        description: verificationStandards,
        target_date: verificationDeadline,
      })
      .eq('id', verificationEventId)
      .eq('post_id', postId)

    if (updateEventError) {
      redirect(`${returnPath}?error=update-event-failed`)
    }
  }

  await supabase.from(LETSWITNESS_TABLES.tags).upsert(
    parsedTags.data.map((tag) => ({
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
    .in('slug', parsedTags.data)

  if (tagLookupError) {
    redirect(`${returnPath}?error=update-tags-failed`)
  }

  await supabase.from(LETSWITNESS_TABLES.postTags).delete().eq('post_id', postId)

  if (storedTags?.length) {
    const { error: insertTagError } = await supabase
      .from(LETSWITNESS_TABLES.postTags)
      .insert(
        storedTags.map((tag) => ({
          post_id: postId,
          tag_id: tag.id,
        }))
      )

    if (insertTagError) {
      redirect(`${returnPath}?error=update-tags-failed`)
    }
  }

  const { data: existingMediaRows, error: mediaLookupError } = await supabase
    .from(LETSWITNESS_TABLES.postMedia)
    .select('id, storage_path')
    .eq('post_id', postId)

  if (mediaLookupError) {
    redirect(`${returnPath}?error=update-media-failed`)
  }

  const mediaToRemove = (existingMediaRows ?? []).filter((row) => removeMediaIds.includes(row.id))
  const remainingMediaCount = (existingMediaRows?.length ?? 0) - mediaToRemove.length

  if (remainingMediaCount + mediaPayload.length > LETSWITNESS_MEDIA_LIMITS.maxFiles) {
    redirect(`${returnPath}?error=update-media-failed`)
  }

  if (mediaToRemove.length) {
    const { error: removeStorageError } = await supabase.storage
      .from(LETSWITNESS_MEDIA_BUCKET)
      .remove(mediaToRemove.map((row) => row.storage_path))

    if (removeStorageError) {
      redirect(`${returnPath}?error=update-media-failed`)
    }

    const { error: removeMediaError } = await supabase
      .from(LETSWITNESS_TABLES.postMedia)
      .delete()
      .in(
        'id',
        mediaToRemove.map((row) => row.id)
      )

    if (removeMediaError) {
      redirect(`${returnPath}?error=update-media-failed`)
    }
  }

  if (mediaPayload.length) {
    const uploadedMedia = []

    for (const [index, item] of mediaPayload.entries()) {
      if (!item) {
        continue
      }

      const storagePath = `${profile.id}/${postId}/edit-${Date.now()}-${index}-${sanitizeStorageName(item.file.name)}`
      const { error: uploadError } = await supabase.storage
        .from(LETSWITNESS_MEDIA_BUCKET)
        .upload(storagePath, item.file, {
          cacheControl: '3600',
          contentType: item.file.type,
          upsert: false,
        })

      if (uploadError) {
        redirect(`${returnPath}?error=update-media-failed`)
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(LETSWITNESS_MEDIA_BUCKET).getPublicUrl(storagePath)

      uploadedMedia.push({
        post_id: postId,
        media_type: item.mediaType,
        storage_path: storagePath,
        public_url: publicUrl,
        file_size: item.file.size,
      })
    }

    if (uploadedMedia.length) {
      const { error: insertMediaError } = await supabase
        .from(LETSWITNESS_TABLES.postMedia)
        .insert(uploadedMedia)

      if (insertMediaError) {
        redirect(`${returnPath}?error=update-media-failed`)
      }
    }
  }

  revalidatePostSurface(postId)
  revalidatePath(`/user/${profile.username}`)
  redirect(`/post/${postId}?updated=1`)
}

export async function withdrawPostAction(formData: FormData) {
  const returnPath = getReturnPath(formData, '/')
  const { supabase, profile } = await requireViewer()
  const postId = formData.get('postId')

  if (typeof postId !== 'string' || !postId) {
    redirect(returnPath)
  }

  const { data: post } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select('id, author_id')
    .eq('id', postId)
    .maybeSingle()

  if (!post || post.author_id !== profile.id) {
    redirect(returnPath)
  }

  const { error } = await supabase.from(LETSWITNESS_TABLES.posts).delete().eq('id', postId)

  if (error) {
    redirect(`/post/${postId}?error=withdraw-failed`)
  }

  revalidatePath('/')
  revalidatePath('/explore')
  revalidatePath('/search')
  revalidatePath(`/user/${profile.username}`)
  redirect('/?withdrawn=1')
}

export async function savePostAsDraftAction(formData: FormData) {
  const returnPath = getReturnPath(formData, '/')
  const { supabase, profile } = await requireViewer()
  const postId = formData.get('postId')

  if (typeof postId !== 'string' || !postId) {
    redirect(returnPath)
  }

  const { data: post } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select('id, author_id')
    .eq('id', postId)
    .maybeSingle()

  if (!post || post.author_id !== profile.id) {
    redirect(returnPath)
  }

  const { error } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .update({
      status: 'draft',
    })
    .eq('id', postId)

  if (error) {
    redirect(`/post/${postId}?error=save-draft-failed`)
  }

  revalidatePath('/')
  revalidatePath('/explore')
  revalidatePath('/search')
  revalidatePath(`/post/${postId}`)
  revalidatePath(`/user/${profile.username}`)
  redirect(`/post/${postId}?savedDraft=1`)
}
