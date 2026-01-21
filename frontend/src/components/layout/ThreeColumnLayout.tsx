import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Panel {
  id: string
  children: ReactNode
  defaultWidth: number
  minWidth?: number
  collapsible?: boolean
}

interface ThreeColumnLayoutProps {
  leftPanel: Panel
  centerPanel: Panel
  rightPanel: Panel
}

export const ThreeColumnLayout = ({
  leftPanel,
  centerPanel,
  rightPanel,
}: ThreeColumnLayoutProps) => {
  const [leftWidth, setLeftWidth] = useState(280)
  const [rightWidth, setRightWidth] = useState(360)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  const [isRightCollapsed, setIsRightCollapsed] = useState(false)
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)

  // Load layout preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('layout-state')
    if (saved) {
      const state = JSON.parse(saved)
      setLeftWidth(state.leftWidth || 280)
      setRightWidth(state.rightWidth || 360)
      setIsLeftCollapsed(state.isLeftCollapsed || false)
      setIsRightCollapsed(state.isRightCollapsed || false)
    }
  }, [])

  // Save layout preferences
  useEffect(() => {
    const state = {
      leftWidth,
      rightWidth,
      isLeftCollapsed,
      isRightCollapsed,
    }
    localStorage.setItem('layout-state', JSON.stringify(state))
  }, [leftWidth, rightWidth, isLeftCollapsed, isRightCollapsed])

  // Handle left panel resize
  const handleLeftMouseDown = () => {
    setIsDraggingLeft(true)
  }

  const handleRightMouseDown = () => {
    setIsDraggingRight(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        const newWidth = Math.max(200, Math.min(500, e.clientX - 8))
        setLeftWidth(newWidth)
      }
      if (isDraggingRight) {
        const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX - 8))
        setRightWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsDraggingLeft(false)
      setIsDraggingRight(false)
    }

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingLeft, isDraggingRight])

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Left Panel */}
      <div
        className={cn(
          "flex flex-col border-r border-border bg-card",
          "transition-all duration-200 overflow-hidden",
          isLeftCollapsed ? 'w-0' : 'w-0'
        )}
        style={{ width: isLeftCollapsed ? 0 : leftWidth }}
      >
        <div className="flex-1 overflow-hidden">{leftPanel.children}</div>
      </div>

      {/* Left Resize Handle */}
      {!isLeftCollapsed && (
        <div
          onMouseDown={handleLeftMouseDown}
          className={cn(
            "w-1 bg-border hover:bg-primary/50",
            "cursor-col-resize",
            "transition-colors duration-200",
            isDraggingLeft && 'bg-primary'
          )}
        />
      )}

      {/* Center Panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {centerPanel.children}
      </div>

      {/* Right Resize Handle */}
      {!isRightCollapsed && (
        <div
          onMouseDown={handleRightMouseDown}
          className={cn(
            "w-1 bg-border hover:bg-primary/50",
            "cursor-col-resize",
            "transition-colors duration-200",
            isDraggingRight && 'bg-primary'
          )}
        />
      )}

      {/* Right Panel */}
      <div
        className={cn(
          "flex flex-col border-l border-border bg-card",
          "transition-all duration-200 overflow-hidden",
          isRightCollapsed ? 'w-0' : 'w-0'
        )}
        style={{ width: isRightCollapsed ? 0 : rightWidth }}
      >
        <div className="flex-1 overflow-hidden">{rightPanel.children}</div>
      </div>

      {/* Collapse Buttons */}
      {leftPanel.collapsible && (
        <button
          onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
          className={cn(
            "absolute left-0 top-20 z-10",
            "w-8 h-8 rounded-r-md",
            "bg-primary hover:bg-primary/90",
            "text-white flex items-center justify-center",
            "transition-colors duration-200"
          )}
          aria-label="Toggle left panel"
        >
          {isLeftCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      {rightPanel.collapsible && (
        <button
          onClick={() => setIsRightCollapsed(!isRightCollapsed)}
          className={cn(
            "absolute right-0 top-20 z-10",
            "w-8 h-8 rounded-l-md",
            "bg-primary hover:bg-primary/90",
            "text-white flex items-center justify-center",
            "transition-colors duration-200"
          )}
          aria-label="Toggle right panel"
        >
          {isRightCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}
