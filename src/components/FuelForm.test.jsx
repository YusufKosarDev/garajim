import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FuelForm from './FuelForm'

// VehicleContext taklit ediliyor — bu test formun kendi mantığını sınıyor,
// Supabase'e gitmesine gerek yok.
const addFuel = vi.fn()
const updateFuel = vi.fn()
const updateVehicle = vi.fn()

let mockCtx

vi.mock('../context/vehicle-context', () => ({
  useVehicles: () => mockCtx,
}))

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}))

const ARAC = { id: 'v1', brand: 'BMW', model: '320i', plate: '34 ABC 1234', currentKm: 100000 }

// Not: number input'larda userEvent.type/clear jsdom'da InvalidStateError atıyor
// (setSelectionRange desteklenmiyor), o yüzden doğrudan change event'i veriyoruz.
const doldur = (input, value) => fireEvent.change(input, { target: { value } })

const alan = {
  tarih: () => document.querySelector('input[type="date"]'),
  km: () => screen.getByPlaceholderText('125000'),
  litre: () => screen.getByPlaceholderText('45.50'),
  fiyat: () => screen.getByPlaceholderText('42.50'),
  tutar: () => screen.getByPlaceholderText('Otomatik hesaplanır'),
  kaydet: () => screen.getByRole('button', { name: /kaydet|güncelle/i }),
}

// react-hook-form'un handleSubmit'i asenkron: doğrulama ve gönderim bir
// mikrotask içinde tamamlanıyor. Bu yüzden submit sonrası iddialar beklenmeli.
const gonder = async () => {
  fireEvent.click(alan.kaydet())
  await waitFor(() => {})
}

beforeEach(() => {
  addFuel.mockClear()
  updateFuel.mockClear()
  updateVehicle.mockClear()
  mockCtx = { addFuel, updateFuel, updateVehicle, vehicles: [ARAC], fuelRecords: [] }
})

const ac = (props = {}) =>
  render(<FuelForm isOpen onClose={vi.fn()} vehicleId="v1" {...props} />)

describe('FuelForm', () => {
  it('açıldığında km alanını aracın güncel km si ile doldurur', () => {
    ac()
    expect(alan.km()).toHaveValue(100000)
  })

  it('zorunlu alanlar boşken kaydetmez ve hataları gösterir', async () => {
    ac()
    fireEvent.click(alan.kaydet())

    expect(await screen.findByText('Litre zorunlu')).toBeInTheDocument()
    expect(screen.getByText('Toplam tutar zorunlu')).toBeInTheDocument()
    expect(addFuel).not.toHaveBeenCalled()
  })

  it('litre x fiyat girilince toplam tutarı otomatik hesaplar', () => {
    ac()
    doldur(alan.litre(), '40')
    doldur(alan.fiyat(), '45')
    expect(alan.tutar()).toHaveValue(1800)
  })

  it('geçerli veriyle addFuel i doğru payload ile çağırır', async () => {
    ac()
    doldur(alan.litre(), '40')
    doldur(alan.fiyat(), '45')
    await gonder()

    await waitFor(() => expect(addFuel).toHaveBeenCalledTimes(1))
    expect(addFuel.mock.calls[0][0]).toMatchObject({
      vehicleId: 'v1',
      km: 100000,
      liters: 40,
      pricePerLiter: 45,
      totalCost: 1800,
    })
  })

  it('son yakıt kaydından düşük km girilirse hata verir (tüketim hesabını bozar)', async () => {
    mockCtx.fuelRecords = [{ id: 'f1', vehicleId: 'v1', km: 105000, liters: 40, totalCost: 1800 }]
    ac()

    doldur(alan.km(), '104000')
    doldur(alan.litre(), '40')
    doldur(alan.fiyat(), '45')
    fireEvent.click(alan.kaydet())

    expect(await screen.findByText(/105\.000/)).toBeInTheDocument()
    expect(addFuel).not.toHaveBeenCalled()
  })

  it('aynı km değerini de reddeder', async () => {
    mockCtx.fuelRecords = [{ id: 'f1', vehicleId: 'v1', km: 100000, liters: 40, totalCost: 1800 }]
    ac()

    doldur(alan.litre(), '40')
    doldur(alan.fiyat(), '45')
    await gonder()

    expect(addFuel).not.toHaveBeenCalled()
  })

  it('tarih alanı bugünden ileriye izin vermez (max attribute)', () => {
    ac()
    const bugun = new Date()
    const beklenen = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}-${String(bugun.getDate()).padStart(2, '0')}`
    expect(alan.tarih()).toHaveAttribute('max', beklenen)
  })

  it('gelecek tarihle submit hiç başlamaz — tarayıcı kısıtı devrede', async () => {
    // max attribute'u ihlal eden bir değerde HTML5 doğrulaması submit'i engelliyor.
    // validatePastDate'in kendi mantığı dateValidation testlerinde ayrıca sınanıyor.
    ac()
    doldur(alan.tarih(), '2099-12-31')
    doldur(alan.litre(), '40')
    doldur(alan.fiyat(), '45')
    await gonder()

    expect(addFuel).not.toHaveBeenCalled()
  })

  it('başka aracın yakıt kayıtları km kontrolünü etkilemez', async () => {
    mockCtx.fuelRecords = [{ id: 'f1', vehicleId: 'BASKA', km: 900000, liters: 40, totalCost: 1800 }]
    ac()

    doldur(alan.litre(), '40')
    doldur(alan.fiyat(), '45')
    await gonder()

    await waitFor(() => expect(addFuel).toHaveBeenCalledTimes(1))
  })

  it('düzenleme modunda mevcut kaydı forma doldurur ve updateFuel çağırır', async () => {
    const kayit = {
      id: 'f9', vehicleId: 'v1', date: '2026-06-01', km: 99000,
      liters: 35, pricePerLiter: 50, totalCost: 1750, fullTank: true, station: 'Shell', notes: '',
    }
    ac({ editRecord: kayit })

    expect(alan.km()).toHaveValue(99000)
    expect(alan.litre()).toHaveValue(35)

    await gonder()

    await waitFor(() => expect(updateFuel).toHaveBeenCalledTimes(1))
    expect(updateFuel.mock.calls[0][0]).toBe('f9')
    expect(addFuel).not.toHaveBeenCalled()
  })

  it('düzenlemede kaydın kendi km si çakışma sayılmaz', async () => {
    const kayit = {
      id: 'f9', vehicleId: 'v1', date: '2026-06-01', km: 105000,
      liters: 35, pricePerLiter: 50, totalCost: 1750, fullTank: true, station: '', notes: '',
    }
    mockCtx.fuelRecords = [{ ...kayit }]
    ac({ editRecord: kayit })

    await gonder()
    await waitFor(() => expect(updateFuel).toHaveBeenCalledTimes(1))
  })

  it('araç km si değişince açık formdaki girdiler KORUNUR', () => {
    const { rerender } = ac()

    doldur(alan.km(), '123456')
    doldur(alan.litre(), '42')

    // Realtime senkron veya başka bir kayıt aracın km'sini güncellerse
    mockCtx = { ...mockCtx, vehicles: [{ ...ARAC, currentKm: 111111 }] }
    rerender(<FuelForm isOpen onClose={vi.fn()} vehicleId="v1" />)

    expect(alan.km()).toHaveValue(123456)
    expect(alan.litre()).toHaveValue(42)
  })
})
