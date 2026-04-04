import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SourcesPanel } from '../SourcesPanel'

const useSourcesMock = vi.fn()
const useCreateSourceMock = vi.fn()
const useDeleteSourceMock = vi.fn()

vi.mock('@/hooks/useSources', () => ({
  useSources: (...args: unknown[]) => useSourcesMock(...args),
  useCreateSource: (...args: unknown[]) => useCreateSourceMock(...args),
  useDeleteSource: (...args: unknown[]) => useDeleteSourceMock(...args)
}))

describe('SourcesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSourcesMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })
    useCreateSourceMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn()
    })
    useDeleteSourceMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn()
    })
  })

  it('shows an explicit unavailable state when no project is selected', () => {
    render(<SourcesPanel />)

    expect(screen.getByText('Sources unavailable')).toBeInTheDocument()
    expect(
      screen.getByText('Select a project to view uploaded files, folders, and import history.')
    ).toBeInTheDocument()
    expect(screen.getByTitle('Select a project to upload files')).toBeDisabled()
  })

  it('shows an empty state for a project with no sources', () => {
    render(<SourcesPanel projectId="project-1" />)

    expect(screen.getByText('No sources yet. Upload files to get started.')).toBeInTheDocument()
    expect(screen.getByText('Files:')).toBeInTheDocument()
    expect(screen.getByText('0B')).toBeInTheDocument()
  })

  it('shows an error state and allows retrying the query', () => {
    const refetch = vi.fn()
    useSourcesMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Sources failed to load'),
      refetch
    })

    render(<SourcesPanel projectId="project-1" />)

    expect(screen.getByText('Unable to load sources')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Retry'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
