import { useState, useRef, useEffect, useCallback } from 'react'
import { ollamaService, OllamaModel } from '../services/ollamaService'
import { STORAGE_KEYS, TIMING } from '../../shared/types'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.OLLAMA_CHAT)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.OLLAMA_CHAT, JSON.stringify(messages))
  } catch {
    // Ignore storage errors
  }
}

function loadModel(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.OLLAMA_MODEL) || ''
  } catch {
    return ''
  }
}

function saveModel(model: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.OLLAMA_MODEL, model)
  } catch {
    // Ignore storage errors
  }
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [models, setModels] = useState<OllamaModel[]>([])
  const [selectedModel, setSelectedModel] = useState(loadModel)
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkConnection = useCallback(async () => {
    setIsLoadingModels(true)
    try {
      const connected = await ollamaService.healthCheck()
      setIsConnected(connected)

      if (!connected) {
        setModels([])
        setSelectedModel('')
        setIsLoadingModels(false)
        return
      }

      const availableModels = await ollamaService.getModels()
      setModels(availableModels)

      const savedModel = loadModel()
      const validSavedModel = availableModels.find((model) => model.name === savedModel)
      const nextModel = validSavedModel?.name ?? availableModels[0]?.name ?? ''

      setSelectedModel(nextModel)
      if (nextModel) saveModel(nextModel)
    } catch {
      setIsConnected(false)
      setModels([])
      setSelectedModel('')
    } finally {
      setIsLoadingModels(false)
    }
  }, [])

  useEffect(() => {
    checkConnection()
    const interval = setInterval(checkConnection, TIMING.OLLAMA_POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [checkConnection])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    saveModel(model)
  }

  const clearConversation = () => {
    setMessages([])
    try {
      localStorage.removeItem(STORAGE_KEYS.OLLAMA_CHAT)
    } catch {
      // Ignore storage errors
    }
  }

  const updateInput = (value: string) => {
    setInput(value)
  }

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isLoading || !isConnected || !selectedModel) return

    const userMessage = input.trim()
    setInput('')

    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    }

    let requestMessages: Message[] = []
    setMessages((prev) => {
      requestMessages = [...prev, newUserMessage]
      return [
        ...requestMessages,
        { role: 'assistant', content: '', timestamp: Date.now() },
      ]
    })

    setIsLoading(true)

    try {
      const response = await fetch(`${ollamaService.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: requestMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          stream: true,
        }),
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''
      let streamDone = false

      while (!streamDone) {
        const { done, value } = await reader.read()
        if (done) {
          streamDone = true
          continue
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((line) => line.trim() !== '')

        for (const line of lines) {
          try {
            const json = JSON.parse(line)
            if (json.message?.content) {
              assistantMessage += json.message.content
              setMessages((prev) => {
                const next = [...prev]
                if (next.length === 0) return next
                next[next.length - 1] = {
                  role: 'assistant',
                  content: assistantMessage,
                  timestamp: Date.now(),
                }
                return next
              })
            }
            if (json.done) setIsLoading(false)
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: '⚠️ **Error**: Could not connect to Ollama.',
          timestamp: Date.now(),
        },
      ])
      setIsLoading(false)
      setIsConnected(false)
    }
  }

  return {
    messages,
    input,
    isLoading,
    isConnected,
    models,
    selectedModel,
    isLoadingModels,
    bottomRef,
    checkConnection,
    handleModelChange,
    clearConversation,
    updateInput,
    sendMessage,
    // Helper to format model size
    formatModelSize: ollamaService.formatModelSize,
    getModelDisplayName: ollamaService.getModelDisplayName,
  }
}
