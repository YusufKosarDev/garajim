import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TireForm from './TireForm'

const addTireSet = vi.fn()
const updateTireSet = vi.fn()
let mockCtx

vi.mock('../context/vehicle-context', () => ({ useVehicles: () => mockCtx }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))

const doldur = (input, value) => fireEvent.change(input, { target: { value } })

const alan = {
  marka: () => screen.getByPlaceholderText('Michelin, Bridgestone...'),
  ebat: () => screen.getByPlaceholderText('205/55 R16'),
  dot: (etiket) => screen.getByLabelText(`${etiket} DOT kodu`),
  derinlik: (etiket) => screen.getByLabelText(`${etiket} diş derinliği (mm)`),
  stepneyToggle: () => screen.getByRole('checkbox'),
  kaydet: () => screen.getByRole('button', { name: /set ekle|güncelle/i }),
}

const gecerliDoldur = () => {
  doldur(alan.marka(), 'Michelin')
  doldur(alan.ebat(), '205/55 R16')
}

const gonder = async () => {
  fireEvent.click(alan.kaydet())
  await waitFor(() => {})
}

beforeEach(() => {
  addTireSet.mockClear()
  updateTireSet.mockClear()
  mockCtx = { addTireSet, updateTireSet, tireSets: [] }
})

const ac = (props = {}) =>
  render(<TireForm isOpen onClose={vi.fn()} vehicleId="v1" {...props} />)

describe('TireForm', () => {
  it('geçerli veriyle addTireSet i çağırır ve stepney i hariç tutar', async () => {
    ac()
    gecerliDoldur()
    await gonder()

    await waitFor(() => expect(addTireSet).toHaveBeenCalledTimes(1))
    const data = addTireSet.mock.calls[0][0]
    expect(data).toMatchObject({ vehicleId: 'v1', season: 'summer', brand: 'Michelin', size: '205/55 R16' })
    // Stepney kapalıyken kaydedilmemeli
    expect(data.tires.some(t => t.position === 'S')).toBe(false)
    expect(data.tires).toHaveLength(4)
  })

  it('stepney açıkken 5. lastiği de kaydeder', async () => {
    ac()
    gecerliDoldur()
    fireEvent.click(alan.stepneyToggle())
    await gonder()

    await waitFor(() => expect(addTireSet).toHaveBeenCalledTimes(1))
    expect(addTireSet.mock.calls[0][0].tires).toHaveLength(5)
  })

  it('zorunlu alanlar boşken kaydetmez', async () => {
    ac()
    fireEvent.click(alan.kaydet())

    expect(await screen.findByText('Marka zorunlu')).toBeInTheDocument()
    expect(screen.getByText('Ebat zorunlu')).toBeInTheDocument()
    expect(addTireSet).not.toHaveBeenCalled()
  })

  it('aynı sezondan ikinci set eklenmesini engeller', async () => {
    // Her iki sezon da doluysa form varsayılan olarak yazlığa düşer ve
    // çakışma kontrolü devreye girer.
    mockCtx.tireSets = [
      { id: 't1', vehicleId: 'v1', season: 'summer' },
      { id: 't2', vehicleId: 'v1', season: 'winter' },
    ]
    ac()
    gecerliDoldur()
    fireEvent.click(alan.kaydet())

    expect(await screen.findByText(/zaten Yazlık set tanımlı/i)).toBeInTheDocument()
    expect(addTireSet).not.toHaveBeenCalled()
  })

  it('araçta yazlık varsa yeni set için kışlığı önerir', () => {
    mockCtx.tireSets = [{ id: 't1', vehicleId: 'v1', season: 'summer' }]
    ac()
    // Not: /kışlık/i hem sezon butonuna hem 'Kışlık Set Ekle' butonuna uyuyor
    expect(screen.getByRole('button', { name: 'Kışlık' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('DOT alanı sadece rakam kabul eder ve 4 haneyle sınırlı', async () => {
    ac()
    doldur(alan.dot('Ön Sol'), 'ab35x23999')
    await waitFor(() => expect(alan.dot('Ön Sol')).toHaveValue('3523'))
  })

  it('eksik DOT kodunu reddeder', async () => {
    ac()
    gecerliDoldur()
    doldur(alan.dot('Ön Sol'), '35')
    fireEvent.click(alan.kaydet())

    expect(await screen.findByText('DOT 4 haneli olmalı')).toBeInTheDocument()
    expect(addTireSet).not.toHaveBeenCalled()
  })

  it('diş derinliği alanı 0-15 mm ile sınırlı (max attribute)', () => {
    ac()
    expect(alan.derinlik('Ön Sol')).toHaveAttribute('max', '15')
    expect(alan.derinlik('Ön Sol')).toHaveAttribute('min', '0')
  })

  it('15 mm üstü değerde submit hiç başlamaz — tarayıcı kısıtı devrede', async () => {
    // max attribute'unu ihlal eden değerde HTML5 doğrulaması submit'i engelliyor;
    // şemadaki 0-15 kuralı ikinci savunma katmanı olarak duruyor.
    ac()
    gecerliDoldur()
    doldur(alan.derinlik('Ön Sol'), '20')
    await gonder()

    expect(addTireSet).not.toHaveBeenCalled()
  })

  it('düzenleme modunda mevcut seti doldurur ve sezonu kilitler', () => {
    const set = {
      id: 't9', vehicleId: 'v1', season: 'winter', brand: 'Nokian', size: '225/45 R17',
      purchaseDate: '2025-10-01', purchasePrice: 12000, notes: '',
      tires: [{ position: 'FL', dot: '3523', treadDepth: 7 }],
    }
    ac({ editTireSet: set })

    expect(alan.marka()).toHaveValue('Nokian')
    expect(alan.dot('Ön Sol')).toHaveValue('3523')
    expect(screen.getByRole('button', { name: /yazlık/i })).toBeDisabled()
  })

  it('lastik setleri listesi değişince açık formdaki girdiler KORUNUR', () => {
    const { rerender } = ac()

    doldur(alan.marka(), 'Pirelli')
    doldur(alan.ebat(), '195/65 R15')

    // Realtime senkron başka bir set eklerse form sıfırlanmamalı
    mockCtx = { ...mockCtx, tireSets: [{ id: 'baska', vehicleId: 'v2', season: 'winter' }] }
    rerender(<TireForm isOpen onClose={vi.fn()} vehicleId="v1" />)

    expect(alan.marka()).toHaveValue('Pirelli')
    expect(alan.ebat()).toHaveValue('195/65 R15')
  })
})
