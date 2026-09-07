import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import i18n from './index'
import tr from './locales/tr.json'
import en from './locales/en.json'
import { DEFAULT_INTERVALS } from '../utils/maintenanceRecommendations'

/**
 * Bu dosyanın asıl işi bir SÖZLEŞMEYİ korumak:
 * veritabanına yazılan değerler çeviriye girmez.
 *
 * "Yağ Değişimi" ekranda bir etiket gibi görünür ama `maintenance_records.type`
 * sütununda saklanır ve DEFAULT_INTERVALS'ta anahtar olarak aranır. Biri onu
 * çeviri sözlüğüne taşırsa İngilizce'de "Oil Change" kaydedilir; bakım öneri
 * motoru eşleşmeyi kaybeder ve kullanıcının geçmiş kayıtları görünmez olur.
 * Sessiz ve geri dönüşü zor bir veri hatası — bu yüzden testle çitleniyor.
 */

const VERITABANI_DEGERLERI = [
  ...Object.keys(DEFAULT_INTERVALS),
  'Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik',
  'Diğer',
]

const kaynakDosyalari = (): string[] => {
  const bulunanlar: string[] = []
  const tara = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) tara(p)
      else if (/\.(jsx|tsx|js|ts)$/.test(e.name) && !/\.test\./.test(e.name)) bulunanlar.push(p)
    }
  }
  tara('src')
  return bulunanlar
}

describe('i18n — veritabanı değerleri çevrilmez', () => {
  it('sözlükte hiçbir DB alan değeri yer almaz', () => {
    const degerler = new Set(Object.values(tr as Record<string, string>))
    const sizanlar = VERITABANI_DEGERLERI.filter(v => degerler.has(v))
    expect(sizanlar, `Bu değerler DB'ye yazılıyor, çeviriye giremez: ${sizanlar.join(', ')}`)
      .toEqual([])
  })

  it('bakım türleri kaynakta düz dizge olarak duruyor', () => {
    // Öneri motoru bu dizgeleri kayıtlarla birebir eşleştiriyor
    const form = fs.readFileSync('src/components/MaintenanceForm.jsx', 'utf8')
    expect(form).toContain("'Yağ Değişimi'")
    expect(form).not.toMatch(/t\('[^']*'\)[^\n]*Yağ Değişimi/)
  })

  it('DEFAULT_INTERVALS anahtarları çeviri anahtarı değil, Türkçe metin', () => {
    for (const anahtar of Object.keys(DEFAULT_INTERVALS)) {
      expect(anahtar).not.toMatch(/^[a-z][a-zA-Z]*\./)
    }
  })
})

describe('i18n — sözlük sağlığı', () => {
  it('tr sözlüğünde boş değer yok', () => {
    const bos = Object.entries(tr as Record<string, string>).filter(([, v]) => !v?.trim())
    expect(bos.map(([k]) => k)).toEqual([])
  })

  it('en sözlüğündeki her anahtarın tr karşılığı var', () => {
    // Ters yön şart değil: İngilizce kısmi, eksikler Türkçeye düşüyor.
    // Ama en'de olup tr'de olmayan bir anahtar yazım hatasıdır.
    const trAnahtarlar = new Set(Object.keys(tr))
    const fazlalik = Object.keys(en).filter(k => !trAnahtarlar.has(k))
    expect(fazlalik, `en.json'da tr.json'da olmayan anahtarlar: ${fazlalik.join(', ')}`).toEqual([])
  })

  it('kaynakta kullanılan her t() anahtarı sözlükte var', () => {
    // Eksik anahtar ekranda ham "settings.foo" metni gösterir
    const trAnahtarlar = new Set(Object.keys(tr))
    const eksikler: string[] = []

    for (const dosya of kaynakDosyalari()) {
      // Yorum satırları atlanıyor: açıklamalarda örnek olarak yazılan
      // `t('...')` gerçek bir kullanım değil (bu testin ilk çalıştırmasında
      // tam da böyle bir yorum yakalandı).
      const kaynak = fs.readFileSync(dosya, 'utf8')
        .split('\n')
        .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join('\n')

      for (const m of kaynak.matchAll(/\bi18n\.t\('([^']+)'\)|(?<![.\w])t\('([^']+)'\)/g)) {
        const anahtar = m[1] ?? m[2]
        // Nokta içermeyenler çeviri anahtarı değil (başka bir `t` fonksiyonu olabilir)
        if (!anahtar.includes('.')) continue
        if (!trAnahtarlar.has(anahtar)) eksikler.push(`${dosya}: ${anahtar}`)
      }
    }

    expect(eksikler, `Sözlükte olmayan anahtarlar:\n${eksikler.join('\n')}`).toEqual([])
  })
})

describe('i18n — dil davranışı', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('tr')
  })

  it('Türkçe metni döndürür', () => {
    const anahtar = Object.keys(tr)[0]
    expect(i18n.t(anahtar)).toBe((tr as Record<string, string>)[anahtar])
  })

  it('İngilizce çevirisi olmayan anahtar Türkçeye düşer, ham anahtar göstermez', async () => {
    // fallbackLng: 'tr' — kısmi çeviride tek kabul edilebilir davranış budur
    await i18n.changeLanguage('en')
    const cevrilmemis = Object.keys(tr).find(k => !(k in en))
    expect(cevrilmemis, 'test anlamlı olsun diye çevrilmemiş bir anahtar gerekiyor').toBeDefined()
    expect(i18n.t(cevrilmemis!)).toBe((tr as Record<string, string>)[cevrilmemis!])
    await i18n.changeLanguage('tr')
  })

  it('desteklenmeyen dil Türkçeye düşer', async () => {
    await i18n.changeLanguage('de')
    const anahtar = Object.keys(tr)[0]
    expect(i18n.t(anahtar)).toBe((tr as Record<string, string>)[anahtar])
    await i18n.changeLanguage('tr')
  })
})
