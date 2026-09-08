import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  calculateTireAge,
  evaluateTire,
  evaluateTireSet,
  getSeasonChangeSuggestion,
  getActiveTireSet,
  getAverageTreadDepth,
} from './tireHelpers'

// calculateTireAge ve getSeasonChangeSuggestion içeride new Date() çağırıyor
const NOW = new Date(2026, 5, 15, 12, 0, 0) // 15 Haziran 2026

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('calculateTireAge', () => {
  it('DOT kodundan hafta ve yılı çözer', () => {
    const yas = calculateTireAge('3523') // 35. hafta, 2023
    expect(yas.week).toBe(35)
    expect(yas.year).toBe(2023)
  })

  it('yaşı yıl cinsinden hesaplar', () => {
    // 2024 başı üretim, şimdi Haziran 2026 -> ~2.4 yıl
    const yas = calculateTireAge('0124')
    expect(yas.ageYears).toBeGreaterThan(2)
    expect(yas.ageYears).toBeLessThan(3)
  })

  it('2 haneli yılı doğru yüzyıla açar', () => {
    expect(calculateTireAge('0130').year).toBe(2030) // <= 30 -> 2000'ler
    expect(calculateTireAge('0199').year).toBe(1999) // > 30 -> 1900'ler
  })

  it('geçersiz DOT kodlarını reddeder', () => {
    expect(calculateTireAge('123')).toBeNull()     // 4 haneli değil
    expect(calculateTireAge('5423')).toBeNull()    // 54. hafta yok
    expect(calculateTireAge('0023')).toBeNull()    // 0. hafta yok
    expect(calculateTireAge('abcd')).toBeNull()
    expect(calculateTireAge('')).toBeNull()
    expect(calculateTireAge(null)).toBeNull()
  })
})

describe('evaluateTire', () => {
  it('yasal sınır altındaki diş derinliğini kritik sayar', () => {
    const result = evaluateTire({ treadDepth: 1.5 })
    expect(result.status).toBe('critical')
    expect(result.warnings[0].message).toContain('1.5')
  })

  it('kış için yetersiz derinliği danger sayar', () => {
    expect(evaluateTire({ treadDepth: 2.5 }).status).toBe('danger')
  })

  it('4mm altını uyarı sayar', () => {
    expect(evaluateTire({ treadDepth: 3.5 }).status).toBe('warning')
  })

  it('sağlıklı lastikte uyarı üretmez', () => {
    const result = evaluateTire({ treadDepth: 7 })
    expect(result.status).toBe('ok')
    expect(result.warnings).toHaveLength(0)
  })

  it('10 yaş ve üstünü kritik sayar (diş derinliği iyi olsa bile)', () => {
    const result = evaluateTire({ treadDepth: 8, dot: '0115' }) // 2015 -> ~11 yaş
    expect(result.status).toBe('critical')
  })

  it('6-10 yaş arasını uyarı sayar', () => {
    expect(evaluateTire({ treadDepth: 8, dot: '0119' }).status).toBe('warning') // ~7 yaş
  })

  it('diş derinliği bilinmiyorsa o kontrolü atlar', () => {
    expect(evaluateTire({}).status).toBe('ok')
    expect(evaluateTire({ treadDepth: 0 }).status).toBe('ok')
  })

  it('en kötü seviye statüyü belirler', () => {
    // Derinlik kritik + yaş uyarı -> kritik
    const result = evaluateTire({ treadDepth: 1.0, dot: '0119' })
    expect(result.status).toBe('critical')
    expect(result.warnings.length).toBe(2)
  })
})

describe('evaluateTireSet', () => {
  it('setteki en kötü lastiğe göre statü verir', () => {
    const set = { tires: [{ treadDepth: 8 }, { treadDepth: 1.2 }, { treadDepth: 7 }] }
    const result = evaluateTireSet(set)
    expect(result.status).toBe('critical')
    expect(result.criticalCount).toBe(1)
    expect(result.issueCount).toBe(1)
  })

  it('sorunlu lastikleri sayar', () => {
    const set = { tires: [{ treadDepth: 1.2 }, { treadDepth: 2.5 }, { treadDepth: 3.5 }, { treadDepth: 8 }] }
    const result = evaluateTireSet(set)
    expect(result.criticalCount).toBe(1)
    expect(result.dangerCount).toBe(1)
    expect(result.warningCount).toBe(1)
    expect(result.issueCount).toBe(3)
  })

  it('sağlıklı sette ok döner', () => {
    expect(evaluateTireSet({ tires: [{ treadDepth: 8 }] }).status).toBe('ok')
  })

  it('eksik veride çökmez', () => {
    expect(evaluateTireSet(null).status).toBe('ok')
    expect(evaluateTireSet({}).status).toBe('ok')
  })
})

describe('getSeasonChangeSuggestion', () => {
  it('Haziran ortasında öneri yok', () => {
    expect(getSeasonChangeSuggestion('summer')).toBeNull()
    expect(getSeasonChangeSuggestion('winter')).toBeNull()
  })

  it('Ekim ikinci yarısında kışa hazırlık önerir', () => {
    vi.setSystemTime(new Date(2026, 9, 20))
    const oneri = getSeasonChangeSuggestion('summer')
    expect(oneri.target).toBe('winter')
    expect(oneri.urgent).toBe(false)
  })

  it('Kasımda kış lastiğini acil işaretler', () => {
    vi.setSystemTime(new Date(2026, 10, 10))
    const oneri = getSeasonChangeSuggestion('summer')
    expect(oneri.target).toBe('winter')
    expect(oneri.urgent).toBe(true)
  })

  it('Nisanda yazlığa geçiş önerir', () => {
    vi.setSystemTime(new Date(2026, 3, 10))
    expect(getSeasonChangeSuggestion('winter').target).toBe('summer')
  })

  it('zaten doğru sezondaysa öneri vermez', () => {
    vi.setSystemTime(new Date(2026, 10, 10))
    expect(getSeasonChangeSuggestion('winter')).toBeNull()
  })
})

describe('getActiveTireSet', () => {
  const summerSet = { id: 's1', season: 'summer' }
  const winterSet = { id: 's2', season: 'winter' }

  it('en son değişimin hedef sezonundaki seti verir', () => {
    const changes = [
      { date: '2026-04-01', toSeason: 'summer' },
      { date: '2025-11-01', toSeason: 'winter' },
    ]
    expect(getActiveTireSet([summerSet, winterSet], changes)).toEqual(summerSet)
  })

  it('değişim sırası karışık gelse de en yenisini bulur', () => {
    const changes = [
      { date: '2025-11-01', toSeason: 'winter' },
      { date: '2026-04-01', toSeason: 'summer' },
    ]
    expect(getActiveTireSet([summerSet, winterSet], changes)).toEqual(summerSet)
  })

  it('hiç değişim yoksa ilk seti verir', () => {
    expect(getActiveTireSet([winterSet, summerSet], [])).toEqual(winterSet)
  })

  it('set yoksa null döner', () => {
    expect(getActiveTireSet([], [])).toBeNull()
    expect(getActiveTireSet(null, [])).toBeNull()
  })
})

describe('getAverageTreadDepth', () => {
  it('sıfır olmayan derinliklerin ortalamasını verir', () => {
    expect(getAverageTreadDepth({ tires: [{ treadDepth: 6 }, { treadDepth: 8 }] })).toBe(7)
  })

  it('derinliği girilmemiş lastikleri ortalamaya katmaz', () => {
    expect(getAverageTreadDepth({ tires: [{ treadDepth: 6 }, {}, { treadDepth: 8 }] })).toBe(7)
  })

  it('hiç derinlik yoksa null döner', () => {
    expect(getAverageTreadDepth({ tires: [{}, {}] })).toBeNull()
    expect(getAverageTreadDepth(null)).toBeNull()
  })
})
