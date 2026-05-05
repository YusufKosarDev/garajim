import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Car, Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react'

function ForgotPassword() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error('Email adresi gerekli!')
      return
    }

    setLoading(true)

    try {
      const { error } = await resetPassword(email.trim())

      if (error) {
        toast.error(error.message)
        return
      }

      // Başarılı — bilgi göster
      setEmailSent(true)
      toast.success('Sıfırlama linki gönderildi! 📧')
    } catch (err) {
      toast.error('Bir hata oluştu, tekrar deneyin')
      console.error('Reset password error:', err)
    } finally {
      setLoading(false)
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

        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
          {!emailSent ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                Şifreni mi Unuttun? 🔑
              </h2>
              <p className="text-sm text-slate-400 text-center mb-6">
                Email adresini gir, sıfırlama linki gönderelim
              </p>

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
                      disabled={loading}
                      autoFocus
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Sıfırlama Linki Gönder
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            // Email gönderildi — başarı ekranı
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Email Gönderildi! 📧
              </h2>
              <p className="text-slate-400 mb-6">
                <span className="text-blue-400 font-medium">{email}</span> adresine sıfırlama linki gönderdik.
                Email'i kontrol et ve linke tıkla.
              </p>
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-slate-300 mb-2">
                  💡 <strong>Email gelmediyse:</strong>
                </p>
                <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                  <li>Spam klasörünü kontrol et</li>
                  <li>Email adresini doğru yazdığından emin ol</li>
                  <li>Birkaç dakika bekle</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                }}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition"
              >
                Tekrar gönder
              </button>
            </div>
          )}

          {/* Login'e Dön */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Giriş sayfasına dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword