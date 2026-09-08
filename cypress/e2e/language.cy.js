/// <reference types="cypress" />

/**
 * Dil değiştirme E2E testi (madde 29).
 *
 * Unit testler sözlüğün tutarlılığını sınıyor ama "düğmeye basınca arayüz
 * gerçekten değişiyor mu" sorusunu yalnızca çalışan uygulama cevaplayabilir:
 * i18n'in main.jsx'te kurulması, sağlayıcının render ağacını kapsaması ve
 * seçimin localStorage'a yazılması ancak burada birlikte doğrulanır.
 */

describe('Dil değiştirme', () => {
  // Yeni kullanıcıya açılan tanıtım modalı tam ekran bir katman koyuyor ve
  // dil düğmesini örtüyor. Escape her zaman kapatmıyor, o yüzden tıklamalar
  // force ile yapılıyor — diğer spec'lerdeki desenin aynısı.
  const selectLanguage = (ad) => cy.contains('button', ad).click({ force: true })

  beforeEach(() => {
    cy.login()
    cy.visit('/settings')
    cy.get('body').type('{esc}')
    cy.wait(2500)
  })

  it('ayarlar sayfasında dil seçici var', () => {
    cy.contains('Dil', { timeout: 10000 }).should('be.visible')
    cy.contains('button', 'English').should('exist')
    cy.contains('button', 'Türkçe').should('exist')
  })

  it('İngilizceye geçince arayüz metni değişir', () => {
    // Türkçe başlangıç
    cy.contains('h1', 'Ayarlar', { timeout: 10000 }).should('be.visible')

    selectLanguage('English')

    // Aynı başlık artık İngilizce — çeviri gerçekten uygulanıyor
    cy.contains('h1', 'Settings', { timeout: 10000 }).should('be.visible')

    // İkinci bir çevrilmiş metin: tek bir başlığın değişmesi tesadüf olabilirdi
    cy.contains('Manage, back up or restore your data').should('be.visible')

    // NOT: sayfada Türkçe metin ARAMA yok. Çeviri bilinçli olarak kısmi ve
    // çevrilmemiş metinler Türkçeye düşüyor; "hiç Türkçe kalmasın" demek bu
    // tasarımla çelişirdi. Ham anahtar sızmadığı ayrı testte sınanıyor.
  })

  it('seçim cihazda saklanır ve sayfa yenilenince korunur', () => {
    selectLanguage('English')
    cy.contains('h1', 'Settings', { timeout: 10000 }).should('be.visible')

    cy.reload()
    cy.get('body').type('{esc}')
    cy.contains('h1', 'Settings', { timeout: 15000 }).should('be.visible')
  })

  it('Türkçeye geri dönülebilir', () => {
    selectLanguage('English')
    cy.contains('h1', 'Settings', { timeout: 10000 }).should('be.visible')

    selectLanguage('Türkçe')
    cy.contains('h1', 'Ayarlar', { timeout: 10000 }).should('be.visible')
  })

  it('İngilizcede çevrilmemiş metin ham anahtar değil Türkçe görünür', () => {
    // fallbackLng: 'tr' — kısmi çeviride kabul edilebilir tek davranış.
    // Kırılsaydı ekranda "settings.foo" gibi anahtarlar görünürdü.
    selectLanguage('English')
    cy.contains('h1', 'Settings', { timeout: 10000 }).should('be.visible')

    cy.get('body').invoke('text').then((text) => {
      const rawKey = text.match(/\b[a-z][a-zA-Z]+\.[a-z][a-z0-9_]{4,}\b/)
      expect(rawKey, `ekranda ham çeviri anahtarı görünüyor: ${rawKey?.[0]}`).to.be.null
    })
  })
})
