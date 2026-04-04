import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { updatePostAction } from '@/app/post/[id]/actions'
import { PostOwnerActions } from '@/components/feed/post-owner-actions'
import { Button, buttonVariants } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { getPostById, getViewerProfile } from '@/lib/data/posts'

export const metadata: Metadata = {
  title: 'Edit Post',
  robots: {
    index: false,
    follow: false,
  },
}

interface EditPostPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ error?: string }>
}

const errorMessages: Record<string, string> = {
  'invalid-update': 'Please review required fields and try again.',
  'update-post-failed': 'We could not update this post. Please try again.',
  'update-event-failed': 'We could not update the verification event. Please try again.',
  'update-tags-failed': 'We could not update tags. Please try again.',
  'update-media-failed': 'We could not update media. Please try again.',
  'save-draft-failed': 'We could not save this post as draft. Please try again.',
  'withdraw-failed': 'We could not withdraw this post. Please try again.',
}

export default async function EditPostPage({ params, searchParams }: EditPostPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const [viewer, post] = await Promise.all([getViewerProfile(), getPostById(id)])

  if (!viewer) {
    redirect(`/login?next=/post/${id}/edit`)
  }

  if (!viewer.username) {
    redirect('/onboarding')
  }

  if (!post) {
    redirect('/explore')
  }

  if (post.author.id !== viewer.id) {
    redirect(`/post/${id}`)
  }

  const event = post.verificationEvents[0]
  const errorMessage = query?.error ? errorMessages[query.error] ?? 'Something went wrong.' : null

  return (
    <div className='mx-auto max-w-3xl space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Edit {post.postType === 'tracking' ? 'Tracking' : 'Prediction'}</CardTitle>
          <CardDescription>Update content or withdraw this published post.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updatePostAction} className='space-y-5'>
            {errorMessage ? (
              <div className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
                {errorMessage}
              </div>
            ) : null}
            <input name='postId' type='hidden' value={post.id} />
            <input name='postType' type='hidden' value={post.postType} />
            <input name='returnPath' type='hidden' value={`/post/${post.id}/edit`} />
            <input name='verificationEventId' type='hidden' value={event?.id ?? ''} />

            <div className='space-y-2'>
              <Label htmlFor='title'>Title</Label>
              <Input defaultValue={post.title} id='title' name='title' required />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea defaultValue={post.description} id='description' name='description' required />
            </div>

            {post.postType === 'tracking' ? (
              <div className='space-y-2'>
              <Label htmlFor='sourceName'>Who made this prediction?</Label>
                <Input
                  defaultValue={post.sourceName ?? ''}
                  id='sourceName'
                  name='sourceName'
                  required
                />
              </div>
            ) : null}

            <div className='space-y-2'>
              <Label htmlFor='predictionContent'>
                {post.postType === 'tracking'
                  ? 'What is his/her/their prediction?'
                  : 'What is your prediction?'}
              </Label>
              <Textarea
                defaultValue={post.predictionContent ?? ''}
                id='predictionContent'
                name='predictionContent'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='sourceUrl'>
                Link (Optional)
              </Label>
              <Input defaultValue={post.sourceUrl ?? ''} id='sourceUrl' name='sourceUrl' type='url' />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='tags'>Tags</Label>
              <Input defaultValue={post.tags.join(',')} id='tags' name='tags' required />
              <p className='text-xs text-muted-foreground'>
                Use comma-separated tags, up to 5.
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='verificationStandards'>
                What milestones indicate the success of this prediction? (Optional)
              </Label>
              <Textarea
                defaultValue={event?.description ?? ''}
                id='verificationStandards'
                name='verificationStandards'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='verificationDeadline'>Deadline</Label>
              <Input
                defaultValue={event?.targetDate ?? ''}
                id='verificationDeadline'
                name='verificationDeadline'
                required
                type='date'
              />
            </div>

            <div className='space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-4'>
              <Label>Media</Label>
              {post.media.length ? (
                <div className='grid gap-3 sm:grid-cols-2'>
                  {post.media.map((item) => (
                    <label
                      className='space-y-2 rounded-md border border-zinc-200 bg-white p-3'
                      key={item.id}>
                      {item.type === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt='Existing media'
                          className='h-24 w-full rounded object-cover'
                          src={item.url ?? ''}
                        />
                      ) : item.type === 'audio' ? (
                        <audio className='w-full' controls src={item.url ?? undefined}>
                          Your browser does not support audio playback.
                        </audio>
                      ) : (
                        <video className='h-24 w-full rounded bg-black object-cover' controls src={item.url ?? undefined}>
                          Your browser does not support video playback.
                        </video>
                      )}
                      <span className='flex items-center gap-2 text-sm text-zinc-700'>
                        <input name='removeMediaIds' type='checkbox' value={item.id} />
                        Remove this media
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>No media attached yet.</p>
              )}
              <div className='space-y-2'>
                <Label htmlFor='mediaFiles'>Upload New Media</Label>
                <Input accept='image/*,audio/*,video/*' id='mediaFiles' multiple name='mediaFiles' type='file' />
                <p className='text-xs text-muted-foreground'>
                  You can remove existing media and add new files in the same update.
                </p>
              </div>
            </div>

            <div className='flex flex-wrap gap-3'>
              <Button type='submit'>Save Changes</Button>
              <Link className={buttonVariants({ variant: 'outline' })} href={`/post/${post.id}`}>
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className='border-rose-200'>
        <CardHeader>
          <CardTitle className='text-lg'>Delete Post</CardTitle>
          <CardDescription>
            Choose whether to hide this post as a draft or permanently delete it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PostOwnerActions postId={post.id} returnPath={`/post/${post.id}/edit`} />
        </CardContent>
      </Card>
    </div>
  )
}
