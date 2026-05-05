import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'
import { usePWA } from '../hooks/usePWA'

const DISMISSED_KEY = 'garajim_pwa_prompt_dismissed'
const DISMISS_DURATION_DAYS = 7 // 7 gün sonra tekrar sorar

export default function PWAInstallPrompt() {
  const { canInstall, install } = usePWA()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!canInstall) return

    // Dismiss edildi mi kontrol et
    const dismissedAt = localStorage.getItem(DISMISSED_KEY)
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24)
      if (days < DISMISS_DURATION_DAYS) return
    }

    // 3 saniye bekle, kullanıcı rahatladıktan sonra göster
    const timer = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(timer)
  }, [canInstall])

  const handleInstall = async () => {
    const installed = await install()
    if (installed) {
      setShow(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
    setShow(false)
  }

  if (!canInstall) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl overflow-hidden border border-blue-500/50">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-base mb-1">
                    Garajım'ı Uygulamaya Dönüştür
                  </h3>
                  <p className="text-xs text-blue-100 leading-relaxed">
                    Ana ekranına ekle, native uygulama gibi kullan. Çevrimdışı da çalışır.
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white transition shrink-0"
                  title="Kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-600 hover:bg-blue-50 px-4 py-2.5 rounded-lg font-semibold text-sm transition"
                >
                  <Download className="w-4 h-4" />
                  Yükle
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold text-sm transition"
                >
                  Daha Sonra
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}