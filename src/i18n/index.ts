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

export const LANGUAGES = [
  { kod: 'tr', ad: 'Türkçe' },
  { kod: 'en', ad: 'English' },
] as const

export const STORAGE_KEY = 'garajim_dil'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    fallbackLng: 'tr',
    supportedLngs: LANGUAGES.map(d => d.kod),
    // Desteklenmeyen bir tarayıcı dili (ör. "de") Türkçeye düşsün
    nonExplicitSupportedLngs: true,
    load: 'languageOnly', // "en-US" -> "en"
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
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

/**
 * <html lang> her zaman aktif dili göstermeli.
 *
 * index.html'de sabit `lang="tr"` yazıyor ve dil değiştirilince orada
 * kalıyordu. Bunun iki somut sonucu var: ekran okuyucu İngilizce metni Türkçe
 * telaffuz kurallarıyla okuyor, ve tarayıcının çeviri önerisi yanlış dili
 * varsayıyor. Tek satırlık bir düzeltme ama a11y açısından gerçek bir hata.
 */
const dilEtiketiniUygula = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng
}

dilEtiketiniUygula(i18n.resolvedLanguage ?? 'tr')
i18n.on('languageChanged', dilEtiketiniUygula)

export default i18n
