import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders, screen } from '@/test/test-utils'
import { ProjectCard } from '../ProjectCard'
import type { Project } from '@/types/project.types'

// ── Mock hooks consumed by ProjectCard ───────────────────────────────────────

const useProjectStatsMock = vi.fn()
const useProjectMock = vi.fn()

vi.mock('@/hooks/useProjects', () => ({
  useProjectStats: () => useProjectStatsMock(),
  useProject: () => useProjectMock(),
}))

// ── Shared fixture ────────────────────────────────────────────────────────────

const baseProject: Project = {
  id: 'proj-1',
  name: 'My Test Project',
  description: 'A project for testing',
  status: 'active',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-03-01'),
  members: [],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProjectCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useProjectStatsMock.mockReturnValue({ data: null })
    useProjectMock.mockReturnValue({
      deleteAsync: vi.fn().mockResolvedValue(undefined),
      isDeleting: false,
    })
  })

  it('renders the project name', () => {
    renderWithProviders(<ProjectCard project={baseProject} />)
    expect(screen.getByText('My Test Project')).toBeInTheDocument()
  })

  it('renders the project status badge', () => {
    renderWithProviders(<ProjectCard project={baseProject} />)
    // Status is capitalised in the component
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders different status badges correctly', () => {
    const paused: Project = { ...baseProject, status: 'paused' }
    renderWithProviders(<ProjectCard project={paused} />)
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('overflow menu button opens the dropdown on click', () => {
    renderWithProviders(<ProjectCard project={baseProject} />)

    // The menu items should not be visible before opening
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()

    // The kebab/more-vertical button has no accessible label, so we query by its
    // parent container.  The button is the only one that contains MoreVerticalIcon.
    const menuButton = screen.getByRole('button', { name: '' })
    fireEvent.click(menuButton)

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Archive')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('Delete option is visible in the open menu', () => {
    renderWithProviders(<ProjectCard project={baseProject} />)

    const [menuButton] = screen.getAllByRole('button')
    fireEvent.click(menuButton)

    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('clicking Delete shows the confirmation dialog', () => {
    renderWithProviders(<ProjectCard project={baseProject} />)

    // Open the overflow menu
    const [menuButton] = screen.getAllByRole('button')
    fireEvent.click(menuButton)

    // Click the Delete item
    fireEvent.click(screen.getByText('Delete'))

    // Confirmation heading and destructive button should appear
    expect(screen.getByText('Delete Project?')).toBeInTheDocument()
    expect(
      screen.getByText(
        'This action cannot be undone. All conversations and data associated with this project will be permanently deleted.'
      )
    ).toBeInTheDocument()
  })

  it('Archive option is visible in the overflow menu', () => {
    renderWithProviders(<ProjectCard project={baseProject} />)

    const [menuButton] = screen.getAllByRole('button')
    fireEvent.click(menuButton)

    expect(screen.getByText('Archive')).toBeInTheDocument()
  })

  it('Cancel button in the delete confirmation closes the dialog', () => {
    renderWithProviders(<ProjectCard project={baseProject} />)

    const [menuButton] = screen.getAllByRole('button')
    fireEvent.click(menuButton)
    fireEvent.click(screen.getByText('Delete'))

    expect(screen.getByText('Delete Project?')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.queryByText('Delete Project?')).not.toBeInTheDocument()
  })

  it('calls deleteAsync when the confirmation Delete button is clicked', async () => {
    const deleteAsync = vi.fn().mockResolvedValue(undefined)
    useProjectMock.mockReturnValue({ deleteAsync, isDeleting: false })

    renderWithProviders(<ProjectCard project={baseProject} />)

    const [menuButton] = screen.getAllByRole('button')
    fireEvent.click(menuButton)
    fireEvent.click(screen.getByText('Delete'))

    // Click the destructive "Delete" button inside the confirmation dialog
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))

    // Give async handler a tick to execute
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(deleteAsync).toHaveBeenCalledOnce()
  })
})
