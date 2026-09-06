import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Bildirim, BildirimAyarlari, TurAyari } from '../utils/notificationManager'
import { useVehicles } from './VehicleContext'
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  generateAllNotifications,
  mergeNotifications,
  sendBrowserNotification,
} from '../utils/notificationManager'

const NotificationContext = createContext<Record<string, unknown> | null>(null)

export const useNotifications = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

const STORAGE_KEY = 'garajim_notifications'
const SETTINGS_KEY = 'garajim_notification_settings'

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const {
    vehicles,
    maintenanceRecords,
    customIntervals,
    tireSets,
    tireChanges,
    isLoaded,
  } = useVehicles()

  const [notifications, setNotifications] = useState<Bildirim[]>([])
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS)
  const [isInitialized, setIsInitialized] = useState(false)

  // İlk yükleme
  useEffect(() => {
    try {
      const storedNotifications = localStorage.getItem(STORAGE_KEY)
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications))
      }
      const storedSettings = localStorage.getItem(SETTINGS_KEY)
      if (storedSettings) {
        setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(storedSettings) })
      }
    } catch (err) {
      console.error('Notification load error:', err)
    }
    setIsInitialized(true)
  }, [])

  // Bildirimleri kaydet
  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
    } catch (err) {
      console.error('Notification save error:', err)
    }
  }, [notifications, isInitialized])

  // Ayarları kaydet
  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (err) {
      console.error('Settings save error:', err)
    }
  }, [settings, isInitialized])

  // Otomatik bildirim üretimi (veriler yüklendikten sonra)
  useEffect(() => {
    if (!isLoaded || !isInitialized) return

    const fresh = generateAllNotifications({
      vehicles,
      maintenanceRecords,
      customIntervals,
      tireSets,
      tireChanges,
      settings,
    })

    setNotifications(prev => {
      const merged = mergeNotifications(prev, fresh)

      // Yeni eklenen ve henüz okunmamış critical/high bildirimler için browser push
      if (settings.browserNotifications) {
        const newCritical = merged.filter(n => {
          if (n.read || n.dismissed) return false
          if (n.priority !== 'critical' && n.priority !== 'high') return false
          // Önceki listede yoksa yeni demektir
          return !prev.some(p => p.id === n.id)
        })

        newCritical.forEach(n => sendBrowserNotification(n))
      }

      return merged
    })
  }, [
    isLoaded,
    isInitialized,
    vehicles,
    maintenanceRecords,
    customIntervals,
    tireSets,
    tireChanges,
    settings,
  ])

  // Hesaplamalar
  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read && !n.dismissed).length,
    [notifications]
  )

  const activeNotifications = useMemo(
    () => notifications.filter(n => !n.dismissed),
    [notifications]
  )

  // Action'lar
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n =>
      n.dismissed ? n : { ...n, read: true }
    ))
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, dismissed: true, read: true } : n
    ))
  }, [])

  const clearAllDismissed = useCallback(() => {
    setNotifications(prev => prev.filter(n => !n.dismissed))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const updateSettings = useCallback((updates: Partial<BildirimAyarlari>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const updateTypeSettings = useCallback((type: string, typeUpdates: Partial<TurAyari>) => {
    setSettings(prev => ({
      ...prev,
      [type]: { ...(prev[type] as object), ...typeUpdates },
    }))
  }, [])

  const value = useMemo(() => ({
    notifications: activeNotifications,
    allNotifications: notifications,
    unreadCount,
    settings,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllDismissed,
    clearAll,
    updateSettings,
    updateTypeSettings,
  }), [
    activeNotifications, notifications, unreadCount, settings,
    markAsRead, markAllAsRead, dismissNotification,
    clearAllDismissed, clearAll, updateSettings, updateTypeSettings,
  ])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}