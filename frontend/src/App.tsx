import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Dashboard } from '@/pages/Dashboard'
import { Projects } from '@/pages/Projects'
import { Analytics } from '@/pages/Analytics'
import { Settings } from '@/pages/Settings'
import { Auth } from '@/pages/Auth'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'
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

function AppContentInner() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const { theme, setTheme } = useTheme()

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

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ErrorBoundary>
      <>
        <RootLayout>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </RootLayout>

        {/* Command Palette */}
        <CommandPalette isDark={theme === 'dark'} onThemeToggle={handleThemeToggle} />
      </>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <AppContentInner />
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
