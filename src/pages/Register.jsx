import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Car, Mail, Lock, Eye, EyeOff, UserPlus, CheckCircle2, XCircle, MailCheck } from 'lucide-react'

function Register() {
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  // Şifre validasyonu (gerçek zamanlı)
  const passwordChecks = {
    length: password.length >= 6,
    match: password.length > 0 && password === confirmPassword,
  }

  const isFormValid =
    email.trim() &&
    passwordChecks.length &&
    passwordChecks.match

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validasyon
    if (!email.trim()) {
      toast.error('Email gerekli!')
      return
    }
    if (!passwordChecks.length) {
      toast.error('Şifre en az 6 karakter olmalı!')
      return
    }
    if (!passwordChecks.match) {
      toast.error('Şifreler eşleşmiyor!')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await signUp(email.trim(), password)

      if (error) {
        // Yaygın hataları Türkçeleştir
        if (error.message.includes('already registered')) {
          toast.error('Bu email zaten kayıtlı! Giriş yapmayı dene.')
        } else if (error.message.includes('Password should be')) {
          toast.error('Şifre yeterince güçlü değil!')
        } else if (error.message.includes('Invalid email')) {
          toast.error('Geçersiz email adresi!')
        } else {
          toast.error(error.message)
        }
        return
      }

      if (data?.user) {
        // Confirm Email AÇIK ise: data.session NULL olur (henüz onaylanmadı)
        // Confirm Email KAPALI ise: data.session dolu olur (otomatik login)
        if (data.session) {
          // Otomatik login (Confirm Email kapalıysa)
          toast.success('Hesabın oluşturuldu! 🎉')
          navigate('/', { replace: true })
        } else {
          // Email doğrulama gerekiyor
          setRegisteredEmail(email.trim())
          setEmailSent(true)
          toast.success('Hesabın oluşturuldu! Email\'ini doğrula 📧')
        }
      }
    } catch (err) {
      toast.error('Bir hata oluştu, tekrar deneyin')
      console.error('Register error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth ile kayıt/giriş
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

  // Email gönderildikten sonra başarı ekranı
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
              <Car className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Garajım</h1>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-4">
                <MailCheck className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Email'ini Doğrula 📧
              </h2>
              <p className="text-slate-400 mb-6">
                <span className="text-blue-400 font-medium">{registeredEmail}</span> adresine bir doğrulama linki gönderdik.
                Email'i açıp linke tıklayarak hesabını aktifleştir.
              </p>

              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-slate-300 mb-2">
                  💡 <strong>Email gelmediyse:</strong>
                </p>
                <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                  <li>Spam/Junk klasörünü kontrol et</li>
                  <li>Email adresini doğru yazdığından emin ol</li>
                  <li>Birkaç dakika bekle (bazen gecikebilir)</li>
                </ul>
              </div>

              <Link
                to="/login"
                className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-blue-600/30"
              >
                Giriş Sayfasına Git
              </Link>

              <button
                onClick={() => {
                  setEmailSent(false)
                  setRegisteredEmail('')
                  setEmail('')
                  setPassword('')
                  setConfirmPassword('')
                }}
                className="mt-3 text-sm text-slate-400 hover:text-white transition"
              >
                Farklı bir email ile kayıt ol
              </button>
            </div>
          </div>
        </div>
      </div>
    )
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

        {/* Register Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Hesap Oluştur 🚀
          </h2>
          <p className="text-sm text-slate-400 text-center mb-6">
            Aracını takip etmeye bugün başla
          </p>

          {/* Google Sign Up Button */}
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
                  placeholder="En az 6 karakter"
                  autoComplete="new-password"
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

            {/* Confirm Password */}
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
                  disabled={loading || googleLoading}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* Şifre Kontrolleri (görsel feedback) */}
            {password.length > 0 && (
              <div className="space-y-2 px-1">
                <ValidationItem
                  isValid={passwordChecks.length}
                  text="En az 6 karakter"
                />
                {confirmPassword.length > 0 && (
                  <ValidationItem
                    isValid={passwordChecks.match}
                    text="Şifreler eşleşiyor"
                  />
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading || !isFormValid}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Hesap oluşturuluyor...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Hesap Oluştur
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Hesabın var mı?{' '}
              <Link
                to="/login"
                className="text-blue-400 hover:text-blue-300 font-medium transition"
              >
                Giriş Yap
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Hesap oluşturarak <span className="text-slate-400">Kullanım Şartları</span>'nı kabul etmiş olursun
        </p>
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

export default Register