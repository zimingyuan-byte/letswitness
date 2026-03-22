import type { PostMediaType } from '@/lib/domain'

export const LETSWITNESS_MEDIA_BUCKET = 'letswitness-media'
export const LETSWITNESS_MEDIA_LIMITS = {
  maxFiles: 5,
  imageBytes: 10 * 1024 * 1024,
  audioBytes: 50 * 1024 * 1024,
  videoBytes: 200 * 1024 * 1024,
}

export function getMediaTypeFromFile(file: File): PostMediaType | null {
  if (file.type.startsWith('image/')) {
    return 'image'
  }

  if (file.type.startsWith('audio/')) {
    return 'audio'
  }

  if (file.type.startsWith('video/')) {
    return 'video'
  }

  return null
}

export function getMediaByteLimit(type: PostMediaType) {
  switch (type) {
    case 'image':
      return LETSWITNESS_MEDIA_LIMITS.imageBytes
    case 'audio':
      return LETSWITNESS_MEDIA_LIMITS.audioBytes
    case 'video':
      return LETSWITNESS_MEDIA_LIMITS.videoBytes
  }
}

export function sanitizeStorageName(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').toLowerCase()
}
