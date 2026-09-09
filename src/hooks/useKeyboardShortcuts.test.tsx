import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

/**
 * Klavye kısayolları hiç test edilmemişti (src/hooks kapsamı %0'dı) ve
 * içinde GERÇEK bir hata duruyordu: `enabled` seçeneği arayüzde tanımlı,
 * App.jsx onu `!isMinimalLayout` olarak geçiyor, ama hook hiç okumuyordu.
 * Yani giriş, kayıt ve paylaşım sayfalarında da kısayollar dinleniyordu —
 * paylaşılan bir raporu açan ziyaretçi "g d" yazınca korumalı bir rotaya
 * yönlendirilip login'e atılıyordu.
 */

const navigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

const sar = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

const bas = (key: string, opts: Partial<KeyboardEventInit> = {}) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }))
}

const kur = (options = {}) => {
  const cb = {
    onShowHelp: vi.fn(),
    onShowCommandPalette: vi.fn(),
    onNewVehicle: vi.fn(),
    onNewMaintenance: vi.fn(),
    onNewFuel: vi.fn(),
    onFocusSearch: vi.fn(),
  }
  const view = renderHook(() => useKeyboardShortcuts({ ...cb, ...options }), { wrapper: sar })
  return { ...cb, view }
}

beforeEach(() => {
  navigate.mockClear()
  document.body.style.overflow = ''
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useKeyboardShortcuts — tek tuşlu kısayollar', () => {
  it('? yardım panelini açar', () => {
    const { onShowHelp } = kur()
    bas('?')
    expect(onShowHelp).toHaveBeenCalledTimes(1)
  })

  it('/ arama alanına odaklanır', () => {
    const { onFocusSearch } = kur()
    bas('/')
    expect(onFocusSearch).toHaveBeenCalledTimes(1)
  })

  it('Ctrl+K komut paletini açar', () => {
    const { onShowCommandPalette } = kur()
    bas('k', { ctrlKey: true })
    expect(onShowCommandPalette).toHaveBeenCalledTimes(1)
  })

  it('Cmd+K de çalışır', () => {
    const { onShowCommandPalette } = kur()
    bas('k', { metaKey: true })
    expect(onShowCommandPalette).toHaveBeenCalledTimes(1)
  })
})

describe('useKeyboardShortcuts — iki tuşlu diziler', () => {
  it('g sonra d panoya gider', () => {
    kur()
    bas('g')
    bas('d')
    expect(navigate).toHaveBeenCalledWith('/')
  })

  it('g sonra v araçlara gider', () => {
    kur()
    bas('g')
    bas('v')
    expect(navigate).toHaveBeenCalledWith('/vehicles')
  })

  it('n sonra v yeni araç formunu açar', () => {
    const { onNewVehicle } = kur()
    bas('n')
    bas('v')
    expect(onNewVehicle).toHaveBeenCalledTimes(1)
  })

  it('n sonra f yeni yakıt formunu açar', () => {
    const { onNewFuel } = kur()
    bas('n')
    bas('f')
    expect(onNewFuel).toHaveBeenCalledTimes(1)
  })

  it('dizi zaman aşımına uğrarsa ikinci tuş tek başına yorumlanır', () => {
    vi.useFakeTimers()
    const { onFocusSearch } = kur()
    bas('g')
    vi.advanceTimersByTime(1500) // SEQUENCE_TIMEOUT 1000 ms
    bas('/')
    expect(navigate).not.toHaveBeenCalled()
    expect(onFocusSearch).toHaveBeenCalledTimes(1)
  })

  it('tanımsız ikinci tuş hiçbir şey yapmaz', () => {
    kur()
    bas('g')
    bas('z')
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('useKeyboardShortcuts — bastırma koşulları', () => {
  it('input içinde yazarken kısayollar çalışmaz', () => {
    const { onShowHelp } = kur()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    bas('?')
    expect(onShowHelp).not.toHaveBeenCalled()
  })

  it('input içinde bile Ctrl+K çalışır — bilinçli istisna', () => {
    const { onShowCommandPalette } = kur()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    bas('k', { ctrlKey: true })
    expect(onShowCommandPalette).toHaveBeenCalledTimes(1)
  })

  it('modal açıkken tek tuşlu kısayollar çalışmaz', () => {
    const { onShowHelp } = kur()
    document.body.style.overflow = 'hidden' // Modal'ın işareti
    bas('?')
    expect(onShowHelp).not.toHaveBeenCalled()
  })

  it('modal açıkken dizi de başlamaz', () => {
    kur()
    document.body.style.overflow = 'hidden'
    bas('g')
    bas('d')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('enabled: false ise HİÇBİR kısayol çalışmaz', () => {
    // Regresyon testi: bu seçenek arayüzde vardı, App.jsx geçiyordu, ama hook
    // okumuyordu. Giriş/kayıt/paylaşım sayfalarında kısayollar aktifti.
    const { onShowHelp, onShowCommandPalette } = kur({ enabled: false })
    bas('?')
    bas('k', { ctrlKey: true })
    bas('g')
    bas('d')
    expect(onShowHelp).not.toHaveBeenCalled()
    expect(onShowCommandPalette).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('enabled varsayılan olarak true — geçilmezse kısayollar çalışır', () => {
    const { onShowHelp } = kur()
    bas('?')
    expect(onShowHelp).toHaveBeenCalledTimes(1)
  })

  it('hook söküldüğünde dinleyici kaldırılır', () => {
    const { onShowHelp, view } = kur()
    view.unmount()
    bas('?')
    expect(onShowHelp).not.toHaveBeenCalled()
  })
})
