import { useState, useRef, useCallback } from 'react'
import { Send, Paperclip, Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { FileAttachmentPreview } from './FileAttachmentPreview'
import { useVoiceInput } from '@/hooks/useVoiceInput'

const ACCEPTED_TYPES = [
  'image/*',
  'text/*',
  'application/pdf',
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java',
  '.c', '.cpp', '.cs', '.rb', '.php', '.json', '.yaml', '.yml', '.md'
].join(',')

const MAX_FILE_SIZE_MB = 10

interface InputAreaProps {
  onSubmit: (message: string, attachments?: File[]) => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
}

export const InputArea = ({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = 'Type your message...'
}: InputAreaProps) => {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isRecording, isSupported: voiceSupported, toggle: toggleVoice } = useVoiceInput({
    onTranscript: (text) => setMessage((prev) => prev ? `${prev} ${text}` : text),
    onError: () => { /* silently ignore mic errors in UI */ }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if ((trimmed || attachments.length > 0) && !isLoading && !disabled) {
      onSubmit(trimmed, attachments.length > 0 ? attachments : undefined)
      setMessage('')
      setAttachments([])
      setFileError(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const oversized = files.filter((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024)
    if (oversized.length > 0) {
      setFileError(`Files must be under ${MAX_FILE_SIZE_MB} MB: ${oversized.map((f) => f.name).join(', ')}`)
      e.target.value = ''
      return
    }

    setFileError(null)
    setAttachments((prev) => {
      const combined = [...prev, ...files]
      // Deduplicate by name+size
      const seen = new Set<string>()
      return combined.filter((f) => {
        const key = `${f.name}-${f.size}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    })
    e.target.value = ''
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const canSubmit = (message.trim().length > 0 || attachments.length > 0) && !isLoading && !disabled

  return (
    <div className="border-t border-border bg-background">
      {/* Attachment previews */}
      <FileAttachmentPreview
        files={attachments}
        onRemove={removeAttachment}
        disabled={isLoading || disabled}
      />

      {/* File error */}
      {fileError && (
        <p className="px-4 pt-2 text-xs text-destructive">{fileError}</p>
      )}

      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-2 items-end">
          {/* Action buttons */}
          <div className="flex gap-1">
            {/* File attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'p-2 rounded-lg transition-colors',
                'hover:bg-muted',
                'text-muted-foreground hover:text-foreground',
                (isLoading || disabled) && 'opacity-50 cursor-not-allowed'
              )}
              title="Attach file"
              disabled={isLoading || disabled}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Voice input */}
            <button
              type="button"
              onClick={toggleVoice}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isRecording
                  ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 animate-pulse'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                (!voiceSupported || isLoading || disabled) && 'opacity-50 cursor-not-allowed'
              )}
              title={
                !voiceSupported
                  ? 'Voice input not supported in this browser'
                  : isRecording
                  ? 'Stop recording'
                  : 'Start voice input'
              }
              disabled={!voiceSupported || isLoading || disabled}
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />

          {/* Text input */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Listening...' : placeholder}
            disabled={isLoading || disabled}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg',
              'bg-muted border border-border',
              'text-foreground placeholder-muted-foreground',
              'resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isRecording && 'ring-2 ring-destructive/50'
            )}
            rows={1}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Send message (Enter)"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
