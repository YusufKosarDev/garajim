import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Dağıtım yapılandırmasının sözleşmesi (`vercel.json`).
 *
 * NEDEN VAR: bu uygulama tek sayfalık. Sunucuda `/login`, `/vehicles/:id`,
 * `/share/:token` diye bir dosya yok; hepsi `index.html`'e yönlendirilmek
 * ZORUNDA. Yönlendirme yoksa canlıda her derin link 404 veriyor —
 * paylaşılan rapor bağlantısı da dahil, ki onun TEK işi doğrudan açılmak.
 *
 * Bu gerçekten başımıza geldi: `vercel.json` yalnızca güvenlik başlıklarını
 * taşıyordu ve `rewrites` yoktu. Yerelde görünmüyordu, çünkü
 * `vite preview` SPA geri düşüşünü kendisi yapıyor; ancak canlı adrese karşı
 * koşulan E2E ortaya çıkardı.
 *
 * (import.meta.url jsdom ortamında http şemasıyla geliyor; bu yüzden yol
 * process.cwd() üzerinden kuruluyor.)
 *
 * Test yapılandırmayı okuyor, tarayıcıyı değil — CI'da dağıtıma erişim yok.
 * Karşılığı: yanlışlıkla silinen bir satırı yakalar, Vercel'in davranışını
 * doğrulamaz.
 */

const cfg = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'))

describe('vercel.json — SPA yönlendirmesi', () => {
  it('her yol index.html e düşüyor', () => {
    const kural = cfg.rewrites?.find((r: { source: string }) => r.source === '/(.*)')
    expect(kural, 'SPA fallback kuralı yok — derin linkler 404 verir').toBeTruthy()
    expect(kural.destination).toBe('/index.html')
  })
})

describe('vercel.json — güvenlik başlıkları', () => {
  const kural = cfg.headers?.find((h: { source: string }) => h.source === '/(.*)')
  const basliklar: Record<string, string> = Object.fromEntries(
    (kural?.headers ?? []).map((h: { key: string; value: string }) => [h.key, h.value])
  )

  it('vite.config.js in okuduğu şekil korunuyor', () => {
    // preview sunucusu başlıkları BURADAN okuyor; source değişirse sessizce
    // boş küme döner ve preview başlıksız çalışır.
    expect(kural).toBeTruthy()
  })

  it('beklenen başlıklar duruyor', () => {
    for (const ad of [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ]) {
      expect(basliklar[ad], ad).toBeTruthy()
    }
  })

  it('CSP hiçbir yönerge için joker açmıyor', () => {
    const csp = basliklar['Content-Security-Policy']
    expect(csp).not.toMatch(/(^|[\s;])\*($|[\s;])/)
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
  })
})
