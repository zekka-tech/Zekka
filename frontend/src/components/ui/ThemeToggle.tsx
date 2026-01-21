import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState<boolean>(false)
  const [isMounted, setIsMounted] = useState(false)

  // Initialize theme on mount
  useEffect(() => {
    setIsMounted(true)
    const savedTheme = localStorage.getItem('theme') || 'system'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme === 'dark' || (savedTheme === 'system' && prefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)

    // Update DOM
    if (newIsDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Save preference
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
  }

  if (!isMounted) {
    return (
      <button className="w-10 h-10 rounded-md flex items-center justify-center" disabled>
        <div className="w-5 h-5 bg-muted rounded" />
      </button>
    )
  }

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
      aria-label="Toggle theme"
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
