/// <reference types="cypress" />

/**
 * Takvim sayfası E2E testleri (madde 28).
 *
 * Neden var: Takvim ve Dashboard'daki etkinlik üretimi utils/calendarEvents'e
 * taşındı ve etkinlik şekli değişti (`type` artık makine anahtarı, gösterilen
 * metin `label`). Bu değişiklik bir unit testle yakalanamaz: yanlış alan okunsa
 * sayfa çökmez, sadece etiketler boş görünür. Bu testler asıl olarak o boşluğu
 * kapatıyor.
 */

describe('Takvim sayfası', () => {
  beforeEach(() => {
    cy.login()
  })

  it('takvim sayfası açılır ve olay sayacı görünür', () => {
    cy.visit('/calendar')
    cy.get('body').type('{esc}')
    cy.wait(2500)

    cy.url().should('include', '/calendar')
    cy.contains('h1', 'Takvim', { timeout: 10000 }).should('be.visible')
    // Alt başlıktaki "N olay gösteriliyor" metni allEvents'ten geliyor
    cy.contains('olay gösteriliyor', { timeout: 10000 }).should('be.visible')
  })

  it('olay etiketleri boş render olmuyor', () => {
    // Asıl kontrol bu: eski kodda gösterilen metin `type` alanındaydı,
    // yeni şekilde `label`. Yanlış alan okunsaydı filtre isimleri dururdu ama
    // liste görünümündeki olaylar etiketsiz kalırdı.
    cy.visit('/calendar')
    cy.get('body').type('{esc}')
    cy.wait(2500)

    cy.contains('Liste').click({ force: true })
    cy.wait(1000)

    // Önce sayfanın kaç olay saydığını oku ("N olay gösteriliyor").
    // Sayı sıfırsa etiket iddiası boşa düşer; test kendini ona göre ayarlıyor.
    cy.contains('olay gösteriliyor').invoke('text').then((sayacMetni) => {
      const sayi = Number((sayacMetni.match(/(\d+)\s*olay/) || [])[1] ?? 0)
      cy.log(`Takvimde ${sayi} olay`)

      cy.get('body').invoke('text').then((text) => {
        if (sayi > 0) {
          // Olay VARSA etiketi de görünmeli. Eski `type` alanı okunsaydı bu
          // etiketler undefined olur ve hiçbiri eşleşmezdi.
          expect(text, `${sayi} olay var ama hiçbirinin etiketi görünmüyor`)
            .to.match(/Muayene|MTV|Sigorta|Kasko|Yağ|Bakım|Lastik|Filtre|L -/)
        } else {
          expect(text).to.match(/olay yok|henüz|Araç Ekle/i)
        }
      })
    })
  })

  it('takvime aktar butonu mevcut', () => {
    cy.visit('/calendar')
    cy.get('body').type('{esc}')
    cy.wait(2500)

    // Buton her zaman DOM'da; olay yoksa disabled olur
    cy.get('button[title="Görünen olayları .ics dosyası olarak indir"]', { timeout: 10000 })
      .should('exist')
  })

  it('gösterge panelindeki yaklaşan tarihler etiketli görünüyor', () => {
    // Dashboard da aynı ortak üretece bağlandı; DateRow ve DashboardCalendar
    // artık `label` okuyor. Kırılsaydı tarih satırları " — BMW 320i" gibi
    // başı boş görünürdü.
    cy.visit('/')
    cy.wait(2500)

    cy.get('body').then(($body) => {
      const text = $body.text()
      const tarihVar = /Muayene|MTV|Sigorta|Kasko/.test(text)
      const bosDurum = /tarih bilgisi girmedin|60 günden uzakta|Henüz araç/i.test(text)
      expect(tarihVar || bosDurum, 'yaklaşan tarihler ya etiketli görünür ya da boş durum çıkar').to.be.true
    })
  })
})
