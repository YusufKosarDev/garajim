import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { VehicleProvider } from './context/VehicleContext'
import { NotificationProvider } from './context/NotificationContext'
import ErrorBoundary from './components/ErrorBoundary'
import ConfigMissing from './components/ConfigMissing'
import { isSupabaseConfigured } from './lib/supabase'
import App from './App.jsx'
import './index.css'

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
        <BrowserRouter>
          <AuthProvider>
            <VehicleProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </VehicleProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  )
}
