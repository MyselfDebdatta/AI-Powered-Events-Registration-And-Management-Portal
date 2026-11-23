import { Component } from 'react'
import ErrorState from './ui/ErrorState'

/**
 * ErrorBoundary — catches render errors so a broken component shows a
 * recoverable card instead of a white screen (§7.9).
 * Pass `resetKeys` (e.g. the route path) to auto-reset on navigation.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info)
    }
  }

  componentDidUpdate(previousProps) {
    const previousKey = previousProps.resetKeys?.join('|')
    const currentKey = this.props.resetKeys?.join('|')
    if (this.state.error && previousKey !== currentKey) {
      this.setState({ error: null })
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (error) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(error, this.reset)
          : this.props.fallback
      }
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-16">
          <ErrorState
            title="Something went wrong on this page."
            body="The rest of the app still works. Try again, or go back home and retry from there."
            retry={this.reset}
            retryLabel="Try again"
            requestId={error.message?.slice(0, 120)}
          />
        </div>
      )
    }
    return this.props.children
  }
}
