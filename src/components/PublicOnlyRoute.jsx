import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * PublicOnlyRoute - Sadece giriş yapmamış kullanıcıların erişebileceği sayfaları sarar.
 * (Login, Register, Forgot Password gibi)
 *
 * Davranış:
 * - Auth state yükleniyorsa: loading spinner göster
 * - Giriş yapmışsa: ana sayfaya yönlendir (zaten giriş yaptı, login görmesi anlamsız)
 * - Giriş yapmamışsa: children'ı render et
 *
 * Kullanım:
 *   <Route path="/login" element={
 *     <PublicOnlyRoute>
 *       <Login />
 *     </PublicOnlyRoute>
 *   } />
 */
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  // Auth kontrolü yapılıyor
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

  // Zaten giriş yapmış — ana sayfaya yönlendir
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // Giriş yapmamış — sayfayı göster
  return children
}

export default PublicOnlyRoute