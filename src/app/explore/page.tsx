import { PostCard } from '@/components/feed/post-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { getExplorePosts } from '@/lib/data/posts'

export default async function ExplorePage() {
  const posts = await getExplorePosts()

  return (
    <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
      <section className='space-y-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Explore predictions</h1>
          <p className='text-sm text-muted-foreground'>
            Browse public predictions by topic, source, and current verification status.
          </p>
        </div>
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
            <p>Compare claims across public figures, companies, campaigns, and institutions.</p>
            <p>Spot records that are attracting the most attention from the community.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
