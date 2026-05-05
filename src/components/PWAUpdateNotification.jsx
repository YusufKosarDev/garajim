import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { usePWA } from '../hooks/usePWA'

export default function PWAUpdateNotification() {
  const { updateAvailable, reload } = usePWA()
  const [dismissed, setDismissed] = useState(false)

  if (!updateAvailable || dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-blue-600 rounded-2xl shadow-2xl overflow-hidden border border-blue-500">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm mb-1">
                  Yeni sürüm hazır 🎉
                </h3>
                <p className="text-xs text-blue-100 mb-3">
                  Güncellemek için sayfayı yenile.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={reload}
                    className="bg-white text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-semibold text-xs transition"
                  >
                    Şimdi Yenile
                  </button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-semibold text-xs transition"
                  >
                    Sonra
                  </button>
                </div>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-white/10 rounded text-white/70 transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}