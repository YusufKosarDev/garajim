import { useState } from 'react'
import { ImageIcon, Maximize2 } from 'lucide-react'
import Lightbox from './Lightbox'

export default function PhotoGallery({ photos = [], emptyMessage = 'Henüz fotoğraf yok' }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [initialIndex, setInitialIndex] = useState(0)

  const openLightbox = (index) => {
    setInitialIndex(index)
    setLightboxOpen(true)
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
        <ImageIcon className="w-10 h-10 text-slate-700 mb-2" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <button
            key={index}
            onClick={() => openLightbox(index)}
            className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 group cursor-zoom-in border border-slate-800 hover:border-blue-500/50 transition"
          >
            <img
              src={photo}
              alt={`Araç fotoğrafı ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
              <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
            </div>

            {/* Sayı rozeti */}
            <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-mono opacity-70 group-hover:opacity-100 transition">
              {index + 1} / {photos.length}
            </div>
          </button>
        ))}
      </div>

      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={photos}
        initialIndex={initialIndex}
      />
    </>
  )
}