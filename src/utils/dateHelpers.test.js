import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  toDateKey,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatRelative,
  daysUntil,
  getDateStatus,
} from './dateHelpers'

// Bu modüldeki fonksiyonların çoğu içeride new Date() çağırıyor ve parametre
// almıyor. Saati sabitlemezsek testler takvime göre kırılır.
const NOW = new Date(2026, 5, 15, 12, 0, 0) // 15 Haziran 2026, öğlen

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toDateKey', () => {
  it('yerel tarihi YYYY-MM-DD olarak verir', () => {
    expect(toDateKey(new Date(2026, 0, 1))).toBe('2026-01-01')
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('ay ve günü sıfırla doldurur', () => {
    expect(toDateKey(new Date(2026, 2, 5))).toBe('2026-03-05')
  })

  it('UTC+ saat diliminde günü geriye KAYDIRMAZ (asıl bug buydu)', () => {
    // Yerel gece yarısı: toISOString() bunu UTC'ye çevirip bir önceki güne düşürürdü
    const yerelGeceYarisi = new Date(2026, 0, 1, 0, 0, 0)
    expect(toDateKey(yerelGeceYarisi)).toBe('2026-01-01')

    // Eski davranışın gerçekten farklı olduğunu, ancak UTC'nin doğusundaysak doğrula
    if (yerelGeceYarisi.getTimezoneOffset() < 0) {
      expect(yerelGeceYarisi.toISOString().split('T')[0]).not.toBe('2026-01-01')
    }
  })

  it('gün sonunu da doğru gün olarak verir', () => {
    expect(toDateKey(new Date(2026, 0, 1, 23, 59, 59))).toBe('2026-01-01')
  })

  it('string girdiyi de kabul eder', () => {
    expect(toDateKey('2026-04-22')).toBe('2026-04-22')
  })

  it('geçersiz girdide boş string döner', () => {
    expect(toDateKey('bu bir tarih değil')).toBe('')
    expect(toDateKey(null)).toBe('')
  })
})

describe('daysUntil', () => {
  it('gelecek tarih için pozitif döner', () => {
    expect(daysUntil('2026-06-25')).toBe(10)
  })

  it('geçmiş tarih için negatif döner', () => {
    expect(daysUntil('2026-06-05')).toBe(-10)
  })

  it('bugün için 0 döner (saat farkına bakmaz)', () => {
    expect(daysUntil('2026-06-15')).toBe(0)
  })

  it('boş/geçersiz girdide null döner', () => {
    expect(daysUntil(null)).toBeNull()
    expect(daysUntil('')).toBeNull()
    expect(daysUntil('geçersiz')).toBeNull()
  })

  it('yıl sınırını doğru geçer', () => {
    vi.setSystemTime(new Date(2026, 11, 30, 12, 0, 0))
    expect(daysUntil('2027-01-02')).toBe(3)
  })
})

describe('getDateStatus', () => {
  it('geçmiş tarih -> expired', () => {
    expect(getDateStatus('2026-06-14')).toBe('expired')
  })

  it('bugün -> warning (henüz geçmemiş)', () => {
    expect(getDateStatus('2026-06-15')).toBe('warning')
  })

  it('30 gün sınırı dahil -> warning', () => {
    expect(getDateStatus('2026-07-15')).toBe('warning')
  })

  it('31 gün -> safe', () => {
    expect(getDateStatus('2026-07-16')).toBe('safe')
  })

  it('tarih yoksa none', () => {
    expect(getDateStatus(null)).toBe('none')
    expect(getDateStatus('geçersiz')).toBe('none')
  })
})

describe('formatRelative', () => {
  it('bugün / yarın / dün', () => {
    expect(formatRelative('2026-06-15')).toBe('bugün')
    expect(formatRelative('2026-06-16')).toBe('yarın')
    expect(formatRelative('2026-06-14')).toBe('dün')
  })

  it('bir hafta içindeki günleri sayar', () => {
    expect(formatRelative('2026-06-18')).toBe('3 gün sonra')
    expect(formatRelative('2026-06-12')).toBe('3 gün önce')
  })

  it('30 günü aşınca kısa tarihe düşer', () => {
    const sonuc = formatRelative('2026-09-01')
    expect(sonuc).not.toMatch(/gün/)
    expect(sonuc).toContain('2026')
  })

  it('boş girdide tire döner', () => {
    expect(formatRelative(null)).toBe('-')
  })
})

describe('formatlayıcılar', () => {
  it('formatDate uzun Türkçe ay adı kullanır', () => {
    expect(formatDate('2026-04-22')).toContain('Nisan')
    expect(formatDate('2026-04-22')).toContain('2026')
  })

  it('formatDateShort kısa ay adı kullanır', () => {
    const kisa = formatDateShort('2026-04-22')
    expect(kisa).toContain('2026')
    expect(kisa).not.toContain('Nisan')
  })

  it('formatDateTime saat de içerir', () => {
    expect(formatDateTime('2026-04-22T14:30:00')).toMatch(/\d{2}:\d{2}/)
  })

  it('hepsi boş/geçersiz girdide tire döner', () => {
    for (const fn of [formatDate, formatDateShort, formatDateTime]) {
      expect(fn(null)).toBe('-')
      expect(fn('')).toBe('-')
      expect(fn('geçersiz tarih')).toBe('-')
    }
  })
})
