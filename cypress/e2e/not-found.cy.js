/// <reference types="cypress" />

/**
 * Bilinmeyen rota.
 *
 * Korumalı rotaların <Routes> bloğunda catch-all yoktu; /vehiclez gibi bir
 * adres navbar'ı ve alt menüyü çiziyor ama içerik alanını BOŞ bırakıyordu.
 * Hiçbir test bunu görmüyordu çünkü hiçbir test var olmayan bir adrese
 * gitmiyordu.
 */
describe('404 — bilinmeyen adres', () => {
  beforeEach(() => {
    cy.login()
  })

  it('bilinmeyen adres 404 içeriği gösterir', () => {
    cy.visitInLanguage('/boyle-bir-sayfa-yok', 'tr')
    cy.contains('Sayfa bulunamadı', { timeout: 15000 }).should('be.visible')
    cy.assertNoRawI18nKeys('404 [tr]')
  })

  it('İngilizce arayüzde de çevrilmiş görünür', () => {
    cy.visitInLanguage('/boyle-bir-sayfa-yok', 'en')
    cy.contains('Page not found', { timeout: 15000 }).should('be.visible')
    cy.assertNoRawI18nKeys('404 [en]')
  })

  it('panoya dön bağlantısı çalışır', () => {
    cy.visitInLanguage('/boyle-bir-sayfa-yok', 'tr')
    cy.contains('a', 'Panoya dön', { timeout: 15000 }).click({ force: true })
    cy.location('pathname').should('eq', '/')
  })

  it('araç detayı gibi görünen geçersiz id 404 DEĞİL — sayfa kendi boş durumunu gösterir', () => {
    // /vehicles/:id tanımlı bir rota; catch-all'a düşmemeli. Bu test 404
    // rotasının gerçek rotaları gölgelemediğini doğruluyor.
    cy.visitInLanguage('/vehicles/olmayan-id', 'tr')
    cy.contains('Sayfa bulunamadı').should('not.exist')
  })
})
