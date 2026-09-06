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

export type EtkinlikTipi = 'inspection' | 'mtv' | 'insurance' | 'kasko' | 'maintenance' | 'fuel'

export interface TakvimEtkinligi {
  /** Makine anahtarı — filtre, ikon ve renk eşlemesi bununla yapılır */
  type: EtkinlikTipi
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
const ARAC_TARIHLERI: Array<{ alan: keyof Vehicle; type: EtkinlikTipi; label: string }> = [
  { alan: 'inspectionDate', type: 'inspection', label: 'Muayene' },
  { alan: 'mtvDate', type: 'mtv', label: 'MTV' },
  { alan: 'insuranceDate', type: 'insurance', label: 'Sigorta' },
  { alan: 'kaskoDate', type: 'kasko', label: 'Kasko' },
]

export interface EtkinlikSecenekleri {
  /** Bakım kayıtlarını da etkinliğe çevir (Takvim sayfası için) */
  bakimlar?: MaintenanceRecord[]
  /** Yakıt kayıtlarını da etkinliğe çevir (Takvim sayfası için) */
  yakitlar?: FuelRecord[]
}

export const buildVehicleEvents = (
  vehicles: Vehicle[] = [],
  { bakimlar, yakitlar }: EtkinlikSecenekleri = {},
): TakvimEtkinligi[] => {
  const etkinlikler: TakvimEtkinligi[] = []

  for (const vehicle of vehicles) {
    for (const { alan, type, label } of ARAC_TARIHLERI) {
      const date = vehicle[alan]
      if (typeof date !== 'string' || !date) continue
      etkinlikler.push({
        type, label, date, vehicle,
        days: daysUntil(date),
        status: getDateStatus(date),
      })
    }
  }

  if (bakimlar?.length || yakitlar?.length) {
    // Her kayıt için vehicles.find() O(A×K) olurdu; Map ile O(1)
    const araclar = new Map(vehicles.map(v => [v.id, v]))

    for (const r of bakimlar ?? []) {
      const vehicle = araclar.get(r.vehicleId)
      if (!vehicle || !r.date) continue
      etkinlikler.push({
        type: 'maintenance', label: r.type, date: r.date, vehicle,
        days: daysUntil(r.date), status: getDateStatus(r.date), record: r,
      })
    }

    for (const r of yakitlar ?? []) {
      const vehicle = araclar.get(r.vehicleId)
      if (!vehicle || !r.date) continue
      const tutar = Number(r.totalCost) || 0
      etkinlikler.push({
        type: 'fuel',
        label: `${r.liters} L - ${tutar.toLocaleString('tr-TR')} ₺`,
        date: r.date, vehicle,
        days: daysUntil(r.date), status: getDateStatus(r.date), record: r,
      })
    }
  }

  return etkinlikler
}
