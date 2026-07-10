import type { Product, ProsConsType } from '@/types'

interface Props {
  type: ProsConsType
  products: Product[]
}

export function ProsConsRow({ type, products }: Props) {
  const isPro = type === 'pro'
  const bgColor = isPro ? 'bg-secondary/5' : 'bg-tertiary/5'
  const borderColor = isPro ? 'border-secondary' : 'border-tertiary'
  const textColor = isPro ? 'text-secondary' : 'text-tertiary'
  const icon = isPro ? '✓' : '✕'
  const label = isPro ? 'KEY PROS' : 'KEY CONS'

  return (
    <tr className={`border-t border-outline-variant ${bgColor}`}>
      <td className="px-4 py-3">
        <span className={`text-xs font-mono uppercase tracking-wider ${textColor}`}>{label}</span>
      </td>
      {products.map(p => {
        const items = p.prosCons?.filter(pc => pc.type === type).sort((a, b) => a.position - b.position) ?? []
        return (
          <td key={p.id} className={`px-4 py-3 border-t-2 ${borderColor}`}>
            <ul className="space-y-1">
              {items.map((pc, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface">
                  <span className={`${textColor} flex-shrink-0 mt-0.5`}>{icon}</span>
                  {pc.text}
                </li>
              ))}
            </ul>
          </td>
        )
      })}
    </tr>
  )
}
