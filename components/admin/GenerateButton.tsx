'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  comparisonId: string
  onGenerated: () => void
}

export function GenerateButton({ comparisonId, onGenerated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/comparisons/${comparisonId}/generate`, { method: 'POST' })
    const { error: err } = await res.json()
    setLoading(false)
    if (err) { setError(err); return }
    onGenerated()
  }

  return (
    <div>
      <Button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : '✦ Generate Comparison'}
      </Button>
      {error && <p className="text-xs text-tertiary mt-1">{error}</p>}
    </div>
  )
}
