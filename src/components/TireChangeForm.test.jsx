import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TireChangeForm from './TireChangeForm'

const addTireChange = vi.fn()
let mockCtx

vi.mock('../context/vehicle-context', () => ({ useVehicles: () => mockCtx }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))

const ARAC = { id: 'v1', brand: 'BMW', model: '320i', currentKm: 100000 }

const doldur = (input, value) => fireEvent.change(input, { target: { value } })

const field = {
  date: () => document.querySelector('input[type="date"]'),
  km: () => screen.getAllByPlaceholderText('0')[0],
  kaydet: () => screen.getByRole('button', { name: /değişimi kaydet/i }),
}

const gonder = async () => {
  fireEvent.click(field.kaydet())
  await waitFor(() => {})
}

beforeEach(() => {
  addTireChange.mockClear()
  mockCtx = { addTireChange, vehicles: [ARAC] }
})

const ac = (props = {}) =>
  render(
    <TireChangeForm
      isOpen
      onClose={vi.fn()}
      vehicleId="v1"
      currentSeason="summer"
      targetSeason="winter"
      {...props}
    />
  )

describe('TireChangeForm', () => {
  it('açılışta km yi aracın güncel km si ile doldurur', () => {
    ac()
    expect(field.km()).toHaveValue(100000)
  })

  it('sezon geçişini doğru kaydeder', async () => {
    ac()
    await gonder()

    await waitFor(() => expect(addTireChange).toHaveBeenCalledTimes(1))
    expect(addTireChange.mock.calls[0][0]).toMatchObject({
      vehicleId: 'v1',
      fromSeason: 'summer',
      toSeason: 'winter',
      km: 100000,
      cost: 0,
    })
  })

  it('km sıfır veya boşsa kaydetmez', async () => {
    ac()
    doldur(field.km(), '0')
    fireEvent.click(field.kaydet())

    expect(await screen.findByText('Geçerli KM gir')).toBeInTheDocument()
    expect(addTireChange).not.toHaveBeenCalled()
  })

  it('tarih alanı bugünle sınırlı (max attribute)', () => {
    ac()
    const today = new Date()
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(field.date()).toHaveAttribute('max', expected)
  })

  it('aracın km si değişince açık formdaki girdiler KORUNUR', () => {
    const { rerender } = ac()

    doldur(field.km(), '123456')

    // Realtime senkron aracın km'sini güncellerse form sıfırlanmamalı
    mockCtx = { ...mockCtx, vehicles: [{ ...ARAC, currentKm: 111111 }] }
    rerender(
      <TireChangeForm isOpen onClose={vi.fn()} vehicleId="v1" currentSeason="summer" targetSeason="winter" />
    )

    expect(field.km()).toHaveValue(123456)
  })
})
