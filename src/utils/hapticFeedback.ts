// Haptic feedback için yardımcı fonksiyonlar
// Vibration API'yi destekleyen cihazlarda hafif titreşimler tetikler

const STORAGE_KEY = 'garajim_haptic_enabled'

// Haptic destekli mi?
export const isHapticSupported = () => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

// Kullanıcı tercihini al
export const isHapticEnabled = () => {
  if (!isHapticSupported()) return false
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === null ? true : stored === 'true' // Default: açık
  } catch {
    return true
  }
}

// Kullanıcı tercihini değiştir
export const setHapticEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled))
  } catch (err) {
    console.error('Haptic preference save error:', err)
  }
}

// Hafif titreşim (10ms) — tıklama, swipe açma
export const hapticLight = () => {
  if (!isHapticEnabled()) return
  try {
    navigator.vibrate(10)
  } catch {
    // navigator.vibrate her tarayıcıda yok ve iOS Safari'de çağrı atılabiliyor.
    // Titreşim tamamen kozmetik — başarısızlığı kullanıcıya yansıtmıyoruz.
  }
}

// Orta titreşim (20ms) — başarılı aksiyon, kayıt ekleme
export const hapticMedium = () => {
  if (!isHapticEnabled()) return
  try {
    navigator.vibrate(20)
  } catch {
    // navigator.vibrate her tarayıcıda yok ve iOS Safari'de çağrı atılabiliyor.
    // Titreşim tamamen kozmetik — başarısızlığı kullanıcıya yansıtmıyoruz.
  }
}

// Güçlü titreşim (40ms) — silme, hata, kritik aksiyon
export const hapticStrong = () => {
  if (!isHapticEnabled()) return
  try {
    navigator.vibrate(40)
  } catch {
    // navigator.vibrate her tarayıcıda yok ve iOS Safari'de çağrı atılabiliyor.
    // Titreşim tamamen kozmetik — başarısızlığı kullanıcıya yansıtmıyoruz.
  }
}

// Başarı pattern (kısa-kısa) — tamamlama
export const hapticSuccess = () => {
  if (!isHapticEnabled()) return
  try {
    navigator.vibrate([10, 50, 10])
  } catch {
    // navigator.vibrate her tarayıcıda yok ve iOS Safari'de çağrı atılabiliyor.
    // Titreşim tamamen kozmetik — başarısızlığı kullanıcıya yansıtmıyoruz.
  }
}

// Hata pattern (uzun-kısa-uzun) — uyarı
export const hapticError = () => {
  if (!isHapticEnabled()) return
  try {
    navigator.vibrate([40, 30, 40])
  } catch {
    // navigator.vibrate her tarayıcıda yok ve iOS Safari'de çağrı atılabiliyor.
    // Titreşim tamamen kozmetik — başarısızlığı kullanıcıya yansıtmıyoruz.
  }
}