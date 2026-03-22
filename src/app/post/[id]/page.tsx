import { notFound } from 'next/navigation'
import { CommentThreadShell } from '@/components/feed/comment-thread-shell'
import { StatusPill } from '@/components/feed/status-pill'
import { VerificationCard } from '@/components/feed/verification-card'
import { VoteMeter } from '@/components/feed/vote-meter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { getPostById } from '@/lib/data/posts'
import { formatTimeToNow } from '@/lib/utils'

interface PostDetailPageProps {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    created?: string
  }>
}

export default async function PostDetailPage({ params, searchParams }: PostDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const post = await getPostById(id)

  if (!post) {
    notFound()
  }

  return (
    <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
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
                  Source: {post.sourceName} · @{post.author.username} ·{' '}
                  {formatTimeToNow(new Date(post.createdAt))}
                </p>
                <CardTitle className='mt-2 text-3xl tracking-tight'>{post.title}</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Verification events</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {post.verificationEvents.map((event) => (
              <VerificationCard key={event.id} event={event} />
            ))}
          </CardContent>
        </Card>

        <CommentThreadShell />
      </section>

      <aside className='space-y-4'>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Credibility score</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <VoteMeter score={post.credibilityScore} />
            <p className='text-sm text-muted-foreground'>
              This score reflects how strongly the community believes the record is worth
              tracking.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Record details</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            <p>Use the original source, timing, and verification criteria together when judging a prediction.</p>
            <p>Clear context helps the community decide whether a claim was real and whether it eventually came true.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
