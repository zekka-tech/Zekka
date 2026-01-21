import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTheme } from '@/contexts/ThemeContext'

export const ThemeToggle = () => {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  if (!isMounted) {
    return (
      <button className="w-10 h-10 rounded-md flex items-center justify-center" disabled>
        <div className="w-5 h-5 bg-muted rounded" />
      </button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "w-10 h-10 rounded-md",
        "flex items-center justify-center",
        "bg-muted hover:bg-muted/80",
        "text-muted-foreground hover:text-foreground",
        "transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-primary"
      )}
      aria-label={`Toggle theme (currently ${theme})`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  )
}
