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
          Comments help add missing context, challenge weak evidence, and highlight details
          that matter for verification.
        </p>
        <div className='rounded-lg border border-dashed border-border bg-muted/40 p-4'>
          Conversation for this record will appear here.
        </div>
      </CardContent>
    </Card>
  )
}
