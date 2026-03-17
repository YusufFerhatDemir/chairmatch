'use client'

import React, { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Client-side React error boundary.
 * Catches rendering errors, shows a gold-themed fallback UI,
 * and reports the error to /api/errors.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report to our error tracking API
    this.reportError(error, errorInfo)
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          component: errorInfo.componentStack?.slice(0, 2000),
        }),
      })
    } catch {
      // Reporting failure must not break the fallback UI
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            padding: 'var(--pad, 20px)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(200,168,75,0.15), rgba(200,168,75,0.05))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              border: '1.5px solid rgba(200,168,75,0.3)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(200,168,75)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h2
            className="cinzel"
            style={{
              fontSize: 'var(--font-lg, 18px)',
              color: 'var(--gold2, #c8a84b)',
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            Etwas ist schiefgelaufen
          </h2>

          <p
            style={{
              color: 'var(--stone, #999)',
              fontSize: 'var(--font-sm, 14px)',
              marginBottom: 20,
              maxWidth: 320,
              lineHeight: 1.5,
            }}
          >
            Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
          </p>

          {this.state.error?.message && (
            <pre
              style={{
                fontSize: 11,
                color: 'var(--stone, #999)',
                background: 'rgba(200,168,75,0.06)',
                border: '1px solid rgba(200,168,75,0.15)',
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 20,
                maxWidth: 360,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.message}
            </pre>
          )}

          <button
            onClick={this.handleRetry}
            className="bgold"
            style={{
              padding: '10px 28px',
              cursor: 'pointer',
            }}
          >
            Erneut versuchen
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
