import { Copy, Check, Download } from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/cn'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-json'

interface CodeBlockProps {
  code: string
  language: string
  filename?: string
}

export const CodeBlock = ({ code, language, filename }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  // Memoize lines array to avoid splitting twice
  const lines = useMemo(() => code.split('\n'), [code])
  const lineCount = lines.length

  // Get highlighted code using Prism
  const highlightedCode = useMemo(() => {
    const lang = Prism.languages[language] ? language : 'javascript'
    return Prism.highlight(code, Prism.languages[lang], lang)
  }, [code, language])

  // Check if language is supported
  const isLanguageSupported = useMemo(() => {
    return !!Prism.languages[language]
  }, [language])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setCopyError(null)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to copy'
      setCopyError(error)
      console.error('Failed to copy:', err)
    }
  }, [code])

  const handleDownload = useCallback(() => {
    try {
      const element = document.createElement('a')
      const file = new Blob([code], { type: 'text/plain' })
      element.href = URL.createObjectURL(file)

      // Sanitize filename
      const sanitizedFilename = (filename || `code.${language}`)
        .replace(/[/\\:*?"<>|]/g, '_')
      element.download = sanitizedFilename

      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      URL.revokeObjectURL(element.href)
    } catch (err) {
      console.error('Failed to download:', err)
    }
  }, [code, filename, language])

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
        <div className="flex items-center gap-3">
          {filename && (
            <span className="text-sm font-medium text-slate-200">{filename}</span>
          )}
          <span className="text-xs text-slate-500 flex items-center gap-1">
            {language.toUpperCase()}
            {!isLanguageSupported && (
              <span className="text-amber-500" title="Language highlighting may not be supported">
                ⚠
              </span>
            )}
            {lineCount > 1 && <span>• {lineCount} lines</span>}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            className={cn(
              "p-1.5 rounded hover:bg-slate-700 transition-colors",
              "text-slate-400 hover:text-slate-200",
              "focus:outline-none focus:ring-2 focus:ring-slate-500"
            )}
            aria-label={`Download ${filename || 'code'} as file`}
            title="Download code"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              "p-1.5 rounded hover:bg-slate-700 transition-colors",
              "text-slate-400 hover:text-slate-200",
              "focus:outline-none focus:ring-2 focus:ring-slate-500",
              copied && "text-green-400"
            )}
            aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
            aria-pressed={copied}
            title={copyError || 'Copy code'}
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Error message */}
      {copyError && (
        <div className="px-4 py-2 bg-red-950/50 border-b border-red-700/50 text-xs text-red-400">
          {copyError}
        </div>
      )}

      {/* Code with syntax highlighting */}
      <div className={cn(
        "overflow-x-auto",
        "bg-slate-950"
      )}>
        <div className="flex">
          {/* Line numbers */}
          <div
            className={cn(
              "flex flex-col items-end px-4 py-3",
              "bg-slate-900 text-slate-500 select-none",
              "border-r border-slate-700 text-xs font-mono",
              "aria-hidden"
            )}
            aria-hidden="true"
          >
            {lines.map((_, i) => (
              <div key={i} className="h-6 leading-6">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code content */}
          <pre className={cn(
            "flex-1 px-4 py-3 m-0",
            "text-sm font-mono",
            "leading-6 overflow-hidden"
          )}>
            <code
              className={`language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
              aria-label={`Code example in ${language}: ${code.substring(0, 100)}`}
            />
          </pre>
        </div>
      </div>
    </div>
  )
}
