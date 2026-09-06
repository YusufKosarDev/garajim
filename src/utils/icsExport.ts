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
const kacir = (metin: string): string =>
  String(metin ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

const oktetUzunlugu = (s: string): number => new TextEncoder().encode(s).length

/**
 * RFC 5545 3.1 — satırlar 75 oktetten uzun olamaz; devam satırları tek boşlukla
 * başlar. Devam satırının kendi boşluğu da o 75 oktete dahildir.
 */
const katla = (satir: string): string => {
  if (oktetUzunlugu(satir) <= 75) return satir

  const parcalar: string[] = []
  let mevcut = ''
  let sinir = 75

  // Karakter karakter ilerliyoruz: çok baytlı bir karakteri ortadan bölmek
  // dosyayı bozar. [...satir] surrogate pair'leri de doğru yürütür.
  for (const karakter of satir) {
    if (oktetUzunlugu(mevcut + karakter) > sinir) {
      parcalar.push(mevcut)
      mevcut = karakter
      sinir = 74 // devam satırlarında baştaki boşluk bir oktet yiyor
    } else {
      mevcut += karakter
    }
  }
  parcalar.push(mevcut)

  return parcalar.join('\r\n ')
}

/** YYYY-MM-DD -> YYYYMMDD (DATE değeri; saat yok, tüm gün etkinliği) */
const icsTarih = (tarih: string): string => tarih.replace(/-/g, '')

const artiGun = (tarih: string, gun: number): string => {
  const [y, a, g] = tarih.split('-').map(Number)
  // Yerel saatle kuruyoruz; toISOString UTC'ye çevirip TR'de günü geriye kaydırırdı
  return toDateKey(new Date(y, a - 1, g + gun))
}

const zamanDamgasi = (d: Date): string =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}` +
  `T${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}${String(d.getUTCSeconds()).padStart(2, '0')}Z`

/**
 * Hangi etkinlikler hatırlatmaya değer? Yasal tarihler kaçırılırsa ceza var;
 * geçmişteki bakım/yakıt kaydı ise takvimde hatırlatma değil, kayıttır.
 */
const HATIRLATMALI: ReadonlySet<string> = new Set(['inspection', 'mtv', 'insurance', 'kasko'])

export interface IcsSecenekleri {
  /** Kaç gün önceden hatırlatma eklensin (yasal tarihler için). 0 = alarm ekleme */
  hatirlatmaGun?: number
}

export const buildICS = (
  etkinlikler: TakvimEtkinligi[],
  { hatirlatmaGun = 7 }: IcsSecenekleri = {},
): string => {
  const simdi = zamanDamgasi(new Date())

  const satirlar: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Garajim//Arac Takvimi//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Garajım',
  ]

  for (const e of etkinlikler) {
    if (!e?.date || !e.vehicle) continue

    const arac = `${e.vehicle.brand ?? ''} ${e.vehicle.model ?? ''}`.trim()
    const plaka = e.vehicle.plate ?? ''
    const baslik = [e.label, arac || plaka].filter(Boolean).join(' — ')

    // UID her yeniden dışa aktarımda AYNI kalmalı: takvim uygulaması aynı
    // etkinliği ikinci kez eklemek yerine güncellesin.
    const uid = `${e.type}-${e.vehicle.id}-${e.date}@garajim`

    satirlar.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${simdi}`,
      // Tüm gün etkinliği: DTEND dahil değildir, o yüzden ertesi gün yazılıyor
      `DTSTART;VALUE=DATE:${icsTarih(e.date)}`,
      `DTEND;VALUE=DATE:${icsTarih(artiGun(e.date, 1))}`,
      katla(`SUMMARY:${kacir(baslik)}`),
      katla(`DESCRIPTION:${kacir([plaka, arac].filter(Boolean).join(' · '))}`),
      'TRANSP:TRANSPARENT',
    )

    if (hatirlatmaGun > 0 && HATIRLATMALI.has(e.type)) {
      satirlar.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        katla(`DESCRIPTION:${kacir(baslik)}`),
        `TRIGGER:-P${hatirlatmaGun}D`,
        'END:VALARM',
      )
    }

    satirlar.push('END:VEVENT')
  }

  satirlar.push('END:VCALENDAR')

  // RFC 5545 satır sonu CRLF'tir; sonda da bir tane olmalı
  return satirlar.join('\r\n') + '\r\n'
}

/** @returns dosyaya yazılan etkinlik sayısı */
export const exportICS = (etkinlikler: TakvimEtkinligi[], secenekler?: IcsSecenekleri): number => {
  const gecerli = etkinlikler.filter(e => e?.date && e.vehicle)
  if (gecerli.length === 0) return 0

  downloadFile(
    buildICS(gecerli, secenekler),
    `garajim-takvim-${toDateKey(new Date())}.ics`,
    'text/calendar;charset=utf-8',
  )
  return gecerli.length
}
