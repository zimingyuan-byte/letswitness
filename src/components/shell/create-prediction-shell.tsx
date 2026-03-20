import { Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { createPredictionAction } from '@/app/post/create/actions'

interface CreatePredictionShellProps {
  errorMessage?: string | null
}

export function CreatePredictionShell({ errorMessage }: CreatePredictionShellProps) {
  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Create a prediction post</CardTitle>
          <CardDescription>
            Create the first core LetsWitness records with a real post insert plus one
            verification event. Media stays metadata-only in this phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createPredictionAction} className='space-y-5'>
            {errorMessage ? (
              <div className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
                {errorMessage}
              </div>
            ) : null}
            <div className='space-y-2'>
              <Label htmlFor='title'>Title</Label>
              <Input
                id='title'
                name='title'
                placeholder='Summarize the prediction in 120 characters or less'
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='sourceName'>Prediction source</Label>
              <Input
                id='sourceName'
                name='sourceName'
                placeholder='Person or organization making the prediction'
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                name='description'
                placeholder='Add context, evidence links, or background for why this prediction matters.'
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='tags'>Tags</Label>
              <Input id='tags' name='tags' placeholder='politics, economy, ai' />
              <p className='text-xs text-muted-foreground'>
                Separate tags with commas. They will be normalized into URL-friendly slugs.
              </p>
            </div>
            <div className='rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
              Media uploads remain metadata-only in this phase. The actual Supabase Storage
              upload workflow will be added next.
            </div>
            <div className='space-y-4 rounded-lg border border-border p-4'>
              <div className='space-y-2'>
                <Label htmlFor='eventType'>Verification event type</Label>
                <select
                  className='flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background'
                  defaultValue='time_point'
                  id='eventType'
                  name='eventType'>
                  <option value='time_point'>Time point</option>
                  <option value='event_trigger'>Event trigger</option>
                </select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='verificationTitle'>Verification title</Label>
                <Input
                  id='verificationTitle'
                  name='verificationTitle'
                  placeholder='Name the verification event'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='verificationDescription'>Verification description</Label>
                <Textarea
                  id='verificationDescription'
                  name='verificationDescription'
                  placeholder='Explain what should happen to validate this prediction.'
                  required
                />
              </div>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='targetDate'>Target date (for time point)</Label>
                  <Input id='targetDate' name='targetDate' type='date' />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='deadline'>Deadline (for event trigger)</Label>
                  <Input id='deadline' name='deadline' type='date' />
                </div>
              </div>
              <p className='text-xs text-muted-foreground'>
                Choose one event type above. The server will use `target date` for time
                point validation and `deadline` for event-trigger validation.
              </p>
            </div>
            <Button type='submit'>Publish prediction</Button>
          </form>
        </CardContent>
      </Card>
      <Card className='border-sky-200 bg-sky-50/70'>
        <CardContent className='flex items-start gap-3 p-6 text-sm text-sky-900'>
          <Info className='mt-0.5 h-4 w-4 shrink-0' />
          This form now writes the core post record and one verification event. Voting,
          comments, and media upload still follow in the next feature pass.
        </CardContent>
      </Card>
    </div>
  )
}
