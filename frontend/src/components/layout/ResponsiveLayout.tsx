import { useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Menu, X } from 'lucide-react'

interface ResponsiveLayoutProps {
  leftPanel?: {
    id: string
    children: ReactNode
    title?: string
  }
  centerPanel: {
    id: string
    children: ReactNode
  }
  rightPanel?: {
    id: string
    children: ReactNode
    title?: string
  }
}

export const ResponsiveLayout = ({
  leftPanel,
  centerPanel,
  rightPanel
}: ResponsiveLayoutProps) => {
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  return (
    <div className={cn(
      "flex flex-col h-full overflow-hidden",
      "bg-background"
    )}>
      {/* Mobile Header - Show only on small screens */}
      <div className={cn(
        "md:hidden flex items-center justify-between",
        "px-4 py-3 border-b border-border",
        "bg-card"
      )}>
        <button
          onClick={() => setLeftOpen(!leftOpen)}
          className={cn(
            "p-2 rounded hover:bg-muted transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            !leftPanel && "opacity-50 cursor-not-allowed"
          )}
          disabled={!leftPanel}
          aria-label={leftOpen && leftPanel ? 'Close left panel' : 'Open left panel'}
          aria-expanded={leftOpen && !!leftPanel}
          aria-controls={leftPanel?.id}
        >
          {leftOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <h1 className="text-lg font-semibold">{centerPanel.id === 'chat' ? 'Chat' : 'Dashboard'}</h1>

        <button
          onClick={() => setRightOpen(!rightOpen)}
          className={cn(
            "p-2 rounded hover:bg-muted transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            !rightPanel && "opacity-50 cursor-not-allowed"
          )}
          disabled={!rightPanel}
          aria-label={rightOpen && rightPanel ? 'Close right panel' : 'Open right panel'}
          aria-expanded={rightOpen && !!rightPanel}
          aria-controls={rightPanel?.id}
        >
          {rightOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden gap-0 md:gap-px">
        {/* Left Sidebar - Responsive */}
        {leftPanel && (
          <div
            className={cn(
              "flex flex-col bg-card border-r border-border",
              "transition-all duration-300",
              // Mobile
              "absolute md:relative z-20 md:z-auto",
              "w-64 md:w-auto md:flex-none",
              "h-full md:h-auto",
              "left-0 top-0",
              !leftOpen && "md:hidden -left-64"
            )}
          >
            {leftPanel.title && (
              <div className="px-4 py-3 border-b border-border md:hidden">
                <h2 className="font-semibold">{leftPanel.title}</h2>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {leftPanel.children}
            </div>
          </div>
        )}

        {/* Mobile Overlay - Close on tap */}
        {leftPanel && leftOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 md:hidden"
            onClick={() => setLeftOpen(false)}
          />
        )}

        {/* Center Content - Always visible */}
        <div className={cn(
          "flex-1 flex flex-col",
          "overflow-hidden",
          "min-w-0" // Important for flex children to shrink properly
        )}>
          {centerPanel.children}
        </div>

        {/* Right Sidebar - Responsive */}
        {rightPanel && (
          <div
            className={cn(
              "flex flex-col bg-card border-l border-border",
              "transition-all duration-300",
              // Mobile
              "absolute md:relative z-20 md:z-auto",
              "w-80 md:w-auto md:flex-none",
              "h-full md:h-auto",
              "right-0 top-0",
              !rightOpen && "md:hidden -right-80"
            )}
          >
            {rightPanel.title && (
              <div className="px-4 py-3 border-b border-border md:hidden">
                <h2 className="font-semibold">{rightPanel.title}</h2>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {rightPanel.children}
            </div>
          </div>
        )}

        {/* Mobile Overlay - Close on tap */}
        {rightPanel && rightOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 md:hidden"
            onClick={() => setRightOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
