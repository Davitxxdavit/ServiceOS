import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuthBootstrap } from '@/features/auth/hooks/use-auth-bootstrap'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AuthBootstrap({ children }: { children: ReactNode }) {
  useAuthBootstrap()
  return children
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthBootstrap>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'text-sm',
                style: {
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                  border: '1px solid hsl(var(--border))',
                },
              }}
            />
          </AuthBootstrap>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
