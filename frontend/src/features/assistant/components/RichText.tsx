import { Fragment, type ReactNode } from 'react'

/**
 * Minimal, safe inline formatter for model output: **bold**, _italic_ and
 * line breaks. Renders React nodes only — no HTML injection.
 */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i, arr) => (
        <Fragment key={i}>
          {formatInline(line)}
          {i < arr.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </>
  )
}

function formatInline(line: string): ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g)
  return parts.filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return (
        <em key={i} className="text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}
