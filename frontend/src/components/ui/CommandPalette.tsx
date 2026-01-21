import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import {
  Search,
  Home,
  FolderOpen,
  Settings,
  Moon,
  Sun,
  Zap,
  HelpCircle,
  Copy,
  ChevronRight
} from 'lucide-react'

interface Command {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  action: () => void
  category: 'navigation' | 'action' | 'settings'
  shortcuts?: string[]
}

interface CommandPaletteProps {
  isDark?: boolean
  onThemeToggle?: () => void
}

// Custom event for opening create project dialog
declare global {
  interface WindowEventMap {
    'open-create-project': CustomEvent
  }
}

export const CommandPalette = ({ isDark, onThemeToggle }: CommandPaletteProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()

  // Track last key press for keyboard shortcuts (e.g., G+D for Go to Dashboard)
  const [lastKeyPress, setLastKeyPress] = useState<string>('')

  const commands: Command[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View your dashboard and recent activity',
      icon: <Home className="w-4 h-4" />,
      action: () => {
        navigate('/dashboard')
        setIsOpen(false)
      },
      category: 'navigation',
      shortcuts: ['G', 'D']
    },
    {
      id: 'nav-projects',
      label: 'Go to Projects',
      description: 'Manage and view all projects',
      icon: <FolderOpen className="w-4 h-4" />,
      action: () => {
        navigate('/projects')
        setIsOpen(false)
      },
      category: 'navigation',
      shortcuts: ['G', 'P']
    },

    // Actions
    {
      id: 'action-new-project',
      label: 'Create New Project',
      description: 'Start a new project',
      icon: <Zap className="w-4 h-4" />,
      action: () => {
        setIsOpen(false)
        // Dispatch custom event for projects page to handle
        window.dispatchEvent(new CustomEvent('open-create-project'))
      },
      category: 'action',
      shortcuts: ['C', 'P']
    },
    {
      id: 'action-copy',
      label: 'Copy URL',
      description: 'Copy current page URL to clipboard',
      icon: <Copy className="w-4 h-4" />,
      action: () => {
        navigator.clipboard.writeText(window.location.href)
        setIsOpen(false)
        // Visual feedback would go here (toast notification)
      },
      category: 'action'
    },

    // Settings
    {
      id: 'settings-theme',
      label: isDark ? 'Light Mode' : 'Dark Mode',
      description: `Switch to ${isDark ? 'light' : 'dark'} mode`,
      icon: isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      action: () => {
        onThemeToggle?.()
        setIsOpen(false)
      },
      category: 'settings',
      shortcuts: ['T', 'M']
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Open settings and preferences',
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        // TODO: Navigate to settings
        setIsOpen(false)
      },
      category: 'settings'
    },
    {
      id: 'help',
      label: 'Help & Feedback',
      description: 'Get help or send feedback',
      icon: <HelpCircle className="w-4 h-4" />,
      action: () => {
        // TODO: Open help/feedback
        setIsOpen(false)
      },
      category: 'settings'
    }
  ], [isDark, navigate, onThemeToggle])

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return commands

    const query = search.toLowerCase()
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query)
    )
  }, [search, commands])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
        setSearch('')
        setSelectedIndex(0)
        return
      }

      // Handle keyboard shortcuts (G+D, G+P, C+P) when palette is closed
      if (!isOpen && !search) {
        const key = e.key.toLowerCase()
        let shortcutCommand = null

        // Track G+D (Go to Dashboard) or G+P (Go to Projects)
        if (key === 'g' && !e.ctrlKey && !e.metaKey) {
          setLastKeyPress('g')
          setTimeout(() => setLastKeyPress(''), 1000)
          return
        }

        if (lastKeyPress === 'g' && (key === 'd' || key === 'p')) {
          shortcutCommand = key === 'd'
            ? filteredCommands.find(c => c.id === 'nav-dashboard')
            : filteredCommands.find(c => c.id === 'nav-projects')
          if (shortcutCommand) {
            shortcutCommand.action()
            return
          }
        }

        // C+P for Create Project
        if (key === 'c' && !e.ctrlKey && !e.metaKey) {
          setLastKeyPress('c')
          setTimeout(() => setLastKeyPress(''), 1000)
          return
        }

        if (lastKeyPress === 'c' && key === 'p') {
          shortcutCommand = filteredCommands.find(c => c.id === 'action-new-project')
          if (shortcutCommand) {
            shortcutCommand.action()
            return
          }
        }
      }

      // Only handle navigation when open
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, lastKeyPress])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl mx-4">
          <div className={cn(
            "rounded-lg border border-border",
            "bg-card shadow-xl",
            "overflow-hidden"
          )}>
            {/* Search Input */}
            <div className={cn(
              "flex items-center gap-3 px-4 py-3",
              "border-b border-border",
              "bg-background"
            )}>
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search commands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search commands by name or description"
                role="searchbox"
                aria-expanded={isOpen}
                className={cn(
                  "flex-1 bg-transparent outline-none",
                  "text-foreground placeholder:text-muted-foreground",
                  "text-sm focus:outline-none"
                )}
              />
              <kbd className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                "bg-muted text-muted-foreground",
                "hidden sm:inline"
              )}>
                ESC
              </kbd>
            </div>

            {/* Commands List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <p>No commands found</p>
                </div>
              ) : (
                <div className="py-2">
                  {/* Group by category */}
                  {['navigation', 'action', 'settings'].map(category => {
                    const categoryCommands = filteredCommands.filter(
                      cmd => cmd.category === category
                    )

                    if (categoryCommands.length === 0) return null

                    return (
                      <div key={category}>
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {category === 'navigation' && 'Navigate'}
                          {category === 'action' && 'Actions'}
                          {category === 'settings' && 'Settings'}
                        </div>

                        {categoryCommands.map((command) => {
                          const isSelected = filteredCommands.indexOf(command) === selectedIndex
                          return (
                            <button
                              key={command.id}
                              onClick={() => command.action()}
                              className={cn(
                                "w-full px-4 py-2 text-left transition-colors",
                                "flex items-center gap-3",
                                isSelected
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-muted',
                                "focus:outline-none focus:ring-2 focus:ring-primary"
                              )}
                              role="option"
                              aria-selected={isSelected}
                              aria-label={command.label}
                            >
                              <span className="text-muted-foreground">
                                {command.icon}
                              </span>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {command.label}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {command.description}
                                </p>
                              </div>

                              <div className="flex items-center gap-1">
                                {command.shortcuts && (
                                  <div className="flex gap-1">
                                    {command.shortcuts.map((key, i) => (
                                      <kbd
                                        key={i}
                                        className={cn(
                                          "px-1.5 py-0.5 rounded text-xs font-medium",
                                          "bg-muted text-muted-foreground",
                                          "hidden sm:inline"
                                        )}
                                      >
                                        {key}
                                      </kbd>
                                    ))}
                                  </div>
                                )}
                                {isSelected && (
                                  <ChevronRight className="w-4 h-4 text-primary" />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={cn(
              "px-4 py-2 border-t border-border",
              "bg-muted/50 text-xs text-muted-foreground",
              "flex items-center justify-between"
            )}>
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-background text-foreground font-medium">Enter</kbd> to execute</span>
              <span className="hidden sm:inline">
                Navigate with <kbd className="px-1 py-0.5 rounded bg-background text-foreground font-medium">↑↓</kbd>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
