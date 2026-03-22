'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { LETSWITNESS_TABLES } from '@/lib/supabase/tables'
import { createCommentSchema } from '@/lib/validators/comment'
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
