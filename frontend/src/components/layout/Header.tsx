import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/shared/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import { LogOutIcon } from 'lucide-react'

export const Header = () => {
  const location = useLocation()
  const { logoutAsync } = useAuth()

  const handleLogout = async () => {
    try {
      await logoutAsync()
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <header className={cn(
      "h-16 border-b border-border",
      "bg-card",
      "flex items-center justify-between px-6",
      "shadow-sm"
    )}>
      {/* Left Section - Logo & Nav */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-xl font-semibold">Zekka</h1>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1">
          <Link
            to="/dashboard"
            className={cn(
              "px-3 py-2 rounded-lg font-medium text-sm transition-colors",
              isActive('/dashboard')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            Dashboard
          </Link>
          <Link
            to="/projects"
            className={cn(
              "px-3 py-2 rounded-lg font-medium text-sm transition-colors",
              isActive('/projects')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            Projects
          </Link>
        </nav>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={cn(
            "w-8 h-8 rounded-full",
            "bg-destructive/10 hover:bg-destructive/20",
            "transition-colors duration-200",
            "flex items-center justify-center text-destructive"
          )}
          title="Logout"
        >
          <LogOutIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
