import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Car, Calendar, BarChart3, Settings as SettingsIcon, MapPin } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Anasayfa', exact: true },
  { path: '/vehicles', icon: Car, label: 'Araçlar' },
  { path: '/calendar', icon: Calendar, label: 'Takvim' },
  { path: '/nearby', icon: MapPin, label: 'Yakın' },
  { path: '/statistics', icon: BarChart3, label: 'İstatistik' },
  { path: '/settings', icon: SettingsIcon, label: 'Ayarlar' },
]

export default function BottomNav() {
  const location = useLocation()
  const { unreadCount } = useNotifications()

  // Bazı sayfalarda bottom nav'i gizle (örneğin araç detayında daha fazla alan istiyoruz)
  const hideOnPaths = []
  if (hideOnPaths.some(p => location.pathname.startsWith(p))) return null

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path)
          const isSettingsWithBadge = item.path === '/settings' && unreadCount > 0

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={`relative flex flex-col items-center justify-center flex-1 min-w-0 py-2 px-1 rounded-lg transition active:scale-95 ${
                isActive
                  ? 'text-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {/* Aktif göstergesi (üst çizgi) */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-400 rounded-full" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition ${isActive ? 'scale-110' : ''}`} />

                {/* Bildirim badge'i */}
                {isSettingsWithBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-0.5 font-medium truncate max-w-full ${
                isActive ? 'text-blue-400' : 'text-slate-500'
              }`}>
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}