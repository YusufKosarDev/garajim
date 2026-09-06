import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePWA } from '../hooks/usePWA'
import { useVehicles } from '../context/VehicleContext'

export default function OfflineIndicator() {
  const { isOnline } = usePWA()
  const { bekleyenSayisi } = useVehicles()
  const [showReconnected, setShowReconnected] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
    } else if (wasOffline) {
      // Tekrar çevrimiçi olduğunda 3 saniye "bağlantı geri geldi" göster
      setShowReconnected(true)
      const timer = setTimeout(() => {
        setShowReconnected(false)
        setWasOffline(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  return (
    <AnimatePresence mode="wait">
      {!isOnline ? (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-50 bg-yellow-600/95 backdrop-blur-sm text-white px-4 py-2 text-center text-sm font-semibold shadow-lg"
        >
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 flex-wrap">
            <WifiOff className="w-4 h-4" />
            <span>Çevrimdışısın — kayıtların sıraya alınıp bağlantı gelince gönderilecek</span>
            {bekleyenSayisi > 0 && (
              <span className="inline-flex items-center gap-1 bg-yellow-700/60 px-2 py-0.5 rounded-full text-xs">
                <Clock className="w-3 h-3" />
                {bekleyenSayisi} bekliyor
              </span>
            )}
          </div>
        </motion.div>
      ) : showReconnected ? (
        <motion.div
          key="reconnected"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-50 bg-green-600/95 backdrop-blur-sm text-white px-4 py-2 text-center text-sm font-semibold shadow-lg"
        >
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-2">
            <Wifi className="w-4 h-4" />
            <span>Bağlantı geri geldi ✓</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}