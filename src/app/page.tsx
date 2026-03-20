import Link from 'next/link'
import { ArrowRight, CalendarClock, ShieldCheck, Sparkles } from 'lucide-react'
import { PostCard } from '@/components/feed/post-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { buttonVariants } from '@/components/ui/Button'
import { getHomePosts, getViewerProfile } from '@/lib/data/posts'

export default async function Home() {
  const [posts, viewer] = await Promise.all([getHomePosts(), getViewerProfile()])

  return (
    <div className='space-y-8'>
      <section className='grid gap-6 lg:grid-cols-[1.4fr_0.8fr]'>
        <Card className='border-zinc-900 bg-zinc-900 text-white'>
          <CardHeader className='space-y-4'>
            <div className='inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium'>
              LetsWitness MVP foundation
            </div>
            <CardTitle className='text-4xl tracking-tight'>
              Record a public prediction now. Let the community witness the outcome later.
            </CardTitle>
            <CardDescription className='max-w-2xl text-sm text-zinc-300'>
              This rebuilt foundation centers the product on evidence, verification, and
              community judgement instead of generic social discussion.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap items-center gap-3'>
            <Link className={buttonVariants({ variant: 'outline', className: 'bg-white text-zinc-900 hover:bg-zinc-100' })} href='/explore'>
              Explore predictions
            </Link>
            <Link className={buttonVariants({ className: 'bg-emerald-500 text-white hover:bg-emerald-400' })} href='/post/create'>
              Create prediction
            </Link>
          </CardContent>
        </Card>
        <div className='grid gap-4'>
          <Card>
            <CardContent className='flex items-start gap-3 p-6'>
              <ShieldCheck className='mt-0.5 h-5 w-5 text-emerald-600' />
              <div className='space-y-1'>
                <p className='font-medium'>Google auth via Supabase</p>
                <p className='text-sm text-muted-foreground'>
                  The old NextAuth and Prisma session stack has been replaced by a
                  Supabase-first auth foundation.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-start gap-3 p-6'>
              <CalendarClock className='mt-0.5 h-5 w-5 text-sky-600' />
              <div className='space-y-1'>
                <p className='font-medium'>Verification-first UX</p>
                <p className='text-sm text-muted-foreground'>
                  Posts, verification events, credibility voting, and comments now drive
                  the product direction instead of communities and subscriptions.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-start gap-3 p-6'>
              <Sparkles className='mt-0.5 h-5 w-5 text-violet-600' />
              <div className='space-y-1'>
                <p className='font-medium'>English-first shell for western audiences</p>
                <p className='text-sm text-muted-foreground'>
                  The MVP interface now aligns with the PRD, including new routes,
                  navigation, and post semantics.
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
                Freshly created records from Supabase appear here. If the database is empty,
                the view falls back to seeded examples.
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
              <CardTitle className='text-lg'>Current foundation status</CardTitle>
              <CardDescription>
                The repo is now aligned with LetsWitness domain language and route structure.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 text-sm text-muted-foreground'>
              <p>Completed in this phase: dependency refresh, Supabase auth groundwork, new routing shell, and real post plus verification-event creation.</p>
              <p>Next phase: credibility votes, verification-result voting, comments, and notifications.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Your account</CardTitle>
              <CardDescription>
                {viewer
                  ? 'You are signed in and can continue with profile setup or content creation.'
                  : 'Sign in with Google to finish onboarding and start creating prediction records.'}
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
                      Create prediction
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
    </div>
  )
}
