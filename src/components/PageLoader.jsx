import { useTranslation } from 'react-i18next'

/**
 * Lazy yüklenen sayfalar için Suspense fallback'i.
 * ProtectedRoute'un yükleme ekranıyla aynı görsel dili kullanır.
 */
export default function PageLoader() {
  const { t } = useTranslation()

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">{t('pageLoader.yukleniyor')}</p>
      </div>
    </div>
  )
}
