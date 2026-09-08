/**
 * Araç takvim etkinliklerinin TEK kaynağı.
 *
 * Önceden aynı iş iki yerde, iki farklı şekille yapılıyordu:
 *   Calendar.jsx     -> { type: 'inspection', label: 'Muayene', ... }
 *   Dashboard.jsx    -> { type: 'Muayene', ... }   // tip alanına etiket yazıyordu
 * Bu yüzden DashboardCalendar ile Calendar aynı veriyi farklı okuyordu ve ICS
 * dışa aktarımı üçüncü bir kopya olacaktı.
 *
 * Yeni şekilde `type` her zaman makine anahtarı, `label` her zaman insan metni.
 */

import { daysUntil, getDateStatus } from './dateHelpers'
import type { Vehicle, MaintenanceRecord, FuelRecord, DateStatus } from '../types'

export type CalendarEventType = 'inspection' | 'mtv' | 'insurance' | 'kasko' | 'maintenance' | 'fuel'

export interface TakvimEtkinligi {
  /** Makine anahtarı — filtre, ikon ve renk eşlemesi bununla yapılır */
  type: CalendarEventType
  /** Kullanıcıya gösterilen metin */
  label: string
  /** YYYY-MM-DD */
  date: string
  vehicle: Vehicle
  /** Gelecek tarihler için kalan gün; geçmiş kayıtlarda null */
  days: number | null
  status: DateStatus
  /** Bakım/yakıt etkinliklerinde kaynak kayıt */
  record?: MaintenanceRecord | FuelRecord
}

/**
 * Araca ait yasal tarihler. Sıra Dashboard'daki eski listeyle aynı tutuldu ki
 * kullanıcı alıştığı sıralamayı kaybetmesin.
 */
const ARAC_TARIHLERI: Array<{ field: keyof Vehicle; type: CalendarEventType; label: string }> = [
  { field: 'inspectionDate', type: 'inspection', label: 'Muayene' },
  { field: 'mtvDate', type: 'mtv', label: 'MTV' },
  { field: 'insuranceDate', type: 'insurance', label: 'Sigorta' },
  { field: 'kaskoDate', type: 'kasko', label: 'Kasko' },
]

export interface CalendarEventOptions {
  /** Bakım kayıtlarını da etkinliğe çevir (Takvim sayfası için) */
  bakimlar?: MaintenanceRecord[]
  /** Yakıt kayıtlarını da etkinliğe çevir (Takvim sayfası için) */
  fuels?: FuelRecord[]
}

export const buildVehicleEvents = (
  vehicles: Vehicle[] = [],
  { bakimlar, fuels }: CalendarEventOptions = {},
): TakvimEtkinligi[] => {
  const events: TakvimEtkinligi[] = []

  for (const vehicle of vehicles) {
    for (const { field, type, label } of ARAC_TARIHLERI) {
      const date = vehicle[field]
      if (typeof date !== 'string' || !date) continue
      events.push({
        type, label, date, vehicle,
        days: daysUntil(date),
        status: getDateStatus(date),
      })
    }
  }

  if (bakimlar?.length || fuels?.length) {
    // Her kayıt için vehicles.find() O(A×K) olurdu; Map ile O(1)
    const vehicleById = new Map(vehicles.map(v => [v.id, v]))

    for (const r of bakimlar ?? []) {
      const vehicle = vehicleById.get(r.vehicleId)
      if (!vehicle || !r.date) continue
      events.push({
        type: 'maintenance', label: r.type, date: r.date, vehicle,
        days: daysUntil(r.date), status: getDateStatus(r.date), record: r,
      })
    }

    for (const r of fuels ?? []) {
      const vehicle = vehicleById.get(r.vehicleId)
      if (!vehicle || !r.date) continue
      const tutar = Number(r.totalCost) || 0
      events.push({
        type: 'fuel',
        label: `${r.liters} L - ${tutar.toLocaleString('tr-TR')} ₺`,
        date: r.date, vehicle,
        days: daysUntil(r.date), status: getDateStatus(r.date), record: r,
      })
    }
  }

  return events
}
