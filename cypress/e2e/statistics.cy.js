/// <reference types="cypress" />

/**
 * Statistics Page E2E Tests
 *
 * Test sırası ÖNEMLİ:
 *   1. Sayfa açılır mı?
 *   2. Tab geçişi (modal AÇMADAN)
 *   3. CSV İndir modal (EN SON — açıp kapat)
 */

describe('Statistics Page', () => {
  beforeEach(() => {
    cy.login()
  })

  // ==========================================================================
  // TEST 1: Sayfa açılır
  // ==========================================================================
  it('İstatistikler sayfası açılır', () => {
    cy.visit('/statistics')

    // Modal varsa kapat (önceki test'ten kalmış olabilir)
    cy.get('body').type('{esc}')

    cy.url().should('include', '/statistics')

    // Sayfa render olsun
    cy.wait(2500)

    // Header'da "İstatistikler" başlığı olmalı
    // Eğer "Henüz araç yok" veya "Henüz kayıt yok" empty state gelirse de OK
    cy.get('body').then(($body) => {
      const text = $body.text().toLowerCase()
      const hasStats = text.includes('istatistik') || 
                       text.includes('henüz') ||  // empty state mesajı
                       text.includes('toplam')    // özet kartlar
      expect(hasStats).to.be.true
    })
  })

  // ==========================================================================
  // TEST 2: Sekmeler arası geçiş çalışır
  // ==========================================================================
  it('Sekmeler arası geçiş çalışır', () => {
    cy.visit('/statistics')

    // Modal varsa kapat
    cy.get('body').type('{esc}')

    // Data yüklensin
    cy.wait(2500)

    // "Genel" tab default — görünür olmalı
    cy.contains('Genel', { timeout: 10000 }).should('be.visible')

    // "Yakıt" tab'ına tıkla
    cy.contains('Yakıt').click({ force: true })
    cy.wait(1000)

    // Yakıt sekmesinde "yakıt" kelimesi geçen bir içerik olmalı
    cy.get('body').then(($body) => {
      const text = $body.text().toLowerCase()
      expect(text).to.include('yakıt')
    })

    // Sayfanın üstüne dön (tab'lar görünür kalsın)
    cy.scrollTo('top')
    cy.wait(500)

    // "Genel"e geri dön (tek geçiş yeterli — daha fazla flaky olur)
    cy.contains('Genel').click({ force: true })
    cy.wait(500)

    // "Genel" tab tekrar aktif
    cy.contains('Genel').should('be.visible')
  })

  // ==========================================================================
  // TEST 3: CSV İndir butonu mevcut ve modal açılıyor (EN SON)
  // ==========================================================================
  it('CSV İndir modali açılır ve kapatılır', () => {
    cy.visit('/statistics')

    // Modal varsa kapat
    cy.get('body').type('{esc}')

    cy.wait(2500)

    // "CSV İndir" butonu görünür
    cy.contains('CSV İndir', { timeout: 10000 })
      .should('be.visible')

    // Butona tıkla — modal açılmalı
    cy.contains('CSV İndir').click({ force: true })

    // Modal açıldığını teyit et (backdrop var)
    cy.wait(500)
    cy.get('.fixed.inset-0', { timeout: 5000 }).should('exist')

    // Modal'ı kapat (Escape tuşu)
    cy.get('body').type('{esc}')

    // Modal kapanmalı
    cy.wait(500)
  })
})