interface Props {
  verdict: string
}

export function AiVerdict({ verdict }: Props) {
  return (
    <div className="mt-6 bg-surface-low border border-outline-variant rounded p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">AI VERDICT</span>
        <span className="text-xs bg-primary/20 text-primary border border-primary/30 rounded px-2 py-0.5 font-mono">claude</span>
      </div>
      <p className="text-sm text-on-surface leading-relaxed">{verdict}</p>
    </div>
  )
}
