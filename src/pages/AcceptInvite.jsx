import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Car, CheckCircle, XCircle, Loader2, Users, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function AcceptInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [status, setStatus] = useState('loading')  // loading | login_required | ready | accepting | success | error
  const [error, setError] = useState('')
  const [garageName, setGarageName] = useState('')
  const [accepting, setAccepting] = useState(false)

  // Sayfa açılınca: token var mı, login mı?
  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Geçersiz davet linki (token yok)')
      return
    }

    // Auth loading bitsin
    if (authLoading) return

    if (!user) {
      // Login değil → login'e yönlendir, dönüşte davet linkine geri gel
      setStatus('login_required')
      return
    }

    // Login var, davet'i kabul edebilir
    setStatus('ready')
  }, [token, user, authLoading])

  // "Garaja Katıl" butonuna tıklayınca
  const handleAccept = async () => {
    if (!token || !user) return

    setAccepting(true)
    setStatus('accepting')

    try {
      // Mevcut session token'ı al
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Oturum bulunamadı')
        setStatus('error')
        setError('Oturum bulunamadı, lütfen tekrar giriş yap')
        setAccepting(false)
        return
      }

      // Edge Function'ı çağır
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        setStatus('error')
        setError(result.error || 'Davet kabul edilemedi')
        toast.error(result.error || 'Davet kabul edilemedi')
        setAccepting(false)
        return
      }

      // Başarı
      setGarageName(result.garage_name || 'Garaj')
      setStatus('success')

      if (result.already_member) {
        toast.success('Zaten bu garajın üyesisin 👋')
      } else {
        toast.success(`"${result.garage_name}" garajına katıldın! 🎉`, { duration: 4000 })
      }

      // 2 saniye sonra dashboard'a yönlendir + sayfa yenile (yeni veriler yüklensin)
      setTimeout(() => {
        navigate('/', { replace: true })
        // Force reload (real-time + state reset için en güvenli)
        setTimeout(() => window.location.reload(), 100)
      }, 2000)
    } catch (err) {
      console.error('Accept invite error:', err)
      setStatus('error')
      setError('Beklenmedik bir hata oluştu')
      setAccepting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Garajım</h1>
          <p className="text-slate-400">Garaj Daveti</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-300">Yükleniyor...</p>
            </div>
          )}

          {status === 'login_required' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-600/20 rounded-full mb-4">
                <Users className="w-8 h-8 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Önce Giriş Yap
              </h2>
              <p className="text-slate-400 mb-6">
                Garaj davetini kabul etmek için Garajım hesabına giriş yapman gerekiyor.
                Hesabın yoksa hızlıca kayıt olabilirsin.
              </p>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-slate-300">
                  💡 <strong>İpucu:</strong> Davet email'i hangi adrese gönderildiyse, o email ile giriş yap.
                  Aksi halde davet kabul edilmez.
                </p>
              </div>

              <Link
                to="/login"
                state={{ from: { pathname: `/accept-invite/${token}` } }}
                className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-blue-600/30 mb-3"
              >
                Giriş Yap
              </Link>
              <Link
                to="/register"
                state={{ from: { pathname: `/accept-invite/${token}` } }}
                className="inline-block w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition"
              >
                Hesap Oluştur
              </Link>
            </div>
          )}

          {status === 'ready' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-4">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Garaja Davet Edildin!
              </h2>
              <p className="text-slate-400 mb-6">
                Bir garajın üyesi olarak araçları görüntüleyebilir,
                bakım/yakıt kayıtları ekleyebilirsin.
              </p>

              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-slate-300 mb-1">
                  <strong>Giriş yaptığın email:</strong>
                </p>
                <p className="text-blue-400 text-sm font-medium">{user?.email}</p>
              </div>

              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <CheckCircle className="w-5 h-5" />
                Daveti Kabul Et
              </button>

              <button
                onClick={() => navigate('/')}
                disabled={accepting}
                className="mt-3 text-sm text-slate-400 hover:text-white transition"
              >
                Şimdi değil
              </button>
            </div>
          )}

          {status === 'accepting' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-white font-medium mb-1">Davet kabul ediliyor...</p>
              <p className="text-sm text-slate-400">Bir saniye bekle</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Hoş Geldin! 🎉
              </h2>
              <p className="text-slate-400 mb-6">
                <span className="text-blue-400 font-medium">"{garageName}"</span> garajına başarıyla katıldın.
                Birazdan dashboard'a yönlendiriliyorsun...
              </p>

              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Yönlendiriliyor...
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/20 rounded-full mb-4">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Davet Kabul Edilemedi
              </h2>
              <p className="text-red-300 mb-6 break-words">
                {error}
              </p>

              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition"
              >
                Dashboard'a Dön
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Aracını takip etmeye bugün başla 🚗
        </p>
      </div>
    </div>
  )
}