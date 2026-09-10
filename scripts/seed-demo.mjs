/**
 * Demo hesabını zenginleştirir — `npm run seed:demo`
 *
 * NEDEN VAR: canlı demo (demo@garajim.com) README'nin anlattığı özelliklerin
 * çoğunu GÖSTEREMİYORDU. Elle sayıldığında 2 araç, 5 bakım, 1 lastik seti ve
 * yalnızca 2 yakıt kaydı vardı — o iki kayıt da aynı gün, aynı istasyon ve
 * 100 km arayla 45 litre. Yani sorun "veri az" değil, **veri yanlış**:
 * tüketim ekranında ~45 L/100km gibi imkânsız bir sayı çıkıyordu. Tek istasyon
 * ve tek tarih olduğu için istasyon analizi, fiyat trendi ve tasarruf içgörüsü
 * tamamen ölüydü; lastik değişim geçmişi ve özel periyot özellikleri hiç
 * görünmüyordu.
 *
 * Bu script, uygulamanın hesap motorlarının GERÇEKTEN İHTİYAÇ DUYDUĞU şekle
 * göre veri üretir — "bir şeyler ekle" değil, her hesabın ön koşulu tek tek
 * okunup sağlanır (bkz. aşağıdaki bölüm yorumları).
 *
 * GÜVENLİK:
 *   • Yalnızca demo@garajim.com üzerinde çalışır, başka hesabı reddeder.
 *   • Anon key + normal login kullanır; service-role key istemez.
 *   • HİÇBİR ŞEY SİLMEZ. `vehicles` satırı silmek ON DELETE CASCADE ile tüm
 *     geçmişi götürürdü; `custom_intervals`'ı uygulamanın yaptığı gibi
 *     "user_id'ye göre topluca sil" yolu da kullanılmaz.
 *   • İdempotent: her tabloda doğal anahtarla var-mı kontrolü yapılır, aynı
 *     satır iki kez eklenmez. Görünür bir işaret alanı KULLANILMAZ — notes
 *     kullanıcıya görünüyor (arayüz, CSV, PDF) ve demoda "[seed v1]" gibi bir
 *     etiket amatör durur.
 *
 * Kullanım:
 *   npm run seed:demo                → KURU çalışma: ne yazacağını gösterir
 *   npm run seed:demo -- --apply     → gerçekten yazar
 *
 * VARSAYILAN KURU ve bu bilinçli. Script'in ilk hâlinde varsayılan "uygula"ydı
 * ve geliştirme sırasında yanlışlıkla çalıştırıldı (bir dinamik import canlı
 * veriye yazmaya başladı; process erken kapandığı için kurtuldu). Canlı veriye
 * yazan bir aracın varsayılanı asla "yaz" olmamalı.
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const DEMO_EMAIL = 'demo@garajim.com'
const DEMO_PASSWORD = 'Demo1234!'
const KURU = !process.argv.includes('--apply')

const log = (...a) => console.log('[seed-demo]', ...a)
const hata = (msg) => { console.error('[seed-demo] HATA:', msg); process.exit(1) }

// ============================================================
// .env — depoda Node tarafından .env okuyan başka bir şey yok ve dotenv
// bağımlılığı da yok, o yüzden elle ayrıştırıyoruz. Değişken adları Vite
// tarafıyla aynı tutuluyor ki iki yerde iki isim olmasın.
// ============================================================
const envOku = () => {
  if (!fs.existsSync('.env')) hata('.env bulunamadı (repo kökünden çalıştır)')
  const satirlar = fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  const env = {}
  for (const satir of satirlar) {
    const t = satir.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

// ============================================================
// Belirlenimli rastgelelik: --dry-run çıktısı ile uygulanan veri BİREBİR aynı
// olmalı, yoksa kullanıcı onayladığı şeyden farklı bir şey yazılır.
// ============================================================
let tohum = 20260910
const rnd = () => {
  tohum = (tohum * 1103515245 + 12345) & 0x7fffffff
  return tohum / 0x7fffffff
}
const araliktaRnd = (min, max) => min + rnd() * (max - min)
const yuvarla = (n, basamak = 2) => Number(n.toFixed(basamak))

// ============================================================
// Tarih üretimi
//
// Ayın 1'i ve son günleri KULLANILMIYOR: statisticsHelpers'taki getMonthKey
// 'YYYY-MM-DD' dizgesini UTC gece yarısı olarak parse edip yerel getMonth()
// okuyor. Negatif UTC ofsetli bir tarayıcıda ayın 1'i önceki aya kayıyor ve
// aylık dökümler bir ay şaşıyor.
// ============================================================
const gunEkle = (tarih, gun) => {
  const d = new Date(tarih.getTime())
  d.setDate(d.getDate() + gun)
  const ayinGunu = d.getDate()
  if (ayinGunu < 4) d.setDate(ayinGunu + 6)
  else if (ayinGunu > 26) d.setDate(ayinGunu - 6)
  return d
}
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ============================================================
// Yakıt serisi üreteci
//
// TÜKETİM DOĞRU ÇIKMALI. fuelHelpers.getAverageConsumption toplam litreyi
// (en düşük km'li kayıt HARİÇ) toplam km aralığına bölüyor. Bu yüzden litre
// değerleri km artışından türetiliyor: litre = artış × oran. Böylece toplam
// otomatik olarak hedeflenen L/100km'ye oturuyor, elle uydurulmuş sayılarla
// 45 L/100km gibi saçmalıklar çıkmıyor.
//
// İSTASYON FARKI KASITLI. fuelPriceAnalysis üç kapı koyuyor: ≥2 kayıt,
// ≥2 farklı istasyon, ve tasarruf hesabı için ±7 GÜN içinde farklı bir
// istasyonda dolum. Bu yüzden her ~7. dolum "kısa aralık" (3-5 gün, 250-400 km
// — uzun hafta sonu) olarak üretiliyor ve istasyon her seferinde değişiyor.
// Araç filtresi uygulanmadığında iki aracın dolumları birlikte sayılıyor, ama
// filtre uygulanınca da çalışsın diye araç İÇİNDE de çiftler var.
// ============================================================
const ISTASYONLAR = [
  { ad: 'Shell', fark: 0.80 },
  { ad: 'BP', fark: 0.45 },
  { ad: 'Opet', fark: -0.35 },
  { ad: 'Petrol Ofisi', fark: -0.70 },
]

const yakitSerisi = ({
  vehicleId, baslangicTarih, bitisTarih, baslangicKm, bitisKm, kayitSayisi,
  oran, fiyatBas, fiyatSon, kisaAralikSikligi = 5, kisaAralikGun = 4,
}) => {
  const kayitlar = []
  const toplamKm = bitisKm - baslangicKm
  const toplamGun = Math.round((bitisTarih - baslangicTarih) / 86400000)
  const ortalamaGun = toplamGun / (kayitSayisi - 1)

  // Aralık AĞIRLIKLARI hem km'ye hem GÜNE aynı oranda dağıtılıyor; böylece
  // seri tam olarak bitisTarih'te bitiyor.
  //
  // "Kısa aralık" ağırlığı SABİT DEĞİL, hedeflenen GÜN sayısından türetiliyor.
  // Sabit 0,45 kullanıldığında BMW'de ~6 güne denk geliyordu (işe yarıyor) ama
  // AUDI daha seyrek dolum yaptığı için aynı ağırlık ~10 güne denk geliyor ve
  // tasarruf içgörüsünün aradığı ±7 gün penceresini kaçırıyordu (2/27).
  const kisaAgirlik = Math.max(0.12, kisaAralikGun / ortalamaGun)
  const agirliklar = []
  const kisaMi = []
  for (let i = 1; i < kayitSayisi; i++) {
    const kisa = i % kisaAralikSikligi === 0
    kisaMi.push(kisa)
    agirliklar.push(kisa ? kisaAgirlik * araliktaRnd(0.85, 1.15) : araliktaRnd(0.9, 1.1))
  }
  const agirlikToplam = agirliklar.reduce((a, b) => a + b, 0)

  let km = baslangicKm
  let kumulatifAgirlik = 0
  let oncekiTarih = null
  let istasyonIdx = 0

  for (let i = 0; i < kayitSayisi; i++) {
    if (i > 0) {
      kumulatifAgirlik += agirliklar[i - 1]
      km = baslangicKm + Math.round(toplamKm * (kumulatifAgirlik / agirlikToplam))
    }
    let tarih = gunEkle(new Date(baslangicTarih), Math.round(toplamGun * (kumulatifAgirlik / agirlikToplam)))
    // Ay içi kırpma iki kaydı aynı güne düşürebilir; sıralamayı koru.
    if (oncekiTarih && tarih <= oncekiTarih) {
      tarih = new Date(oncekiTarih.getTime() + 86400000)
    }
    oncekiTarih = tarih

    const ilerleme = i / (kayitSayisi - 1)
    const tabanFiyat = fiyatBas + (fiyatSon - fiyatBas) * ilerleme + araliktaRnd(-0.35, 0.35)
    const istasyon = ISTASYONLAR[istasyonIdx % ISTASYONLAR.length]
    istasyonIdx++

    const litre = i === 0
      ? yuvarla(araliktaRnd(44, 52), 1)                    // ilk kayıt: litresi hesaba girmiyor
      : yuvarla((km - kayitlar[i - 1].km) * oran / 100, 1)
    const fiyat = yuvarla(Math.max(30, tabanFiyat + istasyon.fark))

    kayitlar.push({
      vehicle_id: vehicleId,
      date: iso(tarih),
      km,
      liters: litre,
      price_per_liter: fiyat,
      total_cost: yuvarla(litre * fiyat),
      // Kısa aralıklı dolumlar kısmi: ~130 km sonra "depo dolduruldu" demek
      // tutarsız olurdu ve arayüzdeki DOLU rozeti anlamını yitirirdi.
      // Tüketim hesabı fullTank'a bakmıyor, yani matematik etkilenmiyor.
      full_tank: i === 0 ? true : !kisaMi[i - 1],
      station: istasyon.ad,
      notes: null,
    })
  }

  // Son kayıt tam bitisKm olsun (yuvarlama kaymasını kapat)
  const son = kayitlar[kayitlar.length - 1]
  if (son.km !== bitisKm) {
    const oncekiKm = kayitlar[kayitlar.length - 2].km
    son.km = bitisKm
    son.liters = yuvarla((bitisKm - oncekiKm) * oran / 100, 1)
    son.total_cost = yuvarla(son.liters * son.price_per_liter)
  }
  return kayitlar
}

// ============================================================
// ARAÇLAR — id'ler canlı hesaptan okundu
// ============================================================
const BMW = '2e889f24-0421-42a0-9fcb-38bd8d7c05de'   // 320i, 2020, Benzin
const AUDI = '7f07e8a9-8ee3-46d1-9181-93267c218d14'  // A4, 2022, Dizel

// current_km YÜKSELTİLİYOR — bu, mevcut veriyi değiştiren TEK işlem.
// Gerekçe: Eylül 2026'ya kadar yakıt geçmişi olmadan "Bu Ay" kartı ve tahmin
// kartı boş kalıyor (getAverageMonthlySpending son 3 ayda ≥3 kayıt istiyor).
const YENI_KM = { [BMW]: 72500, [AUDI]: 38500 }

/** Araç başına hedef tüketim (L/100km) — litre değerleri buradan türetiliyor */
const ORAN = { [BMW]: 7.3, [AUDI]: 5.4 }

/**
 * ÖNCEDEN VAR OLAN BOZUK KAYITLAR.
 *
 * Demo hesabındaki iki yakıt kaydı aynı gün, aynı istasyon ve 100 km arayla
 * 45 litre gösteriyordu — fiziksel olarak imkânsız. Yeni seri eklendikten
 * sonra bunlar tüketim grafiğinde ~57 ve ~46 L/100km'lik iki görünür aykırı
 * nokta hâline geldi.
 *
 * SİLMİYORUZ. Kayıtların kendisi (tarih, istasyon, tutar) korunuyor; yalnızca
 * `liters` değeri kendi km aralığından yeniden hesaplanıyor. 100 km'lik aralık
 * için 7,3 litre çıkıyor — yani kayıt "kısmi bir üstüne ekleme" hâline geliyor
 * ve seriyle tutarlı oluyor. full_tank de false'a çekiliyor: 7 litreye "depo
 * dolduruldu" demek DOLU rozetinin anlamını yitirirdi.
 */
const ONARILACAK_YAKIT = [
  { vehicle_id: BMW, date: '2026-04-15', km: 64900 },
  { vehicle_id: BMW, date: '2026-04-15', km: 65000 },
]

const YAKIT = [
  ...yakitSerisi({
    vehicleId: BMW,
    baslangicTarih: new Date(2025, 0, 14), bitisTarih: new Date(2026, 8, 6),
    baslangicKm: 45000, bitisKm: 72500, kayitSayisi: 46,
    oran: 7.3,                     // mevcut 2 kayıt (45 L, 100 km) da toplama
    fiyatBas: 42.5, fiyatSon: 48.9, // girdiği için sonuç ≈7,6 L/100km oluyor
  }),
  ...yakitSerisi({
    vehicleId: AUDI,
    baslangicTarih: new Date(2025, 1, 11), bitisTarih: new Date(2026, 8, 4),
    baslangicKm: 18000, bitisKm: 38500, kayitSayisi: 27,
    oran: 5.4,
    fiyatBas: 41.8, fiyatSon: 47.6,
  }),
]

// ============================================================
// BAKIM — statüler HESAPLANDI, uydurulmadı.
// getRecommendationStatus: <0 overdue, ≤%10 urgent, ≤%20 soon.
// Amaç: Dashboard'da gerçek öneriler görünsün, geri kalanı sessiz kalsın.
// ============================================================
const BAKIM = [
  // BMW, current_km 72.500 — mevcut 'Yağ Değişimi' (km 60.000) özel periyot
  // 8.000 ile vade 68.000 → −4.500 → OVERDUE
  { vehicle_id: BMW, type: 'Polen Filtresi', date: '2026-01-22', km: 58500, cost: 900,
    notes: 'Kabin filtresi, orijinal' },                    // vade 73.500 → +1.000 → URGENT
  { vehicle_id: BMW, type: 'Fren Hidroliği', date: '2024-11-18', km: 40000, cost: 1200,
    notes: 'DOT 4, tam devre' },                            // vade 80.000 → +7.500 → SOON
  { vehicle_id: BMW, type: 'Yakıt Filtresi', date: '2025-09-20', km: 55000, cost: 1350, notes: null },
  { vehicle_id: BMW, type: 'Buji', date: '2025-06-18', km: 52000, cost: 2400, notes: 'NGK, 4 adet' },

  // AUDI, current_km 38.500
  { vehicle_id: AUDI, type: 'Polen Filtresi', date: '2025-06-12', km: 26000, cost: 850, notes: null },
  { vehicle_id: AUDI, type: 'Hava Filtresi', date: '2026-01-16', km: 30000, cost: 1100, notes: null },
]

// ============================================================
// ÖZEL PERİYOT — yalnızca 2 tane, kasıtlı.
// resolveInterval özel değeri DEFAULT'un ÖNÜNE alıyor, yani her ekleme
// yukarıdaki statü tablosunu bozar. Bozmayan ikisi seçildi.
// ============================================================
const PERIYOT = [
  { vehicle_id: BMW, maintenance_type: 'Yağ Değişimi', kilometers: 8000, months: 12 },
  { vehicle_id: AUDI, maintenance_type: 'Yağ Değişimi', kilometers: 15000, months: 24 },
]

// ============================================================
// LASTİK
//
// BMW'de ZATEN summer set var → yalnızca winter eklenir. tire_sets'te DB
// seviyesinde unique kısıt yok (engel sadece Zod'da), aynı sezondan ikinci set
// eklenirse getActiveTireSet yanlış seti seçip diğerini sessizce yok sayar.
//
// DOT biçimi HHYY (hafta + yıl). from_season/to_season yalnızca
// summer|winter|all-season olabilir, aksi hâlde arayüz '?' basıyor.
// ============================================================
const LASTIK_SETI = [
  { vehicle_id: BMW, season: 'winter', brand: 'Michelin Alpin 6', size: '225/45 R17',
    purchase_date: '2024-10-24', purchase_price: 9200, notes: null,
    tires: [
      { position: 'FL', dot: '4224', treadDepth: 6.9 },
      { position: 'FR', dot: '4224', treadDepth: 7.1 },
      { position: 'RL', dot: '4224', treadDepth: 6.8 },
      { position: 'RR', dot: '4224', treadDepth: 7.0 },
    ] },
  { vehicle_id: AUDI, season: 'summer', brand: 'Goodyear EfficientGrip', size: '245/40 R18',
    purchase_date: '2025-03-14', purchase_price: 11000, notes: null,
    tires: [
      { position: 'FL', dot: '1025', treadDepth: 7.8 },
      { position: 'FR', dot: '1025', treadDepth: 7.7 },
      { position: 'RL', dot: '1025', treadDepth: 7.9 },
      { position: 'RR', dot: '1025', treadDepth: 7.6 },
    ] },
]

// Zincir aktif seti belirliyor: en son değişimin to_season'ı.
// Eylül'de yazlık takılı olmalı → son değişim winter→summer.
const LASTIK_DEGISIM = [
  { vehicle_id: BMW, date: '2024-11-16', from_season: null, to_season: 'winter', km: 41500, cost: 400, notes: null },
  { vehicle_id: BMW, date: '2025-04-12', from_season: 'winter', to_season: 'summer', km: 47800, cost: 450, notes: null },
  { vehicle_id: BMW, date: '2025-11-15', from_season: 'summer', to_season: 'winter', km: 57200, cost: 500, notes: null },
  { vehicle_id: BMW, date: '2026-04-11', from_season: 'winter', to_season: 'summer', km: 64200, cost: 550, notes: 'Balans dahil' },
  { vehicle_id: AUDI, date: '2025-03-20', from_season: null, to_season: 'summer', km: 19500, cost: 500, notes: null },
]

// ============================================================
// Çalışma
// ============================================================
const main = async () => {
  const env = envOku()
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    hata('.env içinde VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY olmalı')
  }

  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
  const { data: auth, error: girisHatasi } = await sb.auth.signInWithPassword({
    email: DEMO_EMAIL, password: DEMO_PASSWORD,
  })
  if (girisHatasi) hata(`demo hesabına giriş yapılamadı: ${girisHatasi.message}`)

  // Hedefi sabitle: bu script yalnızca demo hesabı için yazıldı.
  if (auth.user.email !== DEMO_EMAIL) hata(`beklenmeyen hesap: ${auth.user.email}`)
  log(`hesap: ${auth.user.email}`)
  log(KURU
    ? 'KURU ÇALIŞMA — hiçbir şey yazılmayacak (yazmak için: --apply)'
    : 'UYGULAMA MODU — CANLI veriye yazılacak')

  // garage_id'yi bir DB trigger'ı dolduruyor; kullanıcının garaj üyeliği yoksa
  // eklenen satırlar garage_id=NULL olur ve RLS onları sonsuza kadar gizler.
  const { data: uyelik } = await sb.from('garage_members').select('garage_id')
  if (!uyelik?.length) hata('demo kullanıcının garage_members satırı yok')
  const garajId = uyelik[0].garage_id
  log(`garaj üyeliği: ${garajId}`)

  // --- mevcut satırlar: doğal anahtar kümeleri ---
  const [mevcutYakit, mevcutBakim, mevcutSet, mevcutDegisim, mevcutPeriyot] = await Promise.all([
    sb.from('fuel_records').select('vehicle_id,date,km'),
    sb.from('maintenance_records').select('vehicle_id,type,date,km'),
    sb.from('tire_sets').select('vehicle_id,season'),
    sb.from('tire_changes').select('vehicle_id,date'),
    sb.from('custom_intervals').select('vehicle_id,maintenance_type'),
  ])

  const kume = (rows, alanlar) => new Set((rows ?? []).map(r => alanlar.map(a => r[a]).join('|')))
  const varOlan = {
    yakit: kume(mevcutYakit.data, ['vehicle_id', 'date', 'km']),
    bakim: kume(mevcutBakim.data, ['vehicle_id', 'type', 'date', 'km']),
    set: kume(mevcutSet.data, ['vehicle_id', 'season']),
    degisim: kume(mevcutDegisim.data, ['vehicle_id', 'date']),
    periyot: kume(mevcutPeriyot.data, ['vehicle_id', 'maintenance_type']),
  }

  const suz = (rows, tur, alanlar) =>
    rows.filter(r => !varOlan[tur].has(alanlar.map(a => String(r[a])).join('|')))

  const eklenecek = {
    yakit: suz(YAKIT, 'yakit', ['vehicle_id', 'date', 'km']),
    bakim: suz(BAKIM, 'bakim', ['vehicle_id', 'type', 'date', 'km']),
    set: suz(LASTIK_SETI, 'set', ['vehicle_id', 'season']),
    degisim: suz(LASTIK_DEGISIM, 'degisim', ['vehicle_id', 'date']),
    periyot: suz(PERIYOT, 'periyot', ['vehicle_id', 'maintenance_type']),
  }

  log('')
  log('eklenecek satırlar (atlanan = zaten var):')
  log(`  fuel_records        ${String(eklenecek.yakit.length).padStart(3)} / ${YAKIT.length}`)
  log(`  maintenance_records ${String(eklenecek.bakim.length).padStart(3)} / ${BAKIM.length}`)
  log(`  tire_sets           ${String(eklenecek.set.length).padStart(3)} / ${LASTIK_SETI.length}`)
  log(`  tire_changes        ${String(eklenecek.degisim.length).padStart(3)} / ${LASTIK_DEGISIM.length}`)
  log(`  custom_intervals    ${String(eklenecek.periyot.length).padStart(3)} / ${PERIYOT.length}`)
  log('')
  log('GÜNCELLENECEK (mevcut veriyi değiştiren tek işlem):')
  log(`  vehicles.current_km  BMW 320i -> ${YENI_KM[BMW]},  AUDI A4 -> ${YENI_KM[AUDI]}`)

  if (eklenecek.yakit.length) {
    const b = eklenecek.yakit.filter(r => r.vehicle_id === BMW)
    const a = eklenecek.yakit.filter(r => r.vehicle_id === AUDI)
    const tuketim = (rows, ekLitre = 0) => {
      if (rows.length < 2) return '—'
      const sirali = [...rows].sort((x, y) => x.km - y.km)
      const litre = sirali.slice(1).reduce((s, r) => s + r.liters, 0) + ekLitre
      return (litre / (sirali.at(-1).km - sirali[0].km) * 100).toFixed(2) + ' L/100km'
    }
    log('')
    log('beklenen tüketim (mevcut kayıtlar dahil):')
    log(`  BMW  ${tuketim(b, 90)}   (mevcut 2 kayıt 45+45 L ekleniyor)`)
    log(`  AUDI ${tuketim(a)}`)
    log(`  istasyonlar: ${[...new Set(eklenecek.yakit.map(r => r.station))].join(', ')}`)
    const aylar = new Set(eklenecek.yakit.map(r => r.date.slice(0, 7)))
    log(`  farklı ay sayısı: ${aylar.size} (${[...aylar].sort()[0]} → ${[...aylar].sort().at(-1)})`)
  }

  if (KURU) {
    // Tasarruf içgörüsü ±7 GÜN penceresinde FARKLI bir istasyon arıyor
    // (fuelPriceAnalysis.ts:172-181). Araç filtresi yokken iki aracın dolumları
    // birlikte sayılıyor, ama kullanıcı filtre uygularsa araç İÇİNDE de çift
    // olmalı — o yüzden ikisini ayrı ayrı sayıyoruz.
    const ciftSay = (rows) => {
      let n = 0
      for (const a of rows) {
        const t = new Date(a.date).getTime()
        if (rows.some(b => b.station !== a.station && Math.abs(new Date(b.date).getTime() - t) <= 7 * 86400000)) n++
      }
      return n
    }
    for (const [ad, id] of [['BMW 320i', BMW], ['AUDI A4', AUDI]]) {
      const rows = eklenecek.yakit.filter(r => r.vehicle_id === id)
      log('')
      log(`${ad}: ${rows.length} dolum`)
      log(`  tarih  ${rows[0].date} → ${rows.at(-1).date}`)
      log(`  km     ${rows[0].km} → ${rows.at(-1).km}`)
      log(`  ±7 gün içinde farklı istasyon çifti olan dolum: ${ciftSay(rows)}/${rows.length}`)
    }
    log('')
    log(`tüm dolumlarda ±7 gün çifti: ${ciftSay(eklenecek.yakit)}/${eklenecek.yakit.length} (araç filtresi yokken geçerli)`)
    log('')
    log('ilk 3 ve son 3 dolum:')
    for (const r of [...eklenecek.yakit.slice(0, 3), ...eklenecek.yakit.slice(-3)]) {
      log(`  ${r.date}  km ${r.km}  ${r.liters} L  ${r.price_per_liter} ₺/L  ${r.station}`)
    }
    log('')
    log('kuru çalışma bitti — uygulamak için: npm run seed:demo -- --apply')
    return
  }

  // --- yazma ---
  // user_id HER SATIRA ekleniyor: INSERT policy'si `auth.uid() = user_id`
  // istiyor (bkz. docs/database/policies.sql) ve uygulamanın mapper'ları da
  // her insert'te bunu gönderiyor. İlk denemede unutulduğu için Supabase
  // "new row violates row-level security policy" ile reddetti.
  //
  // garage_id de AÇIKÇA gönderiliyor. docs/database/README.md bunu "bir DB
  // trigger'ı dolduruyor olmalı" diye işaretlemişti; ölçtüm, ÖYLE BİR TRIGGER
  // YOK — bu script'in ilk koşumunda eklenen 86 satırın hepsi garage_id=NULL
  // çıktı. Sonucu görünür: VehicleContext realtime aboneliğini
  // `garage_id=in.(...)` ile filtreliyor (VehicleContext.tsx:275), yani
  // garage_id'si boş satırlar canlı senkron ALMIYOR ve garaj paylaşılırsa
  // diğer üyeye görünmüyor. Uygulamanın kendi mapper'ları da garage_id
  // göndermediği için bu üretimde de geçerli bir hata (raporlandı).
  // custom_intervals'ta garage_id sütunu YOK (types.ts'teki CustomIntervalRow'da
  // geçmiyor) — o tabloya gönderilirse "column does not exist" alırız.
  const GARAGE_ID_OLANLAR = new Set(['fuel_records', 'maintenance_records', 'tire_sets', 'tire_changes'])

  const yaz = async (tablo, rows) => {
    if (!rows.length) { log(`${tablo}: eklenecek satır yok`); return }
    const ortak = GARAGE_ID_OLANLAR.has(tablo)
      ? { user_id: auth.user.id, garage_id: garajId }
      : { user_id: auth.user.id }
    const { error } = await sb.from(tablo).insert(rows.map(r => ({ ...ortak, ...r })))
    if (error) hata(`${tablo} eklenemedi: ${error.message}`)
    log(`${tablo}: ${rows.length} satır eklendi`)
  }

  /**
   * garage_id ONARIMI.
   *
   * Trigger olmadığı için hem bu script'in önceki koşumları hem de
   * uygulamanın kendi eklediği satırlar garage_id=NULL kalıyor. Demo hesabında
   * tek bir garaj olduğu için doğru değer belirsiz değil; boş olanları
   * dolduruyoruz. İdempotent: ikinci koşumda güncellenecek satır kalmıyor.
   */
  const onar = async (tablo) => {
    const { data, error } = await sb.from(tablo)
      .update({ garage_id: garajId }).is('garage_id', null).select('id')
    if (error) hata(`${tablo} garage_id onarılamadı: ${error.message}`)
    if (data?.length) log(`${tablo}: ${data.length} satırın garage_id'si dolduruldu`)
  }

  await yaz('fuel_records', eklenecek.yakit)
  await yaz('maintenance_records', eklenecek.bakim)
  await yaz('tire_sets', eklenecek.set)
  await yaz('tire_changes', eklenecek.degisim)
  // custom_intervals: uygulamanın "user_id'ye göre topluca sil, sonra ekle"
  // yolu KULLANILMIYOR — o yol mevcut satırları silerdi.
  await yaz('custom_intervals', eklenecek.periyot)

  for (const tablo of GARAGE_ID_OLANLAR) await onar(tablo)

  // Bozuk yakıt kayıtlarının litresini kendi km aralığından yeniden hesapla.
  for (const hedef of ONARILACAK_YAKIT) {
    const { data: aracKayitlari } = await sb.from('fuel_records')
      .select('id,km,liters,price_per_liter')
      .eq('vehicle_id', hedef.vehicle_id).order('km')
    const kayit = aracKayitlari?.find(r => r.km === hedef.km)
    if (!kayit) { log(`onarım: ${hedef.km} km'lik kayıt bulunamadı, atlandı`); continue }

    const oncekiKm = aracKayitlari
      .filter(r => r.km < hedef.km)
      .reduce((en, r) => (r.km > en ? r.km : en), 0)
    if (!oncekiKm) { log(`onarım: ${hedef.km} km serinin başında, atlandı`); continue }

    const dogruLitre = yuvarla((hedef.km - oncekiKm) * ORAN[hedef.vehicle_id] / 100, 1)
    if (Math.abs(kayit.liters - dogruLitre) < 0.2) continue // zaten onarılmış

    const { error } = await sb.from('fuel_records').update({
      liters: dogruLitre,
      total_cost: yuvarla(dogruLitre * Number(kayit.price_per_liter)),
      full_tank: false,
    }).eq('id', kayit.id)
    if (error) hata(`yakıt kaydı onarılamadı: ${error.message}`)
    log(`onarım: km ${hedef.km} → ${kayit.liters} L yerine ${dogruLitre} L (${hedef.km - oncekiKm} km aralık)`)
  }

  for (const [vehicleId, km] of Object.entries(YENI_KM)) {
    const { error } = await sb.from('vehicles').update({ current_km: km }).eq('id', vehicleId)
    if (error) hata(`current_km güncellenemedi (${vehicleId}): ${error.message}`)
  }
  log(`vehicles.current_km güncellendi`)

  // --- doğrulama ---
  // OTURUMLU okuma şart: garage_id trigger'ı ateşlemediyse satırlar
  // garage_id=NULL olur, RLS onları gizler ve yukarıdaki insert'ler yine
  // "başarılı" görünür. Service-role okuma bu yalanı görmez, anon okuma görür.
  log('')
  log('doğrulama (oturumlu okuma — RLS altında görünüyor mu?):')
  const sayimlar = {}
  for (const t of ['fuel_records', 'maintenance_records', 'tire_sets', 'tire_changes', 'custom_intervals']) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true })
    if (error) hata(`${t} okunamadı: ${error.message}`)
    sayimlar[t] = count
    log(`  ${t.padEnd(20)} ${count} satır`)
  }
  for (const tablo of GARAGE_ID_OLANLAR) {
    const { count } = await sb.from(tablo).select('*', { count: 'exact', head: true }).is('garage_id', null)
    if (count) hata(`${tablo}: garage_id NULL olan ${count} satır kaldı — realtime ve garaj paylaşımı bu satırları görmez`)
  }
  log('  garage_id boş satır yok ✓')

  if (sayimlar.fuel_records < 10) hata('yakıt kayıtları beklenenden az — RLS satırları gizliyor olabilir')
  log('')
  log('bitti.')
}

main().catch(e => hata(e?.message ?? String(e)))
