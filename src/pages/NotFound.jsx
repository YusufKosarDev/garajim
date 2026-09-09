import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Compass, ArrowLeft } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import PageTransition from '../components/PageTransition'
import { usePageTitle } from '../hooks/usePageTitle'

/**
 * Bilinmeyen rota.
 *
 * Önceden korumalı rotaların <Routes> bloğunda catch-all yoktu: /vehiclez gibi
 * bir adres navbar'lı ama İÇERİĞİ BOŞ bir sayfa üretiyordu — kullanıcı bir hata
 * mı yaptığını, uygulamanın mı bozulduğunu anlayamıyordu.
 *
 * Kendi kutusunu çizmiyor; ortak EmptyState bileşeni zaten ikon + başlık +
 * açıklama + eylem düzenine sahip.
 */
export default function NotFound() {
  const { t } = useTranslation()
  usePageTitle(t('notFound.sayfa_basligi'))

  return (
    <PageTransition>
      <div className="p-6">
        <EmptyState
          icon={Compass}
          title={t('notFound.baslik')}
          description={t('notFound.aciklama')}
          action={
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('notFound.panoya_don')}
            </Link>
          }
        />
      </div>
    </PageTransition>
  )
}
