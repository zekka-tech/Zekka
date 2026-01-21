import { useState, useEffect } from 'react'
import { RootLayout } from '@/components/layout/RootLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Auth } from '@/pages/Auth'
import './styles/globals.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token')
    setIsAuthenticated(!!token)
    setIsLoading(false)
  }, [])

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

  if (!isAuthenticated) {
    return <Auth />
  }

  return (
    <RootLayout>
      <Dashboard />
    </RootLayout>
  )
}

export default App
