import { describe, it, expect } from 'vitest'
import { cn } from '../cn'

describe('cn utility', () => {
  it('combines class names', () => {
    const result = cn('px-2', 'py-1')
    expect(result).toContain('px-2')
    expect(result).toContain('py-1')
  })

  it('handles conditional classes', () => {
    const result = cn('px-2', false && 'py-1', true && 'text-lg')
    expect(result).toContain('px-2')
    expect(result).toContain('text-lg')
    expect(result).not.toContain('py-1')
  })

  it('resolves tailwind conflicts', () => {
    const result = cn('px-2', 'px-4')
    // Should resolve to the last value (px-4)
    expect(result).toContain('px-4')
  })

  it('handles undefined and null', () => {
    const result = cn('px-2', undefined, null, 'py-1')
    expect(result).toContain('px-2')
    expect(result).toContain('py-1')
  })

  it('handles objects', () => {
    const result = cn({
      'px-2': true,
      'py-1': true,
      'text-lg': false
    })
    expect(result).toContain('px-2')
    expect(result).toContain('py-1')
    expect(result).not.toContain('text-lg')
  })
})
