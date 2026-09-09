import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

/**
 * Uygulamanın erişim kapısı ve hiç testi yoktu.
 *
 * Üç davranışı birlikte tutmak gerekiyor: yükleme sırasında içeriği SIZDIRMAMAK
 * (aksi halde korumalı veri bir an görünür), oturumsuz kullanıcıyı login'e
 * yönlendirmek ve gitmek istediği adresi `state.from` içinde SAKLAMAK — Login
 * sayfası girişten sonra oraya geri döndürüyor, o alan kaybolursa kullanıcı her
 * zaman panoya düşer.
 */

const authDurumu = { isAuthenticated: false, loading: false }
vi.mock('../context/auth-context', () => ({
  useAuth: () => authDurumu,
}))

const konumState = vi.fn()

const ac = (baslangicYolu = '/vehicles') =>
  render(
    <MemoryRouter initialEntries={[baslangicYolu]}>
      <Routes>
        <Route
          path="/login"
          element={<LoginCasusu />}
        />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <div>Korumalı içerik</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )

// Yönlendirmenin taşıdığı state'i yakalamak için sahte login sayfası
function LoginCasusu() {
  const location = useLocation()
  konumState(location.state)
  return <div>Giriş sayfası</div>
}

beforeEach(() => {
  authDurumu.isAuthenticated = false
  authDurumu.loading = false
  konumState.mockClear()
})

describe('ProtectedRoute', () => {
  it('yükleme sırasında korumalı içeriği göstermez', () => {
    authDurumu.loading = true
    ac()
    expect(screen.queryByText('Korumalı içerik')).not.toBeInTheDocument()
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument()
  })

  it('yükleme sırasında login e de yönlendirmez', () => {
    // Önemli: loading iken !isAuthenticated de doğru olur. Sıra yanlış olsaydı
    // her sayfa yenilemesinde kullanıcı bir an login e atılırdı.
    authDurumu.loading = true
    ac()
    expect(screen.queryByText('Giriş sayfası')).not.toBeInTheDocument()
  })

  it('oturum yoksa login e yönlendirir', () => {
    ac()
    expect(screen.getByText('Giriş sayfası')).toBeInTheDocument()
    expect(screen.queryByText('Korumalı içerik')).not.toBeInTheDocument()
  })

  it('gitmek istediği adresi state.from içinde saklar', () => {
    ac('/statistics')
    expect(konumState).toHaveBeenCalled()
    const state = konumState.mock.calls.at(-1)[0]
    expect(state?.from?.pathname).toBe('/statistics')
  })

  it('oturum varsa içeriği gösterir', () => {
    authDurumu.isAuthenticated = true
    ac()
    expect(screen.getByText('Korumalı içerik')).toBeInTheDocument()
    expect(screen.queryByText('Giriş sayfası')).not.toBeInTheDocument()
  })
})
