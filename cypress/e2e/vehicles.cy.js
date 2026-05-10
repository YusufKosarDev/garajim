/// <reference types="cypress" />

/**
 * Vehicles Page E2E Tests
 *
 * Test edilenler:
 *   - /vehicles sayfası render
 *   - Araç kartları listede mevcut
 *   - Vehicle detay sayfasına git, geri dön
 */

describe('Vehicles Page', () => {
  beforeEach(() => {
    cy.login()
  })

  // ==========================================================================
  // TEST 1: /vehicles sayfası açılır ve doğru render olur
  // ==========================================================================
  it('Araçlarım sayfası açılır', () => {
    cy.visit('/vehicles')

    cy.url().should('include', '/vehicles')

    // "Araç" veya "Araçlarım" başlığı görünür olmalı
    cy.contains(/araç/i).should('be.visible')
  })

  // ==========================================================================
  // TEST 2: Sayfada en az bir araç kartı var
  // ==========================================================================
  it('Araç listesi gösterilir', () => {
    cy.visit('/vehicles')

    // Sayfanın yüklenmesini bekle (Supabase'den veri gelsin)
    cy.wait(2000)

    // Vehicle kartları <a href="/vehicles/[id]"> formunda link
    // En az 1 tane olmalı (demo hesapta veri var)
    cy.get('a[href*="/vehicles/"]', { timeout: 10000 })
      .should('have.length.greaterThan', 0)
  })

  // ==========================================================================
  // TEST 3: Araç detayına git, geri dön
  // ==========================================================================
  it('Araç detayına gidilir ve geri dönülür', () => {
    cy.visit('/vehicles')

    // Supabase verilerinin yüklenmesini bekle
    cy.wait(2000)

    // İlk araç kartının linkini bul
    cy.get('a[href*="/vehicles/"]', { timeout: 10000 })
      .first()
      .then(($link) => {
        // Link'in href'ini al, manuel visit ile git (click flaky olabilir)
        const href = $link.attr('href')
        cy.visit(href)
      })

    // URL /vehicles/[id] formuna dönmüş olmalı
    cy.url({ timeout: 10000 }).should('match', /\/vehicles\/[a-f0-9-]+/)

    // Geri butonu (browser back)
    cy.go('back')

    // Tekrar /vehicles olmalı
    cy.url({ timeout: 5000 }).should('include', '/vehicles')
    cy.url().should('not.match', /\/vehicles\/[a-f0-9-]+/)
  })
})