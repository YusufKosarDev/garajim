import i18n from '../i18n'
import type { Vehicle, MaintenanceRecord, TireSet, TireChange, CustomIntervals } from '../types'

export type NotificationKind = 'inspection' | 'mtv' | 'insurance' | 'kasko' | 'maintenance' | 'tire-season'
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'

export interface AppNotification {
  id: string
  type: NotificationKind
  vehicleId: string
  maintenanceType?: string
  title: string
  message: string
  date: string
  targetDate?: string
  days?: number
  priority: NotificationPriority
  actionUrl: string
  read: boolean
  dismissed: boolean
  stale?: boolean
}

export interface KindSettings { enabled: boolean; daysBefore?: number[] }
export interface NotificationSettings {
  enabled: boolean
  inspection: KindSettings
  mtv: KindSettings
  insurance: KindSettings
  kasko: KindSettings
  maintenance: { enabled: boolean }
  tireSeason: { enabled: boolean }
  browserNotifications: boolean
  [key: string]: unknown
}

import { daysUntil } from './dateHelpers'
import { getCriticalRecommendations } from './maintenanceRecommendations'
import { getActiveTireSet, getSeasonChangeSuggestion } from './tireHelpers'

// Default ayarlar
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  inspection: { enabled: true, daysBefore: [30, 7, 1] },
  mtv: { enabled: true, daysBefore: [30, 7, 1] },
  insurance: { enabled: true, daysBefore: [30, 7, 1] },
  kasko: { enabled: true, daysBefore: [30, 7, 1] },
  maintenance: { enabled: true },
  tireSeason: { enabled: true },
  browserNotifications: false,
}

// Tür için config
const TYPE_CONFIG: Record<string, { label: string; icon: string; urgentColor: string }> = {
  inspection: { label: 'notification.type.muayene', icon: '📋', urgentColor: 'red' },
  mtv: { label: 'MTV', icon: '💳', urgentColor: 'red' },
  insurance: { label: 'notification.type.trafik_sigortasi', icon: '🛡️', urgentColor: 'red' },
  kasko: { label: 'notification.type.kasko', icon: '🛡️', urgentColor: 'orange' },
  maintenance: { label: 'notification.type.bakim', icon: '🔧', urgentColor: 'blue' },
  'tire-season': { label: 'notification.type.lastik_mevsimi', icon: '🛞', urgentColor: 'cyan' },
}

// Önceliği belirle
const determinePriority = (days: number): NotificationPriority => {
  if (days < 0) return 'critical' // Geçmiş
  if (days <= 1) return 'critical'
  if (days <= 7) return 'high'
  if (days <= 30) return 'medium'
  return 'low'
}

// Bildirim ID'si oluşturma — deduplication için stabil
const buildNotificationId = (type: string, vehicleId: string, targetDate: string): string => {
  return `${type}-${vehicleId}-${targetDate}`
}

// Tarih bazlı bildirim oluştur (muayene, MTV, sigorta, kasko)
const generateDateNotifications = (vehicles: Vehicle[], settings: NotificationSettings): AppNotification[] => {
  const notifications: AppNotification[] = []

  const dateFields: { type: NotificationKind; field: keyof Vehicle; label: string }[] = [
    { type: 'inspection', field: 'inspectionDate', label: 'notification.type.muayene' },
    { type: 'mtv', field: 'mtvDate', label: 'MTV' },
    { type: 'insurance', field: 'insuranceDate', label: 'notification.type.trafik_sigortasi' },
    { type: 'kasko', field: 'kaskoDate', label: 'notification.type.kasko' },
  ]

  vehicles.forEach((vehicle: Vehicle) => {
    dateFields.forEach(({ type, field, label }) => {
      const setting = settings[type] as KindSettings | undefined
      if (!setting || !setting.enabled) return

      const targetDate = vehicle[field] as string | null | undefined
      if (!targetDate) return

      const days = daysUntil(targetDate)
      if (days === null) return

      // Eşiklere uyuyor mu?
      const thresholds = setting.daysBefore || [30, 7, 1]
      const isExpired = days < 0
      const isAtThreshold = thresholds.some((t: number) => days <= t && days >= 0)

      if (!isExpired && !isAtThreshold) return

      const priority = determinePriority(days)
      const vehicleName = `${vehicle.brand} ${vehicle.model}`

      let title, message
      if (isExpired) {
        title = i18n.t('notification.date.expired_title', { label: i18n.t(label) })
        message = i18n.t('notification.date.expired_message', { vehicleName, plate: vehicle.plate, days: Math.abs(days) })
      } else if (days === 0) {
        title = i18n.t('notification.date.today_title', { label: i18n.t(label) })
        message = i18n.t('notification.date.today_message', { vehicleName, plate: vehicle.plate })
      } else if (days === 1) {
        title = i18n.t('notification.date.tomorrow_title', { label: i18n.t(label) })
        message = i18n.t('notification.date.tomorrow_message', { vehicleName, plate: vehicle.plate })
      } else {
        title = i18n.t('notification.date.upcoming_title', { label: i18n.t(label) })
        message = i18n.t('notification.date.upcoming_message', { vehicleName, plate: vehicle.plate, days })
      }

      notifications.push({
        id: buildNotificationId(type, vehicle.id, targetDate),
        type,
        vehicleId: vehicle.id,
        title,
        message,
        date: new Date().toISOString(),
        targetDate,
        days,
        priority,
        actionUrl: `/vehicles/${vehicle.id}`,
        read: false,
        dismissed: false,
      })
    })
  })

  return notifications
}

// Bakım önerileri için bildirim
const generateMaintenanceNotifications = (
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[],
  customIntervals: CustomIntervals,
  settings: NotificationSettings
): AppNotification[] => {
  if (!settings.maintenance?.enabled) return []

  const recommendations = getCriticalRecommendations(vehicles, maintenanceRecords, customIntervals)
  const notifications: AppNotification[] = []

  recommendations.forEach(rec => {
    if (rec.status !== 'overdue' && rec.status !== 'urgent') return

    const vehicle = vehicles.find(v => v.id === rec.vehicleId)
    if (!vehicle) return

    const vehicleName = `${vehicle.brand} ${vehicle.model}`
    const isOverdue = rec.status === 'overdue'

    notifications.push({
      id: `maintenance-${rec.vehicleId}-${rec.type}`,
      type: 'maintenance',
      vehicleId: rec.vehicleId,
      maintenanceType: rec.type,
      title: isOverdue ? i18n.t('notification.maintenance.overdue_title', { type: rec.type }) : i18n.t('notification.maintenance.upcoming_title', { type: rec.type }),
      message: i18n.t('notification.maintenance.message', { vehicleName, plate: vehicle.plate, detail: rec.message || i18n.t('notification.maintenance.interval_due') }),
      date: new Date().toISOString(),
      priority: isOverdue ? 'critical' : 'high',
      actionUrl: `/vehicles/${rec.vehicleId}`,
      read: false,
      dismissed: false,
    })
  })

  return notifications
}

// Lastik sezon değişimi
const generateTireSeasonNotifications = (
  vehicles: Vehicle[],
  tireSets: TireSet[],
  tireChanges: TireChange[],
  settings: NotificationSettings
): AppNotification[] => {
  if (!settings.tireSeason?.enabled) return []

  const notifications: AppNotification[] = []

  vehicles.forEach(vehicle => {
    const vehicleSets = tireSets.filter(t => t.vehicleId === vehicle.id)
    const vehicleChanges = tireChanges.filter(c => c.vehicleId === vehicle.id)

    // 2 set olmayan araçlar için sezon değişimi anlamsız
    const hasSummer = vehicleSets.some(t => t.season === 'summer')
    const hasWinter = vehicleSets.some(t => t.season === 'winter')
    if (!hasSummer || !hasWinter) return

    const activeSet = getActiveTireSet(vehicleSets, vehicleChanges)
    if (!activeSet) return

    const suggestion = getSeasonChangeSuggestion(activeSet.season)
    if (!suggestion) return

    // Sadece urgent öneriler için bildirim
    if (suggestion.urgent || suggestion.type === 'warning') {
      const vehicleName = `${vehicle.brand} ${vehicle.model}`

      notifications.push({
        id: `tire-season-${vehicle.id}-${suggestion.target}`,
        type: 'tire-season',
        vehicleId: vehicle.id,
        title: i18n.t('notification.tire.season_title'),
        message: i18n.t('notification.tire.season_message', { vehicleName, detail: suggestion.message }),
        date: new Date().toISOString(),
        priority: suggestion.urgent ? 'high' : 'medium',
        actionUrl: `/vehicles/${vehicle.id}`,
        read: false,
        dismissed: false,
      })
    }
  })

  return notifications
}

// Tüm bildirimleri oluştur (master function)
export const generateAllNotifications = ({
  vehicles,
  maintenanceRecords,
  customIntervals,
  tireSets,
  tireChanges,
  settings,
}: {
  vehicles: Vehicle[]
  maintenanceRecords: MaintenanceRecord[]
  customIntervals: CustomIntervals
  tireSets: TireSet[]
  tireChanges: TireChange[]
  settings: NotificationSettings | null | undefined
}): AppNotification[] => {
  if (!settings || !settings.enabled) return []

  const all = [
    ...generateDateNotifications(vehicles, settings),
    ...generateMaintenanceNotifications(vehicles, maintenanceRecords, customIntervals, settings),
    ...generateTireSeasonNotifications(vehicles, tireSets, tireChanges, settings),
  ]

  // Önceliğe göre sırala (critical → high → medium → low)
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  all.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return all
}

// Eski bildirimi yenisiyle merge et
// — read durumu korunsun, mesaj/öncelik güncellensin
export const mergeNotifications = (existing: AppNotification[], fresh: AppNotification[]): AppNotification[] => {
  const existingMap = new Map(existing.map(n => [n.id, n]))
  const merged: AppNotification[] = []
  const newIds = new Set()

  fresh.forEach(n => {
    newIds.add(n.id)
    const old = existingMap.get(n.id)
    if (old) {
      // Mevcut bildirim — read/dismissed bilgisini koru, kalan bilgileri güncelle
      merged.push({
        ...n,
        read: old.read,
        dismissed: old.dismissed,
        date: old.date, // İlk oluşturma tarihini koru
      })
    } else {
      // Yeni bildirim
      merged.push(n)
    }
  })

  // Artık geçerli olmayan eski bildirimleri ekle (eğer dismissed değilse, history için)
  // Sadece son 30 gün içinde olanları sakla
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  existing.forEach(n => {
    if (!newIds.has(n.id) && !n.dismissed) {
      const noteDate = new Date(n.date).getTime()
      if (noteDate > thirtyDaysAgo) {
        // Bu bildirim artık geçerli değil ama history için tut, "stale" işaretle
        merged.push({ ...n, stale: true })
      }
    }
  })

  return merged
}

export const getTypeConfig = (type: string) => {
  return TYPE_CONFIG[type] || { label: type, icon: '🔔', urgentColor: 'slate' }
}

/**
 * Bildirimi sistem üzerinden göster.
 *
 * Service worker üzerinden gösteriyoruz: `new Notification()` yalnızca sayfa
 * ÖN PLANDAYKEN çalışır, sekme arka plana alınınca sessizce kaybolur.
 * registration.showNotification() ise sekme arka plandayken de çalışır ve
 * bildirime tıklandığında SW uygulamayı açıp doğru sayfaya götürebilir.
 *
 * Not: uygulama tamamen kapalıyken bildirim göndermek için sunucudan gelen
 * gerçek web push gerekir (VAPID anahtarı + gönderen servis).
 */
export const sendBrowserNotification = async (notification: AppNotification): Promise<boolean> => {
  if (!('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false

  const options: NotificationOptions = {
    body: notification.message,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: notification.id, // Aynı tag → güncellenir, duplicate yapmaz
    data: { url: notification.actionUrl },
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(notification.title, options)
      return true
    }
    // SW yoksa (dev modda kapalı) eski yönteme düş
    new Notification(notification.title, options)
    return true
  } catch (err) {
    console.error('Browser notification error:', err)
    return false
  }
}

// Browser bildirim izni iste
export const requestBrowserPermission = async () => {
  if (!('Notification' in window)) {
    return { supported: false, granted: false }
  }

  if (Notification.permission === 'granted') {
    return { supported: true, granted: true }
  }

  if (Notification.permission === 'denied') {
    return { supported: true, granted: false, denied: true }
  }

  const permission = await Notification.requestPermission()
  return { supported: true, granted: permission === 'granted' }
}