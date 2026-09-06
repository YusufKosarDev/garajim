import { useState, useEffect } from 'react'

/** Tarayıcıya özgü, standart lib.dom'da tanımlı olmayan olay */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const usePWA = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  // Install prompt yakalama
  useEffect(() => {
    // Zaten yüklü mü?
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari'nin standart dışı alanı
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    setIsInstalled(isStandalone)

    // Install promptu yakala
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    // Yüklendikten sonra tetiklenir
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Online/offline durumu
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Service Worker güncellemesi
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true)
      })
    }
  }, [])

  // Install fonksiyonu
  const install = async () => {
    if (!installPrompt) return false
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      return true
    }
    return false
  }

  // Sayfayı yenile (update için)
  const reload = () => {
    window.location.reload()
  }

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    isOnline,
    updateAvailable,
    install,
    reload,
  }
}