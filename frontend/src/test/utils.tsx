import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a custom render function that includes providers
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  client?: QueryClient
}

export const renderWithProviders = (
  ui: ReactNode,
  {
    client = createTestQueryClient(),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) =>
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>, renderOptions)

// Re-export everything from React Testing Library
export * from '@testing-library/react'
