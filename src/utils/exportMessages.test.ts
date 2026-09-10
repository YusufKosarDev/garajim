import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import i18n from '../i18n'
import type { Vehicle, MaintenanceRecord, FuelRecord } from '../types'

/**
 * EKRANDA GÖRÜNMEYEN kullanıcı metinleri.
 *
 * Cypress'teki Türkçe-kalıntı taraması yalnızca DOM'a bakıyor. Ama kullanıcının
 * gördüğü metinlerin bir kısmı DOM'da hiç geçmiyor:
 *   • CSV'nin başlık satırı — indirilen dosyada, Excel'de açılıyor
 *   • formatSupabaseError — her mutasyon toast'ının sonuna ekleniyor
 *   • dataMigration hataları — yalnızca yedek içe alınırken listeleniyor
 *   • backup/imageHelpers hataları — yalnızca bozuk dosya seçilince
 * Bu yüzeyler ancak burada sınanabilir. Dil AÇIKÇA 'en'e alınıyor: projedeki
 * diğer testler 'tr'de koşuyor ve eksik İngilizce çeviriyi göremiyorlar.
 */

const indirilenler: { icerik: string; dosyaAdi: string }[] = []
vi.mock('./downloadFile', () => ({
  downloadFile: (icerik: string, dosyaAdi: string) => { indirilenler.push({ icerik, dosyaAdi }) },
}))

const vehicle = {
  id: 'v1', plate: '34 ABC 123', brand: 'BMW', model: '320i', year: 2020,
  fuelType: 'Benzin', currentKm: 72500, notes: null,
  inspectionDate: '2027-06-15', mtvDate: '2026-07-15',
  insuranceDate: '2026-08-20', kaskoDate: '2026-08-20',
} as Vehicle

const maintenance = [
  { id: 'm1', vehicleId: 'v1', type: 'Yağ Değişimi', date: '2026-02-05', km: 60000, cost: 1500, notes: null },
] as MaintenanceRecord[]

const fuel = [
  { id: 'f1', vehicleId: 'v1', date: '2026-09-04', km: 72500, liters: 50, pricePerLiter: 48.5, totalCost: 2425, fullTank: true, station: 'Opet', notes: null },
] as FuelRecord[]

const basliklar = () => indirilenler.at(-1)!.icerik.split('\n')[0]

beforeEach(() => { indirilenler.length = 0 })
afterEach(async () => { await i18n.changeLanguage('tr') })
afterAll(async () => { await i18n.changeLanguage('tr') })

describe('csvExporter — kolon başlıkları aktif dilde', () => {
  it('Türkçede Türkçe başlıklar', async () => {
    const { exportVehiclesCSV } = await import('./csvExporter')
    await i18n.changeLanguage('tr')
    exportVehiclesCSV([vehicle])
    expect(basliklar()).toContain('Plaka')
    expect(basliklar()).toContain('Yakıt Tipi')
    expect(indirilenler.at(-1)!.dosyaAdi).toContain('garajim-araclar-')
  })

  it('İngilizcede İngilizce başlıklar ve dosya adı', async () => {
    const { exportVehiclesCSV } = await import('./csvExporter')
    await i18n.changeLanguage('en')
    exportVehiclesCSV([vehicle])
    const h = basliklar()
    expect(h).toContain('Plate')
    expect(h).toContain('Fuel Type')
    expect(h).toContain('Inspection Date')
    expect(h).not.toContain('Plaka')
    expect(h).not.toContain('Yakıt Tipi')
    expect(indirilenler.at(-1)!.dosyaAdi).toContain('garajim-vehicles-')
  })

  it('bakım CSV başlıkları İngilizce, tür DEĞERİ Türkçe kalır', async () => {
    const { exportMaintenanceCSV } = await import('./csvExporter')
    await i18n.changeLanguage('en')
    exportMaintenanceCSV(maintenance, [vehicle])
    const csv = indirilenler.at(-1)!.icerik
    expect(csv.split('\n')[0]).toContain('Service Type')
    // 'Yağ Değişimi' bir VERİDİR (maintenance_records.type) — çevrilmemeli
    expect(csv).toContain('Yağ Değişimi')
  })

  it('yakıt CSV: Dolu Depo hücresi de çevrilir', async () => {
    const { exportFuelCSV } = await import('./csvExporter')
    await i18n.changeLanguage('en')
    exportFuelCSV(fuel, [vehicle])
    const csv = indirilenler.at(-1)!.icerik
    expect(csv.split('\n')[0]).toContain('Full Tank')
    expect(csv).toContain('Yes')
    expect(csv).not.toContain('Evet')
  })

  it('bilinmeyen araç yedeği de çevrilir', async () => {
    const { exportMaintenanceCSV } = await import('./csvExporter')
    await i18n.changeLanguage('en')
    exportMaintenanceCSV(maintenance, []) // araç listesi boş -> eşleşme yok
    expect(indirilenler.at(-1)!.icerik).toContain('Unknown')
  })
})

describe('formatSupabaseError — toast eklentileri aktif dilde', () => {
  it('bilinen Postgres hataları çevrilir', async () => {
    const { formatSupabaseError } = await import('../lib/supabaseMappers')
    await i18n.changeLanguage('en')
    expect(formatSupabaseError({ message: 'duplicate key value violates...' })).toBe('This record already exists')
    expect(formatSupabaseError({ message: 'JWT expired' })).toBe('Your session expired, please sign in again')
    expect(formatSupabaseError(null)).toBe('Unknown error')
  })

  it('Türkçede Türkçe döner', async () => {
    const { formatSupabaseError } = await import('../lib/supabaseMappers')
    await i18n.changeLanguage('tr')
    expect(formatSupabaseError({ message: 'duplicate key' })).toBe('Bu kayıt zaten var')
  })

  it('tanınmayan hata ham metni korur — hata ayıklamada tek ipucu', async () => {
    const { formatSupabaseError } = await import('../lib/supabaseMappers')
    await i18n.changeLanguage('en')
    expect(formatSupabaseError({ message: 'some unmapped pg error 42P01' })).toBe('some unmapped pg error 42P01')
  })
})

describe('backup ve görsel hataları aktif dilde', () => {
  it('bozuk yedek dosyası hatası İngilizce', async () => {
    const { parseImportFile } = await import('./backup')
    await i18n.changeLanguage('en')
    const dosya = new File([JSON.stringify({ vehicles: [] })], 'yedek.json', { type: 'application/json' })
    await expect(parseImportFile(dosya)).rejects.toThrow(/no service records found/)
  })

  it('görsel olmayan dosya hatası İngilizce', async () => {
    const { compressImage } = await import('./imageHelpers') as unknown as
      { compressImage: (f: File) => Promise<unknown> }
    await i18n.changeLanguage('en')
    const dosya = new File(['abc'], 'not-an-image.txt', { type: 'text/plain' })
    await expect(compressImage(dosya)).rejects.toThrow(/Not a valid image file/)
  })
})
