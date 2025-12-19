import { useState, useRef, useEffect } from 'react'


interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    // Placeholder for assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3', // Default model, maybe make configurable later
          messages: [...messages, { role: 'user', content: userMessage }],
          stream: true
        }),
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // Parse JSON objects from the stream (each line is a JSON object)
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
                  content: assistantMessage 
                }
                return newMessages
              })
            }
            if (json.done) {
              setIsLoading(false)
            }
          } catch (e) {
            console.error('Error parsing JSON chunk', e)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch from Ollama', error)
      setMessages(prev => [
        ...prev.slice(0, -1), // Remove empty assistant message
        { role: 'assistant', content: 'Error: Could not connect to Ollama. Make sure it is running on port 11434.' }
      ])
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-neutral-200">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 opacity-50">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-lg">Start a conversation with Ollama</p>
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
              <div className="whitespace-pre-wrap">{msg.content}</div>
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
            placeholder="Type a message..."
            disabled={isLoading}
            className="w-full bg-neutral-800 text-white rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-neural-500 placeholder-neutral-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
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
