import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildICS } from './icsExport'
import { buildVehicleEvents } from './calendarEvents'
import type { Vehicle } from '../types'
import type { TakvimEtkinligi } from './calendarEvents'

const ARAC = {
  id: 'v1', plate: '34 ABC 123', brand: 'BMW', model: '320i',
} as unknown as Vehicle

const event = (over: Partial<TakvimEtkinligi> = {}): TakvimEtkinligi => ({
  type: 'inspection', label: 'Muayene', date: '2026-06-15',
  vehicle: ARAC, days: 10, status: 'warning', ...over,
})

const lines = (ics: string) => ics.split('\r\n')

describe('buildICS — yapı', () => {
  it('geçerli bir VCALENDAR iskeleti üretir', () => {
    const s = lines(buildICS([event()]))
    expect(s[0]).toBe('BEGIN:VCALENDAR')
    expect(s).toContain('VERSION:2.0')
    expect(s).toContain('END:VCALENDAR')
    expect(s.filter(l => l === 'BEGIN:VEVENT')).toHaveLength(1)
    expect(s.filter(l => l === 'END:VEVENT')).toHaveLength(1)
  })

  it('satırları CRLF ile ayırır ve dosyayı CRLF ile bitirir', () => {
    // RFC 5545 şartı; sadece \n kullanan dosyaları bazı takvimler reddediyor
    const ics = buildICS([event()])
    expect(ics.endsWith('\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('tüm gün etkinliğinde DTEND ertesi gündür', () => {
    // DTEND dahil değildir; aynı gün yazılırsa etkinlik sıfır uzunlukta olur
    const s = lines(buildICS([event({ date: '2026-06-15' })]))
    expect(s).toContain('DTSTART;VALUE=DATE:20260615')
    expect(s).toContain('DTEND;VALUE=DATE:20260616')
  })

  it('ay ve yıl sınırını doğru aşar', () => {
    expect(lines(buildICS([event({ date: '2026-12-31' })])))
      .toContain('DTEND;VALUE=DATE:20270101')
    // 2028 artık yıl: 28 Şubat'ın ertesi 29 Şubat
    expect(lines(buildICS([event({ date: '2028-02-28' })])))
      .toContain('DTEND;VALUE=DATE:20280229')
    // 2026 artık yıl değil: 28 Şubat'ın ertesi 1 Mart
    expect(lines(buildICS([event({ date: '2026-02-28' })])))
      .toContain('DTEND;VALUE=DATE:20260301')
  })

  it('UID her dışa aktarımda aynı kalır', () => {
    // Aksi halde takvim uygulaması aynı muayeneyi her seferinde yeniden ekler
    const a = lines(buildICS([event()])).find(l => l.startsWith('UID:'))
    const b = lines(buildICS([event()])).find(l => l.startsWith('UID:'))
    expect(a).toBe(b)
    expect(a).toBe('UID:inspection-v1-2026-06-15@garajim')
  })
})

describe('buildICS — kaçış (RFC 5545 kuralları CSV kurallarından farklı)', () => {
  it('virgül, noktalı virgül ve ters bölüyü kaçırır', () => {
    const s = buildICS([event({ label: 'Yag; filtre, conta \\ ek' })])
    const ozet = lines(s).find(l => l.startsWith('SUMMARY:'))
    expect(ozet).toContain('Yag\\; filtre\\, conta \\\\ ek')
  })

  it('tırnağı KAÇIRMAZ (CSV kuralı burada geçerli değil)', () => {
    const s = buildICS([event({ label: 'Servis "Usta"' })])
    expect(lines(s).find(l => l.startsWith('SUMMARY:'))).toContain('Servis "Usta"')
  })

  it('satır sonunu kaçış dizisine çevirir, gerçek satır sonu bırakmaz', () => {
    const s = buildICS([event({ label: 'Bir\nIki' })])
    const summaryLine = lines(s).find(l => l.startsWith('SUMMARY:'))
    expect(summaryLine).toContain('Bir\\nIki')
  })
})

describe('buildICS — 75 oktet satır katlama', () => {
  it('uzun satırı katlar ve devam satırları boşlukla başlar', () => {
    const s = buildICS([event({ label: 'A'.repeat(200) })])
    const allLines = lines(s)
    const bas = allLines.findIndex(l => l.startsWith('SUMMARY:'))
    expect(allLines[bas + 1].startsWith(' ')).toBe(true)
  })

  it('hiçbir satır 75 okteti aşmaz', () => {
    const s = buildICS([event({ label: 'Şşğüöç'.repeat(40) })])
    const enUzun = Math.max(...lines(s).map(l => new TextEncoder().encode(l).length))
    expect(enUzun).toBeLessThanOrEqual(75)
  })

  it('çok baytlı karakteri ortasından bölmez', () => {
    // Türkçe harfler UTF-8'de 2 bayt; bayt sayarak körü körüne kesmek dosyayı
    // bozardı. Katlanan parçalar birleşince metin aynen geri gelmeli.
    const text = 'Ğ'.repeat(120)
    const tum = lines(buildICS([event({ label: text })]))
    const bas = tum.findIndex(l => l.startsWith('SUMMARY:'))
    let birlesik = tum[bas]
    for (let i = bas + 1; tum[i]?.startsWith(' '); i++) birlesik += tum[i].slice(1)
    expect(birlesik).toContain(text)
    expect(birlesik).not.toContain('�')
  })
})

describe('buildICS — hatırlatma', () => {
  it('yasal tarihlere alarm ekler', () => {
    const s = lines(buildICS([event({ type: 'mtv', label: 'MTV' })], { hatirlatmaGun: 7 }))
    expect(s).toContain('BEGIN:VALARM')
    expect(s).toContain('TRIGGER:-P7D')
  })

  it('geçmiş bakım kaydına alarm eklemez', () => {
    // Geçmişte yapılmış bir bakım hatırlatma değil, kayıttır
    const s = lines(buildICS([event({ type: 'maintenance', label: 'Yağ Değişimi' })]))
    expect(s).not.toContain('BEGIN:VALARM')
  })

  it('hatirlatmaGun 0 ise hiç alarm eklenmez', () => {
    const s = lines(buildICS([event()], { hatirlatmaGun: 0 }))
    expect(s).not.toContain('BEGIN:VALARM')
  })
})

describe('buildICS — dayanıklılık', () => {
  it('boş listede geçerli ama olaysız takvim üretir', () => {
    const s = lines(buildICS([]))
    expect(s[0]).toBe('BEGIN:VCALENDAR')
    expect(s).not.toContain('BEGIN:VEVENT')
  })

  it('tarihsiz veya araçsız etkinliği atlar', () => {
    const s = buildICS([
      event(),
      { ...event(), date: '' },
      { ...event(), vehicle: null as unknown as Vehicle },
    ])
    expect(lines(s).filter(l => l === 'BEGIN:VEVENT')).toHaveLength(1)
  })
})

describe('buildVehicleEvents -> buildICS bütünü', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 5)) // 5 Haziran 2026
  })
  afterEach(() => vi.useRealTimers())

  it('aracın dört yasal tarihini de takvime taşır', () => {
    const vehicle = {
      ...ARAC,
      inspectionDate: '2026-06-15',
      mtvDate: '2026-07-31',
      insuranceDate: '2026-08-01',
      kaskoDate: '2026-09-10',
    } as unknown as Vehicle

    const events = buildVehicleEvents([vehicle])
    expect(events).toHaveLength(4)
    // type makine anahtarı, label insan metni — eski Dashboard şeklinde ikisi tek alandaydı
    expect(events.map(e => e.type)).toEqual(['inspection', 'mtv', 'insurance', 'kasko'])
    expect(events.map(e => e.label)).toEqual(['Muayene', 'MTV', 'Sigorta', 'Kasko'])

    const s = lines(buildICS(events))
    expect(s.filter(l => l === 'BEGIN:VEVENT')).toHaveLength(4)
    expect(s.some(l => l.includes('Muayene — BMW 320i'))).toBe(true)
  })

  it('tarihi olmayan alanları atlar', () => {
    const vehicle = { ...ARAC, inspectionDate: '2026-06-15', mtvDate: '' } as unknown as Vehicle
    expect(buildVehicleEvents([vehicle])).toHaveLength(1)
  })

  it('bakım ve yakıt kayıtlarını da isteğe bağlı ekler', () => {
    const vehicle = { ...ARAC, inspectionDate: '2026-06-15' } as unknown as Vehicle
    const events = buildVehicleEvents([vehicle], {
      bakimlar: [{ id: 'm1', vehicleId: 'v1', date: '2026-01-10', type: 'Yağ Değişimi' }] as never,
      fuels: [{ id: 'f1', vehicleId: 'v1', date: '2026-02-10', liters: 45, totalCost: 2000 }] as never,
    })
    expect(events.map(e => e.type)).toEqual(['inspection', 'maintenance', 'fuel'])
    expect(events[2].label).toContain('45 L')
  })

  it('bilinmeyen araca ait kaydı atlar', () => {
    const events = buildVehicleEvents([ARAC], {
      bakimlar: [{ id: 'm1', vehicleId: 'YOK', date: '2026-01-10', type: 'Yağ' }] as never,
    })
    expect(events).toHaveLength(0)
  })
})
