import 'server-only'

import { cache } from 'react'
import type { ViewerProfile, WitnessPost } from '@/lib/domain'
import { mockPosts } from '@/lib/mock-data'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { LETSWITNESS_TABLES } from '@/lib/supabase/tables'

interface PostRow {
  id: string
  author_id: string
  title: string
  description: string
  source_name: string
  status: WitnessPost['status']
  credibility_score: number | null
  created_at: string
}

interface ProfileRow {
  id: string
  email: string | null
  username: string | null
  avatar_url: string | null
  display_name: string | null
}

interface VerificationEventRow {
  id: string
  post_id: string
  type: 'time_point' | 'event_trigger'
  title: string
  description: string
  target_date: string | null
  deadline: string | null
  status: 'waiting' | 'triggered' | 'resolved' | 'expired'
}

interface PostTagRow {
  post_id: string
  tag_id: string
}

interface TagRow {
  id: string
  name: string
  slug: string
}

interface CommentRow {
  post_id: string
}

async function hydratePosts(postRows: PostRow[]): Promise<WitnessPost[]> {
  if (!postRows.length) {
    return []
  }

  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return []
  }

  const authorIds = [...new Set(postRows.map((post) => post.author_id))]
  const postIds = postRows.map((post) => post.id)

  const [{ data: profiles }, { data: verificationEvents }, { data: postTags }, { data: commentRows }] =
    await Promise.all([
      supabase
        .from(LETSWITNESS_TABLES.profiles)
        .select('id, email, username, avatar_url, display_name')
        .in('id', authorIds),
      supabase
        .from(LETSWITNESS_TABLES.verificationEvents)
        .select('id, post_id, type, title, description, target_date, deadline, status')
        .in('post_id', postIds)
        .order('created_at', { ascending: true }),
      supabase
        .from(LETSWITNESS_TABLES.postTags)
        .select('post_id, tag_id')
        .in('post_id', postIds),
      supabase
        .from(LETSWITNESS_TABLES.comments)
        .select('post_id')
        .in('post_id', postIds),
    ])

  const tagIds = [...new Set((postTags as PostTagRow[] | null)?.map((row) => row.tag_id) ?? [])]
  const { data: tags } = tagIds.length
    ? await supabase
        .from(LETSWITNESS_TABLES.tags)
        .select('id, name, slug')
        .in('id', tagIds)
    : { data: [] as TagRow[] }

  const profileMap = new Map(
    ((profiles as ProfileRow[] | null) ?? []).map((profile) => [profile.id, profile])
  )
  const eventMap = new Map<string, WitnessPost['verificationEvents']>()
  const tagMap = new Map(((tags as TagRow[] | null) ?? []).map((tag) => [tag.id, tag]))
  const commentCountMap = new Map<string, number>()
  const postTagMap = new Map<string, string[]>()

  for (const comment of ((commentRows as CommentRow[] | null) ?? [])) {
    commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) ?? 0) + 1)
  }

  for (const event of ((verificationEvents as VerificationEventRow[] | null) ?? [])) {
    const current = eventMap.get(event.post_id) ?? []
    current.push({
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      targetDate: event.target_date,
      deadline: event.deadline,
      status: event.status,
    })
    eventMap.set(event.post_id, current)
  }

  for (const link of ((postTags as PostTagRow[] | null) ?? [])) {
    const tag = tagMap.get(link.tag_id)

    if (!tag) {
      continue
    }

    const current = postTagMap.get(link.post_id) ?? []
    current.push(tag.slug)
    postTagMap.set(link.post_id, current)
  }

  return postRows.map((post) => {
    const author = profileMap.get(post.author_id)

    return {
      id: post.id,
      title: post.title,
      description: post.description,
      sourceName: post.source_name,
      status: post.status,
      credibilityScore: post.credibility_score ?? 50,
      commentCount: commentCountMap.get(post.id) ?? 0,
      createdAt: post.created_at,
      tags: postTagMap.get(post.id) ?? [],
      author: {
        id: post.author_id,
        username: author?.username ?? 'pending-profile',
        displayName: author?.display_name ?? author?.username ?? 'LetsWitness user',
        avatarUrl: author?.avatar_url ?? null,
      },
      verificationEvents: eventMap.get(post.id) ?? [],
    }
  })
}

export const getHomePosts = cache(async (): Promise<WitnessPost[]> => {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return mockPosts
  }

  const { data, error } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select('id, author_id, title, description, source_name, status, credibility_score, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return mockPosts
  }

  const posts = await hydratePosts((data as PostRow[] | null) ?? [])

  return posts.length ? posts : []
})

export const getExplorePosts = cache(async (): Promise<WitnessPost[]> => {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return [...mockPosts].sort((a, b) => b.credibilityScore - a.credibilityScore)
  }

  const { data, error } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select('id, author_id, title, description, source_name, status, credibility_score, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return [...mockPosts].sort((a, b) => b.credibilityScore - a.credibilityScore)
  }

  const posts = await hydratePosts((data as PostRow[] | null) ?? [])

  return [...posts].sort((a, b) => b.credibilityScore - a.credibilityScore)
})

export const getPostById = cache(async (id: string): Promise<WitnessPost | null> => {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return mockPosts.find((post) => post.id === id) ?? null
  }

  const { data, error } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select('id, author_id, title, description, source_name, status, credibility_score, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return mockPosts.find((post) => post.id === id) ?? null
  }

  const posts = await hydratePosts([data as PostRow])

  return posts[0] ?? null
})

export const getViewerProfile = cache(async (): Promise<ViewerProfile | null> => {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data } = await supabase
    .from(LETSWITNESS_TABLES.profiles)
    .select('id, email, username, avatar_url, display_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!data) {
    return {
      id: user.id,
      email: user.email ?? null,
      username: null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      displayName:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email ??
        null,
    }
  }

  return {
    id: data.id,
    email: data.email,
    username: data.username,
    avatarUrl: data.avatar_url,
    displayName: data.display_name,
  }
})

export const getProfileByUsername = cache(
  async (username: string): Promise<ViewerProfile | null> => {
    const supabase = await createServerSupabaseClient()

    if (!supabase) {
      const mockAuthor = mockPosts.find((post) => post.author.username === username)?.author

      if (!mockAuthor) {
        return null
      }

      return {
        id: mockAuthor.id,
        email: null,
        username: mockAuthor.username,
        avatarUrl: mockAuthor.avatarUrl ?? null,
        displayName: mockAuthor.displayName,
      }
    }

    const { data } = await supabase
      .from(LETSWITNESS_TABLES.profiles)
      .select('id, email, username, avatar_url, display_name')
      .eq('username', username)
      .maybeSingle()

    if (!data) {
      return null
    }

    return {
      id: data.id,
      email: data.email,
      username: data.username,
      avatarUrl: data.avatar_url,
      displayName: data.display_name,
    }
  }
)

export const getPostsByUsername = cache(async (username: string): Promise<WitnessPost[]> => {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return mockPosts.filter((post) => post.author.username === username)
  }

  const { data: profile } = await supabase
    .from(LETSWITNESS_TABLES.profiles)
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (!profile) {
    return []
  }

  const { data, error } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select('id, author_id, title, description, source_name, status, credibility_score, created_at')
    .eq('author_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    return []
  }

  return hydratePosts((data as PostRow[] | null) ?? [])
})
