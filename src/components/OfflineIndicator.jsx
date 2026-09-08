import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { WifiOff, Wifi, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePWA } from '../hooks/usePWA'
import { useVehicles } from '../context/vehicle-context'

export default function OfflineIndicator() {
  const { t } = useTranslation()

  const { isOnline } = usePWA()
  const { pendingCount } = useVehicles()
  const [showReconnected, setShowReconnected] = useState(false)
  // Uygulama çevrimdışı açıldıysa da bağlantı dönünce rozet görünsün
  const [wasOffline, setWasOffline] = useState(!isOnline)

  // Çevrimiçi/çevrimdışı GEÇİŞİNİ render sırasında yakala. Eskiden bu bir
  // efektin gövdesindeydi ve `wasOffline` kendi bağımlılığıydı — her geçiş
  // fazladan bir render turu tetikliyordu.
  const [prevOnline, setPrevOnline] = useState(isOnline)
  if (isOnline !== prevOnline) {
    setPrevOnline(isOnline)
    if (!isOnline) {
      setWasOffline(true)
    } else if (wasOffline) {
      setShowReconnected(true)
    }
  }

  // "Bağlantı geri geldi" rozetini 3 saniye sonra gizle.
  // Zamanlayıcı gerçek bir yan etki, efektte kalması doğru.
  useEffect(() => {
    if (!showReconnected) return
    const timer = setTimeout(() => {
      setShowReconnected(false)
      setWasOffline(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [showReconnected])

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
            <span>{t('offlineIndicator.cevrimdisisin_kayitlarin_siraya_alinip_baglanti_')}</span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-yellow-700/60 px-2 py-0.5 rounded-full text-xs">
                <Clock className="w-3 h-3" />
                {pendingCount} bekliyor
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
            <span>{t('offlineIndicator.baglanti_geri_geldi')}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}