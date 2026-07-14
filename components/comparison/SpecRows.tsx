import type { Product } from '@/types'

interface Props {
  specKeys: string[]
  products: Product[]
}

export function SpecRows({ specKeys, products }: Props) {
  return (
    <>
      {specKeys.map(key => (
        <tr key={key} className="border-t border-outline-variant hover:bg-surface-high/30 transition-colors">
          <td className="px-4 py-3 text-xs font-mono text-on-surface-variant uppercase tracking-wider whitespace-nowrap sticky left-0 bg-surface shadow-[2px_0_6px_rgba(0,0,0,0.4)]">
            {key}
          </td>
          {products.map(p => {
            const spec = p.specs?.find(s => s.specKey === key)
            return (
              <td key={p.id} className="px-4 py-3 text-sm font-mono text-on-surface text-center border-l border-outline-variant">
                {spec?.specValue ?? '—'}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}
