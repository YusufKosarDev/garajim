/// <reference types="cypress" />

/**
 * İngilizce arayüzde Türkçe metin kalmış mı?
 *
 * NEDEN AYRI BİR GUARD: `i18n-raw-keys.cy.js` ham çeviri ANAHTARLARINI arıyor
 * (`statistics.tab.yakit` gibi). Ama en yaygın hata o değildi: sabit bir Türkçe
 * metnin hiç sözlüğe girmemiş olması. O durumda ekranda anahtar değil düpedüz
 * Türkçe görünüyor ve anahtar taraması mutlu geçiyor. 91 gerçek bulgunun
 * tamamı bu türdendi.
 *
 * NEDEN scripts/i18n-audit.mjs'in KELİME LİSTESİ KULLANILMIYOR: o liste kaynak
 * kodundaki dizgiler için yazılmış ve 'ay', 'az', 'bu', 'var', 'son' gibi
 * ≤3 karakterli girdiler içeriyor. Render edilmiş DOM metnine karşı bunlar
 * İngilizce kelimelerle eşleşir (May, day, season, filter...) ve guard
 * kullanılamaz hâle gelir.
 *
 * Onun yerine ÇOK KELİMELİ, yalnızca arayüz kromunda geçebilecek ifadeler
 * kullanılıyor — hepsi bu turda düzeltilen gerçek hatalardan türetildi.
 *
 * TOLERE EDİLENLER: veritabanı değerleri kasıtlı olarak çevrilmiyor
 * ('Yağ Değişimi' bir bakım türü, 'Benzin' bir yakıt tipi) ve kullanıcı
 * içeriği (marka, plaka, istasyon adı, notlar) de doğal olarak Türkçe. Bu
 * yüzden liste tek kelimelerden değil, YALNIZCA etiket/cümle kalıplarından
 * oluşuyor.
 */

const TURKCE_KALINTILAR = [
  'gün kaldı',
  'gün geçti',
  'Evet, sil',
  'Evet, kaydet',
  'Evet, iptal',
  'Evet, hepsini sil',
  'Evet, sıfırla',
  'En az 6 karakter',
  'Şifreler eşleşiyor',
  'eşleşen',
  'Fotoğraf Ekle',
  'Daha Ekle',
  'Henüz fotoğraf yok',
  'bulunamadı',
  'silinecek',
  'gönderildi',
  'Yeni Lastik Seti',
  'daha fazla',
  'daha az',
  'daha çok',
  'Geçersiz',
  'Bu üye artık',
  'Tarayıcıda kalan',
  'çıkış yapmak',
  'Ortalama:',
  'için sonuçlar',
  'Grafikler ve analiz',
  'Ana sayfa',
]

/**
 * İKİNCİ MEKANİZMA: Türkçe'ye özgü harf taraması.
 *
 * Yalnızca ifade listesiyle yetinmek bir kez yetmedi: liste "Yıl Sonu
 * Tahmini", "₺ bakım • ₺ yakıt" ve "Daha Sonra"yı kaçırdı ve bunlar ancak
 * ekrana bakılınca görüldü. Bir liste yalnızca içindekini yakalar.
 *
 * Bu yüzden ikinci ve daha geniş bir kontrol: ğ/ş/ı/İ/ö/ü/ç içeren kelimeler.
 * Ama İngilizce arayüzde de MEŞRU Türkçe var — veritabanı değerleri kasıtlı
 * olarak çevrilmiyor ve marka adı Türkçe. O yüzden önce bu İFADELER metinden
 * çıkarılıyor, sonra kalanlara bakılıyor. Tam ifade çıkarmak tek kelime
 * beyaz listelemekten daha güvenli: 'Yakıt Filtresi' bir veri değeri ama
 * tek başına 'Yakıt' bir arayüz etiketi olabilir ve onu kaçırmak istemiyoruz.
 */
const MESRU_TURKCE = [
  // Marka
  'Garajım',
  // DEFAULT_INTERVALS anahtarları — maintenance_records.type'a yazılıyor
  'Yağ Değişimi', 'Yağ Filtresi', 'Hava Filtresi', 'Yakıt Filtresi',
  'Polen Filtresi', 'Balata Değişimi', 'Disk Değişimi', 'Lastik Değişimi',
  'Triger Seti', 'Akü', 'Buji', 'Antifriz', 'Fren Hidroliği',
  // MaintenanceForm açılır listesindeki kısa yazımlar
  'Balata', 'Disk', 'Lastik',
  // Yakıt tipleri — vehicles.fuel_type
  'Benzin', 'Dizel', 'Hibrit', 'Elektrik',
  'Diğer',
  // Dil adları kendi dillerinde yazılır — Ayarlar'daki dil seçici
  'Türkçe',
]

/**
 * ÜÇÜNCÜ MEKANİZMA: Türkçe harfi OLMAYAN kelimeler.
 *
 * İkinci mekanizma ğ/ş/ı/ö/ü/ç arıyor — ama Türkçe arayüz metinlerinin bir
 * kısmında bu harflerden hiçbiri yok: 'Filtreler (6/6 aktif)', 'Tamam',
 * 'Toplam ₺', 'Kapat', 'Sonra'. Bunlar iki mekanizmadan da kaçtı ve ancak
 * kaynak kodu elle taranınca bulundu.
 *
 * Liste KASITLI OLARAK DAR: yalnızca arayüz kromunda geçen, İngilizce bir
 * kelimeyle çakışmayan sözcükler. 'Model' burada YOK (İngilizcede de aynı),
 * 'Ara' da yok (Area, Parameter içinde geçer). Tam kelime sınırıyla aranıyor.
 */
const TURKCE_ASCII = [
  'Filtreler', 'Filtrele', 'Tamam', 'Kaydet', 'Kapat', 'Onayla', 'Evet', 'Hayir',
  'Toplam', 'Notlar', 'Ayarlar', 'Ortalama', 'Temizle', 'Sonra', 'Simdi',
  'Adet', 'Tutar', 'Detaylar', 'Liste', 'Rapor', 'Ozet', 'Uyari', 'Kalan', 'Talep',
]

// Kelime sınırı için  KULLANILMIYOR:  Türkçe harfleri (ı, ş, ğ) kelime
// karakteri saymıyor ve "Toplamı" gibi bir kelimenin içinde yanlış eşleşiyor.
const ASCII_DESENLERI = TURKCE_ASCII.map((k) => [
  k,
  new RegExp(String.raw`(^|[^\p{L}])` + k + String.raw`([^\p{L}]|$)`, 'u'),
])
const TURKCE_HARF = /[ğşıİĞŞÖÜÇöüç]/

const kalintiAra = (baglam) => {
  cy.get('body').invoke('text').then((metin) => {
    const ifadeler = TURKCE_KALINTILAR.filter(k => metin.includes(k))
    // body.text() komşu elementleri BOŞLUKSUZ birleştiriyor: "Export to
    // calendar" + "Filtreler" -> "calendarFiltreler". Sınır deseni orada
    // eşleşemiyor ve gerçek bir kalıntı sessizce geçiyordu (bir kez geçti de).
    // küçük->BÜYÜK harf geçişine boşluk koyup sınırı geri kazanıyoruz.
    const ayrilmis = metin.replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2")
    const asciiKelimeler = ASCII_DESENLERI.filter(([, re]) => re.test(ayrilmis)).map(([k]) => k)

    // Meşru Türkçeyi çıkar, kalan metinde Türkçe harfli kelime ara
    let kalan = metin
    for (const mesru of MESRU_TURKCE) kalan = kalan.split(mesru).join(' ')
    const harfliKelimeler = [...new Set(
      kalan.split(/[\s•·—–,.()/:;!?"'|+%\d]+/).filter(k => k.length > 1 && TURKCE_HARF.test(k))
    )]

    const bulunan = [...ifadeler, ...asciiKelimeler, ...harfliKelimeler]
    expect(
      bulunan,
      `${baglam} — İngilizce arayüzde Türkçe metin kaldı: ${bulunan.join(' | ')}`
    ).to.deep.eq([])
  })
}

const ROTALAR = [
  { path: '/', name: 'Dashboard' },
  { path: '/vehicles', name: 'Araçlarım' },
  { path: '/statistics', name: 'İstatistikler' },
  { path: '/calendar', name: 'Takvim' },
  { path: '/settings', name: 'Ayarlar' },
  { path: '/profile', name: 'Profil' },
]

describe('İngilizce arayüzde Türkçe metin kalmıyor', () => {
  beforeEach(() => {
    cy.login()
  })

  ROTALAR.forEach(({ path, name }) => {
    it(`${name} (${path})`, () => {
      cy.visitInLanguage(path, 'en')
      cy.get('main, body', { timeout: 15000 }).should('be.visible')
      cy.wait(1500)
      kalintiAra(`${name} [en]`)
    })
  })

  it('araç detayı — tarih kartları, bakım ve lastikler sekmesi', () => {
    cy.visitInLanguage('/vehicles', 'en')
    cy.get('a[href*="/vehicles/"]', { timeout: 15000 }).first().click({ force: true })
    cy.url().should('match', /\/vehicles\/.+/)
    cy.wait(1500)
    kalintiAra('Araç detayı [en]')

    cy.contains('button', /tire|lastik/i).click({ force: true })
    cy.wait(1000)
    kalintiAra('Lastikler sekmesi [en]')
  })

  it('İstatistikler — dört sekme ve CSV modali', () => {
    cy.visitInLanguage('/statistics', 'en')
    cy.wait(1500)
    // Sekme adları İngilizce; sırayla hepsini gez
    cy.get('main button').then(($b) => {
      const sekmeler = [...$b].filter(el => /overview|time|vehicles|fuel/i.test(el.textContent))
      expect(sekmeler.length, 'istatistik sekmeleri bulundu').to.be.greaterThan(1)
    })
    for (const ad of [/overview/i, /time/i, /vehicles/i, /fuel/i]) {
      cy.contains('main button', ad).click({ force: true })
      cy.wait(900)
      kalintiAra(`İstatistikler sekmesi ${ad} [en]`)
    }
    cy.contains('button', /csv/i).click({ force: true })
    cy.wait(900)
    kalintiAra('CSV modali [en]')
  })

  /**
   * FORMLAR VE MODALLER — 91 bulgunun en büyük kümesi buradaydı.
   *
   * Rota taraması bunları göremiyor: form açılmadan DOM'da yoklar. Hiçbiri
   * KAYDEDİLMİYOR ve hiçbir yıkıcı butona basılmıyor — yalnızca açılıp
   * okunuyor, sonra Escape ile kapatılıyor.
   */
  it('formlar ve modaller — araç, bakım, yakıt', () => {
    cy.visitInLanguage('/vehicles', 'en')
    cy.contains('button', /add vehicle|new vehicle|araç ekle/i, { timeout: 15000 })
      .click({ force: true })
    cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible')
    cy.wait(800)
    kalintiAra('Araç formu [en]')
    cy.get('body').type('{esc}')

    cy.get('a[href*="/vehicles/"]', { timeout: 15000 }).first().click({ force: true })
    cy.url().should('match', /\/vehicles\/.+/)
    cy.wait(1200)

    cy.contains('button', /add service|add maintenance|bakım ekle/i).click({ force: true })
    cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible')
    cy.wait(800)
    kalintiAra('Bakım formu [en]')
    cy.get('body').type('{esc}')

    cy.contains('main button', /fuel/i).click({ force: true })
    cy.wait(600)
    cy.contains('button', /add fuel|yakıt ekle/i).click({ force: true })
    cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible')
    cy.wait(800)
    kalintiAra('Yakıt formu [en]')
    cy.get('body').type('{esc}')
  })

  it('komut paleti ve bildirim paneli', () => {
    cy.visitInLanguage('/', 'en')
    cy.wait(1200)
    cy.get('body').type('{ctrl}k')
    cy.wait(800)
    kalintiAra('Komut paleti [en]')
    cy.get('body').type('{esc}')
  })

  it('Türkçe modda bu ifadeler ZATEN görünür — guard tersine çalışmıyor', () => {
    // Guard'ın gerçekten bir şey ölçtüğünün kanıtı: aynı ekran Türkçede
    // listedeki ifadelerden en az birini içermeli.
    cy.visitInLanguage('/', 'tr')
    cy.wait(1500)
    cy.get('body').invoke('text').then((metin) => {
      const bulunan = TURKCE_KALINTILAR.filter(k => metin.includes(k))
      expect(bulunan.length, 'Türkçe Dashboard listedeki ifadeleri içermeli').to.be.greaterThan(0)
    })
  })
})
