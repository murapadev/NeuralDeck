import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { Component, ErrorInfo, ReactNode } from 'react'
import { APP_INFO } from '../../shared/types'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * ErrorBoundary - Catches React errors and displays recovery UI
 *
 * Features:
 * - Displays user-friendly error message
 * - Reload button to recover from errors
 * - Link to report issues on GitHub
 * - Shows error details for debugging (collapsible)
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)

    this.setState({ errorInfo })
  }

  /**
   * Generate GitHub issue URL with pre-filled error details
   */
  private getIssueUrl(): string {
    const { error, errorInfo } = this.state
    const params = new URLSearchParams({
      title: `[Bug] ${error?.name || 'Error'}: ${error?.message?.slice(0, 50) || 'Unknown error'}`,
      body: `## Description
Describe what you were doing when the error occurred.

## Error Details
\`\`\`
${error?.message || 'Unknown error'}
\`\`\`

## Stack Trace
\`\`\`
${error?.stack || 'No stack trace available'}
\`\`\`

## Component Stack
\`\`\`
${errorInfo?.componentStack || 'No component stack available'}
\`\`\`

## Environment
- OS: ${navigator.platform}
- App Version: 0.3.0
`,
      labels: 'bug',
    })
    return `${APP_INFO.GITHUB_ISSUES_URL}?${params.toString()}`
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReportIssue = () => {
    const url = this.getIssueUrl()
    if (window.neuralDeck?.openExternal) {
      window.neuralDeck.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-screen items-center justify-center bg-background p-8">
            <div className="max-w-md w-full space-y-4">
              <Alert variant="destructive" className="bg-red-950/50 border-red-900">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="text-lg">Something went wrong</AlertTitle>
                <AlertDescription className="text-red-200/80 mt-2">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </AlertDescription>
              </Alert>

              {/* Error details (for debugging) */}
              {this.state.error?.stack && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-muted-foreground transition-colors">
                    Technical details
                  </summary>
                  <pre className="mt-2 p-2 bg-card rounded overflow-auto max-h-32 text-muted-foreground">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={this.handleReload}
                  className="flex-1 bg-neural-600 hover:bg-neural-500"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload
                </Button>
                <Button
                  onClick={this.handleReportIssue}
                  variant="outline"
                  className="flex-1 border-border hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Press Ctrl+R to reload or Ctrl+Shift+Space to toggle window
              </p>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
