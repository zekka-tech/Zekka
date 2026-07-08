import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/cn'
import { Eye, EyeOff, Loader } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { AxiosError } from 'axios'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginFormProps {
  onSuccess?: () => void
  onSignUpClick?: () => void
}

export const LoginForm = ({
  onSuccess,
  onSignUpClick
}: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const { loginAsync } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('')
    try {
      await loginAsync(values)
      onSuccess?.()
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ error?: string }>
      setServerError(axiosErr.response?.data?.error ?? (err instanceof Error ? err.message : 'Login failed'))
    }
  }

  return (
    <div className={cn("w-full max-w-sm mx-auto")}>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to Zekka</h1>
        <p className="text-muted-foreground">Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div className={cn("p-3 rounded-lg", "bg-destructive/10 text-destructive text-sm")}>
            {serverError}
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
            placeholder="you@example.com"
            disabled={isSubmitting}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
            className={cn(
              "w-full px-4 py-2 rounded-lg",
              "bg-muted border",
              errors.email ? 'border-destructive' : 'border-border',
              "text-foreground placeholder-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-destructive mt-1">{errors.email.message}</p>
          )}
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
              placeholder="••••••••"
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
              className={cn(
                "w-full px-4 py-2 rounded-lg",
                "bg-muted border",
                errors.password ? 'border-destructive' : 'border-border',
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
                "text-muted-foreground hover:text-foreground transition-colors"
              )}
              disabled={isSubmitting}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-xs text-destructive mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled={isSubmitting} className="rounded border-border" />
            <span>Remember me</span>
          </label>
          <a href="#" className="text-primary hover:text-primary/90 transition-colors">
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full py-2 rounded-lg mt-6",
            "bg-primary text-primary-foreground font-medium",
            "hover:bg-primary/90 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center justify-center gap-2"
          )}
        >
          {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

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
