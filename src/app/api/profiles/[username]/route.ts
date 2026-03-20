import { NextResponse } from 'next/server'
import { getProfileByUsername } from '@/lib/data/posts'

interface RouteContext {
  params: Promise<{
    username: string
  }>
}

export async function GET(_: Request, { params }: RouteContext) {
  const { username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile) {
    return NextResponse.json(
      {
        error: 'Profile not found',
      },
      { status: 404 }
    )
  }

  return NextResponse.json({
    data: profile,
  })
}
