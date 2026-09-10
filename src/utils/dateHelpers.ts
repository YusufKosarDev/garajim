// ============================================
// TARİH FORMATLAMA FONKSİYONLARI
// ============================================

import i18n from '../i18n'

/**
 * Tarih biçimi AKTİF DİLE göre seçiliyor.
 *
 * Para birimi (₺) ve sayı gruplaması kasıtlı olarak tr-TR kalıyor — tutarlar
 * Türk Lirası cinsinden ve bu bir VERİ özelliği. Tarih biçimi ise öyle değil,
 * saf sunum: İngilizce bir sayfada "15 Haziran 2026" yazması yalnızca çeviri
 * eksiği olurdu.
 *
 * Çağrı anında okunuyor, modül seviyesinde değil — aksi halde biçim
 * uygulamanın açılış diline donardı.
 *
 * DİKKAT — `resolvedLanguage` TEK BAŞINA GÜVENİLİR DEĞİL.
 *
 * i18next `resolvedLanguage`'ı yalnızca `setResolvedLanguage` içinde, dil
 * zincirinde SÖZLÜĞÜ OLAN ilk dili bularak yazıyor. Bizde sözlükler init'e
 * `resources: {}` ile giriyor ve sonradan `addResourceBundle` ile ekleniyor
 * (bkz. i18n/index.ts, dinamik chunk kararı) — yani init anında store boş,
 * `resolvedLanguage` `undefined` kalıyor ve bir daha hesaplanmıyor.
 *
 * Somut sonucu şuydu: arayüz İngilizceyken (t() çalışıyor, <html lang> 'en')
 * tarihler, ay ve gün adları Türkçe kalıyordu — "15 Şubat 2026", "Pzt Sal Çar".
 * Bu yüzden `language`'a da düşülüyor; ikisi de yoksa yedek dil.
 */
export const aktifYerel = (): string => {
  const dil = i18n.resolvedLanguage || i18n.language || 'tr'
  return dil.startsWith('en') ? 'en-GB' : 'tr-TR'
}

const yerel = aktifYerel

/** Grafik ekseni ve ısı haritası için ay indeksinden kısa ad: "Şub" / "Feb" */
export const kisaAyAdi = (ay: number): string =>
  new Date(2024, ay, 15).toLocaleDateString(aktifYerel(), { month: 'short' })

/** Takvim başlığı ve tablo etiketi: "Eylül 2026" / "September 2026" */
export const ayYilEtiketi = (yil: number, ay: number): string =>
  new Date(yil, ay, 15).toLocaleDateString(aktifYerel(), { month: 'long', year: 'numeric' })

/**
 * Hafta günü adları, PAZARTESİ'den başlayarak.
 *
 * Önceden iki ayrı dosyada elle yazılmış diziler vardı
 * (`['Pzt','Sal',...]` — DashboardCalendar ve Calendar) ve İngilizce arayüzde
 * de Türkçe kalıyorlardı. Intl'den üretmek hem çeviriyi hem de ay/gün
 * adlarının dile uymasını tek yerde çözüyor.
 *
 * 2024-01-01 bir Pazartesi; oradan 7 gün ilerleyerek sırayı kuruyoruz.
 */
export const haftaGunleri = (uzunluk: 'short' | 'long' = 'short'): string[] => {
  const bicim = new Intl.DateTimeFormat(yerel(), { weekday: uzunluk })
  return Array.from({ length: 7 }, (_, i) => bicim.format(new Date(2024, 0, 1 + i)))
}

/** Grafik eksenleri için kısa ay etiketi: "Şub 26" / "Feb 26" */
export const kisaAyEtiketi = (date: Date): string =>
  date.toLocaleDateString(yerel(), { month: 'short', year: '2-digit' })

/** Grafik eksenleri için gün+ay: "08 Eyl" / "08 Sep" */
export const gunAyEtiketi = (date: Date): string =>
  date.toLocaleDateString(yerel(), { day: '2-digit', month: 'short' })

// Bir Date'i YEREL saate göre 'YYYY-MM-DD' anahtarına çevirir.
// Not: toISOString() önce UTC'ye çevirdiği için TR'de (UTC+3) yerel gece yarısı
// bir önceki güne düşer — takvim anahtarlarında asla toISOString() kullanma.
export const toDateKey = (date: Date | string | null | undefined): string => {
  // new Date(null) epoch'a düşer (geçerli tarih sayılır), new Date(undefined)
  // Invalid Date verir — boş girdiyi baştan eleyip ikisini de aynı davranışa çekiyoruz.
  if (date === null || date === undefined || date === '') return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// "22 Nisan 2026" - Tam tarih, uzun ay adı (ana format)
export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(yerel(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// "22 Nis 2026" - Kısa tarih (tablo ve dar alanlar için)
export const formatDateShort = (dateString?: string | null): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(yerel(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// "22 Nisan 2026, 14:30" - Tarih + saat
export const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  const datePart = date.toLocaleDateString(yerel(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timePart = date.toLocaleTimeString(yerel(), {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart}, ${timePart}`
}

// "2 gün önce", "yarın", "bugün", "3 gün sonra"
export const formatRelative = (dateString?: string | null): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const diffMs = target.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return i18n.t('dateHelpers.bugun')
  if (diffDays === 1) return i18n.t('dateHelpers.yarin')
  if (diffDays === -1) return i18n.t('dateHelpers.dun')
  if (diffDays > 0 && diffDays <= 7) return i18n.t('dateHelpers.gun_sonra', { days: diffDays })
  if (diffDays < 0 && diffDays >= -7) return i18n.t('dateHelpers.gun_once', { days: Math.abs(diffDays) })
  if (diffDays > 7 && diffDays <= 30) return i18n.t('dateHelpers.gun_sonra', { days: diffDays })
  if (diffDays < -7 && diffDays >= -30) return i18n.t('dateHelpers.gun_once', { days: Math.abs(diffDays) })

  // 30 günden fazlaysa normal formatta göster
  return formatDateShort(dateString)
}

// ============================================
// TARİH MANTIĞI FONKSİYONLARI
// ============================================

// İki tarih arası gün farkı (pozitif = gelecek, negatif = geçmiş)
export const daysUntil = (dateString?: string | null): number | null => {
  if (!dateString) return null
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const diffMs = date.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

// Tarih durumunu belirle (expired/warning/safe/none)
import type { DateStatus } from '../types'

export const getDateStatus = (dateString?: string | null): DateStatus => {
  if (!dateString) return 'none'
  const days = daysUntil(dateString)
  if (days === null) return 'none'
  if (days < 0) return 'expired'  // Süresi geçmiş
  if (days <= 30) return 'warning'  // 30 gün içinde
  return 'safe'
}