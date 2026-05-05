import { daysUntil } from './dateHelpers'
import { getCriticalRecommendations } from './maintenanceRecommendations'

const NOTIFIED_KEY = 'garajim_notified'

export const requestPermission = async () => {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export const getPermissionStatus = () => {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

const getNotifiedList = () => {
  const data = localStorage.getItem(NOTIFIED_KEY)
  return data ? JSON.parse(data) : []
}

const addToNotified = (key) => {
  const list = getNotifiedList()
  if (!list.includes(key)) {
    list.push(key)
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(list))
  }
}

const sendNotification = (title, body, tag = null) => {
  if (Notification.permission !== 'granted') return
  new Notification(title, {
    body,
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: tag || undefined,
  })
}

const checkDateNotifications = (vehicles) => {
  const notified = getNotifiedList()
  const today = new Date().toISOString().split('T')[0]

  vehicles.forEach(v => {
    const items = [
      { type: 'Muayene', date: v.inspectionDate },
      { type: 'MTV', date: v.mtvDate },
      { type: 'Trafik Sigortası', date: v.insuranceDate },
      { type: 'Kasko', date: v.kaskoDate },
    ]

    items.forEach(item => {
      if (!item.date) return
      const days = daysUntil(item.date)
      const thresholds = [30, 15, 7, 1, 0]
      if (thresholds.includes(days)) {
        const key = `${v.id}-${item.type}-${days}-${today}`
        if (!notified.includes(key)) {
          const title = days === 0
            ? `⚠️ ${item.type} Bugün Sona Eriyor!`
            : `🔔 ${item.type} Yaklaşıyor`
          const body = `${v.brand} ${v.model} (${v.plate}) — ${days === 0 ? 'Bugün son gün!' : `${days} gün kaldı`}`
          sendNotification(title, body, `date-${v.id}-${item.type}`)
          addToNotified(key)
        }
      }
      if (days < 0) {
        const key = `${v.id}-${item.type}-expired-${today}`
        if (!notified.includes(key)) {
          sendNotification(
            `❌ ${item.type} Süresi Geçti`,
            `${v.brand} ${v.model} (${v.plate}) — ${Math.abs(days)} gün geçmiş`,
            `date-${v.id}-${item.type}`
          )
          addToNotified(key)
        }
      }
    })
  })
}

const checkMaintenanceRecommendations = (vehicles, maintenanceRecords, customIntervals = {}) => {
  const notified = getNotifiedList()
  const today = new Date().toISOString().split('T')[0]

  const recommendations = getCriticalRecommendations(vehicles, maintenanceRecords, customIntervals)
  const urgentRecs = recommendations.filter(r => r.status === 'overdue' || r.status === 'urgent')

  urgentRecs.forEach(rec => {
    const key = `maintenance-${rec.vehicleId}-${rec.type}-${rec.status}-${today}`
    if (notified.includes(key)) return

    let title, body

    if (rec.status === 'overdue') {
      title = `🔧 ${rec.type} Gecikti!`
      body = `${rec.vehicle.brand} ${rec.vehicle.model} (${rec.vehicle.plate}) — ${Math.abs(rec.kmRemaining).toLocaleString('tr-TR')} km geçti`
    } else {
      title = `⚠️ ${rec.type} Zamanı Yaklaşıyor`
      body = `${rec.vehicle.brand} ${rec.vehicle.model} (${rec.vehicle.plate}) — ${rec.kmRemaining.toLocaleString('tr-TR')} km kaldı`
    }

    sendNotification(title, body, `maintenance-${rec.vehicleId}-${rec.type}`)
    addToNotified(key)
  })
}

export const checkAndNotify = (vehicles, maintenanceRecords = [], customIntervals = {}) => {
  if (Notification.permission !== 'granted') return

  checkDateNotifications(vehicles)

  if (maintenanceRecords.length > 0) {
    checkMaintenanceRecommendations(vehicles, maintenanceRecords, customIntervals)
  }
}

export const clearNotificationHistory = () => {
  localStorage.removeItem(NOTIFIED_KEY)
}