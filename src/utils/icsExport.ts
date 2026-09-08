/**
 * Takvim etkinliklerini .ics (iCalendar, RFC 5545) dosyasına çevirir.
 *
 * Kaçış kuralları CSV'ninkinden FARKLI — escapeCSV burada kullanılamaz:
 *   CSV: virgül/tırnak varsa alanı tırnağa alır
 *   ICS: ters bölü, noktalı virgül, virgül ve satır sonu ters bölüyle kaçırılır,
 *        tırnak hiç kaçırılmaz.
 *
 * Ayrıca ICS satırları 75 OKTET'i aşamaz; aşan satır katlanır. Ölçü karakter
 * değil oktet: "Muayene" 7 oktet ama "Şubat" 6 karakter / 7 oktet (UTF-8'de Ş
 * iki bayt). Türkçe metinlerde bu fark gerçek — bu yüzden katlama bayt sayarak
 * yapılıyor ve bir karakterin ortasından bölmüyor.
 */

import { downloadFile } from './downloadFile'
import { toDateKey } from './dateHelpers'
import type { TakvimEtkinligi } from './calendarEvents'

/** RFC 5545 3.3.11 — TEXT tipinde kaçırılması gereken karakterler */
const kacir = (text: string): string =>
  String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

const octetLength = (s: string): number => new TextEncoder().encode(s).length

/**
 * RFC 5545 3.1 — satırlar 75 oktetten uzun olamaz; devam satırları tek boşlukla
 * başlar. Devam satırının kendi boşluğu da o 75 oktete dahildir.
 */
const foldLine = (line: string): string => {
  if (octetLength(line) <= 75) return line

  const chunks: string[] = []
  let existing = ''
  let sinir = 75

  // Karakter karakter ilerliyoruz: çok baytlı bir karakteri ortadan bölmek
  // dosyayı bozar. [...satir] surrogate pair'leri de doğru yürütür.
  for (const char of line) {
    if (octetLength(existing + char) > sinir) {
      chunks.push(existing)
      existing = char
      sinir = 74 // devam satırlarında baştaki boşluk bir oktet yiyor
    } else {
      existing += char
    }
  }
  chunks.push(existing)

  return chunks.join('\r\n ')
}

/** YYYY-MM-DD -> YYYYMMDD (DATE değeri; saat yok, tüm gün etkinliği) */
const toIcsDate = (date: string): string => date.replace(/-/g, '')

const addDays = (date: string, gun: number): string => {
  const [y, a, g] = date.split('-').map(Number)
  // Yerel saatle kuruyoruz; toISOString UTC'ye çevirip TR'de günü geriye kaydırırdı
  return toDateKey(new Date(y, a - 1, g + gun))
}

const timestamp = (d: Date): string =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}` +
  `T${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}${String(d.getUTCSeconds()).padStart(2, '0')}Z`

/**
 * Hangi etkinlikler hatırlatmaya değer? Yasal tarihler kaçırılırsa ceza var;
 * geçmişteki bakım/yakıt kaydı ise takvimde hatırlatma değil, kayıttır.
 */
const HATIRLATMALI: ReadonlySet<string> = new Set(['inspection', 'mtv', 'insurance', 'kasko'])

export interface IcsOptions {
  /** Kaç gün önceden hatırlatma eklensin (yasal tarihler için). 0 = alarm ekleme */
  hatirlatmaGun?: number
}

export const buildICS = (
  events: TakvimEtkinligi[],
  { hatirlatmaGun = 7 }: IcsOptions = {},
): string => {
  const now = timestamp(new Date())

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Garajim//Arac Takvimi//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Garajım',
  ]

  for (const e of events) {
    if (!e?.date || !e.vehicle) continue

    const vehicle = `${e.vehicle.brand ?? ''} ${e.vehicle.model ?? ''}`.trim()
    const plaka = e.vehicle.plate ?? ''
    const title = [e.label, vehicle || plaka].filter(Boolean).join(' — ')

    // UID her yeniden dışa aktarımda AYNI kalmalı: takvim uygulaması aynı
    // etkinliği ikinci kez eklemek yerine güncellesin.
    const uid = `${e.type}-${e.vehicle.id}-${e.date}@garajim`

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      // Tüm gün etkinliği: DTEND dahil değildir, o yüzden ertesi gün yazılıyor
      `DTSTART;VALUE=DATE:${toIcsDate(e.date)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addDays(e.date, 1))}`,
      foldLine(`SUMMARY:${kacir(title)}`),
      foldLine(`DESCRIPTION:${kacir([plaka, vehicle].filter(Boolean).join(' · '))}`),
      'TRANSP:TRANSPARENT',
    )

    if (hatirlatmaGun > 0 && HATIRLATMALI.has(e.type)) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        foldLine(`DESCRIPTION:${kacir(title)}`),
        `TRIGGER:-P${hatirlatmaGun}D`,
        'END:VALARM',
      )
    }

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  // RFC 5545 satır sonu CRLF'tir; sonda da bir tane olmalı
  return lines.join('\r\n') + '\r\n'
}

/** @returns dosyaya yazılan etkinlik sayısı */
export const exportICS = (events: TakvimEtkinligi[], options?: IcsOptions): number => {
  const valid = events.filter(e => e?.date && e.vehicle)
  if (valid.length === 0) return 0

  downloadFile(
    buildICS(valid, options),
    `garajim-takvim-${toDateKey(new Date())}.ics`,
    'text/calendar;charset=utf-8',
  )
  return valid.length
}
