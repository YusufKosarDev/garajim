// Bugünün tarihini YYYY-MM-DD formatında döndür (HTML date input için)
export const getTodayString = () => {
  return new Date().toISOString().split('T')[0]
}

// X yıl sonrasının tarihini YYYY-MM-DD formatında döndür
export const getFutureDateString = (yearsAhead) => {
  const date = new Date()
  date.setFullYear(date.getFullYear() + yearsAhead)
  return date.toISOString().split('T')[0]
}

// Geçmişte olması gereken tarihler için (bakım, yakıt)
// "Bugüne kadar" kabul edilir, gelecek tarih hata
export const validatePastDate = (dateString, fieldName = 'Tarih') => {
  if (!dateString) return { isValid: true }

  const date = new Date(dateString)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // Bugünün sonu

  if (date > today) {
    return {
      isValid: false,
      message: `${fieldName} gelecek tarih olamaz`,
    }
  }

  // Çok eski tarih kontrolü (50 yıldan eski)
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 50)
  if (date < minDate) {
    return {
      isValid: false,
      message: `${fieldName} çok eski bir tarih`,
    }
  }

  return { isValid: true }
}

// Gelecekte olabilecek tarihler için (muayene, MTV, sigorta, kasko)
// Geçmişe biraz izin verilir (süresi geçmiş tarihler için) ama çok uzak gelecek hata
export const validateExpiryDate = (dateString, fieldName = 'Tarih', maxYearsAhead = 5) => {
  if (!dateString) return { isValid: true }

  const date = new Date(dateString)

  // Çok uzak gelecek kontrolü
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + maxYearsAhead)
  if (date > maxDate) {
    return {
      isValid: false,
      message: `${fieldName} en fazla ${maxYearsAhead} yıl sonrası olabilir`,
    }
  }

  // Çok eski tarih kontrolü (10 yıldan eski)
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 10)
  if (date < minDate) {
    return {
      isValid: false,
      message: `${fieldName} çok eski bir tarih`,
    }
  }

  return { isValid: true }
}

// Araç yılı doğrulama
export const validateVehicleYear = (year) => {
  if (!year) return { isValid: false, message: 'Yıl zorunlu' }

  const y = Number(year)
  const currentYear = new Date().getFullYear()

  if (isNaN(y)) return { isValid: false, message: 'Geçersiz yıl' }
  if (y < 1950) return { isValid: false, message: `Yıl 1950'den küçük olamaz` }
  if (y > currentYear + 1) {
    return { isValid: false, message: `Yıl ${currentYear + 1}'den büyük olamaz` }
  }

  return { isValid: true }
}