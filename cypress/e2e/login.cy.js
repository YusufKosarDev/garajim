/// <reference types="cypress" />

/**
 * Login Flow E2E Tests
 *
 * Test edilenler:
 *   - Login sayfası UI
 *   - Geçerli credentials ile giriş
 *   - Yanlış şifre ile başarısız giriş
 *   - Authenticated user redirect
 */

describe('Login Flow', () => {
  // Her test öncesi: clean state (önceki session'ları temizle)
  beforeEach(() => {
    // Tüm Cypress session cache'ini temizle
    Cypress.session.clearAllSavedSessions()

    // localStorage temizle
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  // ==========================================================================
  // TEST 1: Login sayfası doğru render oluyor mu?
  // ==========================================================================
  it('Login sayfası doğru görünür', () => {
    cy.visit('/login')

    // URL doğru
    cy.url().should('include', '/login')

    // Garajım logosu/başlığı var
    cy.contains('Garajım').should('be.visible')

    // Email ve şifre input'ları var
    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('be.visible')

    // Submit butonu var
    cy.get('button[type="submit"]').should('be.visible')

    // "Şifremi Unuttum" linki var
    cy.contains(/şifre/i).should('be.visible')
  })

  // ==========================================================================
  // TEST 2: Geçerli credentials → Dashboard
  // ==========================================================================
  it('Geçerli credentials ile başarılı giriş yapar', () => {
    const email = Cypress.env('DEMO_EMAIL')
    const password = Cypress.env('DEMO_PASSWORD')

    cy.visit('/login')

    // Email + şifre gir
    cy.get('input[type="email"]').type(email)
    cy.get('input[type="password"]').type(password)

    // Submit
    cy.get('button[type="submit"]').click()

    // Dashboard'a yönlendirilmeli (URL: /)
    cy.url({ timeout: 15000 }).should('not.include', '/login')

    // Toast: "Hoş geldin" benzeri mesaj
    cy.contains(/hoş geldin|merhaba/i, { timeout: 8000 }).should('be.visible')

    // localStorage'da Supabase session var mı?
    cy.window().then((win) => {
      const keys = Object.keys(win.localStorage)
      const hasSession = keys.some((key) =>
        key.startsWith('sb-') && key.endsWith('-auth-token')
      )
      expect(hasSession).to.be.true
    })
  })

  // ==========================================================================
  // TEST 3: Yanlış şifre → hata mesajı
  // ==========================================================================
  it('Yanlış şifre ile giriş başarısız olur', () => {
    const email = Cypress.env('DEMO_EMAIL')

    cy.visit('/login')

    cy.get('input[type="email"]').type(email)
    cy.get('input[type="password"]').type('YanlisSifre123!')
    cy.get('button[type="submit"]').click()

    // URL hâlâ /login (yönlendirme olmamalı)
    cy.url().should('include', '/login')

    // Toast hata mesajı görünmeli
    cy.contains(/yanlış|hata|hatalı|geçersiz|invalid/i, { timeout: 8000 }).should('be.visible')

    // Supabase session OLUŞMAMALI
    cy.window().then((win) => {
      const keys = Object.keys(win.localStorage)
      const hasSession = keys.some((key) =>
        key.startsWith('sb-') && key.endsWith('-auth-token')
      )
      expect(hasSession).to.be.false
    })
  })

  // ==========================================================================
  // TEST 4: Authenticated user → /login açınca ana sayfaya yönlenir
  // ==========================================================================
  it('Login olmuş kullanıcı /login sayfasına gidemez', () => {
    // Önce login ol
    cy.login()

    // Tekrar /login açmaya çalış
    cy.visit('/login')

    // Otomatik yönlendirme olmalı (PublicOnlyRoute)
    cy.url({ timeout: 8000 }).should('not.include', '/login')
  })
})