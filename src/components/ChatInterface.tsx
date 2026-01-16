import { AlertCircle, Send, Trash2, Wifi, WifiOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChat } from '../hooks/useChat'
import { useTranslation } from '../i18n'
import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export default function ChatInterface() {
  const { t } = useTranslation()
  const {
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
    formatModelSize,
    getModelDisplayName,
  } = useChat()

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          {isConnected === null || isLoadingModels ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              {t('chat.connecting')}
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="gap-1.5">
                <Wifi className="w-3 h-3" />
                {t('chat.connected')}
              </Badge>
              {models.length > 0 && (
                <Select value={selectedModel} onValueChange={handleModelChange}>
                  <SelectTrigger className="w-[180px] h-8 text-xs bg-muted border-border focus:ring-neural-500">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {models.map((model) => (
                      <SelectItem key={model.name} value={model.name} className="text-xs">
                        {getModelDisplayName(model.name)} ({formatModelSize(model.size)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="gap-1.5">
                <WifiOff className="w-3 h-3" />
                {t('chat.disconnected')}
              </Badge>
              <Button variant="ghost" size="sm" onClick={checkConnection} className="h-7 text-xs">
                {t('chat.retry')}
              </Button>
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearConversation}
            className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        {!isConnected && isConnected !== null && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-4 text-red-500/50" />
            <p className="text-lg mb-2 text-foreground">{t('chat.ollamaNotRunning')}</p>
            <p className="text-sm text-muted-foreground mb-6">{t('chat.startOllama')}</p>
            <Button
              onClick={checkConnection}
              variant="outline"
              className="border-border hover:bg-muted"
            >
              {t('chat.checkConnection')}
            </Button>
          </div>
        )}

        {isConnected && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground opacity-50">
            <div className="w-16 h-16 rounded-2xl bg-muted mb-4 animate-pulse-subtle" />
            <p className="text-lg font-medium">{t('chat.startConversation')}</p>
          </div>
        )}

        <div className="space-y-6 pb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn('flex w-full', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm',
                  msg.role === 'user'
                    ? 'bg-neural-600 text-foreground rounded-tr-sm'
                    : 'bg-card border border-border text-card-foreground rounded-tl-sm'
                )}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: ({ className, children, ...props }) => {
                          const isInline = !className
                          return isInline ? (
                            <code
                              className="bg-muted px-1.5 py-0.5 rounded text-neural-200 font-mono text-xs"
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <code className={cn(className, 'block bg-transparent p-0')} {...props}>
                              {children}
                            </code>
                          )
                        },
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
          <div ref={bottomRef} className="h-px" />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-card/50 border-t border-border backdrop-blur-sm">
        <form onSubmit={sendMessage} className="relative flex gap-2">
          <Input
            value={input}
            onChange={(e) => updateInput(e.target.value)}
            placeholder={isConnected ? t('chat.typeMessage') : t('chat.notConnected')}
            disabled={isLoading || !isConnected}
            className="flex-1 bg-background border-border focus-visible:ring-neural-500 h-11"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading || !isConnected}
            size="icon"
            className={cn(
              'h-11 w-11 shrink-0 transition-all',
              isLoading
                ? 'bg-muted text-muted-foreground'
                : 'bg-neural-600 hover:bg-neural-500 text-foreground'
            )}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
