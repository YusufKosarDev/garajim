import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import i18n from '../i18n'

// Testler bileşenlerin GERÇEK metnini arıyor ("Araç Ekle"), anahtarını değil.
// i18n başlatılmazsa t('...') anahtarı döndürür ve tüm metin tabanlı sorgular
// kırılır. Dil açıkça 'tr'ye sabitleniyor: jsdom'un navigator dili ortama göre
// değişir ve testlerin dili ortamdan öğrenmesi kabul edilemez.
await i18n.changeLanguage('tr')

beforeEach(async () => {
  // localStorage her testten sonra temizleniyor; dil algılayıcısı oradan
  // okuduğu için dili her testin başında yeniden sabitliyoruz.
  if (i18n.language !== 'tr') await i18n.changeLanguage('tr')
})

// Her testten sonra DOM'u temizle — testler birbirinin state'ini görmesin
afterEach(() => {
  cleanup()
  localStorage.clear()
})
