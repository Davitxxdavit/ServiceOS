import { cn } from '@/lib/utils'
import type { Block } from '@/features/assistant/types/schemas'

const TONE_CLASS = {
  default: 'text-foreground',
  good: 'text-success',
  warning: 'text-warning',
  bad: 'text-destructive',
} as const

export function BlockView({ block }: { block: Block }) {
  if (block.kind === 'metrics') {
    return (
      <section className="space-y-2" aria-label={block.title ?? 'Metrics'}>
        {block.title ? <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{block.title}</h4> : null}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {block.items.map((item, i) => (
            <div key={i} className="rounded-lg border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className={cn('mt-1 font-mono text-lg font-semibold tabular-nums', TONE_CLASS[item.tone ?? 'default'])}>
                {item.value}
              </div>
              {item.hint ? <div className="mt-0.5 text-xs text-muted-foreground">{item.hint}</div> : null}
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-2" aria-label={block.title ?? 'Table'}>
      {block.title ? <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{block.title}</h4> : null}
      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              {block.columns.map((c, i) => (
                <th key={i} className="whitespace-nowrap px-3 py-2 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} className="border-b border-border/60 last:border-0">
                {row.map((cell, c) => (
                  <td key={c} className={cn('whitespace-nowrap px-3 py-2', typeof cell === 'number' && 'text-right font-mono tabular-nums')}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
