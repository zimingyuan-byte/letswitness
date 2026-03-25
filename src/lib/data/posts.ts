import 'server-only'

import type {
  PostComment,
  VerificationResult,
  ViewerProfile,
  WitnessPost,
} from '@/lib/domain'
import { mockPosts } from '@/lib/mock-data'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { LETSWITNESS_TABLES } from '@/lib/supabase/tables'
import { syncVerificationStates } from '@/lib/data/workflows'

interface PostRow {
  id: string
  author_id: string
  title: string
  description: string
  source_name: string
  prediction_content?: string | null
  source_url?: string | null
  status: WitnessPost['status']
  credibility_score: number | null
  created_at: string
}

const POST_SELECT_WITH_PREDICTION_CONTENT =
  'id, author_id, title, description, source_name, prediction_content, source_url, status, credibility_score, created_at'
const POST_SELECT_WITH_SOURCE_URL =
  'id, author_id, title, description, source_name, source_url, status, credibility_score, created_at'
const POST_SELECT_LEGACY =
  'id, author_id, title, description, source_name, status, credibility_score, created_at'

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
  triggered_at: string | null
  evidence_url: string | null
}

interface PostTagRow {
  post_id: string
  tag_id: string
}

interface TagRow {
  id: string
  slug: string
}

interface PostMediaRow {
  id: string
  post_id: string
  media_type: 'image' | 'audio' | 'video'
  storage_path: string
  public_url: string | null
  file_size: number | null
}

interface CommentRow {
  id: string
  post_id: string
  author_id: string
  parent_id: string | null
  content: string
  score: number
  created_at: string
}

interface CredibilityVoteRow {
  post_id: string
  user_id: string
  value: boolean
}

interface VerificationVoteRow {
  verification_event_id: string
  user_id: string
  result: VerificationResult
}

interface TriggerConfirmRow {
  verification_event_id: string
  user_id: string
}

interface ExplorePostsOptions {
  searchText?: string
  status?: WitnessPost['status'] | ''
  tag?: string
  source?: string
  sort?: 'newest' | 'highest_credibility' | 'most_discussed' | 'soonest_to_verify'
  limit?: number
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? ''
}

function getSoonestVerificationDate(post: WitnessPost) {
  return post.verificationEvents
    .map((event) => event.targetDate || event.deadline)
    .filter((date): date is string => Boolean(date))
    .sort()[0]
}

function sortPosts(posts: WitnessPost[], sort: ExplorePostsOptions['sort']) {
  switch (sort) {
    case 'highest_credibility':
      return [...posts].sort((a, b) => b.credibilityScore - a.credibilityScore)
    case 'most_discussed':
      return [...posts].sort((a, b) => b.commentCount - a.commentCount)
    case 'soonest_to_verify':
      return [...posts].sort((a, b) => {
        const aDate = getSoonestVerificationDate(a)
        const bDate = getSoonestVerificationDate(b)

        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1

        return aDate.localeCompare(bDate)
      })
    case 'newest':
    default:
      return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

function filterMockPosts(posts: WitnessPost[], options: ExplorePostsOptions = {}) {
  const tag = normalizeText(options.tag)
  const source = normalizeText(options.source)
  const search = normalizeText(options.searchText)

  const filtered = posts.filter((post) => {
    if (options.status && post.status !== options.status) {
      return false
    }

    if (tag && !post.tags.some((item) => normalizeText(item) === tag)) {
      return false
    }

    if (source && !normalizeText(post.sourceName).includes(source)) {
      return false
    }

    if (search) {
      const searchable = [
        post.title,
        post.description,
        post.sourceName,
        post.predictionContent ?? '',
        post.author.username,
        post.author.displayName,
        ...post.tags,
      ]
        .join(' ')
        .toLowerCase()

      if (!searchable.includes(search)) {
        return false
      }
    }

    return true
  })

  return sortPosts(filtered, options.sort).slice(0, options.limit ?? filtered.length)
}

async function getViewerId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  if (!supabase) {
    return null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

async function hydratePosts(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  postRows: PostRow[],
  viewerId: string | null
): Promise<WitnessPost[]> {
  if (!supabase || !postRows.length) {
    return []
  }

  const authorIds = [...new Set(postRows.map((post) => post.author_id))]
  const postIds = postRows.map((post) => post.id)

  const [
    { data: profiles },
    { data: verificationEvents },
    { data: postTags },
    { data: commentRows },
    { data: mediaRows },
    { data: credibilityVotes },
  ] = await Promise.all([
    supabase
      .from(LETSWITNESS_TABLES.profiles)
      .select('id, email, username, avatar_url, display_name')
      .in('id', authorIds),
    supabase
      .from(LETSWITNESS_TABLES.verificationEvents)
      .select('id, post_id, type, title, description, target_date, deadline, status, triggered_at, evidence_url')
      .in('post_id', postIds)
      .order('created_at', { ascending: true }),
    supabase
      .from(LETSWITNESS_TABLES.postTags)
      .select('post_id, tag_id')
      .in('post_id', postIds),
    supabase
      .from(LETSWITNESS_TABLES.comments)
      .select('id, post_id, author_id, parent_id, content, score, created_at')
      .in('post_id', postIds),
    supabase
      .from(LETSWITNESS_TABLES.postMedia)
      .select('id, post_id, media_type, storage_path, public_url, file_size')
      .in('post_id', postIds),
    supabase
      .from(LETSWITNESS_TABLES.credibilityVotes)
      .select('post_id, user_id, value')
      .in('post_id', postIds),
  ])

  const eventIds = ((verificationEvents as VerificationEventRow[] | null) ?? []).map((event) => event.id)
  const tagIds = [...new Set((postTags as PostTagRow[] | null)?.map((row) => row.tag_id) ?? [])]

  const [{ data: tags }, { data: verificationVotes }, { data: triggerConfirms }] = await Promise.all([
    tagIds.length
      ? supabase.from(LETSWITNESS_TABLES.tags).select('id, slug').in('id', tagIds)
      : Promise.resolve({ data: [] as TagRow[] }),
    eventIds.length
      ? supabase
          .from(LETSWITNESS_TABLES.verificationVotes)
          .select('verification_event_id, user_id, result')
          .in('verification_event_id', eventIds)
      : Promise.resolve({ data: [] as VerificationVoteRow[] }),
    eventIds.length
      ? supabase
          .from(LETSWITNESS_TABLES.eventTriggerConfirms)
          .select('verification_event_id, user_id')
          .in('verification_event_id', eventIds)
      : Promise.resolve({ data: [] as TriggerConfirmRow[] }),
  ])

  const profileMap = new Map(
    ((profiles as ProfileRow[] | null) ?? []).map((profile) => [profile.id, profile])
  )
  const tagMap = new Map(((tags as TagRow[] | null) ?? []).map((tag) => [tag.id, tag]))
  const postTagMap = new Map<string, string[]>()
  const commentCountMap = new Map<string, number>()
  const mediaMap = new Map<string, WitnessPost['media']>()
  const credibilityMap = new Map<string, WitnessPost['credibility']>()
  const eventVoteMap = new Map<string, WitnessPost['verificationEvents'][number]['votes']>()
  const eventConfirmMap = new Map<string, { count: number; viewerConfirmed: boolean }>()
  const eventMap = new Map<string, WitnessPost['verificationEvents']>()

  for (const link of (postTags as PostTagRow[] | null) ?? []) {
    const tag = tagMap.get(link.tag_id)

    if (!tag) {
      continue
    }

    const current = postTagMap.get(link.post_id) ?? []
    current.push(tag.slug)
    postTagMap.set(link.post_id, current)
  }

  for (const comment of (commentRows as CommentRow[] | null) ?? []) {
    commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) ?? 0) + 1)
  }

  for (const media of (mediaRows as PostMediaRow[] | null) ?? []) {
    const current = mediaMap.get(media.post_id) ?? []
    current.push({
      id: media.id,
      type: media.media_type,
      storagePath: media.storage_path,
      url: media.public_url,
      fileSize: media.file_size,
    })
    mediaMap.set(media.post_id, current)
  }

  for (const vote of (credibilityVotes as CredibilityVoteRow[] | null) ?? []) {
    const current = credibilityMap.get(vote.post_id) ?? {
      upvotes: 0,
      downvotes: 0,
      totalVotes: 0,
      viewerValue: null,
    }

    if (vote.value) {
      current.upvotes += 1
    } else {
      current.downvotes += 1
    }

    current.totalVotes += 1

    if (viewerId && vote.user_id === viewerId) {
      current.viewerValue = vote.value
    }

    credibilityMap.set(vote.post_id, current)
  }

  for (const vote of (verificationVotes as VerificationVoteRow[] | null) ?? []) {
    const current = eventVoteMap.get(vote.verification_event_id) ?? {
      fulfilled: 0,
      unfulfilled: 0,
      partiallyFulfilled: 0,
      totalVotes: 0,
      viewerResult: null,
    }

    if (vote.result === 'fulfilled') {
      current.fulfilled += 1
    } else if (vote.result === 'unfulfilled') {
      current.unfulfilled += 1
    } else {
      current.partiallyFulfilled += 1
    }

    current.totalVotes += 1

    if (viewerId && vote.user_id === viewerId) {
      current.viewerResult = vote.result
    }

    eventVoteMap.set(vote.verification_event_id, current)
  }

  for (const confirm of (triggerConfirms as TriggerConfirmRow[] | null) ?? []) {
    const current = eventConfirmMap.get(confirm.verification_event_id) ?? {
      count: 0,
      viewerConfirmed: false,
    }

    current.count += 1

    if (viewerId && confirm.user_id === viewerId) {
      current.viewerConfirmed = true
    }

    eventConfirmMap.set(confirm.verification_event_id, current)
  }

  for (const event of (verificationEvents as VerificationEventRow[] | null) ?? []) {
    const current = eventMap.get(event.post_id) ?? []
    const confirmState = eventConfirmMap.get(event.id) ?? {
      count: 0,
      viewerConfirmed: false,
    }

    current.push({
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      targetDate: event.target_date,
      deadline: event.deadline,
      status: event.status,
      triggeredAt: event.triggered_at,
      evidenceUrl: event.evidence_url,
      confirmCount: confirmState.count,
      viewerConfirmed: confirmState.viewerConfirmed,
      votes: eventVoteMap.get(event.id) ?? {
        fulfilled: 0,
        unfulfilled: 0,
        partiallyFulfilled: 0,
        totalVotes: 0,
        viewerResult: null,
      },
    })
    eventMap.set(event.post_id, current)
  }

  return postRows.map((post) => {
    const author = profileMap.get(post.author_id)
    const credibility = credibilityMap.get(post.id) ?? {
      upvotes: 0,
      downvotes: 0,
      totalVotes: 0,
      viewerValue: null,
    }
    const computedScore = credibility.totalVotes
      ? Math.round((credibility.upvotes / credibility.totalVotes) * 100)
      : post.credibility_score ?? 50

    return {
      id: post.id,
      title: post.title,
      description: post.description,
      sourceName: post.source_name,
      predictionContent: post.prediction_content ?? null,
      sourceUrl: post.source_url ?? null,
      status: post.status,
      credibilityScore: computedScore,
      credibility,
      commentCount: commentCountMap.get(post.id) ?? 0,
      createdAt: post.created_at,
      tags: postTagMap.get(post.id) ?? [],
      media: mediaMap.get(post.id) ?? [],
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

async function runExploreQuery(
  options: ExplorePostsOptions = {}
): Promise<{ supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; posts: WitnessPost[] }> {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return {
      supabase,
      posts: filterMockPosts(mockPosts, options),
    }
  }

  await syncVerificationStates(supabase)

  const limit = options.limit ?? 50
  let query = supabase
    .from(LETSWITNESS_TABLES.posts)
    .select(POST_SELECT_WITH_PREDICTION_CONTENT)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (options.status) {
    query = query.eq('status', options.status)
  }

  if (options.source?.trim()) {
    query = query.ilike('source_name', `%${options.source.trim()}%`)
  }

  if (options.searchText?.trim()) {
    const pattern = `%${options.searchText.trim()}%`
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern},source_name.ilike.${pattern}`)
  }

  const initialResult = await query
  let data = initialResult.data as PostRow[] | null
  let error = initialResult.error

  if (error?.message?.includes('prediction_content')) {
    let fallbackQuery = supabase
      .from(LETSWITNESS_TABLES.posts)
      .select(POST_SELECT_WITH_SOURCE_URL)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (options.status) {
      fallbackQuery = fallbackQuery.eq('status', options.status)
    }

    if (options.source?.trim()) {
      fallbackQuery = fallbackQuery.ilike('source_name', `%${options.source.trim()}%`)
    }

    if (options.searchText?.trim()) {
      const pattern = `%${options.searchText.trim()}%`
      fallbackQuery = fallbackQuery.or(`title.ilike.${pattern},description.ilike.${pattern},source_name.ilike.${pattern}`)
    }

    const fallbackResult = await fallbackQuery
    data = fallbackResult.data as PostRow[] | null
    error = fallbackResult.error
  }

  if (error?.message?.includes('source_url')) {
    let legacyQuery = supabase
      .from(LETSWITNESS_TABLES.posts)
      .select(POST_SELECT_LEGACY)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (options.status) {
      legacyQuery = legacyQuery.eq('status', options.status)
    }

    if (options.source?.trim()) {
      legacyQuery = legacyQuery.ilike('source_name', `%${options.source.trim()}%`)
    }

    if (options.searchText?.trim()) {
      const pattern = `%${options.searchText.trim()}%`
      legacyQuery = legacyQuery.or(`title.ilike.${pattern},description.ilike.${pattern},source_name.ilike.${pattern}`)
    }

    const legacyResult = await legacyQuery
    data = legacyResult.data as PostRow[] | null
    error = legacyResult.error
  }

  if (error) {
    return {
      supabase,
      posts: filterMockPosts(mockPosts, options),
    }
  }

  const viewerId = await getViewerId(supabase)
  let posts = await hydratePosts(supabase, (data as PostRow[] | null) ?? [], viewerId)
  const tag = normalizeText(options.tag)
  const search = normalizeText(options.searchText)

  if (tag) {
    posts = posts.filter((post) => post.tags.some((item) => normalizeText(item) === tag))
  }

  if (search) {
    posts = posts.filter((post) => {
      const searchable = [
        post.title,
        post.description,
        post.sourceName,
        post.author.username,
        post.author.displayName,
        ...post.tags,
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(search)
    })
  }

  return {
    supabase,
    posts: sortPosts(posts, options.sort).slice(0, limit),
  }
}

export async function getHomePosts(): Promise<WitnessPost[]> {
  const { posts } = await runExploreQuery({
    sort: 'newest',
    limit: 20,
  })

  return posts
}

export async function getExplorePosts(options: ExplorePostsOptions = {}): Promise<WitnessPost[]> {
  const { posts } = await runExploreQuery(options)

  return posts
}

export async function getPostById(id: string): Promise<WitnessPost | null> {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return mockPosts.find((post) => post.id === id) ?? null
  }

  await syncVerificationStates(supabase, [id])

  const { data, error } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select(POST_SELECT_WITH_PREDICTION_CONTENT)
    .eq('id', id)
    .maybeSingle()

  let postRow = data as PostRow | null
  let postError = error

  if (postError?.message?.includes('prediction_content')) {
    const fallbackResult = await supabase
      .from(LETSWITNESS_TABLES.posts)
      .select(POST_SELECT_WITH_SOURCE_URL)
      .eq('id', id)
      .maybeSingle()

    postRow = fallbackResult.data as PostRow | null
    postError = fallbackResult.error
  }

  if (postError?.message?.includes('source_url')) {
    const legacyResult = await supabase
      .from(LETSWITNESS_TABLES.posts)
      .select(POST_SELECT_LEGACY)
      .eq('id', id)
      .maybeSingle()

    postRow = legacyResult.data as PostRow | null
    postError = legacyResult.error
  }

  if (postError || !postRow) {
    return mockPosts.find((post) => post.id === id) ?? null
  }

  const viewerId = await getViewerId(supabase)
  const posts = await hydratePosts(supabase, [postRow], viewerId)

  return posts[0] ?? null
}

export async function getPostComments(postId: string): Promise<PostComment[]> {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return []
  }

  const { data: comments } = await supabase
    .from(LETSWITNESS_TABLES.comments)
    .select('id, post_id, author_id, parent_id, content, score, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })

  const rows = (comments as CommentRow[] | null) ?? []

  if (!rows.length) {
    return []
  }

  const authorIds = [...new Set(rows.map((comment) => comment.author_id))]
  const { data: profiles } = await supabase
    .from(LETSWITNESS_TABLES.profiles)
    .select('id, username, display_name, avatar_url')
    .in('id', authorIds)

  const profileMap = new Map(
    ((profiles as ProfileRow[] | null) ?? []).map((profile) => [profile.id, profile])
  )

  const commentsMap = new Map<string, PostComment>()
  const topLevelComments: PostComment[] = []

  for (const row of rows) {
    const author = profileMap.get(row.author_id)

    commentsMap.set(row.id, {
      id: row.id,
      postId: row.post_id,
      parentId: row.parent_id,
      content: row.content,
      score: row.score,
      createdAt: row.created_at,
      author: {
        id: row.author_id,
        username: author?.username ?? 'pending-profile',
        displayName: author?.display_name ?? author?.username ?? 'LetsWitness user',
        avatarUrl: author?.avatar_url ?? null,
      },
      replies: [],
    })
  }

  for (const row of rows) {
    const comment = commentsMap.get(row.id)

    if (!comment) {
      continue
    }

    if (row.parent_id) {
      commentsMap.get(row.parent_id)?.replies.push(comment)
    } else {
      topLevelComments.push(comment)
    }
  }

  for (const comment of commentsMap.values()) {
    comment.replies.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  return topLevelComments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getViewerProfile(): Promise<ViewerProfile | null> {
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
}

export async function getProfileByUsername(username: string): Promise<ViewerProfile | null> {
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

export async function getPostsByUsername(username: string): Promise<WitnessPost[]> {
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

  await syncVerificationStates(supabase)

  const { data, error } = await supabase
    .from(LETSWITNESS_TABLES.posts)
    .select(POST_SELECT_WITH_PREDICTION_CONTENT)
    .eq('author_id', profile.id)
    .order('created_at', { ascending: false })

  let postRows = (data as PostRow[] | null) ?? []
  let postsError = error

  if (postsError?.message?.includes('prediction_content')) {
    const fallbackResult = await supabase
      .from(LETSWITNESS_TABLES.posts)
      .select(POST_SELECT_WITH_SOURCE_URL)
      .eq('author_id', profile.id)
      .order('created_at', { ascending: false })

    postRows = (fallbackResult.data as PostRow[] | null) ?? []
    postsError = fallbackResult.error
  }

  if (postsError?.message?.includes('source_url')) {
    const legacyResult = await supabase
      .from(LETSWITNESS_TABLES.posts)
      .select(POST_SELECT_LEGACY)
      .eq('author_id', profile.id)
      .order('created_at', { ascending: false })

    postRows = (legacyResult.data as PostRow[] | null) ?? []
    postsError = legacyResult.error
  }

  if (postsError) {
    return []
  }

  const viewerId = await getViewerId(supabase)

  return hydratePosts(supabase, postRows, viewerId)
}
