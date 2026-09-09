/// <reference types="cypress" />

// ============================================================================
// CUSTOM CYPRESS COMMANDS
// ============================================================================
//
// Custom command'lar tüm test'lerde kullanılır.
// Yazımı: cy.commandName()
//
// Örnek: cy.login() → demo hesapla giriş yap
// ============================================================================

/**
 * Demo hesapla giriş yap.
 * Login flow'unu kısaltır — her test başında 1 satır.
 *
 * @example
 *   beforeEach(() => {
 *     cy.login()
 *   })
 */
Cypress.Commands.add('login', (email, password) => {
  // Default değerler — environment variable veya parametre
  const userEmail = email || Cypress.env('DEMO_EMAIL') || 'demo@garajim.com'
  const userPassword = password || Cypress.env('DEMO_PASSWORD') || 'Demo1234!'

  cy.session(
    [userEmail, userPassword],
    () => {
      cy.visit('/login')
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').type(userEmail)
      cy.get('input[type="password"]').type(userPassword)
      cy.get('button[type="submit"]').click()

      // Başarılı login → / (Dashboard) yönlendirir
      cy.url({ timeout: 15000 }).should((url) => {
        expect(url).to.match(/\/(?:$|vehicles|dashboard)/)
      })
    },
    {
      // Oturumu spec dosyaları arasında da sakla — aksi halde her spec
      // yeniden UI login yapıyor ve koşum süresinin yarısı buna gidiyor.
      cacheAcrossSpecs: true,
      validate: () => {
        // Session hâlâ geçerli mi kontrol
        cy.window().its('localStorage').then((ls) => {
          const hasSupabaseSession = Object.keys(ls).some((key) =>
            key.startsWith('sb-') && key.endsWith('-auth-token')
          )
          if (!hasSupabaseSession) {
            throw new Error('Supabase session yok')
          }
        })
      },
    }
  )
})

/**
 * Çıkış yap (oturumu kapat).
 *
 * @example
 *   cy.logout()
 */
Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    // localStorage'dan Supabase session'ı temizle
    Object.keys(win.localStorage).forEach((key) => {
      if (key.startsWith('sb-')) {
        win.localStorage.removeItem(key)
      }
    })
  })
  cy.clearCookies()
  Cypress.session.clearAllSavedSessions()
})

/**
 * Sayfanın yüklenmesini bekle (Dashboard hazır mı).
 * Real-time + Supabase async işlemleri için bekleme.
 *
 * @example
 *   cy.login()
 *   cy.waitForApp()
 */
Cypress.Commands.add('waitForApp', () => {
  // Dashboard ana içeriği görünür mü?
  cy.get('body', { timeout: 15000 }).should('be.visible')

  // Loading spinner varsa kaybolsun
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="loading"]').length > 0) {
      cy.get('[data-testid="loading"]').should('not.exist')
    }
  })

  // Hata toast'ı yoksa devam
  cy.wait(500) // Kısa stabilizasyon
})

/**
 * Ham çeviri anahtarı ekranda görünüyor mu?
 *
 * NEDEN VAR: `tr.json`/`en.json` paritesi bir unit testle korunuyor ama o test
 * anahtarın EKRANA BASILDIĞINI göremez. Sabit bir tabloda `label: 'tire.season.kislik'`
 * yazıp tüketicide `t()` ile sarmayı unutmak, kullanıcıya düz "tire.season.kislik"
 * göstermek demektir — ve bu Türkçe modda da bozuktur, yani dil testleri bile yakalamaz.
 * Tam olarak bu hata 9 yerde birden vardı; kimse fark etmedi çünkü ham anahtar taraması
 * yalnızca /settings sayfasında yapılıyordu.
 *
 * Desen: küçük harfle başlayan, noktayla ayrılmış, boşluk içermeyen tanımlayıcı.
 * "vercel.app", "demo@garajim.com", "rapor.pdf" gibi gerçek metinler nokta sonrası
 * en az 5 karakter şartıyla ayıklanıyor.
 *
 * @example cy.assertNoRawI18nKeys('/statistics')
 */
const RAW_I18N_KEY_PATTERN = /\b[a-z][a-zA-Z]+\.[a-z][a-z0-9_]{4,}\b/

Cypress.Commands.add('assertNoRawI18nKeys', (context = '') => {
  cy.get('body').invoke('text').then((text) => {
    const match = text.match(RAW_I18N_KEY_PATTERN)
    expect(
      match,
      `${context} — ekranda ham çeviri anahtarı görünüyor: "${match?.[0]}"`
    ).to.be.null
  })
})

/**
 * Dili ve onboarding durumunu sayfa açılmadan ÖNCE sabitleyerek ziyaret et.
 *
 * i18next dili `localStorage`'dan okuyor (STORAGE_KEY = 'garajim_dil'), o yüzden
 * arayüzden düğmeye basmak yerine değeri boot'tan önce yazmak hem daha hızlı hem
 * de tek bir sayfaya bağlı kalmıyor. Tanıtım turu da kapatılıyor: tam ekran katman
 * koyduğu için tıklamaları engelliyor ve testi diline göre kırılgan yapıyor.
 *
 * @example cy.visitInLanguage('/calendar', 'en')
 */
Cypress.Commands.add('visitInLanguage', (path, lang) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('garajim_dil', lang)
      win.localStorage.setItem('garajim_onboarding_completed', 'true')
    },
  })
})

/**
 * Toast mesajı kontrol et.
 * react-hot-toast ile gösterilen mesajları kontrol için.
 *
 * Not: yalnızca metni doğrular, toast'ın türünü (success/error) ayırt etmez —
 * react-hot-toast türü DOM'da ayırt edilebilir bir sınıfla işaretlemiyor.
 *
 * @example
 *   cy.checkToast('Hoş geldin')
 */
Cypress.Commands.add('checkToast', (message) => {
  // react-hot-toast renderer DOM'a ekleniyor
  cy.contains(message, { timeout: 8000 }).should('be.visible')
})