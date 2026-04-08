import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center justify-center min-h-[50vh] p-12">
          <div className="max-w-lg text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0F172A] mb-2">Something went wrong</h2>
              <p className="text-[#64748B] text-[14px]">
                We encountered an error loading this page. This may be a temporary issue with your connection to our servers.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-8 py-3 rounded-xl font-bold text-[13px] transition-all"
              >
                Try Again
              </button>
              <p className="text-[12px] text-[#94A3B8]">
                If this persists, try refreshing the page or contact support.
              </p>
            </div>
            {this.state.error && (
              <details className="text-left bg-[#F8FAFC] rounded-xl p-4 border border-slate-100">
                <summary className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest cursor-pointer">
                  Technical Details
                </summary>
                <pre className="mt-3 text-[11px] text-red-600 whitespace-pre-wrap break-all font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
