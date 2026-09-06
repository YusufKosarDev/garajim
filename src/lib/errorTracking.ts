/**
 * Hata izleme (Sentry) — tamamen opsiyonel.
 *
 * VITE_SENTRY_DSN tanımlı değilse Sentry HİÇ yüklenmez: import dinamik olduğu
 * için ayrı bir chunk'a çıkar ve DSN yoksa o chunk indirilmez bile. Yani DSN
 * girmeyen kullanıcıya ne ağ isteği ne de bundle maliyeti çıkar.
 *
 * Kurulum: .env dosyasına VITE_SENTRY_DSN=... ekle.
 */

type SentryModulu = typeof import('@sentry/react')
let sentry: SentryModulu | null = null
let baslatildi = false

const dsn = import.meta.env.VITE_SENTRY_DSN

export const isErrorTrackingEnabled = () => Boolean(dsn)

/**
 * Uygulama açılışında bir kez çağrılır.
 */
export async function initErrorTracking() {
  if (baslatildi || !dsn) return
  baslatildi = true

  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      // Kaynak haritaları 'hidden' üretiliyor (madde 2) — Sentry'ye ayrıca
      // yüklenmeleri gerekir, aksi halde stack trace okunaksız kalır.
      tracesSampleRate: 0,
      // Kişisel veri göndermemek için varsayılan olarak kapalı
      sendDefaultPii: false,
    })
    sentry = Sentry
  } catch (err) {
    // İzleme kurulamazsa uygulama çalışmaya devam etmeli
    baslatildi = false
    console.error('Hata izleme başlatılamadı:', err)
  }
}

/**
 * Yakalanmış bir hatayı raporla.
 * Sentry kapalıysa konsola düşer — mevcut davranış korunur.
 */
export function captureError(error: unknown, context: Record<string, unknown> = {}) {
  if (sentry) {
    sentry.captureException(error, { extra: context })
  } else {
    console.error('Hata:', error, context)
  }
}

/**
 * Global yakalanmamış hatalar. Bunlar ErrorBoundary'ye düşmez
 * (promise reddi ve render dışı hatalar).
 */
export function registerGlobalHandlers() {
  if (typeof window === 'undefined') return

  window.addEventListener('unhandledrejection', (e) => {
    captureError(e.reason ?? new Error('İşlenmemiş promise reddi'), { tur: 'unhandledrejection' })
  })

  window.addEventListener('error', (e) => {
    if (e.error) captureError(e.error, { tur: 'window.error' })
  })
}
