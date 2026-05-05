import { useState, useRef } from 'react'
import { Upload, X, Star, Move, AlertCircle, ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { compressMultipleImages, MAX_VEHICLE_PHOTOS, getImageSize } from '../utils/imageHelpers'

export default function MultiImageUploader({ photos = [], onChange, maxPhotos = MAX_VEHICLE_PHOTOS }) {
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState(null)

  const remainingSlots = maxPhotos - photos.length
  const canAddMore = remainingSlots > 0

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Sadece resim dosyaları
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      toast.error('Lütfen geçerli görsel dosyaları seç')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Sınır kontrolü
    if (imageFiles.length > remainingSlots) {
      toast.error(`En fazla ${remainingSlots} fotoğraf daha ekleyebilirsin`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsUploading(true)
    const loadingToast = toast.loading(`${imageFiles.length} fotoğraf işleniyor...`)

    try {
      const results = await compressMultipleImages(imageFiles)

      const successful = results.filter(r => r.success).map(r => r.data)
      const failed = results.filter(r => !r.success)

      if (successful.length > 0) {
        onChange([...photos, ...successful])
      }

      toast.dismiss(loadingToast)

      if (failed.length === 0) {
        toast.success(`${successful.length} fotoğraf eklendi 📸`)
      } else if (successful.length > 0) {
        toast.success(`${successful.length} eklendi, ${failed.length} başarısız`)
      } else {
        toast.error('Hiçbir fotoğraf yüklenemedi')
      }
    } catch (err) {
      toast.dismiss(loadingToast)
      toast.error('Fotoğraf işleme hatası: ' + err.message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    onChange(newPhotos)
  }

  const handleSetAsMain = (index) => {
    if (index === 0) return
    // Seçileni başa al
    const newPhotos = [...photos]
    const [selected] = newPhotos.splice(index, 1)
    newPhotos.unshift(selected)
    onChange(newPhotos)
    toast.success('Ana fotoğraf değişti')
  }

  // Drag & drop sıralama
  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newPhotos = [...photos]
    const [moved] = newPhotos.splice(draggedIndex, 1)
    newPhotos.splice(index, 0, moved)
    setDraggedIndex(index)
    onChange(newPhotos)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const totalSize = photos.reduce((sum, p) => sum + getImageSize(p), 0)

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Bilgi başlığı */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-400">
          {photos.length} / {maxPhotos} fotoğraf
          {totalSize > 0 && ` • ${(totalSize / 1024).toFixed(2)} MB`}
        </div>
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition disabled:opacity-50"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            {photos.length === 0 ? 'Fotoğraf Ekle' : 'Daha Ekle'}
          </button>
        )}
      </div>

      {/* Boş durum */}
      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl p-8 text-center transition cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <div className="text-sm font-semibold text-slate-300 mb-1">
            Fotoğraf yüklemek için tıkla
          </div>
          <div className="text-xs text-slate-500">
            JPG, PNG, WEBP — max {maxPhotos} fotoğraf
          </div>
          <div className="text-[10px] text-slate-600 mt-2">
            Görseller otomatik sıkıştırılır (~1MB altına)
          </div>
        </button>
      ) : (
        <>
          {/* Galeri grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {photos.map((photo, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition cursor-move ${
                  draggedIndex === index
                    ? 'border-blue-500 opacity-50'
                    : index === 0
                    ? 'border-yellow-500/50'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <img
                  src={photo}
                  alt={`Fotoğraf ${index + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* Ana fotoğraf rozeti */}
                {index === 0 && (
                  <div className="absolute top-1 left-1 bg-yellow-500/90 text-yellow-950 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    ANA
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  {index !== 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSetAsMain(index)
                      }}
                      className="p-1.5 bg-yellow-500/90 hover:bg-yellow-500 text-yellow-950 rounded-md transition"
                      title="Ana fotoğraf yap"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(index)
                    }}
                    className="p-1.5 bg-red-500/90 hover:bg-red-500 text-white rounded-md transition"
                    title="Sil"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Drag indicator (sol üst köşe) */}
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono opacity-0 group-hover:opacity-100">
                  {index + 1}
                </div>
              </div>
            ))}

            {/* Daha ekle butonu */}
            {canAddMore && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="aspect-square border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg flex flex-col items-center justify-center transition disabled:opacity-50 group"
              >
                <Upload className="w-6 h-6 text-slate-500 group-hover:text-blue-400 transition mb-1" />
                <span className="text-[10px] text-slate-500 group-hover:text-blue-400 transition">
                  Ekle
                </span>
              </button>
            )}
          </div>

          {/* İpucu */}
          <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-500">
            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-400">İpucu:</strong> Yıldız ⭐ ikonu ile ana fotoğrafı değiştir, sürükleyerek sıralayabilirsin. İlk fotoğraf araç kartında görünür.
            </div>
          </div>
        </>
      )}
    </div>
  )
}