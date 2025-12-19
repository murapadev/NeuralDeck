import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ollamaService, OllamaModel } from '../services/ollamaService'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

const STORAGE_KEY = 'neuraldeck-ollama-chat'
const MODEL_KEY = 'neuraldeck-ollama-model'

// Load messages from localStorage
function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save messages to localStorage
function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {
    // Ignore storage errors
  }
}

// Load saved model preference
function loadModel(): string {
  try {
    return localStorage.getItem(MODEL_KEY) || ''
  } catch {
    return ''
  }
}

// Save model preference
function saveModel(model: string) {
  try {
    localStorage.setItem(MODEL_KEY, model)
  } catch {
    // Ignore storage errors
  }
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [models, setModels] = useState<OllamaModel[]>([])
  const [selectedModel, setSelectedModel] = useState(loadModel)
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Check connection and load models
  const checkConnection = useCallback(async () => {
    setIsLoadingModels(true)
    const connected = await ollamaService.healthCheck()
    setIsConnected(connected)
    
    if (connected) {
      const availableModels = await ollamaService.getModels()
      setModels(availableModels)
      
      // Auto-select first model if none selected
      if (!selectedModel && availableModels.length > 0) {
        setSelectedModel(availableModels[0].name)
        saveModel(availableModels[0].name)
      }
    }
    setIsLoadingModels(false)
  }, [selectedModel])

  useEffect(() => {
    checkConnection()
    // Re-check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [checkConnection])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Save messages when they change
  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    saveModel(model)
  }

  const clearConversation = () => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !isConnected || !selectedModel) return

    const userMessage = input.trim()
    setInput('')
    
    const newUserMessage: Message = { 
      role: 'user', 
      content: userMessage,
      timestamp: Date.now()
    }
    
    setMessages(prev => [...prev, newUserMessage])
    setIsLoading(true)

    // Placeholder for assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }])

    try {
      const response = await fetch(`${ollamaService.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, newUserMessage].map(m => ({ role: m.role, content: m.content })),
          stream: true
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
        const lines = chunk.split('\n').filter(line => line.trim() !== '')

        for (const line of lines) {
          try {
            const json = JSON.parse(line)
            if (json.message && json.message.content) {
              assistantMessage += json.message.content
              setMessages(prev => {
                const newMessages = [...prev]
                newMessages[newMessages.length - 1] = { 
                  role: 'assistant', 
                  content: assistantMessage,
                  timestamp: Date.now()
                }
                return newMessages
              })
            }
            if (json.done) {
              setIsLoading(false)
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { 
          role: 'assistant', 
          content: '⚠️ **Error**: Could not connect to Ollama. Make sure it is running on port 11434.',
          timestamp: Date.now()
        }
      ])
      setIsLoading(false)
      setIsConnected(false)
    }
  }

  // Connection status indicator
  const ConnectionStatus = () => {
    if (isConnected === null || isLoadingModels) {
      return (
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          Connecting...
        </div>
      )
    }
    
    if (!isConnected) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-400 text-sm">Disconnected</span>
          <button
            onClick={checkConnection}
            className="text-xs text-neural-400 hover:text-neural-300 underline"
          >
            Retry
          </button>
        </div>
      )
    }
    
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        Connected
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-neutral-200">
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <ConnectionStatus />
          
          {/* Model selector */}
          {isConnected && models.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-neutral-800 text-white text-sm rounded-lg px-2 py-1 border border-neutral-700 focus:border-neural-500 focus:outline-none"
            >
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {ollamaService.getModelDisplayName(model.name)} ({ollamaService.formatModelSize(model.size)})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Clear button */}
        {messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="text-xs text-neutral-500 hover:text-neutral-300 px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isConnected && isConnected !== null && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <svg className="w-16 h-16 mb-4 text-red-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-lg mb-2">Ollama is not running</p>
            <p className="text-sm text-neutral-600 mb-4">Start Ollama to begin chatting</p>
            <button
              onClick={checkConnection}
              className="px-4 py-2 bg-neural-600 hover:bg-neural-500 text-white rounded-lg text-sm transition-colors"
            >
              Check Connection
            </button>
          </div>
        )}

        {isConnected && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 opacity-50">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-lg">Start a conversation</p>
            {selectedModel && (
              <p className="text-sm text-neutral-600 mt-1">
                Using {ollamaService.getModelDisplayName(selectedModel)}
              </p>
            )}
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                msg.role === 'user' 
                  ? 'bg-neural-600 text-white' 
                  : 'bg-neutral-800 text-neutral-200'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: ({ className, children, ...props }) => {
                        const isInline = !className
                        return isInline ? (
                          <code className="bg-neutral-700 px-1 rounded text-neural-300" {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className={`${className} block bg-neutral-900 p-2 rounded-lg overflow-x-auto`} {...props}>
                            {children}
                          </code>
                        )
                      },
                      pre: ({ children }) => (
                        <pre className="bg-neutral-900 rounded-lg overflow-hidden my-2">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {msg.content || '...'}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-neutral-900 border-t border-neutral-800">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isConnected ? "Type a message..." : "Ollama not connected"}
            disabled={isLoading || !isConnected}
            className="w-full bg-neutral-800 text-white rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-neural-500 placeholder-neutral-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !isConnected}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-neural-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neural-600 transition-colors"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
