import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Vehicles from './Vehicles'

/**
 * Araçlarım sayfasının arama ve sıralama mantığı.
 *
 * NEDEN BURADA, E2E'de DEĞİL: sekiz sıralama seçeneğinin her birini gerçek
 * tarayıcıda gezmek yavaş ve kırılgan olurdu; oysa mantığın tamamı saf ve
 * senkron. E2E kritik akışı (listeyi aç, araç ekle) zaten kapsıyor.
 *
 * ÖZELLİKLE 'acil' sıralaması: aracı en yakın tarihine göre sıralıyor ve hiç
 * tarihi olmayanı 9999 ile sona atıyor. Sabit zaman olmadan bu test takvim
 * ilerledikçe kendiliğinden bozulurdu.
 */

const deleteVehicle = vi.fn()
let mockCtx

vi.mock('../context/vehicle-context', () => ({ useVehicles: () => mockCtx }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))
// Animasyon katmanı testte gürültü: motion.* düz div'e, AnimatePresence de
// çocuklarını olduğu gibi basan bir sarmalayıcıya indiriliyor. Bileşen kimliği
// SABİT tutuluyor — her erişimde yeni bir fonksiyon dönseydi React ağacı her
// render'da baştan kurar ve testler gerçekte olmayan davranış ölçerdi.
vi.mock('framer-motion', () => {
  const Div = ({ children }) => <div>{children}</div>
  return {
    motion: new Proxy({}, { get: () => Div }),
    AnimatePresence: ({ children }) => <>{children}</>,
  }
})

const arac = (over = {}) => ({
  id: '1', plate: '34 ABC 123', brand: 'BMW', model: '320i', year: 2020,
  fuelType: 'Benzin', currentKm: 100000, photos: [],
  inspectionDate: null, mtvDate: null, insuranceDate: null, kaskoDate: null,
  ...over,
})

const BMW = arac({ id: '1', plate: '34 ABC 123', brand: 'BMW', model: '320i', year: 2020, currentKm: 100000, inspectionDate: '2026-12-01' })
const AUDI = arac({ id: '2', plate: '06 XYZ 987', brand: 'Audi', model: 'A4', year: 2022, currentKm: 40000, fuelType: 'Dizel', inspectionDate: '2026-09-20' })
const CITROEN = arac({ id: '3', plate: '35 KLM 456', brand: 'Citroen', model: 'C3', year: 2018, currentKm: 180000 })
const FILO = [BMW, AUDI, CITROEN]

const ciz = () => render(<MemoryRouter><Vehicles /></MemoryRouter>)

/** Kartların EKRANDAKİ SIRASI — kart linkinin hedefinden okunuyor */
const siradakiPlakalar = () =>
  [...document.querySelectorAll('a[href^="/vehicles/"]')]
    .map(el => FILO.find(v => el.getAttribute('href') === `/vehicles/${v.id}`))
    .filter(Boolean)
    .map(v => v.plate)

const ara = (metin) =>
  fireEvent.change(screen.getByPlaceholderText(/ara/i), { target: { value: metin } })

const sirala = (etiketDeseni) => {
  const secim = document.querySelector('select')
  const secenek = [...secim.options].find(o => etiketDeseni.test(o.textContent))
  expect(secenek, `sıralama seçeneği bulunamadı: ${etiketDeseni}`).toBeTruthy()
  fireEvent.change(secim, { target: { value: secenek.value } })
}

beforeEach(() => {
  vi.setSystemTime(new Date('2026-09-10T09:00:00'))
  deleteVehicle.mockClear()
  mockCtx = { vehicles: FILO, deleteVehicle, isLoaded: true }
})
afterAll(() => { vi.useRealTimers() })

describe('yükleme durumu', () => {
  it('veri gelmeden kart çizilmez (iskelet)', () => {
    mockCtx = { vehicles: [], deleteVehicle, isLoaded: false }
    ciz()
    expect(siradakiPlakalar()).toEqual([])
  })

  it('hiç araç yoksa boş durum çıkar', () => {
    mockCtx = { vehicles: [], deleteVehicle, isLoaded: true }
    ciz()
    expect(screen.getByText(/henüz araç eklenmedi/i)).toBeInTheDocument()
  })
})

describe('arama', () => {
  // Beş alanın hepsi aranıyor; her biri kendi render'ında sınanıyor ki bir
  // sorgunun kalıntısı diğerini etkilemesin.
  const durumlar = [
    ['plaka', 'xyz', ['06 XYZ 987']],
    ['marka', 'citroen', ['35 KLM 456']],
    ['model', '320i', ['34 ABC 123']],
    ['yıl', '2018', ['35 KLM 456']],
    ['yakıt tipi', 'dizel', ['06 XYZ 987']],
  ]

  for (const [alan, sorgu, beklenen] of durumlar) {
    it(`${alan} üzerinde eşleşir ("${sorgu}")`, () => {
      ciz()
      ara(sorgu)
      expect(siradakiPlakalar()).toEqual(beklenen)
    })
  }

  it('büyük/küçük harf ve baştaki boşluk fark etmez', () => {
    ciz()
    ara('  BmW  ')
    expect(siradakiPlakalar()).toEqual(['34 ABC 123'])
  })

  it('aynı ekranda ardışık sorgular birbirinin üstüne yazar', () => {
    ciz()
    ara('bmw')
    expect(siradakiPlakalar()).toEqual(['34 ABC 123'])
    ara('citroen')
    expect(siradakiPlakalar()).toEqual(['35 KLM 456'])
    ara('')
    expect(siradakiPlakalar()).toHaveLength(3)
  })

  it('eşleşme yoksa sayaç 0 / 3 der ve kart kalmaz', () => {
    ciz()
    ara('ferrari')
    expect(siradakiPlakalar()).toEqual([])
    expect(screen.getByText(/0 \/ 3/)).toBeInTheDocument()
  })
})

describe('sıralama', () => {
  it('markaya göre A-Z', () => {
    ciz()
    sirala(/markaya göre/i)
    expect(siradakiPlakalar()).toEqual(['06 XYZ 987', '34 ABC 123', '35 KLM 456'])
  })

  it('kilometreye göre çoktan aza, sonra azdan çoğa', () => {
    ciz()
    sirala(/çok → az/i)
    expect(siradakiPlakalar()).toEqual(['35 KLM 456', '34 ABC 123', '06 XYZ 987'])
    sirala(/az → çok/i)
    expect(siradakiPlakalar()).toEqual(['06 XYZ 987', '34 ABC 123', '35 KLM 456'])
  })

  it('yıla göre yeniden eskiye', () => {
    ciz()
    sirala(/yıla göre \(yeni\)/i)
    expect(siradakiPlakalar()).toEqual(['06 XYZ 987', '34 ABC 123', '35 KLM 456'])
  })

  it('acil: en yakın tarihli önce, hiç tarihi olmayan en sonda', () => {
    ciz()
    sirala(/acil/i)
    // Audi 2026-09-20 (10 gün) < BMW 2026-12-01; Citroen'in hiç tarihi yok -> 9999
    expect(siradakiPlakalar()).toEqual(['06 XYZ 987', '34 ABC 123', '35 KLM 456'])
  })

  it('sıralama ve arama birlikte uygulanır', () => {
    ciz()
    sirala(/çok → az/i)
    ara('e') // Citroen, Benzin ve Dizel üzerinden üçü de eşleşiyor
    expect(siradakiPlakalar()).toEqual(['35 KLM 456', '34 ABC 123', '06 XYZ 987'])
  })
})
