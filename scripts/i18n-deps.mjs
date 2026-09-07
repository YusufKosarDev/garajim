/**
 * `t`yi eksik bağımlılık dizilerine ekler (madde 29).
 *
 * i18next'in `t` fonksiyonu dil değişmedikçe sabittir, ama dil DEĞİŞTİĞİNDE
 * yeni bir referans döner. Bağımlılığa eklenmezse dil değiştirildiğinde
 * memoize edilmiş etiketler eski dilde donup kalır — lint bunu haklı olarak
 * uyarı sayıyor.
 */

import fs from 'node:fs'

// eslint çıktısından alınan konumlar: dosya -> useMemo/useEffect'i kapatan satır
const HEDEFLER = {
  'src/components/CommandPalette.jsx': [50, 58, 185],
  'src/pages/AcceptInvite.jsx': [40],
  'src/pages/SearchNearby.jsx': [206],
  'src/pages/SharedReport.jsx': [49],
}

for (const [dosya, satirNolar] of Object.entries(HEDEFLER)) {
  const satirlar = fs.readFileSync(dosya, 'utf8').split(/\r?\n/)
  let degisti = 0

  for (const no of satirNolar) {
    // eslint 1'den sayar; hook'un başladığı satırdan ileri gidip kapanışı bul
    for (let i = no - 1; i < Math.min(satirlar.length, no + 260); i++) {
      const m = satirlar[i].match(/^(\s*)\}(?:\)|,)?\s*,\s*\[([^\]]*)\]\)/)
      if (!m) continue
      if (/\bt\b/.test(m[2])) break // zaten var

      satirlar[i] = satirlar[i].replace(
        /,\s*\[([^\]]*)\]\)/,
        (_t, icerik) => `, [${icerik.trim() ? icerik.trim() + ', t' : 't'}])`
      )
      degisti++
      break
    }
  }
  fs.writeFileSync(dosya, satirlar.join('\n'))
  console.log(`${dosya}: ${degisti} dizi güncellendi`)
}
