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

/** localStorage okuma — bozuk JSON ya da erişilemeyen depolama sessizce yedeğe düşer */
function depodanOku<T>(anahtar: string, yedek: T): T {
  try {
    const ham = localStorage.getItem(anahtar)
    return ham ? (JSON.parse(ham) as T) : yedek
  } catch (err) {
    console.error(`${anahtar} okunamadı:`, err)
    return yedek
  }
}

function depoyaYaz(anahtar: string, deger: unknown): void {
  try {
    localStorage.setItem(anahtar, JSON.stringify(deger))
  } catch (err) {
    console.error(`${anahtar} kaydedilemedi:`, err)
  }
}

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const {
    vehicles,
    maintenanceRecords,
    customIntervals,
    tireSets,
    tireChanges,
    isLoaded,
  } = useVehicles()

  // localStorage BİR KEZ, ilk render'da okunuyor. Eskiden bir efekt okuyup
  // setState yapıyordu; bu, uygulamanın ilk karede "hiç bildirim yok" diye
  // render olup hemen ardından tekrar render olması demekti ve `isInitialized`
  // adında, sadece bu yarışı yönetmek için var olan üçüncü bir state gerekiyordu.
  const kayitliBildirimler = useMemo(() => depodanOku<Bildirim[]>(STORAGE_KEY, []), [])
  const [notifications, setNotifications] = useState<Bildirim[]>(kayitliBildirimler)
  const [settings, setSettings] = useState<BildirimAyarlari>(() => ({
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...depodanOku<Partial<BildirimAyarlari>>(SETTINGS_KEY, {}),
  }))

  // Tarayıcı bildirimi GÖSTERİLMİŞ id'ler. Başlangıçta depodan gelenlerle
  // dolduruluyor: sayfa her açıldığında eski bildirimler yeniden "yeni" sayılıp
  // bildirim yağmuruna dönmesin. useState lazy initializer'ı sayesinde küme
  // bir kez kuruluyor ve referansı kararlı kalıyor.
  const [bildirilenIdler] = useState(() => new Set(kayitliBildirimler.map(n => n.id)))

  // Bildirimleri kaydet
  useEffect(() => {
    depoyaYaz(STORAGE_KEY, notifications)
  }, [notifications])

  // Ayarları kaydet
  useEffect(() => {
    depoyaYaz(SETTINGS_KEY, settings)
  }, [settings])

  // Üretilen bildirimler girdilerin saf bir fonksiyonu — state değil, türetilmiş değer
  const fresh = useMemo(
    () =>
      isLoaded
        ? generateAllNotifications({
            vehicles,
            maintenanceRecords,
            customIntervals,
            tireSets,
            tireChanges,
            settings,
          })
        : null,
    [isLoaded, vehicles, maintenanceRecords, customIntervals, tireSets, tireChanges, settings]
  )

  // Üretilenleri mevcut listeyle birleştir. Birleştirme okundu/kapatıldı
  // bayraklarını koruduğu için saf bir türetme değil, gerçek bir state
  // güncellemesi — ama efekt yerine render sırasında ayarlama deseniyle
  // yapılıyor (React'in belgelediği yöntem), böylece fazladan render turu yok.
  const [oncekiFresh, setOncekiFresh] = useState(fresh)
  if (fresh !== null && fresh !== oncekiFresh) {
    setOncekiFresh(fresh)
    setNotifications(prev => mergeNotifications(prev, fresh))
  }

  // Tarayıcı bildirimlerini gönder — GERÇEK bir yan etki, efektte olması doğru.
  // Daha önce bu, state updater'ının içinde bir dizi doldurularak yapılıyordu;
  // updater'lar saf olmalı ve StrictMode onları iki kez çalıştırıyor.
  useEffect(() => {
    if (!settings.browserNotifications) return
    for (const n of notifications) {
      if (n.read || n.dismissed) continue
      if (n.priority !== 'critical' && n.priority !== 'high') continue
      if (bildirilenIdler.has(n.id)) continue
      bildirilenIdler.add(n.id)
      void sendBrowserNotification(n)
    }
  }, [notifications, settings.browserNotifications, bildirilenIdler])

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