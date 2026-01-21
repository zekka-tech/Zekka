import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Eye, EyeOff, Loader, Check } from 'lucide-react'

interface RegisterFormProps {
  onSubmit?: (email: string, password: string, name: string) => Promise<void>
  onLoginClick?: () => void
}

export const RegisterForm = ({
  onSubmit,
  onLoginClick
}: RegisterFormProps) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordStrength = {
    hasLength: password.length >= 8,
    hasNumber: /[0-9]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password)
  }

  const isPasswordValid = Object.values(passwordStrength).every(v => v)
  const passwordMatch = password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isPasswordValid) {
      setError('Password does not meet requirements')
      return
    }

    if (!passwordMatch) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      if (onSubmit) {
        await onSubmit(email, password, name)
      } else {
        // Demo registration
        console.log('Register:', { name, email, password })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn(
      "w-full max-w-sm mx-auto"
    )}>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Create Account</h1>
        <p className="text-muted-foreground">
          Join Zekka to get started
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

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
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

          {/* Password Strength */}
          {password && (
            <div className="mt-3 space-y-2 text-xs">
              <div className={cn(
                "flex items-center gap-2",
                passwordStrength.hasLength ? 'text-success' : 'text-muted-foreground'
              )}>
                <Check className="w-3 h-3" />
                At least 8 characters
              </div>
              <div className={cn(
                "flex items-center gap-2",
                passwordStrength.hasNumber ? 'text-success' : 'text-muted-foreground'
              )}>
                <Check className="w-3 h-3" />
                Contains a number
              </div>
              <div className={cn(
                "flex items-center gap-2",
                passwordStrength.hasLower ? 'text-success' : 'text-muted-foreground'
              )}>
                <Check className="w-3 h-3" />
                Contains lowercase letter
              </div>
              <div className={cn(
                "flex items-center gap-2",
                passwordStrength.hasUpper ? 'text-success' : 'text-muted-foreground'
              )}>
                <Check className="w-3 h-3" />
                Contains uppercase letter
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              required
              className={cn(
                "w-full px-4 py-2 rounded-lg",
                "bg-muted border border-border",
                "text-foreground placeholder-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary",
                confirmPassword && !passwordMatch && "ring-2 ring-destructive",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "text-muted-foreground hover:text-foreground",
                "transition-colors"
              )}
              disabled={isLoading}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            disabled={isLoading}
            required
            className="mt-1"
          />
          <span className="text-muted-foreground">
            I agree to the{' '}
            <a href="#" className="text-primary hover:text-primary/90">
              Terms of Service
            </a>
            {' '} and{' '}
            <a href="#" className="text-primary hover:text-primary/90">
              Privacy Policy
            </a>
          </span>
        </label>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !isPasswordValid || !passwordMatch}
          className={cn(
            "w-full py-2 rounded-lg mt-6",
            "bg-primary text-primary-foreground font-medium",
            "hover:bg-primary/90 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center justify-center gap-2"
          )}
        >
          {isLoading && <Loader className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {/* Login Link */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button
          onClick={onLoginClick}
          className="text-primary hover:text-primary/90 transition-colors font-medium"
        >
          Sign in
        </button>
      </div>
    </div>
  )
}
