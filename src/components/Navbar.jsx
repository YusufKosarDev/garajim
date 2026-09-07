import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Car, BarChart3, Settings, Calendar, Search, User, LogOut, ChevronDown, MapPin } from 'lucide-react'
import NotificationButton from './NotificationButton'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Navbar({ onOpenCommandPalette }) {
  const { t } = useTranslation()

  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  // Dışarı tıklayınca menü kapansın
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setShowUserMenu(false)
    const { error } = await signOut()
    if (error) {
      toast.error(t('navbar.cikis_yapilamadi') + error.message)
      return
    }
    toast.success(t('navbar.gorusuruz'))
    navigate('/login', { replace: true })
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  return (
    <nav className="hidden md:block bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 md:px-4 py-3 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <img
            src="/logo.svg"
            alt=""
            className="w-8 h-8 md:w-9 md:h-9 group-hover:scale-105 transition-transform"
          />
          <div className="hidden md:block">
            <div className="text-lg font-bold text-white leading-none">Garajım</div>
            <div className="text-[10px] text-slate-400 leading-none mt-0.5">{t('navbar.arac_takip_asistani')}</div>
          </div>
          <div className="md:hidden">
            <div className="text-base font-bold text-white leading-none">Garajım</div>
          </div>
        </Link>

        <div className="flex items-center gap-0.5 md:gap-1">
          <NavLink to="/" className={linkClass} end title={t('navbar.dashboard')}>
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden lg:inline">{t('navbar.dashboard')}</span>
          </NavLink>
          <NavLink to="/vehicles" className={linkClass} title={t('navbar.araclarim')}>
            <Car className="w-4 h-4" />
            <span className="hidden lg:inline">{t('navbar.araclarim')}</span>
          </NavLink>
          <NavLink to="/calendar" className={linkClass} title={t('navbar.takvim')}>
            <Calendar className="w-4 h-4" />
            <span className="hidden lg:inline">{t('navbar.takvim')}</span>
          </NavLink>
          <NavLink to="/nearby" className={linkClass} title={t('navbar.yakindaki_servisler')}>
            <MapPin className="w-4 h-4" />
            <span className="hidden lg:inline">{t('navbar.yakindaki')}</span>
          </NavLink>
          <NavLink to="/statistics" className={linkClass} title={t('navbar.istatistikler')}>
            <BarChart3 className="w-4 h-4" />
            <span className="hidden lg:inline">{t('navbar.istatistikler')}</span>
          </NavLink>
          <NavLink to="/settings" className={linkClass} title={t('navbar.ayarlar')}>
            <Settings className="w-4 h-4" />
            <span className="hidden lg:inline">{t('navbar.ayarlar')}</span>
          </NavLink>

          {/* Komut paleti butonu */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title={t('navbar.global_arama_ctrl_k')}
          >
            <Search className="w-4 h-4" />
            <span className="hidden xl:flex items-center gap-1.5 text-xs">
              <span>{t('navbar.ara')}</span>
              <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </kbd>
            </span>
          </button>

          <div className="ml-1 md:ml-2">
            <NotificationButton />
          </div>

          {/* Kullanıcı Menüsü */}
          <div className="relative ml-1 md:ml-2" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700"
              title={t('navbar.hesap')}
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <ChevronDown className={`w-3 h-3 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                {/* Email Header */}
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/50">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400 uppercase tracking-wider">{t('navbar.hesap')}</span>
                  </div>
                  <div className="text-sm text-white font-medium truncate">
                    {user?.email || 'Misafir'}
                  </div>
                </div>

                {/* Profile Link */}
                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors border-b border-slate-700"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('navbar.profilim')}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-400 hover:bg-red-600/10 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('navbar.cikis_yap')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}