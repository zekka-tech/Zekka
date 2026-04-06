import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/cn'
import { Eye, EyeOff, Loader, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { AxiosError } from 'axios'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[A-Z]/, 'Must contain an uppercase letter'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) })
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })

type RegisterFormValues = z.infer<typeof registerSchema>

interface RegisterFormProps {
  onSuccess?: () => void
  onLoginClick?: () => void
}

export const RegisterForm = ({
  onSuccess,
  onLoginClick
}: RegisterFormProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const { registerAsync } = useAuth()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema)
  })

  const password = watch('password', '')

  const passwordStrength = {
    hasLength: password.length >= 8,
    hasNumber: /[0-9]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password)
  }

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError('')
    try {
      await registerAsync({ email: values.email, password: values.password, name: values.name })
      onSuccess?.()
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ error?: string }>
      setServerError(axiosErr.response?.data?.error ?? (err instanceof Error ? err.message : 'Registration failed'))
    }
  }

  return (
    <div className={cn("w-full max-w-sm mx-auto")}>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Create Account</h1>
        <p className="text-muted-foreground">Join Zekka to get started</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div className={cn("p-3 rounded-lg", "bg-destructive/10 text-destructive text-sm")}>
            {serverError}
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">Full Name</label>
          <input
            id="name"
            type="text"
            placeholder="John Doe"
            disabled={isSubmitting}
            aria-invalid={!!errors.name}
            {...register('name')}
            className={cn(
              "w-full px-4 py-2 rounded-lg bg-muted border",
              errors.name ? 'border-destructive' : 'border-border',
              "text-foreground placeholder-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            disabled={isSubmitting}
            aria-invalid={!!errors.email}
            {...register('email')}
            className={cn(
              "w-full px-4 py-2 rounded-lg bg-muted border",
              errors.email ? 'border-destructive' : 'border-border',
              "text-foreground placeholder-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              {...register('password')}
              className={cn(
                "w-full px-4 py-2 rounded-lg bg-muted border",
                errors.password ? 'border-destructive' : 'border-border',
                "text-foreground placeholder-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn("absolute right-3 top-1/2 -translate-y-1/2", "text-muted-foreground hover:text-foreground transition-colors")}
              disabled={isSubmitting}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
          )}

          {/* Password strength checklist */}
          {password && (
            <div className="mt-3 space-y-1 text-xs">
              {([
                [passwordStrength.hasLength, 'At least 8 characters'],
                [passwordStrength.hasNumber, 'Contains a number'],
                [passwordStrength.hasLower, 'Contains lowercase letter'],
                [passwordStrength.hasUpper, 'Contains uppercase letter']
              ] as [boolean, string][]).map(([met, label]) => (
                <div
                  key={label}
                  className={cn("flex items-center gap-2", met ? 'text-success' : 'text-muted-foreground')}
                >
                  <Check className="w-3 h-3" />
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium mb-2">Confirm Password</label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isSubmitting}
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
              className={cn(
                "w-full px-4 py-2 rounded-lg bg-muted border",
                errors.confirmPassword ? 'border-destructive' : 'border-border',
                "text-foreground placeholder-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={cn("absolute right-3 top-1/2 -translate-y-1/2", "text-muted-foreground hover:text-foreground transition-colors")}
              disabled={isSubmitting}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Terms */}
        <div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              disabled={isSubmitting}
              aria-invalid={!!errors.terms}
              {...register('terms')}
              className="mt-1"
            />
            <span className="text-muted-foreground">
              I agree to the{' '}
              <a href="#" className="text-primary hover:text-primary/90">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary hover:text-primary/90">Privacy Policy</a>
            </span>
          </label>
          {errors.terms && (
            <p className="text-xs text-destructive mt-1">{errors.terms.message}</p>
          )}
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
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

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
