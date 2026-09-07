import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, CheckCheck, Settings as SettingsIcon, Trash2, BellRing } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext'
import { requestBrowserPermission } from '../utils/notificationManager'
import toast from 'react-hot-toast'
import NotificationItem from './NotificationItem'

export default function NotificationPanel({ isOpen, onClose, anchorRef }) {
  const { t } = useTranslation()

  const {
    notifications,
    unreadCount,
    settings,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllDismissed,
    updateSettings,
  } = useNotifications()

  const panelRef = useRef(null)

  // Dış tıklama ile kapat
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose()
      }
    }

    // Escape ile kapat
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose, anchorRef])

  const handleEnableBrowser = async () => {
    const result = await requestBrowserPermission()
    if (result.granted) {
      updateSettings({ browserNotifications: true })
      toast.success(t('notificationPanel.tarayici_bildirimleri_aktif'))
    } else if (result.denied) {
      toast.error(t('notificationPanel.tarayici_izni_reddedildi_tarayici_ayarlarindan_a'))
    } else if (!result.supported) {
      toast.error(t('notificationPanel.tarayicin_bildirim_desteklemiyor'))
    }
  }

  const visibleNotifications = notifications.filter(n => !n.dismissed)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-1rem)] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold">{t('notificationPanel.bildirimler')}</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} yeni
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                  title={t('notificationPanel.hepsini_okundu_isaretle')}
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <Link
                to="/settings"
                onClick={onClose}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                title={t('notificationPanel.ayarlar')}
              >
                <SettingsIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Browser permission CTA */}
          {!settings.browserNotifications && visibleNotifications.length > 0 && (
            <div className="p-3 bg-blue-500/10 border-b border-blue-500/20">
              <div className="flex items-start gap-2">
                <BellRing className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-300 mb-1.5">
                    {t('notificationPanel.onemli_bildirimleri_sistem_uzerinden_almak_ister')}
                  </div>
                  <button
                    onClick={handleEnableBrowser}
                    className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded font-semibold transition"
                  >
                    Bildirimleri Aç
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Liste */}
          <div className="max-h-[60vh] overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <BellOff className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-semibold mb-1">
                  {t('notificationPanel.bildirim_yok')}
                </p>
                <p className="text-xs text-slate-500">
                  {t('notificationPanel.yaklasan_tarihler_ve_bakim_onerileri_burada')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {visibleNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onDismiss={dismissNotification}
                    onMarkRead={markAsRead}
                    onClose={onClose}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {visibleNotifications.length > 0 && (
            <div className="border-t border-slate-800 p-2 bg-slate-950/50">
              <button
                onClick={() => {
                  clearAllDismissed()
                  toast.success(t('notificationPanel.eski_bildirimler_temizlendi'))
                }}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-3 py-2 rounded transition"
              >
                <Trash2 className="w-3 h-3" />
                {t('notificationPanel.gecmis_bildirimleri_temizle')}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}