import { useState, useRef, useCallback } from 'react'
import { hapticMedium } from '../utils/hapticFeedback'

const PULL_THRESHOLD = 80 // Tetikleme eşiği (px)
const MAX_PULL = 120 // Maksimum çekme mesafesi
const RESISTANCE = 0.5 // Direnç (gerçek çekmeden ne kadar az gidecek)

export function usePullToRefresh({ onRefresh, enabled = true } = {}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const startY = useRef(0)
  const isDragging = useRef(false)
  const hasTriggered = useRef(false)

  const handleTouchStart = useCallback((e) => {
    if (!enabled || isRefreshing) return

    // Sadece sayfanın en üstündeyken çalışsın
    if (window.scrollY > 0) return

    const touch = e.touches[0]
    startY.current = touch.clientY
    isDragging.current = true
    hasTriggered.current = false
  }, [enabled, isRefreshing])

  const handleTouchMove = useCallback((e) => {
    if (!enabled || !isDragging.current || isRefreshing) return
    if (window.scrollY > 0) {
      isDragging.current = false
      return
    }

    const touch = e.touches[0]
    const deltaY = touch.clientY - startY.current

    // Sadece aşağı çekme
    if (deltaY <= 0) {
      setPullDistance(0)
      setIsPulling(false)
      return
    }

    // Direnç uygula
    const distance = Math.min(deltaY * RESISTANCE, MAX_PULL)
    setPullDistance(distance)
    setIsPulling(true)

    // Threshold geçince haptic feedback (sadece bir kez)
    if (distance >= PULL_THRESHOLD && !hasTriggered.current) {
      hasTriggered.current = true
      hapticMedium()
    }
    if (distance < PULL_THRESHOLD) {
      hasTriggered.current = false
    }

    // Sayfa scroll'u engelle
    if (e.cancelable && distance > 5) {
      e.preventDefault()
    }
  }, [enabled, isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !isDragging.current) return

    isDragging.current = false
    setIsPulling(false)

    // Threshold aşıldıysa refresh tetikle
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(60) // Loading konumuna sabitlen

      try {
        if (onRefresh) await onRefresh()
      } catch (err) {
        console.error('Refresh error:', err)
      }

      // Min 600ms göster (UX için)
      setTimeout(() => {
        setIsRefreshing(false)
        setPullDistance(0)
      }, 600)
    } else {
      // Threshold aşılmadı, geri toparla
      setPullDistance(0)
    }
  }, [enabled, pullDistance, isRefreshing, onRefresh])

  return {
    pullDistance,
    isPulling,
    isRefreshing,
    threshold: PULL_THRESHOLD,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}