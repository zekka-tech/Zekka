import { useState, useEffect, useRef } from 'react'
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

type LayoutState = {
  leftWidth?: number
  rightWidth?: number
  isLeftCollapsed?: boolean
  isRightCollapsed?: boolean
}

const readSavedLayout = (): LayoutState => {
  try {
    const saved = localStorage.getItem('layout-state')
    return saved ? (JSON.parse(saved) as LayoutState) : {}
  } catch (e) {
    console.error('Failed to load layout state:', e)
    return {}
  }
}

export const ThreeColumnLayout = ({
  leftPanel,
  centerPanel,
  rightPanel,
}: ThreeColumnLayoutProps) => {
  // Read persisted layout once (lazy init) instead of syncing via an effect,
  // which avoids an extra render on mount.
  const [saved] = useState(readSavedLayout)
  const [leftWidth, setLeftWidth] = useState(saved.leftWidth ?? 280)
  const [rightWidth, setRightWidth] = useState(saved.rightWidth ?? 360)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(saved.isLeftCollapsed ?? false)
  const [isRightCollapsed, setIsRightCollapsed] = useState(saved.isRightCollapsed ?? false)
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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
      if (isDraggingLeft && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const newWidth = Math.max(200, Math.min(500, e.clientX - rect.left))
        setLeftWidth(newWidth)
      }
      if (isDraggingRight && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const newWidth = Math.max(200, Math.min(600, rect.right - e.clientX))
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
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDraggingLeft, isDraggingRight])

  return (
    <div ref={containerRef} className="flex w-full h-full overflow-hidden">
      {/* Left Panel */}
      <div
        className={cn(
          "flex flex-col border-r border-border bg-card",
          "overflow-hidden"
        )}
        style={{
          width: isLeftCollapsed ? 0 : leftWidth,
          transition: isDraggingLeft ? 'none' : 'width 0.2s ease-out'
        }}
      >
        <div className="flex-1 overflow-auto">{leftPanel.children}</div>
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
          "overflow-hidden"
        )}
        style={{
          width: isRightCollapsed ? 0 : rightWidth,
          transition: isDraggingRight ? 'none' : 'width 0.2s ease-out'
        }}
      >
        <div className="flex-1 overflow-auto">{rightPanel.children}</div>
      </div>

      {/* Collapse Buttons */}
      {leftPanel.collapsible && (
        <button
          onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
          className={cn(
            "fixed left-0 top-20 z-10",
            "w-8 h-8 rounded-r-md",
            "bg-primary hover:bg-primary/90",
            "text-white flex items-center justify-center",
            "transition-colors duration-200"
          )}
          aria-label="Toggle left panel"
          title={isLeftCollapsed ? 'Show left panel' : 'Hide left panel'}
        >
          {isLeftCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      {rightPanel.collapsible && (
        <button
          onClick={() => setIsRightCollapsed(!isRightCollapsed)}
          className={cn(
            "fixed right-0 top-20 z-10",
            "w-8 h-8 rounded-l-md",
            "bg-primary hover:bg-primary/90",
            "text-white flex items-center justify-center",
            "transition-colors duration-200"
          )}
          aria-label="Toggle right panel"
          title={isRightCollapsed ? 'Show right panel' : 'Hide right panel'}
        >
          {isRightCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}
