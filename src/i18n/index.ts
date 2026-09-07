/**
 * Çoklu dil altyapısı (madde 29).
 *
 * TASARIM KARARLARI
 *
 * 1. Türkçe hem varsayılan hem YEDEK dil. Uygulama Türkçe doğdu; bir anahtar
 *    çevrilmemişse ekranda "vehicle.add" gibi ham anahtar değil Türkçe metin
 *    görünür. Kademeli geçişte tek güvenli davranış budur.
 *
 * 2. VERİTABANINA YAZILAN DEĞERLER ÇEVRİLMEZ. "Yağ Değişimi" ekranda bir
 *    etiket gibi görünür ama aslında `maintenance_records.type` sütununda duran
 *    ve DEFAULT_INTERVALS'ta anahtar olarak aranan bir VERİ. Çevrilirse bakım
 *    öneri motoru eşleşmeyi kaybeder, kullanıcının geçmiş kayıtları görünmez
 *    olur. Aynısı yakıt tipleri ve lastik pozisyonları için de geçerli.
 *    Bu kural bir testle korunuyor (i18n.test.ts).
 *
 * 3. Yalnızca `tr` ve `en` var. Çeviri dosyalarını sayfa/alan bazında
 *    gruplanmış tek bir ad alanında tutuyoruz — ayrı ad alanları bu boyuttaki
 *    bir uygulamada fayda vermeden yükleme karmaşası ekliyor.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import tr from './locales/tr.json'
import en from './locales/en.json'

export const DILLER = [
  { kod: 'tr', ad: 'Türkçe' },
  { kod: 'en', ad: 'English' },
] as const

export const DEPOLAMA_ANAHTARI = 'garajim_dil'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    fallbackLng: 'tr',
    supportedLngs: DILLER.map(d => d.kod),
    // Desteklenmeyen bir tarayıcı dili (ör. "de") Türkçeye düşsün
    nonExplicitSupportedLngs: true,
    load: 'languageOnly', // "en-US" -> "en"
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: DEPOLAMA_ANAHTARI,
      caches: ['localStorage'],
    },
    interpolation: {
      // React zaten kaçırıyor; i18next'in ikinci kez kaçırması "&#39;" üretirdi
      escapeValue: false,
    },
    // Türkçe'de olmayan bir anahtar boş değil, anahtarın kendisi dönsün ki
    // eksik çeviri geliştirmede fark edilsin
    returnEmptyString: false,
  })

export default i18n
