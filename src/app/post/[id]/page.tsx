import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CommentThreadShell } from '@/components/feed/comment-thread-shell'
import { CredibilityVotePanel } from '@/components/feed/credibility-vote-panel'
import { MediaGallery } from '@/components/feed/media-gallery'
import { StatusPill } from '@/components/feed/status-pill'
import { VerificationCard } from '@/components/feed/verification-card'
import { VerificationVotePanel } from '@/components/feed/verification-vote-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { siteConfig } from '@/config'
import { getPostById, getPostComments, getViewerProfile } from '@/lib/data/posts'
import { formatTimeToNow } from '@/lib/utils'

interface PostDetailPageProps {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    created?: string
  }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getPostById(id)

  if (!post) {
    return {
      title: 'Prediction Record Not Found',
      description: 'The requested prediction tracking record could not be found on LetsWitness.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const description = `Track and verify this public prediction from ${post.sourceName}. Review the evidence, verification events, and community credibility discussion on LetsWitness.`

  return {
    title: `${post.title} | Prediction Tracking Record`,
    description,
    keywords: [
      ...siteConfig.keywords,
      post.sourceName,
      ...post.tags,
      'prediction record',
      'prediction verification',
    ],
    alternates: {
      canonical: `/post/${post.id}`,
    },
    openGraph: {
      title: `${post.title} | Prediction Tracking Record`,
      description,
      url: `${siteConfig.url}/post/${post.id}`,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: `${post.title} | Prediction Tracking Record`,
      description,
    },
  }
}

export default async function PostDetailPage({ params, searchParams }: PostDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const [post, comments, viewer] = await Promise.all([
    getPostById(id),
    getPostComments(id),
    getViewerProfile(),
  ])

  if (!post) {
    notFound()
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    author: {
      '@type': 'Person',
      name: post.author.displayName ?? post.author.username,
    },
    datePublished: post.createdAt,
    mainEntityOfPage: `${siteConfig.url}/post/${post.id}`,
    keywords: ['prediction tracking', 'prediction verification', 'witness record', ...post.tags],
    about: [
      {
        '@type': 'Thing',
        name: post.sourceName,
      },
    ],
  }

  return (
    <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className='space-y-6'>
        {query?.created === '1' ? (
          <Card className='border-emerald-200 bg-emerald-50'>
            <CardContent className='p-4 text-sm text-emerald-800'>
              Prediction published successfully.
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader className='space-y-3'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-sm text-muted-foreground'>
                  @{post.author.username} · {formatTimeToNow(new Date(post.createdAt))}
                </p>
                <h1 className='mt-2 text-3xl font-semibold tracking-tight'>{post.title}</h1>
              </div>
              <StatusPill status={post.status} />
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='leading-7 text-zinc-700'>{post.description}</p>
            <div className='flex flex-wrap gap-2'>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className='rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700'>
                  #{tag}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <MediaGallery media={post.media} sourceName={post.sourceName} sourceUrl={post.sourceUrl} />

        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Verification events</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {post.verificationEvents.map((event) => (
              <div className='space-y-4' key={event.id}>
                <VerificationCard
                  event={event}
                  predictionContent={post.predictionContent ?? post.title}
                  predictionSource={post.sourceName}
                />
                <VerificationVotePanel event={event} postId={post.id} viewer={viewer} />
              </div>
            ))}
          </CardContent>
        </Card>

        <CommentThreadShell comments={comments} postId={post.id} viewer={viewer} />
      </section>

      <aside className='space-y-4'>
        <CredibilityVotePanel post={post} viewer={viewer} />
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Record details</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            <p>Use the original source, timing, and verification criteria together when judging this prediction record.</p>
            <p>Clear context helps the community witness whether a public prediction was real and whether it eventually came true.</p>
            <p>{post.commentCount} comments and {post.verificationEvents.length} verification events are attached to this record.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
