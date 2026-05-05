// ============================================
// TARİH FORMATLAMA FONKSİYONLARI
// ============================================

// "22 Nisan 2026" - Tam tarih, uzun ay adı (ana format)
export const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// "22 Nis 2026" - Kısa tarih (tablo ve dar alanlar için)
export const formatDateShort = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// "22 Nisan 2026, 14:30" - Tarih + saat
export const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  const datePart = date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timePart = date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart}, ${timePart}`
}

// "2 gün önce", "yarın", "bugün", "3 gün sonra"
export const formatRelative = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const diffMs = target - today
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'bugün'
  if (diffDays === 1) return 'yarın'
  if (diffDays === -1) return 'dün'
  if (diffDays > 0 && diffDays <= 7) return `${diffDays} gün sonra`
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} gün önce`
  if (diffDays > 7 && diffDays <= 30) return `${diffDays} gün sonra`
  if (diffDays < -7 && diffDays >= -30) return `${Math.abs(diffDays)} gün önce`

  // 30 günden fazlaysa normal formatta göster
  return formatDateShort(dateString)
}

// ============================================
// TARİH MANTIĞI FONKSİYONLARI
// ============================================

// İki tarih arası gün farkı (pozitif = gelecek, negatif = geçmiş)
export const daysUntil = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const diffMs = date - today
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

// Tarih durumunu belirle (expired/warning/safe/none)
export const getDateStatus = (dateString) => {
  if (!dateString) return 'none'
  const days = daysUntil(dateString)
  if (days === null) return 'none'
  if (days < 0) return 'expired'  // Süresi geçmiş
  if (days <= 30) return 'warning'  // 30 gün içinde
  return 'safe'
}