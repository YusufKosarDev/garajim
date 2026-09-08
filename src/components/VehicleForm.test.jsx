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

const field = {
  plaka: () => screen.getByPlaceholderText('34 ABC 123'),
  marka: () => screen.getByPlaceholderText('BMW'),
  model: () => screen.getByPlaceholderText('320i'),
  year: () => screen.getByPlaceholderText('2020'),
  km: () => screen.getByPlaceholderText('0'),
  dates: () => document.querySelectorAll('input[type="date"]'),
  kaydet: () => screen.getByRole('button', { name: /araç ekle|güncelle/i }),
}

const fillValid = () => {
  doldur(field.plaka(), '34ABC1234')
  doldur(field.marka(), 'BMW')
  doldur(field.model(), '320i')
  doldur(field.year(), '2020')
}

const gonder = async () => {
  fireEvent.click(field.kaydet())
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
    fillValid()
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
    fireEvent.click(field.kaydet())

    expect(await screen.findByText('Plaka zorunlu')).toBeInTheDocument()
    expect(screen.getByText('Marka zorunlu')).toBeInTheDocument()
    expect(screen.getByText('Model zorunlu')).toBeInTheDocument()
    expect(addVehicle).not.toHaveBeenCalled()
  })

  it('geçersiz plaka formatını reddeder', async () => {
    ac()
    fillValid()
    doldur(field.plaka(), 'ABC')
    fireEvent.click(field.kaydet())

    expect(await screen.findByText(/geçerli bir plaka formatı/i)).toBeInTheDocument()
    expect(addVehicle).not.toHaveBeenCalled()
  })

  it('aynı plaka zaten kayıtlıysa reddeder', async () => {
    mockCtx.vehicles = [MEVCUT]
    ac()
    fillValid()
    fireEvent.click(field.kaydet())

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
    const thisYear = new Date().getFullYear()
    ac()
    expect(field.year()).toHaveAttribute('max', String(thisYear + 1))
    expect(field.year()).toHaveAttribute('min', '1950')
  })

  it('sınırın ötesindeki yılda submit hiç başlamaz — tarayıcı kısıtı devrede', async () => {
    // max attribute'unu ihlal eden değerde HTML5 doğrulaması submit'i engelliyor;
    // validateVehicleYear'ın kendi mantığı dateValidation testlerinde sınanıyor.
    const thisYear = new Date().getFullYear()
    ac()
    fillValid()
    doldur(field.year(), String(thisYear + 2))
    await gonder()

    expect(addVehicle).not.toHaveBeenCalled()
  })

  it('çok uzak gelecekteki muayene tarihini reddeder', async () => {
    ac()
    fillValid()
    doldur(field.dates()[0], '2099-01-01')
    fireEvent.click(field.kaydet())

    expect(await screen.findByText(/muayene tarihi/i)).toBeInTheDocument()
    expect(addVehicle).not.toHaveBeenCalled()
  })

  it('düzenleme modunda mevcut aracı forma doldurur', () => {
    ac({ editVehicle: MEVCUT })
    expect(field.plaka()).toHaveValue('34 ABC 1234')
    expect(field.marka()).toHaveValue('BMW')
    expect(field.year()).toHaveValue(2020)
    expect(field.km()).toHaveValue(100000)
  })

  it('araç listesi değişince açık formdaki girdiler KORUNUR', () => {
    const { rerender } = ac()

    doldur(field.marka(), 'Audi')
    doldur(field.model(), 'A4')

    // Realtime senkron başka bir araç eklerse form sıfırlanmamalı
    mockCtx = { ...mockCtx, vehicles: [MEVCUT] }
    rerender(<VehicleForm isOpen onClose={vi.fn()} />)

    expect(field.marka()).toHaveValue('Audi')
    expect(field.model()).toHaveValue('A4')
  })
})
