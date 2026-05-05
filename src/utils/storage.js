const STORAGE_KEY = 'garajim_data'

export const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (err) {
    console.error('LocalStorage yükleme hatası:', err)
    return null
  }
}

export const saveData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (err) {
    console.error('LocalStorage kaydetme hatası:', err)

    // Kapasite doldu hatası
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      return { error: 'quota' }
    }
    return { error: 'unknown' }
  }
}

export const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (err) {
    console.error('LocalStorage temizleme hatası:', err)
    return false
  }
}

// LocalStorage kapasite bilgisi (yaklaşık)
export const getStorageInfo = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY) || ''
    const bytes = new Blob([data]).size
    const kb = bytes / 1024
    const mb = kb / 1024

    // Tahmini toplam kapasite: 5 MB (çoğu tarayıcı için)
    const estimatedTotalMB = 5
    const usagePercent = (mb / estimatedTotalMB) * 100

    return {
      bytes,
      kb: Math.round(kb * 100) / 100,
      mb: Math.round(mb * 1000) / 1000,
      usagePercent: Math.round(usagePercent * 100) / 100,
      estimatedTotalMB,
    }
  } catch (err) {
    return null
  }
}