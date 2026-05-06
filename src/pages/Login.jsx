import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Car, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'

function Login() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Login sonrası gidilecek sayfa (önceki sayfa veya dashboard)
  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Basit validasyon
    if (!email.trim() || !password.trim()) {
      toast.error('Email ve şifre gerekli!')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await signIn(email.trim(), password)

      if (error) {
        // Yaygın hataları Türkçeleştir
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email veya şifre yanlış!')
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Email adresinizi doğrulayın!')
        } else {
          toast.error(error.message)
        }
        return
      }

      if (data?.user) {
        toast.success(`Hoş geldin! 🎉`)
        navigate(from, { replace: true })
      }
    } catch (err) {
      toast.error('Bir hata oluştu, tekrar deneyin')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth ile giriş
  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        toast.error('Google ile giriş başarısız: ' + error.message)
        setGoogleLoading(false)
      }
      // Başarılı olursa kullanıcı Google'a yönlendirilir, geri dönünce
      // AuthContext otomatik olarak session'ı yakalar.
    } catch (err) {
      toast.error('Bir hata oluştu, tekrar deneyin')
      console.error('Google login error:', err)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo & Başlık */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Garajım</h1>
          <p className="text-slate-400">Araç Takip Asistanı</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Tekrar Hoş Geldin 👋
          </h2>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full bg-white hover:bg-slate-100 disabled:bg-slate-300 disabled:cursor-not-allowed text-slate-900 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-3 shadow-lg mb-5"
          >
            {googleLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                Yönlendiriliyor...
              </>
            ) : (
              <>
                <GoogleIcon />
                Google ile Devam Et
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-800/50 px-3 text-slate-400 uppercase">veya</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  autoComplete="email"
                  disabled={loading || googleLoading}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading || googleLoading}
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

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300 transition"
              >
                Şifremi unuttum
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Giriş Yap
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Hesabın yok mu?{' '}
              <Link
                to="/register"
                className="text-blue-400 hover:text-blue-300 font-medium transition"
              >
                Kayıt Ol
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Aracını takip etmeye bugün başla 🚗
        </p>
      </div>
    </div>
  )
}

// Google Icon (renkli SVG)
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default Login