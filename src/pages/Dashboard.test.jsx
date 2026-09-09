import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

/**
 * src/pages kapsamı %0'dı — 436 unit test vardı ama hiçbiri bir sayfayı render
 * etmiyordu. Dashboard uygulamanın açılış ekranı ve içindeki hesaplar (yaklaşan
 * tarih eşikleri, süresi geçmiş/uyarı sayıları, toplam harcama) yalnızca burada
 * yaşıyor; util testleri onları görmüyor.
 *
 * Context'ler taklit ediliyor, gerçek sağlayıcılar kurulmuyor: sınanan şey
 * Dashboard'ın KENDİ mantığı, Supabase katmanı değil (o VehicleContext.test'te).
 */

const veri = {
  vehicles: [],
  maintenanceRecords: [],
  fuelRecords: [],
  customIntervals: {},
  isLoaded: true,
}

vi.mock('../context/vehicle-context', () => ({
  useVehicles: () => veri,
}))

// Ağır alt bileşenler: kendi testleri var, burada render maliyeti taşımasın
vi.mock('../components/MaintenanceForm', () => ({ default: () => null }))
vi.mock('../components/FuelForm', () => ({ default: () => null }))
vi.mock('../components/DashboardCalendar', () => ({ default: () => <div>Takvim</div> }))

const NOW = new Date(2026, 5, 15, 12, 0, 0) // 15 Haziran 2026

const arac = (over = {}) => ({
  id: 'v1', plate: '34 ABC 123', brand: 'BMW', model: '320i',
  year: 2018, fuelType: 'Benzin', currentKm: 90000,
  inspectionDate: null, mtvDate: null, insuranceDate: null, kaskoDate: null,
  photos: [], ...over,
})

const ac = () => render(<MemoryRouter><Dashboard /></MemoryRouter>)

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(NOW)
  Object.assign(veri, {
    vehicles: [], maintenanceRecords: [], fuelRecords: [],
    customIntervals: {}, isLoaded: true,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Dashboard — yükleme ve boş durum', () => {
  it('veri yüklenmediyse iskelet gösterir, karşılama ekranı göstermez', () => {
    veri.isLoaded = false
    ac()
    expect(screen.queryByText(/Aracını Takip Etmeye Başla/)).not.toBeInTheDocument()
  })

  it('araç yoksa karşılama ekranı gösterir', () => {
    ac()
    expect(screen.getByText(/Aracını Takip Etmeye Başla/)).toBeInTheDocument()
    expect(screen.getByText(/İlk Aracını Ekle/)).toBeInTheDocument()
  })
})

describe('Dashboard — yaklaşan tarihler', () => {
  // Etiket araç adıyla AYNI metin düğümünde render ediliyor ("Muayene — BMW 320i"),
  // o yüzden tam eşleşme değil regex kullanılıyor.
  it('60 günden yakın tarihi listeler', () => {
    // 1 Temmuz 2026: bugünden 16 gün sonra -> eşiğin içinde
    veri.vehicles = [arac({ inspectionDate: '2026-07-01' })]
    ac()
    expect(screen.getByText(/Muayene/)).toBeInTheDocument()
  })

  it('60 günden UZAK tarihi listelemez — eşik gerçekten uygulanıyor', () => {
    // 1 Aralık 2026: ~169 gün sonra
    veri.vehicles = [arac({ inspectionDate: '2026-12-01' })]
    ac()
    expect(screen.queryByText(/Muayene —/)).not.toBeInTheDocument()
  })

  it('süresi geçmiş tarihi de gösterir', () => {
    veri.vehicles = [arac({ mtvDate: '2026-01-31' })]
    ac()
    expect(screen.getByText(/MTV —/)).toBeInTheDocument()
  })

  it('birden fazla tarih en yakın olandan başlar', () => {
    veri.vehicles = [arac({
      kaskoDate: '2026-08-01',   // ~47 gün
      insuranceDate: '2026-06-20', // 5 gün
    })]
    ac()
    const govde = document.body.textContent
    expect(govde.indexOf('Sigorta')).toBeLessThan(govde.indexOf('Kasko'))
  })

  it('İngilizce modda tarih etiketleri de çevrilir', async () => {
    const { dilDegistir } = await import('../i18n')
    await dilDegistir('en')
    try {
      veri.vehicles = [arac({ inspectionDate: '2026-07-01' })]
      ac()
      expect(screen.getByText(/Inspection —/)).toBeInTheDocument()
    } finally {
      // finally: assertion patlarsa bile dili geri al, sonraki testler etkilenmesin
      await dilDegistir('tr')
    }
  })
})

describe('Dashboard — toplam harcama', () => {
  it('bakım ve yakıt maliyetlerini toplar', () => {
    veri.vehicles = [arac()]
    veri.maintenanceRecords = [
      { id: 'm1', vehicleId: 'v1', type: 'Yağ Değişimi', date: '2026-05-01', km: 88000, cost: 3500 },
    ]
    veri.fuelRecords = [
      { id: 'f1', vehicleId: 'v1', date: '2026-06-01', km: 89000, liters: 45, pricePerLiter: 42.5, totalCost: 1500, fullTank: true },
    ]
    ac()
    // 3500 + 1500 = 5000 -> tr-TR gruplaması ile "5.000"
    expect(screen.getByText(/5\.000/)).toBeInTheDocument()
  })
})
