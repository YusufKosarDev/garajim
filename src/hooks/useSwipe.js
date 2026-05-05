import { useState, useRef, useCallback } from 'react'

const SWIPE_THRESHOLD = 80 // Tetikleme eşiği (px)
const MAX_SWIPE = 160 // Maksimum kaydırma (px)
const VERTICAL_THRESHOLD = 15 // Bu kadar dikey hareket varsa swipe iptal (scroll niyetlidir)

export function useSwipe({ onSwipeLeft, onSwipeRight, enabled = true } = {}) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const startX = useRef(0)
  const startY = useRef(0)
  const currentX = useRef(0)
  const isHorizontal = useRef(null) // null = belirsiz, true = yatay swipe, false = dikey scroll

  const handleTouchStart = useCallback((e) => {
    if (!enabled) return
    const touch = e.touches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
    currentX.current = isOpen ? -MAX_SWIPE : 0
    isHorizontal.current = null
    setIsDragging(true)
  }, [enabled, isOpen])

  const handleTouchMove = useCallback((e) => {
    if (!enabled || !isDragging) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - startX.current
    const deltaY = touch.clientY - startY.current

    // Yön belirleme (ilk birkaç pikselde)
    if (isHorizontal.current === null) {
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        // Hareket yeterince başladı, yönü belirle
        if (Math.abs(deltaY) > VERTICAL_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
          // Dikey scroll niyetli — swipe iptal
          isHorizontal.current = false
          setIsDragging(false)
          setTranslateX(isOpen ? -MAX_SWIPE : 0)
          return
        }
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          isHorizontal.current = true
        }
      }
    }

    if (isHorizontal.current !== true) return

    // Sayfa scroll'u engelle (sadece yatay swipe sırasında)
    if (e.cancelable) e.preventDefault()

    // Yeni X konumu
    let newX = currentX.current + deltaX

    // Sınırla: -MAX_SWIPE ile 0 arası
    newX = Math.max(-MAX_SWIPE, Math.min(0, newX))

    setTranslateX(newX)
  }, [enabled, isDragging, isOpen])

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return
    setIsDragging(false)

    // Yatay swipe değildiyse hiçbir şey yapma
    if (isHorizontal.current !== true) {
      isHorizontal.current = null
      return
    }

    // Threshold kontrolü
    if (Math.abs(translateX) >= SWIPE_THRESHOLD) {
      // Eşik aşıldı — swipe tamamlandı
      if (translateX < 0) {
        // Sola swipe — aç
        setTranslateX(-MAX_SWIPE)
        setIsOpen(true)
        if (onSwipeLeft) onSwipeLeft()
      } else {
        // Sağa swipe — kapat
        setTranslateX(0)
        setIsOpen(false)
        if (onSwipeRight) onSwipeRight()
      }
    } else {
      // Eşik aşılmadı — eski duruma dön
      setTranslateX(isOpen ? -MAX_SWIPE : 0)
    }

    isHorizontal.current = null
  }, [enabled, translateX, isOpen, onSwipeLeft, onSwipeRight])

  // Manuel kapatma (örneğin başka bir kart açılınca)
  const close = useCallback(() => {
    setTranslateX(0)
    setIsOpen(false)
  }, [])

  // Manuel açma
  const open = useCallback(() => {
    setTranslateX(-MAX_SWIPE)
    setIsOpen(true)
  }, [])

  return {
    translateX,
    isDragging,
    isOpen,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    close,
    open,
    maxSwipe: MAX_SWIPE,
  }
}