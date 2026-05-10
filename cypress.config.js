const { defineConfig } = require('cypress')

module.exports = defineConfig({
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
      // Buraya custom plugin'ler eklenebilir
      return config
    },
  },
})