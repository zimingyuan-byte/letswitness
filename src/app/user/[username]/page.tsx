import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PostCard } from '@/components/feed/post-card'
import { siteConfig } from '@/config'
import { getPostsByUsername, getProfileByUsername } from '@/lib/data/posts'

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
  const [profile, authoredPosts] = await Promise.all([
    getProfileByUsername(username),
    getPostsByUsername(username),
  ])

  if (!profile) {
    notFound()
  }

  return (
    <div className='grid gap-6 lg:grid-cols-[0.85fr_1.15fr]'>
      <aside className='space-y-4'>
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
            <p>Prediction posts: {authoredPosts.length}</p>
            <p>Browse the records this contributor has published and followed.</p>
          </CardContent>
        </Card>
      </aside>
      <section className='space-y-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Posts by @{profile.username}</h1>
          <p className='text-sm text-muted-foreground'>
            Review this contributor&apos;s published prediction records in one place.
          </p>
        </div>
        {authoredPosts.length ? (
          <div className='space-y-4'>
            {authoredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className='p-6 text-sm text-muted-foreground'>
              This profile has not published any predictions yet.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
