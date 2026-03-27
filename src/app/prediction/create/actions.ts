'use server'

import { createPostRecord } from '@/lib/data/create-posts'

export async function createPredictionAction(formData: FormData) {
  await createPostRecord({
    mode: 'prediction',
    createPath: '/prediction/create',
    formData,
  })
}
