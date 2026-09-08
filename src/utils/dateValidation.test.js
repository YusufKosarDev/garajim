import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getTodayString,
  validatePastDate,
  validateExpiryDate,
  validateVehicleYear,
} from './dateValidation'

const NOW = new Date(2026, 5, 15, 12, 0, 0) // 15 Haziran 2026

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getTodayString', () => {
  it('bugünü yerel saate göre verir', () => {
    expect(getTodayString()).toBe('2026-06-15')
  })

  it('gün başında bile doğru günü verir (eski toISOString hatası)', () => {
    vi.setSystemTime(new Date(2026, 5, 15, 0, 30, 0)) // yerel 00:30
    expect(getTodayString()).toBe('2026-06-15')
  })
})

describe('validatePastDate', () => {
  it('geçmiş tarihi kabul eder', () => {
    expect(validatePastDate('2026-06-01').isValid).toBe(true)
  })

  it('bugünü kabul eder', () => {
    expect(validatePastDate('2026-06-15').isValid).toBe(true)
  })

  it('gelecek tarihi reddeder ve alan adını mesaja koyar', () => {
    const result = validatePastDate('2026-06-16', 'Bakım tarihi')
    expect(result.isValid).toBe(false)
    expect(result.message).toContain('Bakım tarihi')
    expect(result.message).toContain('gelecek')
  })

  it('50 yıldan eski tarihi reddeder', () => {
    expect(validatePastDate('1970-01-01').isValid).toBe(false)
  })

  it('boş tarihi geçerli sayar (alan zorunlu değil)', () => {
    expect(validatePastDate('').isValid).toBe(true)
    expect(validatePastDate(null).isValid).toBe(true)
  })
})

describe('validateExpiryDate', () => {
  it('yakın geleceği kabul eder', () => {
    expect(validateExpiryDate('2027-06-15').isValid).toBe(true)
  })

  it('süresi geçmiş tarihi kabul eder (kullanıcının gecikmiş muayenesi olabilir)', () => {
    expect(validateExpiryDate('2025-01-01').isValid).toBe(true)
  })

  it('varsayılan 5 yıldan uzak geleceği reddeder', () => {
    const result = validateExpiryDate('2035-01-01', 'Muayene')
    expect(result.isValid).toBe(false)
    expect(result.message).toContain('Muayene')
    expect(result.message).toContain('5 yıl')
  })

  it('maxYearsAhead parametresine uyar', () => {
    expect(validateExpiryDate('2028-01-01', 'Kasko', 1).isValid).toBe(false)
    expect(validateExpiryDate('2028-01-01', 'Kasko', 10).isValid).toBe(true)
  })

  it('10 yıldan eski tarihi reddeder', () => {
    expect(validateExpiryDate('2010-01-01').isValid).toBe(false)
  })

  it('boş tarihi geçerli sayar', () => {
    expect(validateExpiryDate(null).isValid).toBe(true)
  })
})

describe('validateVehicleYear', () => {
  it('makul yılları kabul eder', () => {
    expect(validateVehicleYear(2020).isValid).toBe(true)
    expect(validateVehicleYear('2020').isValid).toBe(true)
    expect(validateVehicleYear(1950).isValid).toBe(true)
  })

  it('gelecek model yılına (mevcut yıl + 1) izin verir', () => {
    expect(validateVehicleYear(2027).isValid).toBe(true)
    expect(validateVehicleYear(2028).isValid).toBe(false)
  })

  it('1950 öncesini reddeder', () => {
    expect(validateVehicleYear(1949).isValid).toBe(false)
  })

  it('boş yılı zorunlu sayar', () => {
    expect(validateVehicleYear('').isValid).toBe(false)
    expect(validateVehicleYear(null).isValid).toBe(false)
  })

  it('sayı olmayan girdiyi reddeder', () => {
    expect(validateVehicleYear('araba').isValid).toBe(false)
  })
})
