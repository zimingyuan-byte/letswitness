import Link from 'next/link'
import { ArrowUpRight, MessageSquare } from 'lucide-react'
import type { WitnessPost } from '@/lib/domain'
import { formatTimeToNow } from '@/lib/utils'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { VoteMeter } from '@/components/feed/vote-meter'
import { StatusPill } from '@/components/feed/status-pill'

interface PostCardProps {
  post: WitnessPost
}

export function PostCard({ post }: PostCardProps) {
  const metaPrefix =
    post.postType === 'tracking' && post.sourceName
      ? `Source: ${post.sourceName}`
      : 'Self-authored Prediction'
  const linkLabel = post.postType === 'tracking' ? 'Source Link' : 'Link'

  return (
    <article itemScope itemType='https://schema.org/Article'>
      <Card className='overflow-hidden'>
        <CardHeader className='space-y-3'>
          <div className='flex items-start justify-between gap-4'>
            <div className='space-y-1'>
              <CardTitle className='text-xl'>
                <Link className='hover:underline' href={`/post/${post.id}`} itemProp='url'>
                  <span itemProp='headline'>{post.title}</span>
                </Link>
              </CardTitle>
              <p className='text-sm text-muted-foreground'>
                {metaPrefix} · Posted by @{post.author.username} · {formatTimeToNow(new Date(post.createdAt))}
              </p>
              {post.sourceUrl ? (
                <p className='text-sm text-muted-foreground'>
                  {linkLabel}:{' '}
                  <a
                    className='font-medium text-zinc-900 underline'
                    href={post.sourceUrl}
                    rel='noreferrer'
                    target='_blank'>
                    Open link
                  </a>
                </p>
              ) : null}
            </div>
            <StatusPill status={post.status} />
          </div>
          <div className='flex flex-wrap gap-2'>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className='rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700'>
                #{tag}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-sm leading-6 text-zinc-700' itemProp='description'>
            {post.description}
          </p>
          <VoteMeter score={post.credibilityScore} totalVotes={post.credibility.totalVotes} />
          <meta itemProp='datePublished' content={post.createdAt} />
          <meta itemProp='keywords' content={post.tags.join(', ')} />
        </CardContent>
        <CardFooter className='flex items-center justify-between gap-3 border-t bg-zinc-50/70 pt-4'>
          <div className='flex items-center gap-4 text-sm text-muted-foreground'>
            <span className='inline-flex items-center gap-1'>
              <MessageSquare className='h-4 w-4' />
              {post.commentCount} comments
            </span>
            <span>{post.verificationEvents.length} verification events</span>
          </div>
          <Link
            className='inline-flex items-center gap-1 text-sm font-medium text-zinc-900 hover:text-zinc-700'
            href={`/post/${post.id}`}>
            View details
            <ArrowUpRight className='h-4 w-4' />
          </Link>
        </CardFooter>
      </Card>
    </article>
  )
}
