import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { VehicleProvider } from './context/VehicleContext'
import { NotificationProvider } from './context/NotificationContext'
import ErrorBoundary from './components/ErrorBoundary'
import ConfigMissing from './components/ConfigMissing'
import { isSupabaseConfigured } from './lib/supabase'
import { initErrorTracking, registerGlobalHandlers } from './lib/errorTracking'
import App from './App.jsx'
import './index.css'

// VITE_SENTRY_DSN yoksa ikisi de sessizce no-op
initErrorTracking()
registerGlobalHandlers()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Realtime abonelik zaten canlı değişiklikleri iteliyor; agresif refetch gereksiz.
      staleTime: 5 * 60 * 1000,
      // Geçici ağ hatalarında elle yazılmış katmanda hiç retry yoktu.
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
      // Sekmeye dönünce sessizce tazele — realtime kopmuşsa telafi eder.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

const root = createRoot(document.getElementById('root'))

// .env yoksa provider'ları hiç kurma — AuthProvider mount olur olmaz
// supabase.auth.getSession() çağırıyor ve anlamsız hatalar üretiyor.
if (!isSupabaseConfigured) {
  root.render(
    <StrictMode>
      <ConfigMissing />
    </StrictMode>
  )
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <VehicleProvider>
                <NotificationProvider>
                  <App />
                </NotificationProvider>
              </VehicleProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
