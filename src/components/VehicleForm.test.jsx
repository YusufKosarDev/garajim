import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VehicleForm from './VehicleForm'

const addVehicle = vi.fn()
const updateVehicle = vi.fn()
let mockCtx

vi.mock('../context/vehicle-context', () => ({ useVehicles: () => mockCtx }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))

const MEVCUT = {
  id: 'v1', plate: '34 ABC 1234', brand: 'BMW', model: '320i',
  year: 2020, fuelType: 'Benzin', currentKm: 100000,
  inspectionDate: '', mtvDate: '', insuranceDate: '', kaskoDate: '',
  notes: '', photos: [],
}

const doldur = (input, value) => fireEvent.change(input, { target: { value } })

const alan = {
  plaka: () => screen.getByPlaceholderText('34 ABC 123'),
  marka: () => screen.getByPlaceholderText('BMW'),
  model: () => screen.getByPlaceholderText('320i'),
  yil: () => screen.getByPlaceholderText('2020'),
  km: () => screen.getByPlaceholderText('0'),
  tarihler: () => document.querySelectorAll('input[type="date"]'),
  kaydet: () => screen.getByRole('button', { name: /araç ekle|güncelle/i }),
}

const gecerliDoldur = () => {
  doldur(alan.plaka(), '34ABC1234')
  doldur(alan.marka(), 'BMW')
  doldur(alan.model(), '320i')
  doldur(alan.yil(), '2020')
}

const gonder = async () => {
  fireEvent.click(alan.kaydet())
  await waitFor(() => {})
}

beforeEach(() => {
  addVehicle.mockClear()
  updateVehicle.mockClear()
  mockCtx = { addVehicle, updateVehicle, vehicles: [] }
})

const ac = (props = {}) => render(<VehicleForm isOpen onClose={vi.fn()} {...props} />)

describe('VehicleForm', () => {
  it('geçerli veriyle addVehicle i çağırır ve plakayı biçimlendirir', async () => {
    ac()
    gecerliDoldur()
    await gonder()

    await waitFor(() => expect(addVehicle).toHaveBeenCalledTimes(1))
    expect(addVehicle.mock.calls[0][0]).toMatchObject({
      plate: '34 ABC 1234', // boşluksuz girildi, biçimlendirildi
      brand: 'BMW',
      model: '320i',
      year: 2020,
      fuelType: 'Benzin',
    })
  })

  it('zorunlu alanlar boşken kaydetmez', async () => {
    ac()
    fireEvent.click(alan.kaydet())

    expect(await screen.findByText('Plaka zorunlu')).toBeInTheDocument()
    expect(screen.getByText('Marka zorunlu')).toBeInTheDocument()
    expect(screen.getByText('Model zorunlu')).toBeInTheDocument()
    expect(addVehicle).not.toHaveBeenCalled()
  })

  it('geçersiz plaka formatını reddeder', async () => {
    ac()
    gecerliDoldur()
    doldur(alan.plaka(), 'ABC')
    fireEvent.click(alan.kaydet())

    expect(await screen.findByText(/geçerli bir plaka formatı/i)).toBeInTheDocument()
    expect(addVehicle).not.toHaveBeenCalled()
  })

  it('aynı plaka zaten kayıtlıysa reddeder', async () => {
    mockCtx.vehicles = [MEVCUT]
    ac()
    gecerliDoldur()
    fireEvent.click(alan.kaydet())

    expect(await screen.findByText('Bu plaka zaten kayıtlı')).toBeInTheDocument()
    expect(addVehicle).not.toHaveBeenCalled()
  })

  it('düzenlemede aracın kendi plakası çakışma sayılmaz', async () => {
    mockCtx.vehicles = [MEVCUT]
    ac({ editVehicle: MEVCUT })
    await gonder()

    await waitFor(() => expect(updateVehicle).toHaveBeenCalledTimes(1))
    expect(updateVehicle.mock.calls[0][0]).toBe('v1')
    expect(addVehicle).not.toHaveBeenCalled()
  })

  it('yıl alanı gelecek model yılıyla sınırlı (max attribute)', () => {
    const buYil = new Date().getFullYear()
    ac()
    expect(alan.yil()).toHaveAttribute('max', String(buYil + 1))
    expect(alan.yil()).toHaveAttribute('min', '1950')
  })

  it('sınırın ötesindeki yılda submit hiç başlamaz — tarayıcı kısıtı devrede', async () => {
    // max attribute'unu ihlal eden değerde HTML5 doğrulaması submit'i engelliyor;
    // validateVehicleYear'ın kendi mantığı dateValidation testlerinde sınanıyor.
    const buYil = new Date().getFullYear()
    ac()
    gecerliDoldur()
    doldur(alan.yil(), String(buYil + 2))
    await gonder()

    expect(addVehicle).not.toHaveBeenCalled()
  })

  it('çok uzak gelecekteki muayene tarihini reddeder', async () => {
    ac()
    gecerliDoldur()
    doldur(alan.tarihler()[0], '2099-01-01')
    fireEvent.click(alan.kaydet())

    expect(await screen.findByText(/muayene tarihi/i)).toBeInTheDocument()
    expect(addVehicle).not.toHaveBeenCalled()
  })

  it('düzenleme modunda mevcut aracı forma doldurur', () => {
    ac({ editVehicle: MEVCUT })
    expect(alan.plaka()).toHaveValue('34 ABC 1234')
    expect(alan.marka()).toHaveValue('BMW')
    expect(alan.yil()).toHaveValue(2020)
    expect(alan.km()).toHaveValue(100000)
  })

  it('araç listesi değişince açık formdaki girdiler KORUNUR', () => {
    const { rerender } = ac()

    doldur(alan.marka(), 'Audi')
    doldur(alan.model(), 'A4')

    // Realtime senkron başka bir araç eklerse form sıfırlanmamalı
    mockCtx = { ...mockCtx, vehicles: [MEVCUT] }
    rerender(<VehicleForm isOpen onClose={vi.fn()} />)

    expect(alan.marka()).toHaveValue('Audi')
    expect(alan.model()).toHaveValue('A4')
  })
})
