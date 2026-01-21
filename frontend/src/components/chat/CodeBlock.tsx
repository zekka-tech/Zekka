import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'

interface CodeBlockProps {
  code: string
  language: string
  filename?: string
}

export const CodeBlock = ({ code, language, filename }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={cn(
      "my-4 rounded-lg overflow-hidden",
      "bg-slate-900 border border-slate-700"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2",
        "bg-slate-800 border-b border-slate-700"
      )}>
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-sm text-slate-400">{filename}</span>
          )}
          <span className="text-xs text-slate-500">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "p-1 rounded",
            "hover:bg-slate-700 transition-colors",
            "text-slate-400 hover:text-slate-200"
          )}
          title="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Code */}
      <div className={cn(
        "overflow-x-auto px-4 py-3",
        "font-mono text-sm"
      )}>
        <pre className={cn(
          "m-0",
          "text-slate-200",
          "leading-relaxed"
        )}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}
