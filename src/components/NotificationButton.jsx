import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { useNotifications } from '../context/notification-context'
import NotificationPanel from './NotificationPanel'

export default function NotificationButton() {
  const { t } = useTranslation()

  const { unreadCount } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef(null)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(prev => !prev)}
        className={`relative flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-lg transition-colors border ${
          isOpen
            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
        }`}
        title={t('notificationButton.bildirimler')}
        aria-label={t('notificationButton.bildirimler')}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={buttonRef}
      />
    </div>
  )
}