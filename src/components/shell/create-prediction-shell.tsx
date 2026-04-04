'use client'

import { type ChangeEvent, type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Info, Upload } from 'lucide-react'
import { createPredictionAction } from '@/app/prediction/create/actions'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
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
  predictionContent: string
  sourceUrl: string
  description: string
  tags: string[]
  verificationStandards: string
  verificationDeadline: string
}

interface CreatePredictionFieldErrors {
  title: string | null
  predictionContent: string | null
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

interface SelectedTag {
  value: string
  label: string
}

interface SelectedImagePreview {
  name: string
  url: string
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

function getCommonTag(value: string) {
  return COMMON_TAGS.find((tag) => tag.value === value)
}

export function CreatePredictionShell({
  errorMessage,
  fieldErrors,
  values,
}: CreatePredictionShellProps) {
  const [formValues, setFormValues] = useState<CreatePredictionValues>({
    ...values,
  })
  const [currentFieldErrors, setCurrentFieldErrors] =
    useState<CreatePredictionFieldErrors>(fieldErrors)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<SelectedImagePreview[]>([])
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>(
    values.tags.map((tag) => ({
      value: tag,
      label: getCommonTag(tag)?.label ?? tag,
    }))
  )
  const [customTagInput, setCustomTagInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function clearTagError() {
    setCurrentFieldErrors((current) => ({
      ...current,
      tags: null,
    }))
  }

  function toggleTag(tag: string) {
    const commonTag = getCommonTag(tag)

    if (!commonTag) {
      return
    }

    setSelectedTags((current) => {
      const exists = current.some((item) => item.value === tag)

      if (exists) {
        return current.filter((item) => item.value !== tag)
      }

      return [
        ...current,
        {
          value: commonTag.value,
          label: commonTag.label,
        },
      ]
    })

    clearTagError()
  }

  function handleCustomTagsChange(value: string) {
    setCustomTagInput(value)
    clearTagError()
  }

  function addCustomTag() {
    const label = customTagInput.trim()
    const normalized = normalizeTag(label)

    if (!normalized) {
      return
    }

    if (selectedTags.some((tag) => tag.value === normalized)) {
      setCustomTagInput('')
      return
    }

    const matchingCommonTag = getCommonTag(normalized)
    setSelectedTags((current) => [
      ...current,
      {
        value: normalized,
        label: matchingCommonTag?.label ?? label,
      },
    ])
    setCustomTagInput('')
    clearTagError()
  }

  function removeSelectedTag(tag: string) {
    setSelectedTags((current) => current.filter((item) => item.value !== tag))
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
    setSelectedImagePreviews((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url))

      return files
        .filter((file) => file.type.startsWith('image/'))
        .map((file) => ({
          name: file.name,
          url: URL.createObjectURL(file),
        }))
    })
  }

  useEffect(() => {
    return () => {
      selectedImagePreviews.forEach((item) => URL.revokeObjectURL(item.url))
    }
  }, [selectedImagePreviews])

  function validateForm() {
    const nextErrors: CreatePredictionFieldErrors = {
      title: null,
      predictionContent: null,
      sourceUrl: null,
      description: null,
      tags: null,
      verificationStandards: null,
      verificationDeadline: null,
    }

    const title = formValues.title.trim()
    const predictionContent = formValues.predictionContent.trim()
    const sourceUrl = formValues.sourceUrl.trim()
    const description = formValues.description.trim()

    if (!title) {
      nextErrors.title = 'Enter a title.'
    }

    if (!predictionContent) {
      nextErrors.predictionContent = 'Enter the prediction content.'
    }

    if (sourceUrl && !/^https?:\/\/.+/i.test(sourceUrl)) {
      nextErrors.sourceUrl = 'Enter a full URL starting with http:// or https://.'
    }

    if (!description) {
      nextErrors.description = 'Enter a description.'
    }

    if (!selectedTags.length) {
      nextErrors.tags = 'Choose or add at least one tag so readers can discover the prediction.'
    } else if (selectedTags.length > 5) {
      nextErrors.tags = 'Choose or add up to 5 tags in total.'
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
          <CardDescription>Publish your own prediction and define how it should be verified later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createPredictionAction}
            className='space-y-5'
            noValidate
            onSubmit={handleSubmit}>
            {errorMessage ? (
              <div className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
                {errorMessage}
              </div>
            ) : null}

            <div className='space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/70 p-5'>
              <div className='space-y-1'>
                <h2 className='text-base font-semibold text-zinc-900'>Post Description</h2>
                <p className='text-sm text-muted-foreground'>
                  These fields describe the post itself and help readers understand the prediction at a glance.
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
                  placeholder='Enter a clear title for this prediction'
                  required
                  value={formValues.title}
                />
                <FieldError message={currentFieldErrors.title} />
              </div>

              <div className='space-y-2'>
                <Label
                  className={cn(currentFieldErrors.description ? 'text-rose-700' : undefined)}
                  htmlFor='description'>
                  Description
                </Label>
                <Textarea
                  className={getFieldClassName(Boolean(currentFieldErrors.description))}
                  id='description'
                  name='description'
                  onChange={(event) => updateField('description', event.target.value)}
                  placeholder='Add context, background, or supporting notes for why this prediction matters.'
                  required
                  value={formValues.description}
                />
                <FieldError message={currentFieldErrors.description} />
              </div>

              <div className='space-y-2'>
                <Label className={cn(currentFieldErrors.tags ? 'text-rose-700' : undefined)} htmlFor='customTags'>
                  Tags
                </Label>
                <input name='tags' type='hidden' value={selectedTags.map((tag) => tag.value).join(',')} />
                <div className='flex flex-wrap gap-2'>
                  {COMMON_TAGS.map((tag) => {
                    const isSelected = selectedTags.some((item) => item.value === tag.value)

                    return (
                      <button
                        key={tag.value}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm transition-colors',
                          isSelected
                            ? 'border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200'
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
                  onChange={(event) => handleCustomTagsChange(event.target.value)}
                  onKeyDown={handleCustomTagKeyDown}
                  placeholder='Type a custom tag and press Enter'
                  value={customTagInput}
                />
                <div className='flex flex-wrap items-center gap-2'>
                  <Button onClick={addCustomTag} type='button' variant='outline'>
                    Add Tag
                  </Button>
                </div>
                {selectedTags.length ? (
                  <div className='flex flex-wrap items-center gap-2'>
                    {selectedTags.map((tag) => (
                      <button
                        key={tag.value}
                        className='rounded-full border border-sky-300 bg-sky-100 px-3 py-1.5 text-sm text-sky-900 transition-colors hover:bg-sky-200'
                        onClick={() => removeSelectedTag(tag.value)}
                        type='button'>
                        #{tag.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className='text-xs text-muted-foreground'>
                  Click common tags or add custom tags below. All selected tags appear in the confirmed list underneath and can be removed there. Use up to 5 tags in total.
                </p>
                <FieldError message={currentFieldErrors.tags} />
              </div>
            </div>

            <div className='space-y-4 rounded-lg border border-sky-200 bg-sky-50/60 p-5'>
              <div className='space-y-1'>
                <h2 className='text-base font-semibold text-zinc-900'>Prediction</h2>
                <p className='text-sm text-muted-foreground'>
                  These fields capture your prediction, optional supporting materials, and how it should be verified.
                </p>
              </div>

              <div className='space-y-2'>
                <Label
                  className={cn(currentFieldErrors.predictionContent ? 'text-rose-700' : undefined)}
                  htmlFor='predictionContent'>
                  What is your prediction?
                </Label>
                <Textarea
                  className={getFieldClassName(Boolean(currentFieldErrors.predictionContent))}
                  id='predictionContent'
                  name='predictionContent'
                  onChange={(event) => updateField('predictionContent', event.target.value)}
                  placeholder='Briefly summarize your prediction in one clear sentence.'
                  required
                  value={formValues.predictionContent}
                />
                <p className='text-xs text-muted-foreground'>
                  Use short, direct wording so readers can quickly understand exactly what you predict will happen.
                </p>
                <FieldError message={currentFieldErrors.predictionContent} />
              </div>

              <div className='space-y-4 rounded-lg border border-white/70 bg-white/80 p-4 shadow-sm'>
                <div className='space-y-1'>
                  <h3 className='text-sm font-semibold text-zinc-900'>Related Information (Optional)</h3>
                  <p className='text-xs text-muted-foreground'>
                    Add files or a link if you want to attach background material to this prediction.
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='mediaFiles'>Media</Label>
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
                  {selectedImagePreviews.length ? (
                    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                      {selectedImagePreviews.map((preview) => (
                        <div key={preview.url} className='overflow-hidden rounded-md border bg-white'>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={preview.name}
                            className='h-24 w-full object-cover'
                            src={preview.url}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <p className='text-xs text-muted-foreground'>
                    Up to 5 files total. Images up to 10MB, audio up to 50MB, and video up to 200MB.
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label className={cn(currentFieldErrors.sourceUrl ? 'text-rose-700' : undefined)} htmlFor='sourceUrl'>
                    Link (Optional)
                  </Label>
                  <Input
                    className={getFieldClassName(Boolean(currentFieldErrors.sourceUrl))}
                    id='sourceUrl'
                    name='sourceUrl'
                    onChange={(event) => updateField('sourceUrl', event.target.value)}
                    placeholder='https://example.com/background-reference'
                    type='url'
                    value={formValues.sourceUrl}
                  />
                  <p className='text-xs text-muted-foreground'>
                    Paste an article, note, thread, or any related reference link if you want to give more context.
                  </p>
                  <FieldError message={currentFieldErrors.sourceUrl} />
                </div>
              </div>

              <div className='space-y-4 rounded-lg border border-white/70 bg-white/80 p-4 shadow-sm'>
                <div className='space-y-2'>
                  <Label
                    className={cn(currentFieldErrors.verificationStandards ? 'text-rose-700' : undefined)}
                    htmlFor='verificationStandards'>
                    What milestones indicate the success of this prediction? (Optional)
                  </Label>
                  <Textarea
                    className={getFieldClassName(Boolean(currentFieldErrors.verificationStandards))}
                    id='verificationStandards'
                    name='verificationStandards'
                    onChange={(event) => updateField('verificationStandards', event.target.value)}
                    placeholder='Explain exactly what outcome, benchmark, or condition will count as verified.'
                    value={formValues.verificationStandards}
                  />
                  <FieldError message={currentFieldErrors.verificationStandards} />
                </div>

                <div className='space-y-2'>
                  <Label
                    className={cn(currentFieldErrors.verificationDeadline ? 'text-rose-700' : undefined)}
                    htmlFor='verificationDeadline'>
                    Deadline
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
                  Every new prediction uses a time-point verification workflow and will be checked on the deadline above.
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
          Be as precise as possible so other people can fairly judge what you predicted and whether it eventually came true.
        </CardContent>
      </Card>
    </div>
  )
}
