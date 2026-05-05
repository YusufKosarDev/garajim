import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

// Global modal stack — kaç modal açık takip eder
let modalStack = []

const addToStack = (id) => {
  modalStack.push(id)
  if (modalStack.length === 1) {
    // İlk modal açıldı → body scroll'u kilitle
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }
}

const removeFromStack = (id) => {
  modalStack = modalStack.filter(modalId => modalId !== id)
  if (modalStack.length === 0) {
    // Son modal da kapandı → scroll'u geri aç
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  }
}

const isTopModal = (id) => {
  return modalStack[modalStack.length - 1] === id
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  closeOnBackdrop = true,
  closeOnEsc = true,
}) {
  const modalIdRef = useRef(`modal-${Date.now()}-${Math.random()}`)
  const modalRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Modal açıldığında stack'e ekle, kapandığında çıkar
  useEffect(() => {
    const modalId = modalIdRef.current

    if (isOpen) {
      addToStack(modalId)
      // Açılmadan önceki focus elementini kaydet
      previousFocusRef.current = document.activeElement

      return () => {
        removeFromStack(modalId)
        // Modal kapandığında önceki focus'a geri dön (ama component unmount'ta değil)
        if (previousFocusRef.current instanceof HTMLElement) {
          setTimeout(() => {
            previousFocusRef.current?.focus()
          }, 100)
        }
      }
    }
  }, [isOpen])

  // ESC tuşu — sadece en üstteki modal tepki versin
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return

    const handleEsc = (e) => {
      if (e.key === 'Escape' && isTopModal(modalIdRef.current)) {
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, closeOnEsc, onClose])

  // Focus trap — Tab tuşu modal içinde dolaşsın
  useEffect(() => {
    if (!isOpen) return

    const handleTab = (e) => {
      if (e.key !== 'Tab') return
      if (!modalRef.current) return
      if (!isTopModal(modalIdRef.current)) return

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const focusable = Array.from(focusableElements).filter(el => !el.disabled && el.offsetParent !== null)

      if (focusable.length === 0) return

      const firstElement = focusable[0]
      const lastElement = focusable[focusable.length - 1]

      if (e.shiftKey) {
        // Shift + Tab: ilk elemandaysan sona atla
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: son elemandaysan başa atla
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    window.addEventListener('keydown', handleTab)
    return () => window.removeEventListener('keydown', handleTab)
  }, [isOpen])

  // Backdrop tıklama — sadece backdrop'a tıklanırsa kapansın (içerik değil)
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose()
    }
  }

  // Stack'teki sıraya göre z-index hesapla (her modal 10 artar)
  const zIndexBase = 50 + (modalStack.indexOf(modalIdRef.current) * 10)

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ zIndex: zIndexBase }}
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`bg-slate-900 border border-slate-800 rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
          >
            {title && (
              <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                <h2 id="modal-title" className="text-lg font-bold">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                  aria-label="Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}