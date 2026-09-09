/// <reference types="cypress" />

/**
 * Ham çeviri anahtarı taraması — tüm ana rotalarda, iki dilde.
 *
 * NEDEN AYRI BİR SPEC: `language.cy.js` dil DEĞİŞTİRMEYİ sınıyor ve ham anahtar
 * kontrolünü yalnızca /settings üzerinde yapıyordu. Bu yüzden 9 ayrı yerde
 * ekrana basılan ham anahtarları (statistics.tab.yakit, calendar.filter.bakim,
 * tire.position.on_sol, ...) hiç görmedi. Hata Türkçe modda da vardı, yani
 * "dil değişiyor mu" testi doğası gereği yakalayamazdı.
 *
 * Buradaki kontrol sayfa bazlı ve dilden bağımsız: hangi dilde olursa olsun
 * ekranda anahtar biçiminde bir dizge görünmemeli.
 */

const ROUTES = [
  { path: '/', name: 'Dashboard' },
  { path: '/vehicles', name: 'Araçlarım' },
  { path: '/statistics', name: 'İstatistikler' },
  { path: '/calendar', name: 'Takvim' },
  { path: '/nearby', name: 'Yakındaki Servisler' },
  { path: '/settings', name: 'Ayarlar' },
]

const LANGUAGES = ['tr', 'en']

describe('Ham çeviri anahtarı ekranda görünmüyor', () => {
  beforeEach(() => {
    cy.login()
  })

  LANGUAGES.forEach((lang) => {
    describe(`dil: ${lang}`, () => {
      ROUTES.forEach(({ path, name }) => {
        it(`${name} (${path})`, () => {
          cy.visitInLanguage(path, lang)
          // Sayfanın gerçekten render ettiğinden emin ol — boş bir body'de
          // bu test anlamsızca yeşil olurdu.
          cy.get('main, body', { timeout: 15000 }).should('be.visible')
          cy.wait(1500) // lazy route + veri yüklemesi
          cy.assertNoRawI18nKeys(`${name} [${lang}]`)
        })
      })

      it(`araç detayı ve lastikler sekmesi (${lang})`, () => {
        cy.visitInLanguage('/vehicles', lang)
        cy.get('a[href*="/vehicles/"]', { timeout: 15000 }).first().click({ force: true })
        cy.url().should('match', /\/vehicles\/.+/)
        cy.wait(1500)
        cy.assertNoRawI18nKeys(`Araç detayı [${lang}]`)

        // Lastik kartları ve değişim geçmişi ayrı bir sekmede — TireDisplay ve
        // TireChangeHistory ham anahtar basıyordu, sekme açılmadan görünmezdi.
        cy.contains('button', /lastik|tire/i).click({ force: true })
        cy.wait(1000)
        cy.assertNoRawI18nKeys(`Lastikler sekmesi [${lang}]`)
      })

      it(`<html lang> AÇILIŞTA aktif dili gösterir (${lang})`, () => {
        // Mevcut dil testleri changeLanguage sonrasını sınıyordu; AÇILIŞ değeri
        // kimsenin bakmadığı bir boşluktu. Sözlükler dinamik yüklemeye
        // geçirilince init asenkron oldu ve etiket yedek dile ('tr') donmaya
        // başladı. Görünür sonucu: CSS text-transform:uppercase Türkçe kuralını
        // uygulayıp İngilizce arayüzde "TOTAL SPENDİNG" üretiyordu.
        cy.visitInLanguage('/', lang)
        cy.get('main, body', { timeout: 15000 }).should('be.visible')
        cy.document().its('documentElement.lang').should('eq', lang)
      })

      it(`CSV dışa aktarma modali (${lang})`, () => {
        cy.visitInLanguage('/statistics', lang)
        // ExportDataModal'ın seçenek etiketleri ham anahtardı; modal açılmadan
        // hiçbir tarama onları göremez.
        cy.contains('button', /csv/i, { timeout: 15000 }).click({ force: true })
        cy.wait(1000)
        cy.assertNoRawI18nKeys(`CSV modali [${lang}]`)
      })
    })
  })
})
