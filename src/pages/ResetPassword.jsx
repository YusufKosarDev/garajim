import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Car, Lock, Eye, EyeOff, KeyRound, CheckCircle2, XCircle } from 'lucide-react'

function ResetPassword() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validSession, setValidSession] = useState(null) // null=loading, true=valid, false=invalid

  // Sayfa açıldığında, URL'deki session token'ını kontrol et
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Email'deki linke tıklanınca Supabase otomatik session oluşturur
      if (session) {
        setValidSession(true)
      } else {
        setValidSession(false)
      }
    }
    checkSession()
  }, [])

  // Şifre validasyonu
  const passwordChecks = {
    length: password.length >= 6,
    match: password.length > 0 && password === confirmPassword,
  }

  const isFormValid = passwordChecks.length && passwordChecks.match

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isFormValid) {
      toast.error('Şifre kurallarını kontrol et!')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Şifren başarıyla değişti! 🎉')
      // Login sayfasına yönlendir
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (err) {
      toast.error('Bir hata oluştu, tekrar deneyin')
      console.error('Reset password error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Loading state — session kontrol ediliyor
  if (validSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Doğrulanıyor...</p>
        </div>
      </div>
    )
  }

  // Geçersiz session — link süresi dolmuş veya yanlış
  if (validSession === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/20 rounded-2xl mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Link Geçersiz</h1>
            <p className="text-slate-400">
              Bu şifre sıfırlama linki geçersiz veya süresi dolmuş.
            </p>
          </div>
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-blue-600/30"
          >
            Yeni Link Talep Et
          </button>
        </div>
      </div>
    )
  }

  // Geçerli session — şifre belirleme formu
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo & Başlık */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Garajım</h1>
          <p className="text-slate-400">Yeni Şifreni Belirle</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Yeni Şifre 🔐
          </h2>
          <p className="text-sm text-slate-400 text-center mb-6">
            Güçlü bir şifre seç, kimsenin bilemeyeceği
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Yeni Şifre */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Yeni Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  autoComplete="new-password"
                  disabled={loading}
                  autoFocus
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-11 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Şifre Tekrar */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Şifre (Tekrar)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Şifreni tekrar gir"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* Şifre Kontrolleri */}
            {password.length > 0 && (
              <div className="space-y-2 px-1">
                <ValidationItem isValid={passwordChecks.length} text="En az 6 karakter" />
                {confirmPassword.length > 0 && (
                  <ValidationItem isValid={passwordChecks.match} text="Şifreler eşleşiyor" />
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  Şifreyi Güncelle
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// Validation feedback component
function ValidationItem({ isValid, text }) {
  return (
    <div className={`flex items-center gap-2 text-sm transition ${isValid ? 'text-green-400' : 'text-slate-500'}`}>
      {isValid ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{text}</span>
    </div>
  )
}

export default ResetPassword