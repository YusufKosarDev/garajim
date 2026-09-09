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
 */
const yerel = (): string => (i18n.resolvedLanguage === 'en' ? 'en-GB' : 'tr-TR')

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