import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function NotFound() {
  return (
    <div className='mx-auto max-w-xl'>
      <Card>
        <CardHeader>
          <CardTitle className='text-3xl tracking-tight'>Not found</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4 text-sm text-muted-foreground'>
          <p>The page or prediction record you requested could not be found.</p>
          <Link href='/'>
            <Button>Return home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
