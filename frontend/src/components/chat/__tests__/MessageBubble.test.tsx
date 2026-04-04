import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '@/test/test-utils'
import { MessageBubble } from '../MessageBubble'

describe('MessageBubble', () => {
  it('renders assistant code blocks from message metadata', () => {
    renderWithProviders(
      <MessageBubble
        message={{
          id: 'assistant-1',
          role: 'assistant',
          content: 'Here is the implementation.',
          timestamp: new Date(),
          status: 'complete',
          metadata: {
            codeBlocks: [
              {
                id: 'code-1',
                language: 'typescript',
                code: 'const answer = 42',
                filename: 'answer.ts'
              }
            ]
          }
        }}
      />
    )

    expect(screen.getByText('answer.ts')).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Code example in typescript: const answer = 42/i)
    ).toBeInTheDocument()
  })
})
