import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { RootLayout } from '@/components/layout/RootLayout'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Dashboard } from '@/pages/Dashboard'
import { Projects } from '@/pages/Projects'
import { Auth } from '@/pages/Auth'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { useAuth } from '@/hooks/useAuth'
import './styles/globals.css'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
})

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('theme-preference')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Update theme in document
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme-preference', isDark ? 'dark' : 'light')
  }, [isDark])

  const handleThemeToggle = () => {
    setIsDark(prev => !prev)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Auth />
  }

  return (
    <ErrorBoundary>
      <>
        <RootLayout>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </RootLayout>

        {/* Command Palette */}
        <CommandPalette isDark={isDark} onThemeToggle={handleThemeToggle} />
      </>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  )
}

export default App
