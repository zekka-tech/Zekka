import '@testing-library/jest-dom'
import { configureAxe } from 'vitest-axe'
import { toHaveNoViolations } from 'vitest-axe/matchers'
import { expect } from 'vitest'

expect.extend({ toHaveNoViolations })

// Configure axe with WCAG 2.1 AA rules
configureAxe({
  rules: [
    { id: 'color-contrast', enabled: true },
    { id: 'region', enabled: true }
  ]
})
import { createElement, type ReactNode } from 'react'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock localStorage with in-memory persistence
let storage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => (key in storage ? storage[key] : null)),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = String(value)
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key]
  }),
  clear: vi.fn(() => {
    storage = {}
  }),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(() => true),
})

vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')

  return {
    ...actual,
    ResponsiveContainer: ({
      children,
      width,
      height,
    }: {
      children: ReactNode
      width?: number | string
      height?: number | string
    }) =>
      createElement(
        'div',
        {
          style: {
            width: typeof width === 'number' ? `${width}px` : width || '800px',
            height:
              typeof height === 'number' ? `${height}px` : height || '300px',
          },
        },
        children
      ),
  }
})

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserver
})
