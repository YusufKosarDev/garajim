import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Bildirim, BildirimAyarlari, TurAyari } from '../utils/notificationManager'
import { NotificationContext } from './notification-context'
import { useVehicles } from './vehicle-context'
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  generateAllNotifications,
  mergeNotifications,
  sendBrowserNotification,
} from '../utils/notificationManager'

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

    // NOT: Bildirim gönderimi state updater'ının İÇİNDE yapılıyordu. Updater'lar
    // saf olmalı; StrictMode iki kez çalıştırdığı için aynı bildirim iki kez
    // gösterilebiliyordu. Yan etki artık dışarıda.
    const gosterilecekler: Bildirim[] = []

    setNotifications(prev => {
      const merged = mergeNotifications(prev, fresh)

      if (settings.browserNotifications) {
        for (const n of merged) {
          if (n.read || n.dismissed) continue
          if (n.priority !== 'critical' && n.priority !== 'high') continue
          // Önceki listede yoksa yeni demektir
          if (prev.some(p => p.id === n.id)) continue
          gosterilecekler.push(n)
        }
      }

      return merged
    })

    gosterilecekler.forEach(n => { void sendBrowserNotification(n) })
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