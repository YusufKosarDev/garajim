import { useEffect } from 'react'
import i18n from '../i18n'

/**
 * Sekme başlığını ayarlar, bileşen sökülünce eski başlığa döner.
 *
 * "Garajım" marka adı — çevrilmiyor. "Araç Takip Asistanı" ise çevrilebilir
 * bir slogan ve sekme adı arama geçmişinde/yer imlerinde görünüyor, o yüzden
 * dile uyması gerekiyor.
 */
export const usePageTitle = (title: string) => {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title
      ? `${title} — Garajım`
      : i18n.t('usePageTitle.tagline')

    return () => {
      document.title = previousTitle
    }
  }, [title])
}
