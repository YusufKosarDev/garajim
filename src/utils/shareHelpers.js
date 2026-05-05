import LZString from 'lz-string'

// Paylaşılabilir veri oluştur (compress edilmiş, URL-safe)
export const encodeShareData = (vehicle, maintenanceRecords, fuelRecords) => {
  // Sadece gerekli alanları al, fotoğrafları çıkar (URL'i şişirmesin)
  const sharedVehicle = {
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    fuelType: vehicle.fuelType,
    currentKm: vehicle.currentKm,
    inspectionDate: vehicle.inspectionDate,
    mtvDate: vehicle.mtvDate,
    insuranceDate: vehicle.insuranceDate,
    kaskoDate: vehicle.kaskoDate,
    notes: vehicle.notes,
  }

  const sharedMaintenance = maintenanceRecords.map(r => ({
    id: r.id,
    type: r.type,
    date: r.date,
    km: r.km,
    cost: r.cost,
    notes: r.notes,
    // photo dahil edilmiyor — URL şişer
  }))

  const sharedFuel = fuelRecords.map(r => ({
    id: r.id,
    date: r.date,
    km: r.km,
    liters: r.liters,
    pricePerLiter: r.pricePerLiter,
    totalCost: r.totalCost,
    fullTank: r.fullTank,
    station: r.station,
  }))

  const data = {
    vehicle: sharedVehicle,
    maintenance: sharedMaintenance,
    fuel: sharedFuel,
    sharedAt: new Date().toISOString(),
    version: 1,
  }

  // JSON → compress → URL-safe base64
  const json = JSON.stringify(data)
  return LZString.compressToEncodedURIComponent(json)
}

// Paylaşılan veriyi decode et
export const decodeShareData = (encoded) => {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null

    const data = JSON.parse(json)

    // Versiyon kontrolü
    if (!data.version || data.version > 1) {
      console.error('Unsupported share data version:', data.version)
      return null
    }

    return data
  } catch (err) {
    console.error('Share data decode error:', err)
    return null
  }
}

// Paylaşım URL'i oluştur
export const createShareUrl = (vehicle, maintenanceRecords, fuelRecords) => {
  const encoded = encodeShareData(vehicle, maintenanceRecords, fuelRecords)
  const baseUrl = window.location.origin
  return `${baseUrl}/share/${encoded}`
}

// URL boyutunu hesapla (kullanıcıya bilgi için)
export const getShareUrlSize = (url) => {
  return {
    chars: url.length,
    kb: (url.length / 1024).toFixed(2),
  }
}

// Browser native share API destekli mi?
export const isNativeShareSupported = () => {
  return typeof navigator !== 'undefined' && 'share' in navigator
}

// Native share API ile paylaş
export const shareNatively = async ({ title, text, url }) => {
  if (!isNativeShareSupported()) {
    return { success: false, reason: 'unsupported' }
  }

  try {
    await navigator.share({ title, text, url })
    return { success: true }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, reason: 'cancelled' }
    }
    return { success: false, reason: 'error', error: err }
  }
}

// Clipboard'a kopyala
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    // Fallback için eski yöntem
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      return false
    }
  }
}