import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  User, Mail, Lock, Shield, Calendar, ArrowLeft, 
  Eye, EyeOff, CheckCircle2, XCircle, Save 
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { usePageTitle } from '../hooks/usePageTitle'
import PageTransition from '../components/PageTransition'

export default function Profile() {
  usePageTitle('Profilim')

  const { user } = useAuth()
  const navigate = useNavigate()

  // Şifre Değiştir state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Email Değiştir state
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  // Provider tespiti (email vs google)
  const provider = user?.app_metadata?.provider || 'email'
  const isGoogleUser = provider === 'google'

  // Format tarih (TR locale)
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // Şifre validasyonu
  const passwordChecks = {
    length: newPassword.length >= 6,
    match: newPassword.length > 0 && newPassword === confirmNewPassword,
  }

  // Şifre Değiştirme
  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!currentPassword) {
      toast.error('Mevcut şifren gerekli!')
      return
    }
    if (!passwordChecks.length) {
      toast.error('Yeni şifre en az 6 karakter olmalı!')
      return
    }
    if (!passwordChecks.match) {
      toast.error('Yeni şifreler eşleşmiyor!')
      return
    }
    if (currentPassword === newPassword) {
      toast.error('Yeni şifre eskisiyle aynı olamaz!')
      return
    }

    setPasswordLoading(true)

    try {
      // Önce mevcut şifreyi doğrula (re-authentication)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        toast.error('Mevcut şifre yanlış!')
        setPasswordLoading(false)
        return
      }

      // Şifreyi güncelle
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        toast.error('Şifre güncellenemedi: ' + updateError.message)
        return
      }

      toast.success('Şifren başarıyla güncellendi! 🔐')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      console.error('Change password error:', err)
      toast.error('Bir hata oluştu, tekrar deneyin')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Email Değiştirme
  const handleChangeEmail = async (e) => {
    e.preventDefault()

    if (!newEmail.trim()) {
      toast.error('Yeni email gerekli!')
      return
    }
    if (newEmail.trim() === user.email) {
      toast.error('Yeni email mevcut emailinle aynı!')
      return
    }

    setEmailLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      })

      if (error) {
        toast.error('Email güncellenemedi: ' + error.message)
        return
      }

      toast.success(
        `Doğrulama linki ${newEmail} adresine gönderildi! Email değişikliği için linke tıkla.`,
        { duration: 6000 }
      )
      setNewEmail('')
    } catch (err) {
      console.error('Change email error:', err)
      toast.error('Bir hata oluştu, tekrar deneyin')
    } finally {
      setEmailLoading(false)
    }
  }

  // Avatar baş harfi
  const avatarLetter = user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <PageTransition>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-800 rounded-lg transition"
            aria-label="Geri"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Profilim</h1>
            <p className="text-slate-400 text-sm mt-1">Hesap bilgilerini yönet</p>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 shadow-lg">
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-bold text-white truncate">
                {user?.email}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {isGoogleUser ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-md text-xs font-medium text-slate-200">
                    <GoogleIconSmall />
                    Google ile bağlı
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-md text-xs font-medium text-slate-200">
                    <Mail className="w-3 h-3" />
                    Email + Şifre
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hesap Bilgileri */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Hesap Bilgileri
          </h2>

          <div className="space-y-3">
            <InfoRow
              icon={<Mail className="w-4 h-4 text-slate-400" />}
              label="Email"
              value={user?.email || '-'}
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4 text-slate-400" />}
              label="Kayıt Tarihi"
              value={formatDate(user?.created_at)}
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4 text-slate-400" />}
              label="Son Giriş"
              value={formatDate(user?.last_sign_in_at)}
            />
            <InfoRow
              icon={<Shield className="w-4 h-4 text-slate-400" />}
              label="Auth Provider"
              value={isGoogleUser ? 'Google OAuth' : 'Email + Şifre'}
            />
          </div>
        </div>

        {/* Şifre Değiştir - Sadece email kullanıcılar için */}
        {!isGoogleUser && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Lock className="w-5 h-5 text-orange-400" />
              Şifre Değiştir
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Hesabının güvenliği için güçlü bir şifre kullan.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Mevcut Şifre */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mevcut Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Mevcut şifren"
                    autoComplete="current-password"
                    disabled={passwordLoading}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-12 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    tabIndex={-1}
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Yeni Şifre */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    autoComplete="new-password"
                    disabled={passwordLoading}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Yeni Şifre Tekrar */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Yeni şifreni tekrar gir"
                    autoComplete="new-password"
                    disabled={passwordLoading}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Validation */}
              {newPassword.length > 0 && (
                <div className="space-y-1.5 px-1">
                  <ValidationItem
                    isValid={passwordChecks.length}
                    text="En az 6 karakter"
                  />
                  {confirmNewPassword.length > 0 && (
                    <ValidationItem
                      isValid={passwordChecks.match}
                      text="Şifreler eşleşiyor"
                    />
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={passwordLoading}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-semibold transition"
              >
                {passwordLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Güncelleniyor...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Şifreyi Değiştir
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Email Değiştir - Sadece email kullanıcılar için */}
        {!isGoogleUser && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Email Değiştir
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Yeni email adresine doğrulama linki gönderilir. Linke tıkladıktan sonra değişiklik aktif olur.
            </p>

            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Yeni Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="yeni@email.com"
                    autoComplete="email"
                    disabled={emailLoading}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={emailLoading || !newEmail.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-semibold transition"
              >
                {emailLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Email Değiştir
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Google User Info Box */}
        {isGoogleUser && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-300 mb-1">Google Hesabıyla Bağlısın</h3>
                <p className="text-sm text-slate-300">
                  Şifre ve email değişiklikleri Google hesabın üzerinden yapılır.
                  Bu işlemler için <strong>myaccount.google.com</strong> sayfasını ziyaret et.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}

// Helper Components
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <span className="text-sm text-white font-medium text-right truncate ml-2">
        {value}
      </span>
    </div>
  )
}

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

function GoogleIconSmall() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}