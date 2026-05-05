import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'

export default function Lightbox({ isOpen, onClose, photos = [], initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const containerRef = useRef(null)
  const touchStartX = useRef(null)

  // Modal açılınca initial index'e git
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
    }
  }, [isOpen, initialIndex])

  // Body scroll lock (Modal sistemimizle uyumlu)
  useEffect(() => {
    if (!isOpen) return

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const previousOverflow = document.body.style.overflow
    const previousPadding = document.body.style.paddingRight

    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPadding
    }
  }, [isOpen])

  // Klavye kontrolleri
  useEffect(() => {
    if (!isOpen) return

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, currentIndex, photos.length])

  const goToPrev = () => {
    if (photos.length <= 1) return
    setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length)
  }

  const goToNext = () => {
    if (photos.length <= 1) return
    setCurrentIndex(prev => (prev + 1) % photos.length)
  }

  // Touch gestures (mobil swipe)
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX

    // 50px threshold
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext()
      } else {
        goToPrev()
      }
    }
    touchStartX.current = null
  }

  // Backdrop tıklama
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Fotoğraf indirme
  const handleDownload = () => {
    const photo = photos[currentIndex]
    if (!photo) return

    const link = document.createElement('a')
    link.href = photo
    link.download = `garajim-foto-${currentIndex + 1}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen || photos.length === 0) return null

  const currentPhoto = photos[currentIndex]

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex flex-col"
          onClick={handleBackdropClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Üst bar */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <div className="text-white text-sm font-semibold">
              {currentIndex + 1} / {photos.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition"
                title="İndir"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition"
                title="Kapat (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sol ok */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrev()
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-3 bg-black/40 hover:bg-black/70 rounded-full text-white/80 hover:text-white transition backdrop-blur-sm"
              title="Önceki (←)"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          {/* Sağ ok */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-3 bg-black/40 hover:bg-black/70 rounded-full text-white/80 hover:text-white transition backdrop-blur-sm"
              title="Sonraki (→)"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          {/* Ana fotoğraf */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-12 pt-16 pb-24">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentIndex}
                src={currentPhoto}
                alt={`Fotoğraf ${currentIndex + 1}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            </AnimatePresence>
          </div>

          {/* Alt thumbnail bar */}
          {photos.length > 1 && (
            <div
              className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-2 justify-center overflow-x-auto pb-1">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition ${
                      index === currentIndex
                        ? 'border-blue-500 opacity-100 scale-105'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kullanım ipucu */}
          {photos.length > 1 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[10px] text-white/40 hidden sm:block">
              <span className="px-2 py-1 bg-black/40 rounded">←→ ile gezin • ESC ile kapat</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}