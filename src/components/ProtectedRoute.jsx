import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute - Sadece giriş yapmış kullanıcıların erişebileceği sayfaları sarar.
 *
 * Davranış:
 * - Auth state yükleniyorsa: loading spinner göster
 * - Giriş yapmamışsa: /login'e yönlendir (gitmek istediği sayfayı state'e kaydet)
 * - Giriş yapmışsa: children'ı render et
 *
 * Kullanım:
 *   <Route path="/" element={
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   } />
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // Auth kontrolü yapılıyor (ilk yükleme)
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Giriş yapmamış — login'e yönlendir
  if (!isAuthenticated) {
    // location.state.from ile gitmek istediği sayfayı kaydet
    // Login başarılı olunca o sayfaya geri dönsün
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Giriş yapmış — sayfayı göster
  return children
}

export default ProtectedRoute