import { daysUntil } from './dateHelpers'
import { getCriticalRecommendations } from './maintenanceRecommendations'
import { getActiveTireSet, getSeasonChangeSuggestion } from './tireHelpers'

// Default ayarlar
export const DEFAULT_NOTIFICATION_SETTINGS = {
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
const TYPE_CONFIG = {
  inspection: { label: 'Muayene', icon: '📋', urgentColor: 'red' },
  mtv: { label: 'MTV', icon: '💳', urgentColor: 'red' },
  insurance: { label: 'Trafik Sigortası', icon: '🛡️', urgentColor: 'red' },
  kasko: { label: 'Kasko', icon: '🛡️', urgentColor: 'orange' },
  maintenance: { label: 'Bakım', icon: '🔧', urgentColor: 'blue' },
  'tire-season': { label: 'Lastik Mevsimi', icon: '🛞', urgentColor: 'cyan' },
}

// Önceliği belirle
const determinePriority = (days) => {
  if (days < 0) return 'critical' // Geçmiş
  if (days <= 1) return 'critical'
  if (days <= 7) return 'high'
  if (days <= 30) return 'medium'
  return 'low'
}

// Bildirim ID'si oluşturma — deduplication için stabil
const buildNotificationId = (type, vehicleId, targetDate) => {
  return `${type}-${vehicleId}-${targetDate}`
}

// Tarih bazlı bildirim oluştur (muayene, MTV, sigorta, kasko)
const generateDateNotifications = (vehicles, settings) => {
  const notifications = []

  const dateFields = [
    { type: 'inspection', field: 'inspectionDate', label: 'Muayene' },
    { type: 'mtv', field: 'mtvDate', label: 'MTV' },
    { type: 'insurance', field: 'insuranceDate', label: 'Trafik Sigortası' },
    { type: 'kasko', field: 'kaskoDate', label: 'Kasko' },
  ]

  vehicles.forEach(vehicle => {
    dateFields.forEach(({ type, field, label }) => {
      const setting = settings[type]
      if (!setting || !setting.enabled) return

      const targetDate = vehicle[field]
      if (!targetDate) return

      const days = daysUntil(targetDate)
      if (days === null) return

      // Eşiklere uyuyor mu?
      const thresholds = setting.daysBefore || [30, 7, 1]
      const isExpired = days < 0
      const isAtThreshold = thresholds.some(t => days <= t && days >= 0)

      if (!isExpired && !isAtThreshold) return

      const priority = determinePriority(days)
      const vehicleName = `${vehicle.brand} ${vehicle.model}`

      let title, message
      if (isExpired) {
        title = `${label} süresi geçti!`
        message = `${vehicleName} (${vehicle.plate}) — ${Math.abs(days)} gün önce`
      } else if (days === 0) {
        title = `${label} bugün!`
        message = `${vehicleName} (${vehicle.plate}) için bugün son gün`
      } else if (days === 1) {
        title = `${label} yarın!`
        message = `${vehicleName} (${vehicle.plate}) için yarın son gün`
      } else {
        title = `${label} yaklaşıyor`
        message = `${vehicleName} (${vehicle.plate}) — ${days} gün kaldı`
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
const generateMaintenanceNotifications = (vehicles, maintenanceRecords, customIntervals, settings) => {
  if (!settings.maintenance?.enabled) return []

  const recommendations = getCriticalRecommendations(vehicles, maintenanceRecords, customIntervals)
  const notifications = []

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
      title: isOverdue ? `${rec.type} bakım zamanı geçti!` : `${rec.type} bakım zamanı yaklaşıyor`,
      message: `${vehicleName} (${vehicle.plate}) — ${rec.message || 'Periyot dolmak üzere'}`,
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
const generateTireSeasonNotifications = (vehicles, tireSets, tireChanges, settings) => {
  if (!settings.tireSeason?.enabled) return []

  const notifications = []

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
        title: 'Lastik mevsim değişimi',
        message: `${vehicleName} — ${suggestion.message}`,
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
}) => {
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
export const mergeNotifications = (existing, fresh) => {
  const existingMap = new Map(existing.map(n => [n.id, n]))
  const merged = []
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

export const getTypeConfig = (type) => {
  return TYPE_CONFIG[type] || { label: type, icon: '🔔', urgentColor: 'slate' }
}

// Browser native notification gönder (eğer izin varsa)
export const sendBrowserNotification = (notification) => {
  if (!('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false

  try {
    const config = getTypeConfig(notification.type)
    new Notification(notification.title, {
      body: notification.message,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: notification.id, // Aynı tag → güncellenir, duplicate yapmaz
      data: { url: notification.actionUrl },
    })
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