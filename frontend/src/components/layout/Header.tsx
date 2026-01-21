import { Logo } from '@/components/shared/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/cn'

export const Header = () => {
  return (
    <header className={cn(
      "h-16 border-b border-border",
      "bg-card",
      "flex items-center justify-between px-6",
      "shadow-sm"
    )}>
      {/* Left Section - Logo */}
      <div className="flex items-center gap-3">
        <Logo />
        <h1 className="text-xl font-semibold">Zekka</h1>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu Placeholder */}
        <button
          className={cn(
            "w-8 h-8 rounded-full",
            "bg-primary hover:bg-primary/90",
            "transition-colors duration-200",
            "flex items-center justify-center text-white text-sm font-medium"
          )}
          title="User menu"
        >
          U
        </button>
      </div>
    </header>
  )
}
