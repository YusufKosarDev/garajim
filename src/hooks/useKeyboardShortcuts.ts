import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const isTypingInInput = () => {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    // isContentEditable HTMLElement'te tanımlı, Element'te değil
    (el instanceof HTMLElement && el.isContentEditable)
  )
}

const isModalOpen = () => {
  return document.body.style.overflow === 'hidden'
}

export interface ShortcutOptions {
  onShowHelp?: () => void
  onShowCommandPalette?: () => void
  onNewVehicle?: () => void
  onNewMaintenance?: () => void
  onNewFuel?: () => void
  onFocusSearch?: () => void
  enabled?: boolean
}

export const useKeyboardShortcuts = ({
  onShowHelp,
  onShowCommandPalette,
  onNewVehicle,
  onNewMaintenance,
  onNewFuel,
  onFocusSearch,
  enabled = true,
}: ShortcutOptions) => {
  const navigate = useNavigate()
  const sequenceRef = useRef<{ key: string | null; timestamp: number }>({ key: null, timestamp: 0 })

  useEffect(() => {
    // `enabled` arayüzde tanımlıydı ve App.jsx onu `!isMinimalLayout` olarak
    // GEÇİYORDU, ama hook hiç okumuyordu: kısayollar giriş, kayıt ve paylaşım
    // sayfalarında da dinleniyordu. Paylaşılan bir raporu açan ziyaretçi "g d"
    // yazdığında korumalı bir rotaya yönlendirilip login'e atılıyordu.
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // CMD+K / CTRL+K — Command Palette (input içinde bile çalışmalı, özel)
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault()
        onShowCommandPalette?.()
        return
      }

      // Input'ta ise diğer kısayollar devre dışı
      if (isTypingInInput()) return

      // Cmd/Ctrl/Alt kombinasyonlarını es geç
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const now = Date.now()
      const SEQUENCE_TIMEOUT = 1000
      const isSequenceActive = now - sequenceRef.current.timestamp < SEQUENCE_TIMEOUT

      // Tek tuşlu kısayollar (modal açıkken devre dışı)
      if (!isSequenceActive && !isModalOpen()) {
        switch (key) {
          case '?':
            e.preventDefault()
            onShowHelp?.()
            return

          case '/':
            e.preventDefault()
            onFocusSearch?.()
            return
        }
      }

      // İki tuşlu kısayollar — sequence başlatma
      if (!isSequenceActive && (key === 'g' || key === 'n')) {
        if (isModalOpen()) return
        sequenceRef.current = { key, timestamp: now }
        return
      }

      // İki tuşlu kısayollar — sequence tamamlama
      if (isSequenceActive) {
        const firstKey = sequenceRef.current.key

        if (firstKey === 'g') {
          e.preventDefault()
          sequenceRef.current = { key: null, timestamp: 0 }

          switch (key) {
            case 'd': navigate('/'); break
            case 'v': navigate('/vehicles'); break
            case 'c': navigate('/calendar'); break
            case 's': navigate('/statistics'); break
            case ',': navigate('/settings'); break
          }
          return
        }

        if (firstKey === 'n') {
          e.preventDefault()
          sequenceRef.current = { key: null, timestamp: 0 }

          switch (key) {
            case 'v': onNewVehicle?.(); break
            case 'm': onNewMaintenance?.(); break
            case 'f': onNewFuel?.(); break
          }
          return
        }

        sequenceRef.current = { key: null, timestamp: 0 }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, navigate, onShowHelp, onShowCommandPalette, onNewVehicle, onNewMaintenance, onNewFuel, onFocusSearch])
}