import i18n from '../i18n'
import { toDateKey } from './dateHelpers'
import type { ValidationResult } from '../types'

/**
 * `fieldName` ÇEVRİLMİŞ alan adı olarak gelir (bkz. formSchemas'taki
 * `formSchemas.field.*` anahtarları), çeviri anahtarı olarak değil: mesajın
 * içine {{fieldName}} ile gömülüyor ve iç içe t() çağrısı okunurluğu bozardı.
 * Varsayılan da bu yüzden çağrı anında çözülüyor — modül seviyesinde
 * hesaplanırsa uygulamanın açılış diline donardı.
 */
const defaultFieldName = () => i18n.t('dateValidation.field.tarih')

// Bugünün tarihini YYYY-MM-DD formatında döndür (HTML date input için)
// Yerel saate göre — toISOString() TR'de tarihi bir gün geriye kaydırırdı.
export const getTodayString = () => toDateKey(new Date())

// Geçmişte olması gereken tarihler için (bakım, yakıt)
// "Bugüne kadar" kabul edilir, gelecek tarih hata
export const validatePastDate = (dateString?: string | null, fieldName = defaultFieldName()): ValidationResult => {
  if (!dateString) return { isValid: true }

  const date = new Date(dateString)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // Bugünün sonu

  if (date > today) {
    return {
      isValid: false,
      message: i18n.t('dateValidation.gelecek_tarih_olamaz', { fieldName }),
    }
  }

  // Çok eski tarih kontrolü (50 yıldan eski)
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 50)
  if (date < minDate) {
    return {
      isValid: false,
      message: i18n.t('dateValidation.cok_eski_tarih', { fieldName }),
    }
  }

  return { isValid: true }
}

// Gelecekte olabilecek tarihler için (muayene, MTV, sigorta, kasko)
// Geçmişe biraz izin verilir (süresi geçmiş tarihler için) ama çok uzak gelecek hata
export const validateExpiryDate = (dateString?: string | null, fieldName = defaultFieldName(), maxYearsAhead = 5): ValidationResult => {
  if (!dateString) return { isValid: true }

  const date = new Date(dateString)

  // Çok uzak gelecek kontrolü
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + maxYearsAhead)
  if (date > maxDate) {
    return {
      isValid: false,
      message: i18n.t('dateValidation.en_fazla_yil_sonrasi', { fieldName, years: maxYearsAhead }),
    }
  }

  // Çok eski tarih kontrolü (10 yıldan eski)
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 10)
  if (date < minDate) {
    return {
      isValid: false,
      message: i18n.t('dateValidation.cok_eski_tarih', { fieldName }),
    }
  }

  return { isValid: true }
}

// Araç yılı doğrulama
export const validateVehicleYear = (year?: string | number | null): ValidationResult => {
  if (!year) return { isValid: false, message: i18n.t('dateValidation.yil_zorunlu') }

  const y = Number(year)
  const currentYear = new Date().getFullYear()

  if (isNaN(y)) return { isValid: false, message: i18n.t('dateValidation.gecersiz_yil') }
  if (y < 1950) return { isValid: false, message: i18n.t('dateValidation.yil_kucuk_olamaz') }
  if (y > currentYear + 1) {
    return { isValid: false, message: i18n.t('dateValidation.yil_buyuk_olamaz', { max: currentYear + 1 }) }
  }

  return { isValid: true }
}