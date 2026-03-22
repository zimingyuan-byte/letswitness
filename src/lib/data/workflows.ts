import 'server-only'

import { LETSWITNESS_TABLES } from '@/lib/supabase/tables'

export async function syncVerificationStates(
  supabase: any,
  postIds?: string[]
) {
  if (!supabase) {
    return
  }

  await supabase.rpc('letswitness_sync_verification_states', {
    p_post_ids: postIds?.length ? postIds : null,
  })
}

export async function recalculateCredibilityScore(
  supabase: any,
  postId: string
) {
  if (!supabase) {
    return
  }

  await supabase.rpc('letswitness_recalculate_credibility_score', {
    p_post_id: postId,
  })
}

export async function triggerVerificationEvent(
  supabase: any,
  eventId: string,
  triggeredBy: string,
  evidenceUrl?: string | null
) {
  if (!supabase) {
    return
  }

  await supabase.rpc('letswitness_trigger_event', {
    p_event_id: eventId,
    p_triggered_by: triggeredBy,
    p_evidence_url: evidenceUrl || null,
  })
}

interface NotificationInput {
  userId: string
  type: string
  referenceId?: string | null
  message: string
}

export async function insertNotification(
  supabase: any,
  input: NotificationInput
) {
  if (!supabase) {
    return
  }

  const { error } = await supabase
    .from(LETSWITNESS_TABLES.notifications)
    .insert({
      user_id: input.userId,
      type: input.type,
      reference_id: input.referenceId ?? null,
      message: input.message,
    })

  if (!error) {
    return
  }

  await supabase.rpc('letswitness_insert_notification', {
    p_user_id: input.userId,
    p_type: input.type,
    p_reference_id: input.referenceId ?? null,
    p_message: input.message,
  })
}
