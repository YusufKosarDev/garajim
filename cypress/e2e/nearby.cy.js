/// <reference types="cypress" />

/**
 * Yakındaki Servisler — smoke test
 *
 * Bu sayfa lazy yükleniyor ve leaflet'i kendi chunk'ında getiriyor.
 * Amaç: route'un gerçekten çözülüp render olduğunu doğrulamak.
 * Konum izni gerektirdiği için harita içeriği değil, izin öncesi ekran sınanıyor.
 */

describe('Yakındaki Servisler', () => {
  beforeEach(() => {
    cy.login()
  })

  it('lazy route çözülür ve konum izni ekranı render olur', () => {
    cy.visit('/nearby')

    cy.url().should('include', '/nearby')

    // Lazy chunk yüklenene kadar PageLoader görünebilir; başlık gelene kadar bekle
    cy.contains('Yakındaki Servisler', { timeout: 15000 }).should('be.visible')
    cy.contains('Konumumu Kullan').should('be.visible')
  })

  it('konum reddedilirse anlamlı hata gösterir', () => {
    // Geolocation'ı reddedecek şekilde stub'la
    cy.visit('/nearby', {
      onBeforeLoad(win) {
        cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((_ok, fail) => {
          fail({ code: 1, message: 'User denied Geolocation' })
        })
      },
    })

    cy.contains('Konumumu Kullan', { timeout: 15000 }).click()
    cy.contains(/konum izni reddedildi|konum alınamadı|konum belirlenemedi/i, { timeout: 10000 })
      .should('be.visible')
  })
})
