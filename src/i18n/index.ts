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
 *
 * 4. SÖZLÜKLER DİNAMİK YÜKLENİYOR. Statik import edildiklerinde ikisi birden
 *    ana chunk'ta ~167 kB (≈45 kB gzip) yer kaplıyordu, oysa kullanıcı her
 *    zaman yalnızca birini okuyor. Artık aktif dil ayrı bir chunk olarak
 *    iniyor. Ayrıntı için aşağıdaki `bundleYukle` ve `i18nHazir` notlarına bak.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

export const LANGUAGES = [
  { kod: 'tr', ad: 'Türkçe' },
  { kod: 'en', ad: 'English' },
] as const

export const STORAGE_KEY = 'garajim_dil'

const FALLBACK = 'tr'

/**
 * Sözlük yükleyicileri. Vite bunları ayrı chunk'lara böler; `import()` çağrısı
 * yapılmadan hiçbiri inmez.
 */
const yukleyiciler: Record<string, () => Promise<{ default: Record<string, string> }>> = {
  tr: () => import('./locales/tr.json'),
  en: () => import('./locales/en.json'),
}

const yuklenenDiller = new Set<string>()

/** "en-US" -> "en"; desteklenmeyen dil yedek dile düşer */
const normalize = (lng?: string): string => {
  const kod = lng?.split('-')[0] ?? FALLBACK
  return kod in yukleyiciler ? kod : FALLBACK
}

/**
 * Bir dilin sözlüğünü yükleyip i18next'e ekler. Aynı dil için ikinci çağrı
 * ağ/parse maliyeti üretmez.
 */
const bundleYukle = async (lng?: string): Promise<void> => {
  const kod = normalize(lng)
  if (yuklenenDiller.has(kod)) return
  const modul = await yukleyiciler[kod]()
  i18n.addResourceBundle(kod, 'translation', modul.default, true, true)
  yuklenenDiller.add(kod)
}

const initPromise = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Sözlükler init'te DEĞİL, bundleYukle ile ekleniyor.
    resources: {},
    partialBundledLanguages: true,
    fallbackLng: FALLBACK,
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
 * Uygulama BUNU BEKLEMEK ZORUNDA (bkz. main.jsx).
 *
 * Sözlükler dinamik yüklendiği için, beklenmezse ilk render'da `t()` henüz
 * veri bulamaz ve ekranda ham anahtarlar görünür — daha önce başımıza gelen
 * hatanın aynısı. Bu yüzden aktif dilin sözlüğü render'dan ÖNCE bekleniyor.
 *
 * Yedek dil (tr) aktif dil değilse ARKA PLANDA, beklenmeden yükleniyor: parite
 * testi iki sözlüğün anahtar kümesini birebir aynı tuttuğu için yedeğe düşmek
 * pratikte gerekmiyor, ama bir kaza olursa kısa süre sonra hazır oluyor ve ilk
 * boyayı geciktirmiyor.
 */
export const i18nHazir: Promise<void> = initPromise
  .then(() => bundleYukle(i18n.resolvedLanguage ?? i18n.language))
  .then(() => {
    const aktif = normalize(i18n.resolvedLanguage ?? i18n.language)
    if (aktif !== FALLBACK) void bundleYukle(FALLBACK)
  })

/**
 * Dil değiştirmenin TEK doğru yolu.
 *
 * Doğrudan `i18n.changeLanguage()` çağrılırsa sözlük henüz inmemiş olabilir ve
 * kullanıcı bir an için ham anahtarlar görür. Burada önce sözlük yükleniyor,
 * sonra dil değiştiriliyor.
 */
export const dilDegistir = async (lng: string): Promise<void> => {
  await bundleYukle(lng)
  await i18n.changeLanguage(lng)
}

// Dil dışarıdan (ör. testlerde changeLanguage ile) değişirse sözlüğü tamamla.
i18n.on('languageChanged', (lng) => { void bundleYukle(lng) })

/**
 * <html lang> her zaman aktif dili göstermeli.
 *
 * index.html'de sabit `lang="tr"` yazıyor ve dil değiştirilince orada
 * kalıyordu. Bunun iki somut sonucu var: ekran okuyucu İngilizce metni Türkçe
 * telaffuz kurallarıyla okuyor, ve tarayıcının çeviri önerisi yanlış dili
 * varsayıyor. Tek satırlık bir düzeltme ama a11y açısından gerçek bir hata.
 */
const dilEtiketiniUygula = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = normalize(lng)
}

dilEtiketiniUygula(i18n.resolvedLanguage ?? FALLBACK)
i18n.on('languageChanged', dilEtiketiniUygula)

export default i18n
