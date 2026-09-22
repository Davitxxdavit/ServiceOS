import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { RichText } from '@/features/assistant/components/RichText'

describe('RichText', () => {
  it('renders bold and italic markers as elements', () => {
    const { container } = render(<RichText text={'**Sea Bass** is _low_'} />)
    expect(container.querySelector('strong')?.textContent).toBe('Sea Bass')
    expect(container.querySelector('em')?.textContent).toBe('low')
  })

  it('never injects HTML from model output', () => {
    const { container } = render(<RichText text={'<img src=x onerror=alert(1)> **hi**'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
  })

  it('turns newlines into line breaks', () => {
    const { container } = render(<RichText text={'a\nb\nc'} />)
    expect(container.querySelectorAll('br')).toHaveLength(2)
  })
})
