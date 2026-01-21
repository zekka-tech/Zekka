import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Eye, EyeOff, Loader } from 'lucide-react'

interface LoginFormProps {
  onSubmit?: (email: string, password: string) => Promise<void>
  onSignUpClick?: () => void
}

export const LoginForm = ({
  onSubmit,
  onSignUpClick
}: LoginFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (onSubmit) {
        await onSubmit(email, password)
      } else {
        // Demo login
        console.log('Login:', { email, password })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn(
      "w-full max-w-sm mx-auto"
    )}>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to Zekka</h1>
        <p className="text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error */}
        {error && (
          <div className={cn(
            "p-3 rounded-lg",
            "bg-destructive/10 text-destructive text-sm"
          )}>
            {error}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
            required
            className={cn(
              "w-full px-4 py-2 rounded-lg",
              "bg-muted border border-border",
              "text-foreground placeholder-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              required
              className={cn(
                "w-full px-4 py-2 rounded-lg",
                "bg-muted border border-border",
                "text-foreground placeholder-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "text-muted-foreground hover:text-foreground",
                "transition-colors"
              )}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled={isLoading}
              className="rounded border-border"
            />
            <span>Remember me</span>
          </label>
          <a
            href="#"
            className="text-primary hover:text-primary/90 transition-colors"
          >
            Forgot password?
          </a>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full py-2 rounded-lg mt-6",
            "bg-primary text-primary-foreground font-medium",
            "hover:bg-primary/90 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center justify-center gap-2"
          )}
        >
          {isLoading && <Loader className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Sign Up Link */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <button
          onClick={onSignUpClick}
          className="text-primary hover:text-primary/90 transition-colors font-medium"
        >
          Sign up
        </button>
      </div>
    </div>
  )
}
