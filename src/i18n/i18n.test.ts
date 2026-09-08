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

const sourceFiles = (): string[] => {
  const matches: string[] = []
  const tara = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) tara(p)
      else if (/\.(jsx|tsx|js|ts)$/.test(e.name) && !/\.test\./.test(e.name)) matches.push(p)
    }
  }
  tara('src')
  return matches
}

describe('i18n — veritabanı değerleri çevrilmez', () => {
  it('sözlükte hiçbir DB alan değeri yer almaz', () => {
    const values = new Set(Object.values(tr as Record<string, string>))
    const leaked = VERITABANI_DEGERLERI.filter(v => values.has(v))
    expect(leaked, `Bu değerler DB'ye yazılıyor, çeviriye giremez: ${leaked.join(', ')}`)
      .toEqual([])
  })

  it('bakım türleri kaynakta düz dizge olarak duruyor', () => {
    // Öneri motoru bu dizgeleri kayıtlarla birebir eşleştiriyor
    const form = fs.readFileSync('src/components/MaintenanceForm.jsx', 'utf8')
    expect(form).toContain("'Yağ Değişimi'")
    expect(form).not.toMatch(/t\('[^']*'\)[^\n]*Yağ Değişimi/)
  })

  it('DEFAULT_INTERVALS anahtarları çeviri anahtarı değil, Türkçe metin', () => {
    for (const key of Object.keys(DEFAULT_INTERVALS)) {
      expect(key).not.toMatch(/^[a-z][a-zA-Z]*\./)
    }
  })
})

describe('i18n — sözlük sağlığı', () => {
  it('tr sözlüğünde boş değer yok', () => {
    const emptyValues = Object.entries(tr as Record<string, string>).filter(([, v]) => !v?.trim())
    expect(emptyValues.map(([k]) => k)).toEqual([])
  })

  it('iki sözlüğün anahtar kümeleri birebir aynı', () => {
    // Çeviri artık tam. Bu test onu öyle TUTAR: yeni bir Türkçe metin
    // eklenip İngilizcesi unutulursa CI kırılır. Eskiden yalnızca tek yön
    // (en -> tr) sınanıyordu ve İngilizce %19'da kalmıştı; kimse fark etmedi.
    const trKeys = new Set(Object.keys(tr))
    const enKeys = new Set(Object.keys(en))

    const missingInEn = [...trKeys].filter(k => !enKeys.has(k))
    const extraInEn = [...enKeys].filter(k => !trKeys.has(k))

    expect(missingInEn, `en.json'da eksik anahtarlar:\n${missingInEn.join('\n')}`).toEqual([])
    expect(extraInEn, `en.json'da fazladan anahtarlar:\n${extraInEn.join('\n')}`).toEqual([])
  })

  it('en sözlüğünde boş değer yok', () => {
    // Boş bir çeviri `returnEmptyString: false` yüzünden sessizce Türkçeye
    // düşer — yani anahtar "çevrilmiş" görünür ama ekranda Türkçe çıkar.
    const emptyValues = Object.entries(en as Record<string, string>).filter(([, v]) => !v?.trim())
    expect(emptyValues.map(([k]) => k)).toEqual([])
  })

  it('kaynakta kullanılan her t() anahtarı sözlükte var', () => {
    // Eksik anahtar ekranda ham "settings.foo" metni gösterir
    const trKeys = new Set(Object.keys(tr))
    const missing: string[] = []

    for (const file of sourceFiles()) {
      // Yorum satırları atlanıyor: açıklamalarda örnek olarak yazılan
      // `t('...')` gerçek bir kullanım değil (bu testin ilk çalıştırmasında
      // tam da böyle bir yorum yakalandı).
      const source = fs.readFileSync(file, 'utf8')
        .split('\n')
        .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join('\n')

      for (const m of source.matchAll(/\bi18n\.t\('([^']+)'\)|(?<![.\w])t\('([^']+)'\)/g)) {
        const key = m[1] ?? m[2]
        // Nokta içermeyenler çeviri anahtarı değil (başka bir `t` fonksiyonu olabilir)
        if (!key.includes('.')) continue
        if (!trKeys.has(key)) missing.push(`${file}: ${key}`)
      }
    }

    expect(missing, `Sözlükte olmayan anahtarlar:\n${missing.join('\n')}`).toEqual([])
  })
})

describe('i18n — dil davranışı', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('tr')
  })

  it('Türkçe metni döndürür', () => {
    const key = Object.keys(tr)[0]
    expect(i18n.t(key)).toBe((tr as Record<string, string>)[key])
  })

  it('İngilizce çevirisi olmayan anahtar Türkçeye düşer, ham anahtar göstermez', async () => {
    // fallbackLng: 'tr' — ileride bir anahtarın İngilizcesi unutulursa ekranda
    // "settings.foo" değil Türkçe metin görünmeli.
    //
    // Anahtar SENTETİK: sözlükteki gerçek bir boşluğa dayanmıyor. Eskiden bu
    // test `Object.keys(tr).find(k => !(k in en))` ile çalışıyordu, yani
    // çeviri tamamlandığı anda kendi kendini geçersiz kılıyordu.
    const sentetikAnahtar = '__test.yalnizca_turkcede_var'
    const sentetikDeger = 'Yalnızca Türkçede var'
    i18n.addResource('tr', 'translation', sentetikAnahtar, sentetikDeger)

    await i18n.changeLanguage('en')
    expect(i18n.t(sentetikAnahtar)).toBe(sentetikDeger)
    await i18n.changeLanguage('tr')
  })

  it('dil değişince <html lang> güncellenir', async () => {
    // index.html'de sabit lang="tr" var; dil değişince orada kalırsa ekran
    // okuyucu İngilizce metni Türkçe telaffuzuyla okur.
    await i18n.changeLanguage('en')
    expect(document.documentElement.lang).toBe('en')

    await i18n.changeLanguage('tr')
    expect(document.documentElement.lang).toBe('tr')
  })

  it('desteklenmeyen dil Türkçeye düşer', async () => {
    await i18n.changeLanguage('de')
    const key = Object.keys(tr)[0]
    expect(i18n.t(key)).toBe((tr as Record<string, string>)[key])
    await i18n.changeLanguage('tr')
  })
})
