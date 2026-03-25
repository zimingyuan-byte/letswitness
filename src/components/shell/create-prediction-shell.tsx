'use client'

import { type ChangeEvent, type FormEvent, type KeyboardEvent, useMemo, useRef, useState } from 'react'
import { Info, Upload } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { createPredictionAction } from '@/app/post/create/actions'
import { cn } from '@/lib/utils'

const COMMON_TAGS = [
  { label: 'Politics', value: 'politics' },
  { label: 'Economy', value: 'economy' },
  { label: 'AI', value: 'ai' },
  { label: 'Technology', value: 'technology' },
  { label: 'Markets', value: 'markets' },
  { label: 'Crypto', value: 'crypto' },
  { label: 'Elections', value: 'elections' },
  { label: 'Climate', value: 'climate' },
  { label: 'Public Health', value: 'public-health' },
  { label: 'China', value: 'china' },
  { label: 'United States', value: 'united-states' },
  { label: 'Geopolitics', value: 'geopolitics' },
] as const

interface CreatePredictionValues {
  title: string
  sourceName: string
  sourceUrl: string
  description: string
  tags: string[]
  verificationStandards: string
  verificationDeadline: string
}

interface CreatePredictionFieldErrors {
  title: string | null
  sourceName: string | null
  sourceUrl: string | null
  description: string | null
  tags: string | null
  verificationStandards: string | null
  verificationDeadline: string | null
}

interface CreatePredictionShellProps {
  errorMessage?: string | null
  fieldErrors: CreatePredictionFieldErrors
  values: CreatePredictionValues
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) {
    return null
  }

  return <p className='text-xs font-medium text-rose-700'>{message}</p>
}

function getFieldClassName(hasError: boolean) {
  return hasError
    ? 'border-rose-500 bg-rose-50/70 focus-visible:ring-rose-500'
    : undefined
}

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase().replace(/\s+/g, '-')
}

export function CreatePredictionShell({
  errorMessage,
  fieldErrors,
  values,
}: CreatePredictionShellProps) {
  const initialCommonTags = values.tags.filter((tag) =>
    COMMON_TAGS.some((commonTag) => commonTag.value === tag)
  )
  const initialCustomTags = values.tags
    .filter((tag) => !COMMON_TAGS.some((commonTag) => commonTag.value === tag))
    .join(', ')

  const [formValues, setFormValues] = useState<CreatePredictionValues>({
    ...values,
    tags: initialCommonTags,
  })
  const [currentFieldErrors, setCurrentFieldErrors] = useState<CreatePredictionFieldErrors>(fieldErrors)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [customTags, setCustomTags] = useState(
    initialCustomTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map(normalizeTag)
  )
  const [customTagInput, setCustomTagInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const combinedTags = useMemo(() => {
    return [...new Set([...formValues.tags, ...customTags])]
  }, [customTags, formValues.tags])

  function updateField<K extends keyof CreatePredictionValues>(
    key: K,
    value: CreatePredictionValues[K]
  ) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }))

    const errorKey = key as keyof CreatePredictionFieldErrors
    setCurrentFieldErrors((current) => ({
      ...current,
      [errorKey]: null,
    }))
  }

  function toggleTag(tag: string) {
    setFormValues((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags : [...current.tags, tag],
    }))

    clearTagError()
  }

  function clearTagError() {
    setCurrentFieldErrors((current) => ({
      ...current,
      tags: null,
    }))
  }

  function handleCustomTagsChange(value: string) {
    setCustomTagInput(value)
    clearTagError()
  }

  function addCustomTag() {
    const normalized = normalizeTag(customTagInput)

    if (!normalized) {
      return
    }

    if (
      COMMON_TAGS.some((tag) => tag.value === normalized && formValues.tags.includes(normalized)) ||
      customTags.includes(normalized)
    ) {
      setCustomTagInput('')
      return
    }

    setCustomTags((current) => [...current, normalized])
    setCustomTagInput('')
    clearTagError()
  }

  function removeCustomTag(tag: string) {
    setCustomTags((current) => current.filter((item) => item !== tag))
    clearTagError()
  }

  function removeSelectedTag(tag: string) {
    if (formValues.tags.includes(tag)) {
      setFormValues((current) => ({
        ...current,
        tags: current.tags.filter((item) => item !== tag),
      }))
    } else {
      removeCustomTag(tag)
      return
    }

    clearTagError()
  }

  function handleCustomTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addCustomTag()
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    setSelectedFiles(files.map((file) => file.name))
  }

  function validateForm() {
    const nextErrors: CreatePredictionFieldErrors = {
      title: null,
      sourceName: null,
      sourceUrl: null,
      description: null,
      tags: null,
      verificationStandards: null,
      verificationDeadline: null,
    }

    const title = formValues.title.trim()
    const sourceName = formValues.sourceName.trim()
    const sourceUrl = formValues.sourceUrl.trim()
    const description = formValues.description.trim()
    const verificationStandards = formValues.verificationStandards.trim()

    if (title.length < 8 || title.length > 120) {
      nextErrors.title = 'Use 8-120 characters and summarize the claim in one clear sentence.'
    }

    if (sourceName.length < 2 || sourceName.length > 120) {
      nextErrors.sourceName = 'Enter the person or organization that made the prediction.'
    } else if (/^https?:\/\//i.test(sourceName)) {
      nextErrors.sourceName =
        'Enter the speaker or organization name here, not a URL. Put links in Description.'
    }

    if (sourceUrl && !/^https?:\/\/.+/i.test(sourceUrl)) {
      nextErrors.sourceUrl = 'Enter a full URL starting with http:// or https://.'
    }

    if (description.length < 30 || description.length > 5000) {
      nextErrors.description =
        'Add at least 30 characters of context, including what was said, when, and any useful source link.'
    }

    if (!combinedTags.length) {
      nextErrors.tags = 'Choose or add at least one tag so readers can discover the prediction.'
    } else if (combinedTags.length > 5) {
      nextErrors.tags = 'Choose or add up to 5 tags in total.'
    }

    if (verificationStandards.length < 5 || verificationStandards.length > 500) {
      nextErrors.verificationStandards =
        'Explain what outcome should happen so other users can verify this prediction fairly.'
    }

    if (!formValues.verificationDeadline) {
      nextErrors.verificationDeadline = 'Choose the date when this prediction should be checked.'
    }

    return nextErrors
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const nextErrors = validateForm()
    const hasErrors = Object.values(nextErrors).some(Boolean)

    setCurrentFieldErrors(nextErrors)

    if (hasErrors) {
      event.preventDefault()
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Create Prediction</CardTitle>
          <CardDescription>
            Publish a claim, add context, and define how it should be verified later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createPredictionAction} className='space-y-5' onSubmit={handleSubmit}>
            {errorMessage ? (
              <div className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
                {errorMessage}
              </div>
            ) : null}

            <div className='space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/70 p-5'>
              <div className='space-y-1'>
                <h2 className='text-base font-semibold text-zinc-900'>Post Description</h2>
                <p className='text-sm text-muted-foreground'>
                  These fields describe the post itself and help readers understand the record at a glance.
                </p>
              </div>

              <div className='space-y-2'>
                <Label className={cn(currentFieldErrors.title ? 'text-rose-700' : undefined)} htmlFor='title'>
                  Title
                </Label>
                <Input
                  className={getFieldClassName(Boolean(currentFieldErrors.title))}
                  id='title'
                  name='title'
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder='Summarize the prediction in 120 characters or less'
                  required
                  value={formValues.title}
                />
                <FieldError message={currentFieldErrors.title} />
              </div>

              <div className='space-y-2'>
                <Label className={cn(currentFieldErrors.description ? 'text-rose-700' : undefined)} htmlFor='description'>
                  Description
                </Label>
                <Textarea
                  className={getFieldClassName(Boolean(currentFieldErrors.description))}
                  id='description'
                  name='description'
                  onChange={(event) => updateField('description', event.target.value)}
                  placeholder='Add context, evidence links, or background for why this prediction matters.'
                  required
                  value={formValues.description}
                />
                <FieldError message={currentFieldErrors.description} />
              </div>

              <div className='space-y-2'>
                <Label className={cn(currentFieldErrors.tags ? 'text-rose-700' : undefined)} htmlFor='customTags'>
                  Tags
                </Label>
                <input name='tags' type='hidden' value={combinedTags.join(',')} />
                <div className='flex flex-wrap gap-2'>
                  {COMMON_TAGS.map((tag) => {
                    const isSelected = combinedTags.includes(tag.value)

                    return (
                      <button
                        key={tag.value}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm transition-colors',
                          isSelected
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50',
                          currentFieldErrors.tags ? 'border-rose-300' : undefined
                        )}
                        onClick={() => toggleTag(tag.value)}
                        type='button'>
                        {tag.label}
                      </button>
                    )
                  })}
                </div>
                <Input
                  className={getFieldClassName(Boolean(currentFieldErrors.tags))}
                  id='customTags'
                  onKeyDown={handleCustomTagKeyDown}
                  onChange={(event) => handleCustomTagsChange(event.target.value)}
                  placeholder='Type a custom tag and press Enter'
                  value={customTagInput}
                />
                <div className='flex flex-wrap items-center gap-2'>
                  <Button onClick={addCustomTag} type='button' variant='outline'>
                    Add Tag
                  </Button>
                </div>
                {combinedTags.length ? (
                  <div className='flex flex-wrap items-center gap-2'>
                    {combinedTags.map((tag) => (
                      <button
                        key={tag}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm transition-colors',
                          formValues.tags.includes(tag)
                            ? 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800'
                            : 'border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200'
                        )}
                        onClick={() => removeSelectedTag(tag)}
                        type='button'>
                        #{tag}
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className='text-xs text-muted-foreground'>
                  Click common tags or add custom tags below. All selected tags appear in the
                  confirmed list underneath and can be removed there. Use up to 5 tags in total.
                </p>
                <FieldError message={currentFieldErrors.tags} />
              </div>
            </div>

            <div className='space-y-4 rounded-lg border border-sky-200 bg-sky-50/60 p-5'>
              <div className='space-y-1'>
                <h2 className='text-base font-semibold text-zinc-900'>Prediction Content</h2>
                <p className='text-sm text-muted-foreground'>
                  These fields capture who made the prediction, the original evidence, and how it should be verified.
                </p>
              </div>

              <div className='space-y-2'>
                <Label className={cn(currentFieldErrors.sourceName ? 'text-rose-700' : undefined)} htmlFor='sourceName'>
                  Prediction Source
                </Label>
                <Input
                  className={getFieldClassName(Boolean(currentFieldErrors.sourceName))}
                  id='sourceName'
                  name='sourceName'
                  onChange={(event) => updateField('sourceName', event.target.value)}
                  placeholder='Person or organization making the prediction'
                  required
                  value={formValues.sourceName}
                />
                <FieldError message={currentFieldErrors.sourceName} />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='mediaFiles'>Evidence Media</Label>
                <input
                  accept='image/*,audio/*,video/*'
                  className='sr-only'
                  id='mediaFiles'
                  multiple
                  name='mediaFiles'
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  type='file'
                />
                <div className='flex flex-wrap items-center gap-3'>
                  <Button onClick={() => fileInputRef.current?.click()} type='button' variant='outline'>
                    <Upload className='mr-2 h-4 w-4' />
                    Choose Files
                  </Button>
                  <p className='text-sm text-muted-foreground'>
                    {selectedFiles.length
                      ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected`
                      : 'No files selected yet'}
                  </p>
                </div>
                {selectedFiles.length ? (
                  <div className='rounded-lg border border-border bg-white px-3 py-2 text-xs text-slate-600'>
                    {selectedFiles.join(', ')}
                  </div>
                ) : null}
                <p className='text-xs text-muted-foreground'>
                  Up to 5 files total. Images up to 10MB, audio up to 50MB, and video up to
                  200MB.
                </p>
              </div>

              <div className='space-y-2'>
                <Label className={cn(currentFieldErrors.sourceUrl ? 'text-rose-700' : undefined)} htmlFor='sourceUrl'>
                  Source Link (Optional)
                </Label>
                <Input
                  className={getFieldClassName(Boolean(currentFieldErrors.sourceUrl))}
                  id='sourceUrl'
                  name='sourceUrl'
                  onChange={(event) => updateField('sourceUrl', event.target.value)}
                  placeholder='https://example.com/original-source'
                  type='url'
                  value={formValues.sourceUrl}
                />
                <p className='text-xs text-muted-foreground'>
                  Paste the original article, video, post, or transcript link here if one exists.
                </p>
                <FieldError message={currentFieldErrors.sourceUrl} />
              </div>

              <div className='space-y-4 rounded-lg border border-white/70 bg-white/80 p-4 shadow-sm'>
                <div className='space-y-2'>
                  <Label
                    className={cn(currentFieldErrors.verificationStandards ? 'text-rose-700' : undefined)}
                    htmlFor='verificationStandards'>
                    Verification Standards
                  </Label>
                  <Textarea
                    className={getFieldClassName(Boolean(currentFieldErrors.verificationStandards))}
                    id='verificationStandards'
                    name='verificationStandards'
                    onChange={(event) => updateField('verificationStandards', event.target.value)}
                    placeholder='Explain exactly what outcome, benchmark, or condition will count as verified.'
                    required
                    value={formValues.verificationStandards}
                  />
                  <FieldError message={currentFieldErrors.verificationStandards} />
                </div>

                <div className='space-y-2'>
                  <Label
                    className={cn(currentFieldErrors.verificationDeadline ? 'text-rose-700' : undefined)}
                    htmlFor='verificationDeadline'>
                    Verification Deadline
                  </Label>
                  <Input
                    className={getFieldClassName(Boolean(currentFieldErrors.verificationDeadline))}
                    id='verificationDeadline'
                    name='verificationDeadline'
                    onChange={(event) => updateField('verificationDeadline', event.target.value)}
                    type='date'
                    value={formValues.verificationDeadline}
                  />
                  <FieldError message={currentFieldErrors.verificationDeadline} />
                </div>

                <p className='text-xs text-muted-foreground'>
                  Every new prediction uses a time-point verification workflow and will be checked on
                  the deadline above.
                </p>
              </div>
            </div>

            <Button type='submit'>Publish Prediction</Button>
          </form>
        </CardContent>
      </Card>
      <Card className='border-sky-200 bg-sky-50/70'>
        <CardContent className='flex items-start gap-3 p-6 text-sm text-sky-900'>
          <Info className='mt-0.5 h-4 w-4 shrink-0' />
          Be as precise as possible so other people can fairly judge whether the prediction
          was real and whether it came true.
        </CardContent>
      </Card>
    </div>
  )
}
