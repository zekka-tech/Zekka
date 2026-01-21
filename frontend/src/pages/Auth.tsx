import { useState } from 'react'
import { cn } from '@/lib/cn'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { Logo } from '@/components/shared/Logo'

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true)

  const handleAuthSuccess = () => {
    // Auth hook will handle updating the app state
    // Just reload to trigger re-render
    window.location.reload()
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center",
      "bg-gradient-to-br from-background via-background to-muted/20",
      "p-4"
    )}>
      {/* Background decoration */}
      <div className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none",
        "before:absolute before:top-0 before:right-0 before:w-[500px] before:h-[500px]",
        "before:bg-primary/5 before:rounded-full before:blur-3xl",
        "after:absolute after:bottom-0 after:left-0 after:w-[500px] after:h-[500px]",
        "after:bg-primary/5 after:rounded-full after:blur-3xl"
      )} />

      {/* Content */}
      <div className={cn(
        "relative z-10 w-full max-w-md"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-center mb-8 gap-2">
          <Logo />
          <span className="text-2xl font-bold">Zekka</span>
        </div>

        {/* Forms */}
        {isLogin ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSignUpClick={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onLoginClick={() => setIsLogin(true)}
          />
        )}

        {/* Footer */}
        <div className={cn(
          "mt-12 text-center text-xs text-muted-foreground border-t border-border pt-6"
        )}>
          <p>© 2026 Zekka Framework. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
