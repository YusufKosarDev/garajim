import { Link } from 'react-router-dom'
import { X, Clock } from 'lucide-react'
import { getTypeConfig } from '../utils/notificationManager'
import { formatRelative } from '../utils/dateHelpers'

export default function NotificationItem({ notification, onDismiss, onMarkRead, onClose }) {
  const config = getTypeConfig(notification.type)
  const isUnread = !notification.read
  const isStale = notification.stale === true

  // Öncelik bazlı renkler
  const priorityColors = {
    critical: {
      bar: 'bg-red-500',
      bg: 'bg-red-500/5',
      text: 'text-red-400',
    },
    high: {
      bar: 'bg-orange-500',
      bg: 'bg-orange-500/5',
      text: 'text-orange-400',
    },
    medium: {
      bar: 'bg-yellow-500',
      bg: 'bg-yellow-500/5',
      text: 'text-yellow-400',
    },
    low: {
      bar: 'bg-blue-500',
      bg: 'bg-blue-500/5',
      text: 'text-blue-400',
    },
  }

  const colors = priorityColors[notification.priority] || priorityColors.low

  const handleDismissClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onDismiss(notification.id)
  }

  const handleClick = () => {
    if (isUnread) {
      onMarkRead(notification.id)
    }
    if (onClose) onClose()
  }

  const Wrapper = ({ children }) => {
    if (notification.actionUrl) {
      return (
        <Link
          to={notification.actionUrl}
          onClick={handleClick}
          className="block"
        >
          {children}
        </Link>
      )
    }
    return <div onClick={handleClick}>{children}</div>
  }

  return (
    <Wrapper>
      <div className={`relative group transition ${
        isUnread ? colors.bg : 'hover:bg-slate-800/50'
      } ${isStale ? 'opacity-60' : ''}`}>
        {/* Sol şerit (öncelik göstergesi) */}
        {isUnread && (
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.bar}`} />
        )}

        <div className="flex items-start gap-3 p-3 pl-4">
          {/* İkon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${
            isUnread ? 'bg-slate-800' : 'bg-slate-800/50'
          }`}>
            {config.icon}
          </div>

          {/* İçerik */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${
                  isUnread ? 'text-white' : 'text-slate-300'
                }`}>
                  {notification.title}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                  {notification.message}
                </div>
              </div>

              {/* Sil butonu */}
              <button
                onClick={handleDismissClick}
                className="p-1 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100 shrink-0"
                title="Kapat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alt çubuk: zaman + okunmamış noktası */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <Clock className="w-2.5 h-2.5" />
                {formatRelative(notification.date)}
              </span>
              {isUnread && (
                <span className={`w-1.5 h-1.5 rounded-full ${colors.bar}`} />
              )}
              {isStale && (
                <span className="text-[10px] text-slate-600 italic">Geçmiş</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  )
}