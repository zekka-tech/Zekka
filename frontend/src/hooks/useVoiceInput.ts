import { useState, useRef, useCallback, useEffect } from 'react'

export type VoiceInputStatus = 'idle' | 'recording' | 'unsupported'

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void
  onError?: (message: string) => void
  language?: string
}

interface UseVoiceInputReturn {
  status: VoiceInputStatus
  isRecording: boolean
  isSupported: boolean
  start: () => void
  stop: () => void
  toggle: () => void
}

export const useVoiceInput = ({
  onTranscript,
  onError,
  language = 'en-US'
}: UseVoiceInputOptions): UseVoiceInputReturn => {
  const [status, setStatus] = useState<VoiceInputStatus>('idle')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  type SpeechRecognitionCtor = new () => SpeechRecognition

  const getSpeechRecognitionCtor = (): SpeechRecognitionCtor | null => {
    if (typeof window === 'undefined') return null
    const w = window as Window & {
      webkitSpeechRecognition?: SpeechRecognitionCtor
      SpeechRecognition?: SpeechRecognitionCtor
    }
    return w.webkitSpeechRecognition ?? w.SpeechRecognition ?? null
  }

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setStatus('idle')
  }, [])

  const start = useCallback(() => {
    const SpeechRecognitionImpl = getSpeechRecognitionCtor()
    if (!isSupported || !SpeechRecognitionImpl) {
      setStatus('unsupported')
      onError?.('Voice input is not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognitionImpl()
    recognition.lang = language
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      if (transcript) {
        onTranscript(transcript)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        onError?.(`Voice recognition error: ${event.error}`)
      }
      setStatus('idle')
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setStatus('idle')
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setStatus('recording')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, language, onTranscript, onError])

  const toggle = useCallback(() => {
    if (status === 'recording') {
      stop()
    } else {
      start()
    }
  }, [status, start, stop])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  return {
    status,
    isRecording: status === 'recording',
    isSupported,
    start,
    stop,
    toggle
  }
}
