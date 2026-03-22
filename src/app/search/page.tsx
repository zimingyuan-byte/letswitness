import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { PostCard } from '@/components/feed/post-card'
import { Button, buttonVariants } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { siteConfig } from '@/config'
import type { PostStatus } from '@/lib/domain'
import { getExplorePosts } from '@/lib/data/posts'

interface SearchPageProps {
  searchParams?: Promise<{
    q?: string
    status?: string
    source?: string
    tag?: string
    sort?: string
  }>
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>
}): Promise<Metadata> {
  const params = (await searchParams) ?? {}
  const query = params.q?.trim() ?? ''

  if (!query) {
    return {
      title: 'Search Public Predictions',
      description:
        'Search public predictions, verification records, and witness archives on LetsWitness.',
      keywords: [
        ...siteConfig.keywords,
        'search public predictions',
        'prediction search',
        'verification search',
      ],
      alternates: {
        canonical: '/search',
      },
    }
  }

  return {
    title: `Search "${query}"`,
    description: `Search LetsWitness for public predictions, verification records, and witness archives related to ${query}.`,
    keywords: [...siteConfig.keywords, query, 'prediction search results'],
    alternates: {
      canonical: `/search?q=${encodeURIComponent(query)}`,
    },
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = (await searchParams) ?? {}
  const query = params.q?.trim() ?? ''
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

  const results = await getExplorePosts({
    searchText: query || undefined,
    status: normalizedStatus,
    source: source || undefined,
    tag: tag || undefined,
    sort,
    limit: query || status || source || tag ? 50 : 8,
  })

  return (
    <div className='space-y-6'>
      <section className='space-y-4'>
        <div className='space-y-2'>
          <h1 className='text-3xl font-bold tracking-tight'>Search public predictions</h1>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            Search prediction tracking records by person, organization, topic, or verification
            phrase to find public claims and witness records faster.
          </p>
        </div>

        <form action='/search' className='grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]'>
          <Input
            aria-label='Search public predictions'
            defaultValue={query}
            name='q'
            placeholder='Search by person, organization, topic, or keyword'
          />
          <Input defaultValue={source} name='source' placeholder='Filter by source' />
          <Input defaultValue={tag} name='tag' placeholder='Filter by tag' />
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
          <div className='flex gap-3'>
            <select
              className='flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background'
              defaultValue={sort}
              name='sort'>
              <option value='newest'>Newest</option>
              <option value='highest_credibility'>Highest credibility</option>
              <option value='most_discussed'>Most discussed</option>
              <option value='soonest_to_verify'>Soonest to verify</option>
            </select>
            <Button type='submit'>Search</Button>
          </div>
        </form>
      </section>

      <section className='grid gap-6 lg:grid-cols-[1.15fr_0.85fr]'>
        <div className='space-y-4'>
          <div>
            <h2 className='text-2xl font-semibold tracking-tight'>
              {query ? `Results for "${query}"` : 'Recent prediction records'}
            </h2>
            <p className='text-sm text-muted-foreground'>
              {query
                ? `${results.length} matching prediction records found.`
                : 'Search by keyword to narrow down prediction records, evidence, and verification topics.'}
            </p>
          </div>

          {results.length ? (
            <div className='space-y-4'>
              {results.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className='space-y-3 p-6 text-sm text-muted-foreground'>
                <p>No matching prediction records were found for this search yet.</p>
                <Link className={buttonVariants({ variant: 'outline' })} href='/explore'>
                  Browse all records
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Search ideas</CardTitle>
              <CardDescription>
                Useful searches often combine a source and an outcome.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-2 text-sm text-muted-foreground'>
              <p>Try a public figure, company name, election, recession, AI, market, inflation, or policy topic.</p>
              <p>Search by verification language such as acquired, launched, defaulted, won, banned, or approved.</p>
              <p>Use tags and source names together to uncover related prediction tracking records.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Explore more</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm text-muted-foreground'>
              <p>Browse the full archive to compare predictions across people, institutions, and topics.</p>
              <Link
                className='inline-flex items-center gap-1 text-sm font-medium text-zinc-900 hover:text-zinc-700'
                href='/explore'>
                Go to explore
                <ArrowRight className='h-4 w-4' />
              </Link>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  )
}
