'use client'

import { useState } from 'react'

interface Props {
  value: string
  onSave: (value: string) => void
  className?: string
  multiline?: boolean
}

export function InlineEditCell({ value, onSave, className = '', multiline = false }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function handleBlur() {
    setEditing(false)
    onSave(draft)
  }

  if (editing) {
    return multiline ? (
      <textarea
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        className={`bg-surface-high border border-primary rounded px-2 py-1 text-sm text-on-surface w-full resize-none focus:outline-none ${className}`}
        rows={3}
      />
    ) : (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => e.key === 'Enter' && handleBlur()}
        className={`bg-surface-high border border-primary rounded px-2 py-1 text-sm text-on-surface w-full focus:outline-none ${className}`}
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      className={`cursor-pointer hover:bg-surface-high rounded px-1 transition-colors ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-on-surface-variant italic text-xs">click to edit</span>}
    </span>
  )
}
