import type { PostMediaItem } from '@/lib/domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface MediaGalleryProps {
  media: PostMediaItem[]
}

export function MediaGallery({ media }: MediaGalleryProps) {
  if (!media.length) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Evidence media</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-4'>
          {media.map((item) => (
            <div key={item.id} className='overflow-hidden rounded-lg border bg-white'>
              {item.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt='Prediction evidence'
                  className='h-auto max-h-[28rem] w-full object-cover'
                  src={item.url ?? ''}
                />
              ) : null}
              {item.type === 'audio' ? (
                <div className='p-4'>
                  <audio className='w-full' controls src={item.url ?? undefined}>
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : null}
              {item.type === 'video' ? (
                <video className='max-h-[28rem] w-full bg-black' controls src={item.url ?? undefined}>
                  Your browser does not support video playback.
                </video>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
