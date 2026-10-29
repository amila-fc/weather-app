import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { ErrorBoundary, ErrorFallback } from './components/ErrorBoundary'
import { ThemeProvider } from './theme/ThemeProvider'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ErrorBoundary
        fallback={(reset) => (
          <ErrorFallback
            title="The weather app crashed"
            message="Something went wrong. Try again, or reload the page."
            onRetry={reset}
            onReload={() => window.location.reload()}
          />
        )}
      >
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>,
)