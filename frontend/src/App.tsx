import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/components/ui/Toast'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'
import './styles/globals.css'

const DashboardPage = lazy(() =>
  import('@/pages/Dashboard').then((module) => ({ default: module.Dashboard }))
)
const ProjectsPage = lazy(() =>
  import('@/pages/Projects').then((module) => ({ default: module.Projects }))
)
const AnalyticsPage = lazy(() =>
  import('@/pages/Analytics').then((module) => ({ default: module.Analytics }))
)
const SettingsPage = lazy(() =>
  import('@/pages/Settings').then((module) => ({ default: module.Settings }))
)
const AuthPage = lazy(() =>
  import('@/pages/Auth').then((module) => ({ default: module.Auth }))
)
const CommandPalette = lazy(() =>
  import('@/components/ui/CommandPalette').then((module) => ({
    default: module.CommandPalette,
  }))
)

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Do not retry on auth errors or client errors
        if (error instanceof Error && 'status' in error) {
          const status = (error as Error & { status?: number }).status
          if (status && status >= 400 && status < 500) return false
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})

const AppLoadingFallback = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-background">
    <div className="text-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
)

function AppContentInner() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const { theme, setTheme } = useTheme()

  if (isLoading) {
    return <AppLoadingFallback />
  }

  if (!isAuthenticated || !user) {
    return (
      <Suspense fallback={<AppLoadingFallback />}>
        <AuthPage />
      </Suspense>
    )
  }

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ErrorBoundary>
      <>
        <RootLayout>
          <Suspense fallback={<AppLoadingFallback />}>
            <Routes>
              <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
              <Route path="/projects" element={<ErrorBoundary><ProjectsPage /></ErrorBoundary>} />
              <Route path="/analytics" element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </RootLayout>

        {/* Command Palette */}
        <Suspense fallback={null}>
          <CommandPalette isDark={theme === 'dark'} onThemeToggle={handleThemeToggle} />
        </Suspense>
      </>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <OfflineBanner />
          <Router>
            <AppContentInner />
          </Router>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
