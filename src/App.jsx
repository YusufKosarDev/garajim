import { useState, useEffect, useRef } from 'react'
import { useLocation, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import MobileTopBar from './components/MobileTopBar'
import BottomNav from './components/BottomNav'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import VehicleDetail from './pages/VehicleDetail'
import Statistics from './pages/Statistics'
import Settings from './pages/Settings'
import Calendar from './pages/Calendar'
import SharedReport from './pages/SharedReport'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'
import AcceptInvite from './pages/AcceptInvite'
import SearchNearby from './pages/SearchNearby'
import WelcomeTour from './components/WelcomeTour'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import CommandPalette from './components/CommandPalette'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import OfflineIndicator from './components/OfflineIndicator'
import PWAUpdateNotification from './components/PWAUpdateNotification'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function App() {
  const location = useLocation()
  const [showTour, setShowTour] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  const globalActionsRef = useRef({
    newVehicle: null,
    newMaintenance: null,
    newFuel: null,
  })

  // Paylaşım sayfasında navbar/bottomnav gizlensin
  const isSharedPage = location.pathname.startsWith('/share/')

  // Davet kabul sayfası — kendi başına yönetiyor (login değilken de açılır)
  const isAcceptInvitePage = location.pathname.startsWith('/accept-invite/')

  // Auth sayfaları (login, register, forgot-password) — minimal layout
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)

  // Layout gizlenmesi gereken sayfalar
  const isMinimalLayout = isSharedPage || isAuthPage || isAcceptInvitePage

  useEffect(() => {
    if (isMinimalLayout) return // Minimal layout sayfalarda tour gösterme
    const completed = localStorage.getItem('garajim_onboarding_completed')
    if (!completed) {
      setTimeout(() => setShowTour(true), 800)
    }
  }, [isMinimalLayout])

  const handleFocusSearch = () => {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="ara" i], input[placeholder*="search" i]')
    if (searchInput) {
      searchInput.focus()
      searchInput.select()
    }
  }

  useKeyboardShortcuts({
    onShowHelp: () => setShowShortcuts(true),
    onShowCommandPalette: () => setShowCommandPalette(true),
    onNewVehicle: () => globalActionsRef.current.newVehicle?.(),
    onNewMaintenance: () => globalActionsRef.current.newMaintenance?.(),
    onNewFuel: () => globalActionsRef.current.newFuel?.(),
    onFocusSearch: handleFocusSearch,
    enabled: !isMinimalLayout, // Minimal layout sayfalarda kısayollar pasif
  })

  // Paylaşım sayfası — minimal layout (Auth gerekmez, herkes görebilir)
  if (isSharedPage) {
    return (
      <>
        <ErrorBoundary>
          <Routes>
            <Route path="/share/:encodedData" element={<SharedReport />} />
          </Routes>
        </ErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '12px 16px',
            },
          }}
        />
      </>
    )
  }

  // Davet kabul sayfası — minimal layout, sayfa kendi auth'unu yönetir
  if (isAcceptInvitePage) {
    return (
      <>
        <ErrorBoundary>
          <Routes>
            <Route path="/accept-invite/:token" element={<AcceptInvite />} />
          </Routes>
        </ErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </>
    )
  }

  // Auth sayfaları — minimal layout (Sadece giriş yapmamış kullanıcılar)
  if (isAuthPage) {
    return (
      <>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            } />
            <Route path="/register" element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicOnlyRoute>
                <ForgotPassword />
              </PublicOnlyRoute>
            } />
            {/* ResetPassword PublicOnlyRoute DEĞİL — çünkü email linkinden gelinince session aktif olur */}
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </ErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </>
    )
  }

  // Normal layout (uygulama) — KORUMALI sayfalar
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-white">
        <OfflineIndicator />

        {/* Desktop navbar (md+) */}
        <Navbar onOpenCommandPalette={() => setShowCommandPalette(true)} />

        {/* Mobile top bar (sadece mobile) */}
        <MobileTopBar onOpenCommandPalette={() => setShowCommandPalette(true)} />

        <main className="max-w-6xl mx-auto pb-20 md:pb-0">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard globalActionsRef={globalActionsRef} />} />
              <Route path="/vehicles" element={<Vehicles globalActionsRef={globalActionsRef} />} />
              <Route path="/vehicles/:id" element={<VehicleDetail globalActionsRef={globalActionsRef} />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/nearby" element={<SearchNearby />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings onShowTour={() => setShowTour(true)} />} />
            </Routes>
          </ErrorBoundary>
        </main>

        {/* Mobile bottom navigation (sadece mobile) */}
        <BottomNav />

        <WelcomeTour isOpen={showTour} onClose={() => setShowTour(false)} />
        <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          onNewVehicle={() => globalActionsRef.current.newVehicle?.()}
          onNewMaintenance={() => globalActionsRef.current.newMaintenance?.()}
          onNewFuel={() => globalActionsRef.current.newFuel?.()}
        />
        <PWAInstallPrompt />
        <PWAUpdateNotification />

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </div>
    </ProtectedRoute>
  )
}

export default App