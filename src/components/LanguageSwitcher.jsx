import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { DILLER } from '../i18n'

/**
 * Dil seçici (madde 29).
 *
 * Seçim i18next'in dil algılayıcısı tarafından localStorage'a yazılıyor, yani
 * sonraki açılışta korunuyor. Seçim yapılmadıysa tarayıcı dili kullanılır ve
 * desteklenmeyen bir dilde Türkçeye düşülür.
 */
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  // "en-US" gibi bölgesel kodlar da "en" düğmesini seçili göstermeli
  const aktif = i18n.resolvedLanguage ?? i18n.language?.split('-')[0]

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Languages className="w-5 h-5 text-blue-400" aria-hidden="true" />
        {t('languageSwitcher.dil')}
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        {t('languageSwitcher.aciklama')}
      </p>

      <div role="group" aria-label={t('languageSwitcher.dil')} className="flex gap-2 flex-wrap">
        {DILLER.map(({ kod, ad }) => {
          const secili = aktif === kod
          return (
            <button
              key={kod}
              type="button"
              onClick={() => i18n.changeLanguage(kod)}
              aria-pressed={secili}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${
                secili
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {ad}
            </button>
          )
        })}
      </div>

      {/* İngilizce çeviri kısmi; kapsam gizlenmiyor */}
      <p className="text-[11px] text-slate-500 mt-3">
        {t('languageSwitcher.kismi_ceviri_notu')}
      </p>
    </div>
  )
}
