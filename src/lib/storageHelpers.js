import { supabase } from './supabase'

/**
 * Storage Bucket isimleri (constants)
 */
export const BUCKETS = {
  VEHICLE_PHOTOS: 'vehicle-photos',
  MAINTENANCE_PHOTOS: 'maintenance-photos',
}

/**
 * Base64 string'i Blob'a çevir
 * 
 * "data:image/jpeg;base64,/9j/4AAQ..." formatından
 * Blob (binary) formatına dönüşüm yapar.
 */
const base64ToBlob = (base64String) => {
  // base64 prefix'ini ayır: "data:image/jpeg;base64,..." 
  const matches = base64String.match(/^data:(.+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Geçersiz base64 formatı')
  }
  
  const mimeType = matches[1]      // 'image/jpeg'
  const base64Data = matches[2]    // gerçek base64 verisi
  
  // base64 → binary
  const byteCharacters = atob(base64Data)
  const byteArrays = []
  
  // 1024 byte'lık parçalara böl (büyük dosyalarda performans için)
  for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
    const slice = byteCharacters.slice(offset, offset + 1024)
    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }
    byteArrays.push(new Uint8Array(byteNumbers))
  }
  
  return new Blob(byteArrays, { type: mimeType })
}

/**
 * Dosya adı oluştur (benzersiz)
 * 
 * Örnek: "vehicle_1717325432123_abc123.jpg"
 */
const generateFileName = (extension = 'jpg', prefix = 'photo') => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}.${extension}`
}

/**
 * MIME type'tan extension çıkar
 * 
 * "image/jpeg" → "jpg"
 * "image/png"  → "png"
 */
const getExtensionFromMime = (mimeType) => {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return map[mimeType] || 'jpg'
}

/**
 * Base64 string'den fotoğrafı Storage'a yükle, public URL döndür
 * 
 * @param {string} base64String - "data:image/jpeg;base64,..." formatlı string
 * @param {string} userId - Kullanıcı UUID (klasör adı için)
 * @param {string} bucket - 'vehicle-photos' | 'maintenance-photos'
 * @param {string} prefix - Dosya adı prefix'i ('vehicle' | 'maintenance')
 * @returns {Promise<string|null>} Public URL veya hata durumunda null
 */
export const uploadPhotoFromBase64 = async (base64String, userId, bucket, prefix = 'photo') => {
  try {
    // 1. Eğer zaten URL ise (data: ile başlamıyorsa) direkt döndür
    if (!base64String || !base64String.startsWith('data:')) {
      return base64String
    }
    
    // 2. Base64 → Blob
    const blob = base64ToBlob(base64String)
    
    // 3. Dosya adı oluştur (kullanıcı klasörü altında)
    const extension = getExtensionFromMime(blob.type)
    const fileName = generateFileName(extension, prefix)
    const filePath = `${userId}/${fileName}`
    
    // 4. Storage'a yükle
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: false,
      })
    
    if (error) throw error
    
    // 5. Public URL al
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)
    
    return urlData.publicUrl
  } catch (error) {
    console.error('uploadPhotoFromBase64 error:', error)
    return null
  }
}

/**
 * File input'tan gelen File objesini Storage'a yükle
 * 
 * @param {File} file - HTML File API objesi
 * @param {string} userId - Kullanıcı UUID
 * @param {string} bucket - Bucket adı
 * @param {string} prefix - Dosya adı prefix'i
 * @returns {Promise<string|null>} Public URL veya null
 */
export const uploadPhotoFromFile = async (file, userId, bucket, prefix = 'photo') => {
  try {
    if (!file) return null
    
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = generateFileName(extension, prefix)
    const filePath = `${userId}/${fileName}`
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })
    
    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)
    
    return urlData.publicUrl
  } catch (error) {
    console.error('uploadPhotoFromFile error:', error)
    return null
  }
}

/**
 * Birden fazla base64 string'i toplu yükle, URL listesi döndür
 * 
 * Bazıları başarısız olursa null döner ve filtrelenir.
 * 
 * @param {string[]} base64Array - Base64 string'ler
 * @param {string} userId - Kullanıcı UUID
 * @param {string} bucket - Bucket adı
 * @param {string} prefix - Dosya adı prefix'i
 * @returns {Promise<string[]>} URL listesi
 */
export const uploadPhotosBatch = async (base64Array, userId, bucket, prefix = 'photo') => {
  if (!base64Array || base64Array.length === 0) return []
  
  const uploadPromises = base64Array.map(b64 => 
    uploadPhotoFromBase64(b64, userId, bucket, prefix)
  )
  
  const results = await Promise.all(uploadPromises)
  
  // null olanları filtrele (başarısız upload'lar)
  return results.filter(url => url !== null)
}

/**
 * URL'den dosya path'ini çıkar (Storage'dan silmek için)
 * 
 * URL: https://xxx.supabase.co/storage/v1/object/public/vehicle-photos/user-id/file.jpg
 * Path: user-id/file.jpg
 */
const extractPathFromUrl = (url, bucket) => {
  if (!url || typeof url !== 'string') return null
  
  // Public URL formatı: .../storage/v1/object/public/{bucket}/{path}
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = url.indexOf(marker)
  
  if (index === -1) return null
  
  return url.substring(index + marker.length)
}

/**
 * Public URL'den fotoğrafı Storage'dan sil
 * 
 * @param {string} url - Public URL
 * @param {string} bucket - Bucket adı
 * @returns {Promise<boolean>} Başarı durumu
 */
export const deletePhotoByUrl = async (url, bucket) => {
  try {
    if (!url) return true
    
    // Eğer base64 ise Storage'a hiç yüklenmedi, silmeye gerek yok
    if (url.startsWith('data:')) return true
    
    const path = extractPathFromUrl(url, bucket)
    if (!path) {
      console.warn('Path çıkarılamadı:', url)
      return false
    }
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw error
    
    return true
  } catch (error) {
    console.error('deletePhotoByUrl error:', error)
    return false
  }
}

/**
 * Birden fazla URL'i toplu sil
 * 
 * @param {string[]} urls - Public URL'ler
 * @param {string} bucket - Bucket adı
 * @returns {Promise<number>} Silinen dosya sayısı
 */
export const deletePhotosBatch = async (urls, bucket) => {
  if (!urls || urls.length === 0) return 0
  
  // Sadece gerçek storage URL'lerini filtrele (base64'leri atla)
  const paths = urls
    .filter(url => url && !url.startsWith('data:'))
    .map(url => extractPathFromUrl(url, bucket))
    .filter(path => path !== null)
  
  if (paths.length === 0) return 0
  
  try {
    const { error, data } = await supabase.storage
      .from(bucket)
      .remove(paths)
    
    if (error) throw error
    
    return data?.length || 0
  } catch (error) {
    console.error('deletePhotosBatch error:', error)
    return 0
  }
}

/**
 * URL'in geçerli bir Storage URL'i olup olmadığını kontrol et
 */
export const isStorageUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  return url.includes('/storage/v1/object/public/')
}

/**
 * URL'in base64 olup olmadığını kontrol et
 */
export const isBase64 = (url) => {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('data:')
}