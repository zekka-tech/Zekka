import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputArea } from '../InputArea'

describe('InputArea', () => {
  let onSubmit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSubmit = vi.fn()
  })

  it('renders the textarea', () => {
    render(<InputArea onSubmit={onSubmit} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('typing in the textarea updates its value', async () => {
    const user = userEvent.setup()
    render(<InputArea onSubmit={onSubmit} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Hello world')

    expect(textarea).toHaveValue('Hello world')
  })

  it('pressing Enter calls onSubmit with the typed message', async () => {
    const user = userEvent.setup()
    render(<InputArea onSubmit={onSubmit} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Send this')
    await user.keyboard('{Enter}')

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith('Send this')
  })

  it('pressing Shift+Enter does NOT submit and adds a newline', async () => {
    const user = userEvent.setup()
    render(<InputArea onSubmit={onSubmit} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Line one')
    await user.keyboard('{Shift>}{Enter}{/Shift}')

    expect(onSubmit).not.toHaveBeenCalled()
    // The textarea value should now contain a newline character
    expect((textarea as HTMLTextAreaElement).value).toContain('\n')
  })

  it('submit button is disabled when the message is empty', () => {
    render(<InputArea onSubmit={onSubmit} />)

    const sendButton = screen.getByTitle('Send message (Enter)')
    expect(sendButton).toBeDisabled()
  })

  it('submit button is disabled when isLoading is true', async () => {
    const user = userEvent.setup()
    render(<InputArea onSubmit={onSubmit} isLoading />)

    const textarea = screen.getByRole('textbox')
    // Manually fire a change since typing is blocked on a disabled textarea
    fireEvent.change(textarea, { target: { value: 'Some text' } })

    const sendButton = screen.getByTitle('Send message (Enter)')
    expect(sendButton).toBeDisabled()
  })

  it('textarea is disabled when isLoading is true', () => {
    render(<InputArea onSubmit={onSubmit} isLoading />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('clears the textarea after a successful submit', async () => {
    const user = userEvent.setup()
    render(<InputArea onSubmit={onSubmit} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Clear me')
    await user.keyboard('{Enter}')

    expect(textarea).toHaveValue('')
  })

  it('clicking the send button submits the message', async () => {
    const user = userEvent.setup()
    render(<InputArea onSubmit={onSubmit} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Via button')

    const sendButton = screen.getByTitle('Send message (Enter)')
    await user.click(sendButton)

    expect(onSubmit).toHaveBeenCalledWith('Via button')
  })
})
