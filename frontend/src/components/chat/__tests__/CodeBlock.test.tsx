import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CodeBlock } from '../CodeBlock'

// Mock Prism to avoid jsdom CSS issues
vi.mock('prismjs', () => ({
  default: {
    highlight: (code: string) => code,
    languages: { javascript: {}, typescript: {}, python: {}, bash: {}, json: {} }
  },
  highlight: (code: string) => code,
  languages: { javascript: {}, typescript: {}, python: {}, bash: {}, json: {} }
}))

vi.mock('prismjs/themes/prism-tomorrow.css', () => ({}))
vi.mock('prismjs/components/prism-typescript', () => ({}))
vi.mock('prismjs/components/prism-javascript', () => ({}))
vi.mock('prismjs/components/prism-python', () => ({}))
vi.mock('prismjs/components/prism-java', () => ({}))
vi.mock('prismjs/components/prism-csharp', () => ({}))
vi.mock('prismjs/components/prism-ruby', () => ({}))
vi.mock('prismjs/components/prism-go', () => ({}))
vi.mock('prismjs/components/prism-rust', () => ({}))
vi.mock('prismjs/components/prism-bash', () => ({}))
vi.mock('prismjs/components/prism-sql', () => ({}))
vi.mock('prismjs/components/prism-json', () => ({}))

vi.mock('@/lib/utils', () => ({
  downloadFile: vi.fn()
}))

describe('CodeBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
    })
  })

  it('renders the code content', () => {
    render(<CodeBlock code="const x = 1" language="javascript" />)
    expect(screen.getByText(/const x = 1/)).toBeTruthy()
  })

  it('displays the language label', () => {
    render(<CodeBlock code="print('hello')" language="python" />)
    expect(screen.getByText(/python/i)).toBeTruthy()
  })

  it('renders a copy button', () => {
    render(<CodeBlock code="hello world" language="bash" />)
    // Look for button with copy-related aria label or title
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('copy button calls clipboard.writeText with the code', async () => {
    const code = 'const answer = 42'
    render(<CodeBlock code={code} language="javascript" />)

    const buttons = screen.getAllByRole('button')
    const copyBtn = buttons.find(
      (b) => b.getAttribute('title')?.toLowerCase().includes('copy') ||
             b.getAttribute('aria-label')?.toLowerCase().includes('copy')
    ) || buttons[0]

    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(code)
    })
  })

  it('renders a download button', () => {
    render(<CodeBlock code="SELECT 1" language="sql" filename="query.sql" />)
    const buttons = screen.getAllByRole('button')
    const downloadBtn = buttons.find(
      (b) => b.getAttribute('title')?.toLowerCase().includes('download') ||
             b.getAttribute('aria-label')?.toLowerCase().includes('download')
    )
    expect(downloadBtn).toBeDefined()
  })
})
