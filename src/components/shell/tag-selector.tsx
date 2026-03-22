'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface TagSelectorProps {
  suggestedTags: readonly string[]
  defaultValue: string
  inputId?: string
}

function splitTags(rawValue: string) {
  return [...new Set(rawValue.split(',').map((tag) => tag.trim()).filter(Boolean))]
}

export function TagSelector({ suggestedTags, defaultValue, inputId }: TagSelectorProps) {
  const defaultTags = useMemo(() => splitTags(defaultValue), [defaultValue])

  const [selectedSuggestedTags, setSelectedSuggestedTags] = useState<string[]>(
    defaultTags.filter((tag) => suggestedTags.includes(tag))
  )
  const [customTags, setCustomTags] = useState(
    defaultTags.filter((tag) => !suggestedTags.includes(tag)).join(', ')
  )

  const combinedTags = useMemo(() => {
    const nextTags = [...selectedSuggestedTags, ...splitTags(customTags)]
    return [...new Set(nextTags)].join(', ')
  }, [customTags, selectedSuggestedTags])

  function toggleSuggestedTag(tag: string) {
    setSelectedSuggestedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    )
  }

  return (
    <div className='space-y-3'>
      <input name='tags' type='hidden' value={combinedTags} />
      <div className='flex flex-wrap gap-2'>
        {suggestedTags.map((tag) => {
          const isSelected = selectedSuggestedTags.includes(tag)

          return (
            <button
              key={tag}
              className={cn(
                'rounded-full border px-3 py-1 text-sm transition-colors',
                isSelected
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-border bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900'
              )}
              onClick={() => toggleSuggestedTag(tag)}
              type='button'>
              {tag}
            </button>
          )
        })}
      </div>
      <div className='space-y-2'>
        <input
          className='flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background'
          id={inputId}
          onChange={(event) => setCustomTags(event.target.value)}
          placeholder='Add extra tags if needed, separated by commas'
          value={customTags}
        />
        <p className='text-xs text-muted-foreground'>
          Pick common tags above or add your own. Up to 5 tags total.
        </p>
      </div>
    </div>
  )
}
