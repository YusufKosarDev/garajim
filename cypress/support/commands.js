/// <reference types="cypress" />

// ============================================================================
// CUSTOM CYPRESS COMMANDS
// ============================================================================
//
// Custom command'lar tüm test'lerde kullanılır.
// Yazımı: cy.commandName()
//
// Örnek: cy.login() → demo hesapla giriş yap
// ============================================================================

/**
 * Demo hesapla giriş yap.
 * Login flow'unu kısaltır — her test başında 1 satır.
 *
 * @example
 *   beforeEach(() => {
 *     cy.login()
 *   })
 */
Cypress.Commands.add('login', (email, password) => {
  // Default değerler — environment variable veya parametre
  const userEmail = email || Cypress.env('DEMO_EMAIL') || 'demo@garajim.com'
  const userPassword = password || Cypress.env('DEMO_PASSWORD') || 'Demo1234!'

  cy.session(
    [userEmail, userPassword],
    () => {
      cy.visit('/login')
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').type(userEmail)
      cy.get('input[type="password"]').type(userPassword)
      cy.get('button[type="submit"]').click()

      // Başarılı login → / (Dashboard) yönlendirir
      cy.url({ timeout: 15000 }).should((url) => {
        expect(url).to.match(/\/(?:$|vehicles|dashboard)/)
      })
    },
    {
      validate: () => {
        // Session hâlâ geçerli mi kontrol
        cy.window().its('localStorage').then((ls) => {
          const hasSupabaseSession = Object.keys(ls).some((key) =>
            key.startsWith('sb-') && key.endsWith('-auth-token')
          )
          if (!hasSupabaseSession) {
            throw new Error('Supabase session yok')
          }
        })
      },
    }
  )
})

/**
 * Çıkış yap (oturumu kapat).
 *
 * @example
 *   cy.logout()
 */
Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    // localStorage'dan Supabase session'ı temizle
    Object.keys(win.localStorage).forEach((key) => {
      if (key.startsWith('sb-')) {
        win.localStorage.removeItem(key)
      }
    })
  })
  cy.clearCookies()
  Cypress.session.clearAllSavedSessions()
})

/**
 * Sayfanın yüklenmesini bekle (Dashboard hazır mı).
 * Real-time + Supabase async işlemleri için bekleme.
 *
 * @example
 *   cy.login()
 *   cy.waitForApp()
 */
Cypress.Commands.add('waitForApp', () => {
  // Dashboard ana içeriği görünür mü?
  cy.get('body', { timeout: 15000 }).should('be.visible')

  // Loading spinner varsa kaybolsun
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="loading"]').length > 0) {
      cy.get('[data-testid="loading"]').should('not.exist')
    }
  })

  // Hata toast'ı yoksa devam
  cy.wait(500) // Kısa stabilizasyon
})

/**
 * Toast mesajı kontrol et.
 * react-hot-toast ile gösterilen mesajları kontrol için.
 *
 * @example
 *   cy.checkToast('Hoş geldin')
 *   cy.checkToast('hata', 'error')
 */
Cypress.Commands.add('checkToast', (message, type = 'success') => {
  // react-hot-toast renderer DOM'a ekleniyor
  cy.contains(message, { timeout: 8000 }).should('be.visible')
})