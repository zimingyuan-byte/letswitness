import type { Metadata } from 'next'
import Link from 'next/link'
import { PostCard } from '@/components/feed/post-card'
import { buttonVariants } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { siteConfig } from '@/config'
import type { PostStatus } from '@/lib/domain'
import { getExplorePosts } from '@/lib/data/posts'

export const metadata: Metadata = {
  title: 'Explore Prediction Tracking Records',
  description:
    'Browse public prediction tracking records by source, topic, and verification status on LetsWitness.',
  keywords: [
    ...siteConfig.keywords,
    'explore predictions',
    'prediction archive',
    'verification status',
  ],
  alternates: {
    canonical: '/explore',
  },
}

interface ExplorePageProps {
  searchParams?: Promise<{
    status?: string
    source?: string
    tag?: string
    sort?: string
  }>
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = (await searchParams) ?? {}
  const status = params.status?.trim() ?? ''
  const source = params.source?.trim() ?? ''
  const tag = params.tag?.trim() ?? ''
  const sort =
    params.sort === 'highest_credibility' ||
    params.sort === 'most_discussed' ||
    params.sort === 'soonest_to_verify'
      ? params.sort
      : 'newest'
  const allowedStatuses: PostStatus[] = [
    'pending',
    'verifying',
    'fulfilled',
    'unfulfilled',
    'partially_fulfilled',
    'expired',
  ]
  const normalizedStatus = allowedStatuses.includes(status as PostStatus)
    ? (status as PostStatus)
    : undefined

  const posts = await getExplorePosts({
    status: normalizedStatus,
    source: source || undefined,
    tag: tag || undefined,
    sort,
    limit: 50,
  })

  return (
    <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
      <section className='space-y-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Explore prediction tracking records</h1>
          <p className='text-sm text-muted-foreground'>
            Browse public predictions by topic, source, and verification status to see what
            the community is tracking and reviewing.
          </p>
        </div>
        <form action='/explore' className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
          <select
            className='flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background'
            defaultValue={status}
            name='status'>
            <option value=''>All statuses</option>
            <option value='pending'>Pending</option>
            <option value='verifying'>Verifying</option>
            <option value='fulfilled'>Fulfilled</option>
            <option value='unfulfilled'>Unfulfilled</option>
            <option value='partially_fulfilled'>Partially fulfilled</option>
            <option value='expired'>Expired</option>
          </select>
          <Input defaultValue={source} name='source' placeholder='Filter by source' />
          <Input defaultValue={tag} name='tag' placeholder='Filter by tag' />
          <select
            className='flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background'
            defaultValue={sort}
            name='sort'>
            <option value='newest'>Newest</option>
            <option value='highest_credibility'>Highest credibility</option>
            <option value='most_discussed'>Most discussed</option>
            <option value='soonest_to_verify'>Soonest to verify</option>
          </select>
          <div className='flex gap-3 md:col-span-2 xl:col-span-4'>
            <button
              className={buttonVariants()}
              type='submit'>
              Apply filters
            </button>
            <Link className={buttonVariants({ variant: 'outline' })} href='/explore'>
              Reset
            </Link>
          </div>
        </form>
        <div className='space-y-4'>
          {posts.length ? (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <Card>
              <CardContent className='p-6 text-sm text-muted-foreground'>
                No predictions are available yet. Create one to start the archive.
              </CardContent>
            </Card>
          )}
        </div>
      </section>
      <aside className='space-y-4'>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Explore highlights</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm text-muted-foreground'>
            <p>Follow predictions that are still pending, already under review, or fully resolved.</p>
            <p>Compare prediction records across public figures, companies, campaigns, and institutions.</p>
            <p>Find witness records that are drawing the most attention from the community.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
