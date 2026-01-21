import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FileText, ExternalLink, Code2, Copy, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Citation } from '@/types/chat.types'

interface InlineCitationProps {
  citation: Citation
  index?: number
  onClick?: () => void
  onViewSource?: () => void
}

export const InlineCitation = ({
  citation,
  index,
  onClick,
  onViewSource
}: InlineCitationProps) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const tooltipId = `citation-tooltip-${index || 1}`

  const filename = citation.filePath.split('/').pop() || citation.filePath
  const directory = citation.filePath.substring(0, citation.filePath.lastIndexOf('/'))

  // Detect mobile on mount and window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleCopyPath = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(citation.filePath)
      setCopied(true)
      setCopyError(null)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to copy path'
      setCopyError(error)
      console.error('Failed to copy citation path:', err)
      setTimeout(() => setCopyError(null), 3000)
    }
  }, [citation.filePath])

  const citationRef = `[${index || 1}]`

  return (
    <>
      {/* Citation Badge */}
      <button
        ref={badgeRef}
        onClick={(e) => {
          e.stopPropagation()
          if (isMobile) {
            // On mobile, toggle tooltip on click
            setShowTooltip(!showTooltip)
          }
          onClick?.()
        }}
        onMouseEnter={() => !isMobile && setShowTooltip(true)}
        onMouseLeave={() => !isMobile && setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => !isMobile && setShowTooltip(false)}
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 mx-0.5",
          "rounded-full text-xs font-medium",
          "bg-blue-500/15 text-blue-600 dark:text-blue-400",
          "border border-blue-500/30",
          "hover:bg-blue-500/25 transition-colors duration-200",
          "cursor-pointer relative",
          "focus:outline-none focus:ring-2 focus:ring-blue-500"
        )}
        aria-label={`Citation ${index || 1}: ${filename} at line ${citation.lineNumber || 'unknown'}`}
        aria-describedby={showTooltip ? tooltipId : undefined}
        title={`Source: ${citation.filePath}${citation.lineNumber ? `:${citation.lineNumber}` : ''}`}
      >
        <FileText className="w-3 h-3" />
        <span className="font-semibold">{citationRef}</span>
      </button>

      {/* Enhanced Tooltip (using Portal for proper positioning) */}
      {showTooltip && createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            "fixed z-50 p-3 rounded-lg",
            "bg-slate-900 border border-slate-700",
            "shadow-lg text-xs text-slate-200",
            "min-w-max max-w-sm pointer-events-auto"
          )}
          style={{
            top: badgeRef.current
              ? badgeRef.current.getBoundingClientRect().bottom + 8
              : 0,
            left: badgeRef.current
              ? badgeRef.current.getBoundingClientRect().left
              : 0,
          }}
        >
          {/* Source file info */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Code2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs font-medium text-slate-100 truncate">
                  {filename}
                </p>
                {directory && (
                  <p className="text-slate-400 truncate text-xs">{directory}/</p>
                )}
              </div>
            </div>

            {/* Line number if available */}
            {citation.lineNumber && (
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-xs">Line {citation.lineNumber}</span>
              </div>
            )}

            {/* Error message if copy failed */}
            {copyError && (
              <div className="flex items-start gap-2 p-2 rounded bg-red-950/50 border border-red-700/50">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-400" />
                <p className="text-red-400 text-xs">{copyError}</p>
              </div>
            )}

            {/* Snippet preview if available */}
            {citation.snippet && (
              <div className={cn(
                "p-2 rounded bg-slate-950 border border-slate-700",
                "font-mono text-xs text-slate-300",
                "max-h-20 overflow-y-auto"
              )}>
                {citation.snippet}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={handleCopyPath}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded",
                  "hover:bg-slate-800 transition-colors",
                  "text-slate-400 hover:text-slate-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500"
                )}
                aria-label={copied ? 'File path copied to clipboard' : 'Copy file path to clipboard'}
                aria-pressed={copied}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {onViewSource && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewSource()
                    setShowTooltip(false)
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded",
                    "hover:bg-slate-800 transition-colors",
                    "text-slate-400 hover:text-slate-200",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                  aria-label={`View source file: ${filename}`}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>View</span>
                </button>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute -top-1 left-3 w-2 h-2 bg-slate-900 border-l border-t border-slate-700 transform rotate-45" />
        </div>,
        document.body
      )}
    </>
  )
}
