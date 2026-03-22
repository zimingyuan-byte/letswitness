import type { MetadataRoute } from 'next'
import { siteConfig } from '@/config'
import { getExplorePosts } from '@/lib/data/posts'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getExplorePosts()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteConfig.url}/explore`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/search`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteConfig.url}/post/${post.id}`,
    lastModified: new Date(post.createdAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const seenUsers = new Set<string>()
  const userRoutes: MetadataRoute.Sitemap = []

  for (const post of posts) {
    const username = post.author.username

    if (!username || seenUsers.has(username)) {
      continue
    }

    seenUsers.add(username)
    userRoutes.push({
      url: `${siteConfig.url}/user/${username}`,
      lastModified: new Date(post.createdAt),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  return [...staticRoutes, ...postRoutes, ...userRoutes]
}
