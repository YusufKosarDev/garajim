// Maksimum dosya boyutu (sıkıştırma sonrası)
const MAX_FILE_SIZE_MB = 1
const MAX_DIMENSION = 1920 // px
const COMPRESSION_QUALITY = 0.85

// Maksimum araç başına fotoğraf sayısı
export const MAX_VEHICLE_PHOTOS = 5

// Tek bir resmi compress edip base64'e çevir
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Geçerli bir görsel dosyası değil'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')

        let { width, height } = img

        // Boyut sınırlama (oran koruyarak)
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = (height / width) * MAX_DIMENSION
            width = MAX_DIMENSION
          } else {
            width = (width / height) * MAX_DIMENSION
            height = MAX_DIMENSION
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // JPEG olarak compress et (kalite %85)
        const compressedBase64 = canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY)

        // Boyut kontrolü
        const sizeKB = (compressedBase64.length * 0.75) / 1024 // base64 to bytes approx

        if (sizeKB > MAX_FILE_SIZE_MB * 1024) {
          // Hâlâ çok büyük, tekrar compress et (daha düşük kalite)
          const moreCompressed = canvas.toDataURL('image/jpeg', 0.7)
          resolve(moreCompressed)
        } else {
          resolve(compressedBase64)
        }
      }
      img.onerror = () => reject(new Error('Görsel yüklenemedi'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Dosya okunamadı'))
    reader.readAsDataURL(file)
  })
}

// Birden çok dosyayı işle
export const compressMultipleImages = async (files) => {
  const results = []
  for (const file of files) {
    try {
      const compressed = await compressImage(file)
      results.push({ success: true, data: compressed })
    } catch (err) {
      results.push({ success: false, error: err.message, fileName: file.name })
    }
  }
  return results
}

// Base64 string'in boyutunu hesapla (KB)
export const getImageSize = (base64String) => {
  if (!base64String) return 0
  // base64 boyutu = 4 * ceil(n / 3), gerçek boyut = (string.length * 3) / 4 / 1024
  const sizeInBytes = (base64String.length * 3) / 4
  return Math.round(sizeInBytes / 1024) // KB
}

// Bir array'in toplam boyutu
export const getTotalImageSize = (photos = []) => {
  return photos.reduce((sum, p) => sum + getImageSize(p), 0)
}

// Geçerli bir base64 image mi?
export const isValidImageDataUrl = (str) => {
  if (!str || typeof str !== 'string') return false
  return str.startsWith('data:image/') && str.includes(';base64,')
}