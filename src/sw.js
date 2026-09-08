/// <reference lib="webworker" />

/**
 * Özel service worker (vite-plugin-pwa injectManifest modu).
 *
 * Neden özel SW: generateSW modunda push ve notificationclick handler'ı
 * yazacak yer yoktu. Bildirimler `new Notification()` ile gösteriliyordu ve
 * bu YALNIZCA sayfa açıkken çalışır — arayüz ise "uygulama açık olmasa bile"
 * diyordu. SW üzerinden gösterilen bildirimler sayfa arka plandayken de çalışır.
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Vite build sırasında precache listesini buraya enjekte eder
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Google Fonts — generateSW modundaki runtimeCaching'in karşılığı
const ONE_YEAR = 60 * 60 * 24 * 365
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: ONE_YEAR })],
  })
)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: ONE_YEAR })],
  })
)

// Yeni sürüm hazır olunca beklemeden devral (registerType: autoUpdate ile uyumlu)
self.skipWaiting()
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ---------------------------------------------------------------------------
// PUSH
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Garajım', body: event.data.text() }
  }

  const title = data.title || 'Garajım'
  const options = {
    body: data.body || data.message || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Aynı tag'li bildirim üst üste yığılmaz, güncellenir
    tag: data.tag || data.id,
    data: { url: data.url || data.actionUrl || '/' },
    dir: 'auto',
    lang: 'tr',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ---------------------------------------------------------------------------
// BİLDİRİME TIKLAMA
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Uygulama zaten açıksa oraya odaklan ve yönlendir
      for (const windowOf of windowClients) {
        if ('focus' in windowOf) {
          windowOf.focus()
          if ('navigate' in windowOf) windowOf.navigate(target)
          return
        }
      }
      // Açık pencere yoksa yeni sekme aç
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})

// ---------------------------------------------------------------------------
// SAYFADAN GELEN MESAJLAR
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
