import type { ReactNode } from 'react'
import { Header } from './Header'
import { cn } from '@/lib/cn'

interface RootLayoutProps {
  children: ReactNode
}

export const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <div className={cn(
      "flex flex-col h-screen w-full",
      "bg-background text-foreground"
    )}>
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-hidden",
        "flex w-full"
      )}>
        {children}
      </main>
    </div>
  )
}
