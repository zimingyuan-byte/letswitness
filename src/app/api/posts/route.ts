import { NextResponse } from 'next/server'
import { getHomePosts } from '@/lib/data/posts'

export async function GET() {
  const posts = await getHomePosts()

  return NextResponse.json({
    data: posts,
  })
}
