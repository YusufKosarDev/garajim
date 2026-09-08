/// <reference types="cypress" />

/**
 * Komut paleti E2E testi.
 *
 * NEDEN BU TEST VAR: paletin "her açılışta aramayı sıfırla" davranışı bir
 * useEffect'ten render sırasında ayarlama desenine taşındı (Aşama 4). Bu tam
 * olarak unit testin göremediği türden bir değişiklik — state'in ne zaman
 * sıfırlandığı ancak gerçek bir açma/kapama döngüsünde görünür.
 *
 * Testler yapısal: belirli araç/bakım verisine değil, paletin kendi
 * elemanlarına bakıyor (diğer spec'lerdeki savunmacı test deseni).
 * Sonuç satırları `button[data-index]` ile seçiliyor — sayfa arkasındaki
 * navigasyon linkleriyle karışmasın diye.
 */

describe('Komut paleti', () => {
  const openPalette = () => cy.get('body').type('{ctrl}k')
  const paletInput = () => cy.get('input[placeholder*="ara" i]', { timeout: 10000 })
  const results = () => cy.get('button[data-index]', { timeout: 8000 })

  beforeEach(() => {
    cy.login()
    cy.visit('/')
    // Yeni kullanıcıya açılan tanıtım modalı klavye olaylarını yutuyor
    cy.get('body').type('{esc}')
    cy.wait(1500)
  })

  it('Ctrl+K ile açılır', () => {
    openPalette()
    paletInput().should('be.visible')
  })

  it('yazınca sonuçlar süzülür', () => {
    openPalette()
    // Filtreden önce birden fazla sonuç var
    results().should('have.length.greaterThan', 1)

    paletInput().type('ayarlar')
    // "Ayarlar" sayfası her kurulumda var — veriye bağlı değil
    results().should('have.length.greaterThan', 0)
    results().first().should('contain.text', 'Ayarlar')
  })

  it('Escape ile kapanır', () => {
    openPalette()
    paletInput().should('be.visible')
    cy.get('body').type('{esc}')
    cy.get('input[placeholder*="ara" i]').should('not.exist')
  })

  it('yeniden açıldığında önceki arama temizlenmiş olur', () => {
    // Asıl korunan davranış bu: kapanıp açılınca input BOŞ gelmeli.
    openPalette()
    paletInput().type('ayarlar').should('have.value', 'ayarlar')

    cy.get('body').type('{esc}')
    cy.get('input[placeholder*="ara" i]').should('not.exist')

    openPalette()
    paletInput().should('have.value', '')
  })

  it('sonuç seçilince ilgili sayfaya gidilir', () => {
    openPalette()
    paletInput().type('ayarlar')
    results().first().click()
    cy.url().should('include', '/settings')
  })
})
