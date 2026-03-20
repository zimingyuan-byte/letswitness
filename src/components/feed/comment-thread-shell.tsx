import { MessageSquareMore } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export function CommentThreadShell() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <MessageSquareMore className='h-4 w-4 text-muted-foreground' />
          Comment thread
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4 text-sm text-muted-foreground'>
        <p>
          This foundation phase keeps the comment area lightweight. The next phase will
          attach real create-comment, reply, and moderation workflows to this section.
        </p>
        <div className='rounded-lg border border-dashed border-border bg-muted/40 p-4'>
          Top-level comments and one-level replies will be implemented here next.
        </div>
      </CardContent>
    </Card>
  )
}
