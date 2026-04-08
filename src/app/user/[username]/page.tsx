import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PostCard } from '@/components/feed/post-card'
import { buttonVariants } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { siteConfig } from '@/config'
import {
  getFollowedPostsByViewer,
  getPostsByUsername,
  getProfileByUsername,
  getViewerProfile,
} from '@/lib/data/posts'

interface UserPageProps {
  params: Promise<{
    username: string
  }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile?.username) {
    return {
      title: 'Contributor Not Found',
      description: 'The requested contributor profile could not be found on LetsWitness.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const displayName = profile.displayName ?? `@${profile.username}`
  const description = `${displayName} publishes and tracks public prediction records on LetsWitness. Browse their prediction archive and verification history.`

  return {
    title: `${displayName} | Prediction Contributor`,
    description,
    robots: {
      index: false,
      follow: false,
    },
    keywords: [
      ...siteConfig.keywords,
      profile.username,
      'prediction contributor',
      'prediction archive',
      'verification history',
    ],
    alternates: {
      canonical: `/user/${profile.username}`,
    },
    openGraph: {
      title: `${displayName} | Prediction Contributor`,
      description,
      url: `${siteConfig.url}/user/${profile.username}`,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${displayName} | Prediction Contributor`,
      description,
    },
  }
}

export default async function UserPage({ params }: UserPageProps) {
  const { username } = await params
  const [profile, authoredPosts, viewer, followedPosts] = await Promise.all([
    getProfileByUsername(username),
    getPostsByUsername(username),
    getViewerProfile(),
    getFollowedPostsByViewer(),
  ])

  if (!profile) {
    notFound()
  }

  const isOwner = viewer?.id === profile.id
  const trackingPosts = authoredPosts.filter((post) => post.postType === 'tracking')
  const predictionPosts = authoredPosts.filter((post) => post.postType === 'prediction')
  const draftTrackingPosts = trackingPosts.filter((post) => post.status === 'draft')
  const draftPredictionPosts = predictionPosts.filter((post) => post.status === 'draft')
  const publishedTrackingPosts = trackingPosts.filter((post) => post.status !== 'draft')
  const publishedPredictionPosts = predictionPosts.filter((post) => post.status !== 'draft')
  const followedTrackingPosts = followedPosts.filter((post) => post.postType === 'tracking')
  const followedPredictionPosts = followedPosts.filter((post) => post.postType === 'prediction')

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-2xl'>@{profile.username}</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm text-muted-foreground'>
            <p>{profile.displayName ?? 'LetsWitness contributor'}</p>
            <p>{profile.email ?? 'Email hidden'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Profile metrics</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm text-muted-foreground'>
            <p>My posts: {authoredPosts.length}</p>
            <p>Tracking: {trackingPosts.length}</p>
            <p>Prediction: {predictionPosts.length}</p>
            <p>My Followed: {isOwner ? followedPosts.length : 0}</p>
          </CardContent>
        </Card>
      </div>

      <section className='space-y-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Profile of @{profile.username}</h1>
          <p className='text-sm text-muted-foreground'>
            Tracking, prediction, drafts, and followed posts are grouped separately.
          </p>
        </div>
        <div className={`grid gap-4 ${isOwner ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          <Card id='my-tracking'>
            <CardHeader>
              <CardTitle className='text-xl'>My Tracking</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {publishedTrackingPosts.length ? (
                publishedTrackingPosts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)
              ) : (
                <p className='text-sm text-muted-foreground'>No published tracking posts yet.</p>
              )}

              <div className='border-t pt-4'>
                <h3 className='text-sm font-semibold text-zinc-900'>Draft</h3>
                <div className='mt-3 space-y-3'>
                  {draftTrackingPosts.length ? (
                    draftTrackingPosts.map((post) => (
                      <Card key={post.id}>
                        <CardContent className='flex items-center justify-between gap-3 p-4'>
                          <div>
                            <p className='font-medium text-zinc-900'>{post.title}</p>
                            <p className='text-xs text-muted-foreground'>Saved as draft</p>
                          </div>
                          {isOwner ? (
                            <Link
                              className={buttonVariants({ variant: 'outline' })}
                              href={`/post/${post.id}/edit`}>
                              Edit Draft
                            </Link>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className='text-sm text-muted-foreground'>No tracking drafts.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id='my-prediction'>
            <CardHeader>
              <CardTitle className='text-xl'>My Prediction</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {publishedPredictionPosts.length ? (
                publishedPredictionPosts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)
              ) : (
                <p className='text-sm text-muted-foreground'>No published prediction posts yet.</p>
              )}

              <div className='border-t pt-4'>
                <h3 className='text-sm font-semibold text-zinc-900'>Draft</h3>
                <div className='mt-3 space-y-3'>
                  {draftPredictionPosts.length ? (
                    draftPredictionPosts.map((post) => (
                      <Card key={post.id}>
                        <CardContent className='flex items-center justify-between gap-3 p-4'>
                          <div>
                            <p className='font-medium text-zinc-900'>{post.title}</p>
                            <p className='text-xs text-muted-foreground'>Saved as draft</p>
                          </div>
                          {isOwner ? (
                            <Link
                              className={buttonVariants({ variant: 'outline' })}
                              href={`/post/${post.id}/edit`}>
                              Edit Draft
                            </Link>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className='text-sm text-muted-foreground'>No prediction drafts.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {isOwner ? (
            <Card id='my-followed'>
              <CardHeader>
                <CardTitle className='text-xl'>My Followed</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <h3 className='text-sm font-semibold text-zinc-900'>Tracking</h3>
                  <div className='mt-3 space-y-4'>
                    {followedTrackingPosts.length ? (
                      followedTrackingPosts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)
                    ) : (
                      <p className='text-sm text-muted-foreground'>No followed tracking posts yet.</p>
                    )}
                  </div>
                </div>
                <div className='border-t pt-4'>
                  <h3 className='text-sm font-semibold text-zinc-900'>Prediction</h3>
                  <div className='mt-3 space-y-4'>
                    {followedPredictionPosts.length ? (
                      followedPredictionPosts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)
                    ) : (
                      <p className='text-sm text-muted-foreground'>No followed prediction posts yet.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  )
}
