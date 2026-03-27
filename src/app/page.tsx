import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, CalendarClock, ShieldCheck, Sparkles } from 'lucide-react'
import { PostCard } from '@/components/feed/post-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { buttonVariants } from '@/components/ui/Button'
import { siteConfig } from '@/config'
import { getHomePosts, getViewerProfile } from '@/lib/data/posts'

export const metadata: Metadata = {
  title: 'Prediction Tracking and Verification Platform',
  description:
    'LetsWitness is a prediction tracking platform where people archive public predictions, preserve evidence, and witness verification over time.',
  keywords: [
    ...siteConfig.keywords,
    'prediction tracking platform',
    'track public claims',
    'public prediction verification',
  ],
  alternates: {
    canonical: '/',
  },
}

export default async function Home() {
  const [posts, viewer] = await Promise.all([getHomePosts(), getViewerProfile()])

  return (
    <div className='space-y-8'>
      <section className='grid gap-6 lg:grid-cols-[1.4fr_0.8fr]'>
        <Card className='border-zinc-900 bg-zinc-900 text-white'>
          <CardHeader className='space-y-4'>
            <div className='inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium'>
              Public prediction archive
            </div>
            <h1 className='text-4xl font-semibold tracking-tight'>
              Track public predictions. Preserve the evidence. Witness the verification.
            </h1>
            <CardDescription className='max-w-2xl text-sm text-zinc-300'>
              LetsWitness is a public prediction tracking archive for quotes, claims, and
              forecasts from people, organizations, and institutions.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap items-center gap-3'>
            <Link className={buttonVariants({ variant: 'outline', className: 'bg-white text-zinc-900 hover:bg-zinc-100' })} href='/explore'>
              Explore predictions
            </Link>
            <Link className={buttonVariants({ className: 'bg-emerald-500 text-white hover:bg-emerald-400' })} href='/post/create'>
              Create Tracking
            </Link>
            <Link
              className={buttonVariants({
                variant: 'outline',
                className: 'border-white/30 bg-white/10 text-white hover:bg-white/20',
              })}
              href='/prediction/create'>
              Create Prediction
            </Link>
          </CardContent>
        </Card>
        <div className='grid gap-4'>
          <Card>
            <CardContent className='flex items-start gap-3 p-6'>
              <ShieldCheck className='mt-0.5 h-5 w-5 text-emerald-600' />
              <div className='space-y-1'>
                <p className='font-medium'>Save trustworthy records</p>
                <p className='text-sm text-muted-foreground'>
                  Keep claims tied to clear titles, sources, and context so people can review
                  them fairly later.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-start gap-3 p-6'>
              <CalendarClock className='mt-0.5 h-5 w-5 text-sky-600' />
              <div className='space-y-1'>
                <p className='font-medium'>Track what happens next</p>
                <p className='text-sm text-muted-foreground'>
                  Add a date or trigger event so each prediction has a concrete path to
                  verification.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-start gap-3 p-6'>
              <Sparkles className='mt-0.5 h-5 w-5 text-violet-600' />
              <div className='space-y-1'>
                <p className='font-medium'>Discuss the evidence</p>
                <p className='text-sm text-muted-foreground'>
                  Review credibility, follow updates, and build a shared record around public
                  claims.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-2xl font-semibold tracking-tight'>Featured predictions</h2>
              <p className='text-sm text-muted-foreground'>
                Recent and featured records appear here so visitors can quickly see what is
                being tracked.
              </p>
            </div>
            <Link
              className='inline-flex items-center gap-1 text-sm font-medium text-zinc-900 hover:text-zinc-700'
              href='/explore'>
              Browse all
              <ArrowRight className='h-4 w-4' />
            </Link>
          </div>
          <div className='space-y-4'>
            {posts.length ? (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <Card>
                <CardContent className='p-6 text-sm text-muted-foreground'>
                  No predictions have been published yet. Create the first one from the new
                  submission flow.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <div className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>How it works</CardTitle>
              <CardDescription>
                Each post starts with a public claim and a clear path to verification.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 text-sm text-muted-foreground'>
              <p>Document the original statement, add context, and define when or how it should be checked.</p>
              <p>Community signals and follow-up discussion help separate strong records from weak or misleading ones.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Your account</CardTitle>
              <CardDescription>
                {viewer
                  ? 'You are signed in and can continue with profile setup or content creation.'
                  : 'Sign in to finish onboarding and start creating prediction records.'}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {viewer ? (
                <>
                  <p className='text-sm text-muted-foreground'>
                    Signed in as {viewer.email ?? viewer.displayName ?? 'viewer'}.
                  </p>
                  <div className='flex flex-wrap gap-3'>
                    <Link className={buttonVariants()} href={viewer.username ? `/user/${viewer.username}` : '/onboarding'}>
                      {viewer.username ? 'Open profile' : 'Finish profile'}
                    </Link>
                    <Link className={buttonVariants({ variant: 'outline' })} href='/post/create'>
                      Create Tracking
                    </Link>
                    <Link className={buttonVariants({ variant: 'outline' })} href='/prediction/create'>
                      Create Prediction
                    </Link>
                  </div>
                </>
              ) : (
                <Link className={buttonVariants()} href='/login'>
                  Go to login
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-xl'>Prediction tracking with context</CardTitle>
            <CardDescription>
              Strong records make prediction verification clearer for readers and search.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            <p>
              LetsWitness helps people track predictions made by politicians, founders,
              investors, commentators, and public institutions.
            </p>
            <p>
              Each record centers on the original prediction, the source, the timing, and the
              evidence required for fair verification.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-xl'>Witness verification over time</CardTitle>
            <CardDescription>
              A prediction matters most when people can revisit it later.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            <p>
              The goal is not only to archive a prediction, but to witness whether it came
              true, failed, expired, or remained disputed.
            </p>
            <p>
              By combining evidence, verification events, and community review, LetsWitness
              creates a structured public prediction verification record.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
