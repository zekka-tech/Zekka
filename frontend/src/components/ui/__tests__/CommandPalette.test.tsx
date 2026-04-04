import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '@/test/test-utils'
import { CommandPalette } from '../CommandPalette'

// ── Mocks ─────────────────────────────────────────────────────────────────────

// react-router-dom's useNavigate is used inside CommandPalette;
// renderWithProviders wraps with MemoryRouter so navigate is real, but we can
// spy on it if we need to assert navigation.  For the palette tests we mostly
// care about UI state, so no extra mock is needed here.

// navigator.clipboard is not available in jsdom by default.
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Open the palette via Ctrl+K */
function openPalette() {
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when closed', () => {
    renderWithProviders(<CommandPalette />)

    // The dialog is not in the DOM while closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search commands...')).not.toBeInTheDocument()
  })

  it('renders the command list when opened via Ctrl+K', () => {
    renderWithProviders(<CommandPalette />)

    openPalette()

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search commands...')).toBeInTheDocument()
    // At least one navigation command should appear
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
  })

  it('search input filters commands by label', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CommandPalette />)

    openPalette()

    const input = screen.getByPlaceholderText('Search commands...')
    await user.type(input, 'analytics')

    expect(screen.getByText('Go to Analytics')).toBeInTheDocument()
    // Commands that don't match should be gone
    expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Go to Projects')).not.toBeInTheDocument()
  })

  it('search input filters commands by description', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CommandPalette />)

    openPalette()

    const input = screen.getByPlaceholderText('Search commands...')
    await user.type(input, 'metrics')

    expect(screen.getByText('Go to Analytics')).toBeInTheDocument()
  })

  it('shows "No commands found" when the search yields no results', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CommandPalette />)

    openPalette()

    const input = screen.getByPlaceholderText('Search commands...')
    await user.type(input, 'zzznomatch')

    expect(screen.getByText('No commands found')).toBeInTheDocument()
  })

  it('pressing Escape closes the palette', () => {
    renderWithProviders(<CommandPalette />)

    openPalette()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clicking the backdrop closes the palette', () => {
    renderWithProviders(<CommandPalette />)

    openPalette()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // The backdrop is the fixed overlay div that sits behind the dialog
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50') as HTMLElement
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clicking a command button calls its action (navigates)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CommandPalette />)

    openPalette()

    // Click the "Go to Projects" command
    const projectsButton = screen.getByRole('option', { name: 'Go to Projects' })
    await user.click(projectsButton)

    // After the action the palette should close
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clicking the Copy URL command calls clipboard.writeText', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CommandPalette />)

    openPalette()

    const copyButton = screen.getByRole('option', { name: 'Copy URL' })
    await user.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href)
  })

  it('Ctrl+K a second time closes an open palette', () => {
    renderWithProviders(<CommandPalette />)

    openPalette()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    openPalette()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
