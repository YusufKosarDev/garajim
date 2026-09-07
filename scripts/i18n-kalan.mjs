/** Taşınmamış kullanıcı metinlerini kategorilere ayırır (madde 29 denetimi). */
import fs from 'node:fs'
import path from 'node:path'

const dosyalar = []
;(function tara(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) tara(p)
    else if (/\.(jsx|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) dosyalar.push(p)
  }
})('src')

const TR = /[çğıöşüÇĞİÖŞÜ]/
const kategoriler = { konsol: [], ternary: [], modul: [], diger: [] }

for (const f of dosyalar) {
  const satirlar = fs.readFileSync(f, 'utf8').split(/\r?\n/)
  let bilesenIcinde = false

  satirlar.forEach((satir, i) => {
    if (/^(?:export\s+(?:default\s+)?)?(?:function\s+[A-Z]|const\s+[A-Z]\w*\s*=\s*(?:memo\()?\()/.test(satir)) {
      bilesenIcinde = true
    }
    if (/^\s*(\/\/|\*|\/\*)/.test(satir)) return

    for (const m of satir.matchAll(/'([^'\\\n]*)'|"([^"\\\n]*)"/g)) {
      const v = (m[1] ?? m[2] ?? '').trim()
      if (!TR.test(v) || v.length < 2) continue
      const kayit = `${f}:${i + 1}  ${JSON.stringify(v)}`

      if (/console\.(log|error|warn|info)/.test(satir)) kategoriler.konsol.push(kayit)
      else if (/\?[^:]*'|:\s*'/.test(satir) && /\?/.test(satir)) kategoriler.ternary.push(kayit)
      else if (!bilesenIcinde) kategoriler.modul.push(kayit)
      else kategoriler.diger.push(kayit)
    }
  })
}

for (const [ad, liste] of Object.entries(kategoriler)) {
  console.log(`\n### ${ad.toUpperCase()} (${liste.length})`)
  liste.forEach(l => console.log('  ' + l))
  
}
