'use server'

import { createPostRecord } from '@/lib/data/create-posts'

export async function createTrackingAction(formData: FormData) {
  await createPostRecord({
    mode: 'tracking',
    createPath: '/post/create',
    formData,
  })
}
