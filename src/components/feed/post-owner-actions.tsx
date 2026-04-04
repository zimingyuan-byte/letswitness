'use client'

import Link from 'next/link'
import { useState } from 'react'
import { savePostAsDraftAction, withdrawPostAction } from '@/app/post/[id]/actions'
import { Button, buttonVariants } from '@/components/ui/Button'

interface PostOwnerActionsProps {
  postId: string
  returnPath: string
  editHref?: string
}

export function PostOwnerActions({ postId, returnPath, editHref }: PostOwnerActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  return (
    <>
      <div className='flex flex-wrap gap-2'>
        {editHref ? (
          <Link className={buttonVariants({ variant: 'outline' })} href={editHref}>
            Edit
          </Link>
        ) : null}
        <Button
          className='cursor-pointer'
          onClick={() => setIsDeleteDialogOpen(true)}
          type='button'
          variant='destructive'>
          Delete
        </Button>
      </div>

      {isDeleteDialogOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-sm rounded-lg border bg-white p-5 shadow-lg'>
            <h3 className='text-lg font-semibold text-zinc-900'>Delete This Post?</h3>
            <p className='mt-2 text-sm text-muted-foreground'>
              Choose whether to save as draft or permanently delete.
            </p>
            <div className='mt-4 flex flex-wrap gap-2'>
              <form action={savePostAsDraftAction}>
                <input name='postId' type='hidden' value={postId} />
                <input name='returnPath' type='hidden' value={returnPath} />
                <Button type='submit' variant='outline'>
                  Save as Draft
                </Button>
              </form>
              <form action={withdrawPostAction}>
                <input name='postId' type='hidden' value={postId} />
                <input name='returnPath' type='hidden' value={returnPath} />
                <Button type='submit' variant='destructive'>
                  Delete
                </Button>
              </form>
              <Button
                className='cursor-pointer'
                onClick={() => setIsDeleteDialogOpen(false)}
                type='button'
                variant='ghost'>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
