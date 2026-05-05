import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIconLucide, Maximize2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { compressImage, getImageSize } from '../utils/imageHelpers'
import Lightbox from './Lightbox'

export default function SingleImageUploader({
  photo,
  onChange,
  label = 'Fotoğraf',
  hint = 'Fatura, fiş veya parça fotoğrafı',
  maxSizeMB = 1,
}) {
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir görsel dosyası seç')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsUploading(true)
    const loadingToast = toast.loading('Fotoğraf işleniyor...')

    try {
      const compressed = await compressImage(file)
      onChange(compressed)
      toast.dismiss(loadingToast)
      toast.success('Fotoğraf eklendi 📸')
    } catch (err) {
      toast.dismiss(loadingToast)
      toast.error(err.message || 'Fotoğraf yüklenemedi')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onChange(null)
  }

  const handleOpenLightbox = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setLightboxOpen(true)
  }

  const sizeKB = photo ? getImageSize(photo) : 0

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {photo ? (
        // Fotoğraf var — preview + buton
        <div className="relative group">
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            <button
              type="button"
              onClick={handleOpenLightbox}
              className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-700 hover:border-blue-500/50 transition cursor-zoom-in shrink-0 group/thumb"
              title="Büyüt"
            >
              <img
                src={photo}
                alt="Fatura"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/40 transition flex items-center justify-center">
                <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover/thumb:opacity-100 transition" />
              </div>
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">
                Fatura fotoğrafı eklendi
              </div>
              <div className="text-xs text-slate-400">
                {sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`}
              </div>
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition"
                >
                  Değiştir
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="text-[11px] text-red-400 hover:text-red-300 transition"
                >
                  Kaldır
                </button>
              </div>
            </div>
          </div>

          <Lightbox
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            photos={[photo]}
            initialIndex={0}
          />
        </div>
      ) : (
        // Fotoğraf yok — yükleme butonu
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg p-4 text-center transition cursor-pointer disabled:opacity-50 group"
        >
          <ImageIconLucide className="w-6 h-6 text-slate-500 group-hover:text-blue-400 transition mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-300 mb-0.5">
            {label} ekle
          </div>
          <div className="text-xs text-slate-500">
            {hint} • Maksimum {maxSizeMB} MB
          </div>
        </button>
      )}
    </div>
  )
}