// ESM sözdizimi: package.json'da "type": "module" var, bu dosya da .js.
// CommonJS (`require`/`module.exports`) Cypress 15.21'den itibaren burada
// çalışmıyor — "require is not defined in ES module scope" ile patlıyor.
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    // Localhost dev server URL
    baseUrl: 'http://localhost:5173',

    // Viewport ayarları (desktop default)
    viewportWidth: 1280,
    viewportHeight: 800,

    // Default timeout (Supabase işlemleri biraz yavaş olabilir)
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 15000,

    // Video kaydı kapatıldı (yer kaplıyor, gerek yok)
    video: false,

    // Test başarısızlığında screenshot otomatik
    screenshotOnRunFailure: true,

    // Test pattern (cypress/e2e/ altındaki *.cy.js dosyaları)
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',

    // Test başarısız olunca otomatik tekrar dene (flaky test'lere karşı)
    retries: {
      runMode: 1,    // CI'da 1 kez retry
      openMode: 0,   // GUI'de retry yok
    },

    // Environment variables (test'lerde Cypress.env('KEY') ile erişilir)
    env: {
      DEMO_EMAIL: 'demo@garajim.com',
      DEMO_PASSWORD: 'Demo1234!',
    },

    setupNodeEvents(on, config) {
      // Tarayıcı dili KASITLI olarak İngilizce.
      //
      // Uygulamanın varsayılanı Türkçe ve testlerin çoğu Türkçe metin arıyor.
      // Geliştirme makinesi Türkçe olduğu için bu "kendiliğinden" çalışıyordu,
      // ama CI koşucusu İngilizce ve 63 testin 20'si oradan düştü — uygulamada
      // hata yoktu, testler makinenin diline bağımlıydı.
      //
      // Tarayıcıyı İngilizceye sabitlemek bu bağımlılığı bir daha gizlenemez
      // hâle getiriyor: dili localStorage'a yazan cy.visit sarmalayıcısı
      // (bkz. support/commands.js) çalışmazsa testler HEMEN kırmızıya döner.
      on('before:browser:launch', (browser, launchOptions) => {
        launchOptions.args.push('--lang=en-US')
        return launchOptions
      })
      return config
    },
  },
})