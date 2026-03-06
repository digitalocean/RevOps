import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('App error:', error, info) }
  render() {
    if (this.state.hasError)
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 560 }}>
          <h1 style={{ color: '#b91c1c', marginBottom: 8 }}>Something went wrong</h1>
          <pre style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>{this.state.error?.message}</pre>
          <button type="button" onClick={() => this.setState({ hasError: false, error: null })} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>Try again</button>
        </div>
      )
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
