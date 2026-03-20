import { NextResponse } from 'next/server'
import { getPostById } from '@/lib/data/posts'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params
  const post = await getPostById(id)

  if (!post) {
    return NextResponse.json(
      {
        error: 'Post not found',
      },
      { status: 404 }
    )
  }

  return NextResponse.json({
    data: post,
  })
}
