# Katkıda bulunma

Pull request'ler memnuniyetle karşılanır. Büyük değişiklikler için önce issue açın.

## Kurulum

```bash
git clone https://github.com/YusufKosarDev/garajim.git
cd garajim
npm install
cp .env.example .env      # Supabase URL ve anon key'ini gir
npm run dev
```

`.env` olmadan da uygulama açılır: `src/lib/supabase.ts` modül seviyesinde
hata fırlatmıyor, yapılandırma eksikse `ConfigMissing` kurulum ekranı çıkıyor.
Bu sayede build ve testler de `.env` gerektirmiyor.

## Göndermeden önce

```bash
npm run verify   # lint + typecheck + unit test + build
```

CI de tam olarak bunu koşuyor, artı Cypress. Yerelde E2E:

```bash
npm run dev            # ayrı terminalde
npm run test:e2e
```

Üretim bundle'ına karşı koşmak (chunk bölme ve dinamik import'ları da sınar):

```bash
npm run build && npm run preview   # ayrı terminalde
npm run test:e2e:preview
```

## Bozulmaması gereken sözleşmeler

Bunlar testlerle zorlanıyor; ihlal CI'ı kırar.

### 1. Veritabanına yazılan değerler çevrilmez

`"Yağ Değişimi"` ekranda bir etiket gibi görünür ama aslında
`maintenance_records.type` sütununda duran ve `DEFAULT_INTERVALS`'ta anahtar
olarak aranan bir **veridir**. Çevrilirse bakım öneri motoru eşleşmeyi kaybeder
ve kullanıcının geçmiş kayıtları görünmez olur. Aynısı yakıt tipleri ve lastik
pozisyon kodları için de geçerli.

Bu kural `src/i18n/i18n.test.ts` tarafından korunuyor.

### 2. Sözlükler dümdüz ve birebir eşit

`src/i18n/locales/{tr,en}.json` **düz** noktalı anahtar tutar — iç içe obje
yok. İki dosyanın anahtar kümesi **birebir aynı** olmalı ve hiçbir değer boş
olmamalı. Yeni anahtar eklerken ikisine birden ekleyin.

```json
{ "vehicleCard.duzenle": "Düzenle" }
```

### 3. Bileşenler etiketi t() ile çözer

Sabit tablolarda `label`/`description` alanları **çeviri anahtarı** tutar,
çevrilmiş metin değil. Tüketici `t(...)` ile sarmalıdır.

```jsx
const tabs = [{ id: 'fuel', label: 'statistics.tab.yakit' }]   // ✅ anahtar
…
{t(tab.label)}                                                  // ✅ sarılmış
{tab.label}                                                     // ❌ ekranda ham anahtar görünür
```

Bu hata bir kez 9 yerde birden oluştu ve kimse fark etmedi (Türkçe modda da
bozuktu). Şimdi `cypress/e2e/i18n-raw-keys.cy.js` 6 rotayı iki dilde tarıyor.

### 4. Util'ler çeviriyi kaynakta yapar

React dışı modüller (`utils/`, `lib/`) `import i18n from '../i18n'` +
`i18n.t()` kullanır ve **çevrilmiş metin** döndürür.

⚠️ `i18n.t()` **modül seviyesinde çağrılamaz** — o değer uygulamanın açılış
diline donar ve kullanıcı dili değiştirince güncellenmez. Anahtarı sabitte
tutup çeviriyi fonksiyon içinde yapın:

```ts
const ALANLAR = [{ field: 'inspectionDate', labelKey: 'calendarEvent.muayene' }]  // ✅
export const uret = () => ALANLAR.map(a => ({ label: i18n.t(a.labelKey) }))       // ✅
```

Aynı sebeple Zod şemaları **fabrika fonksiyonudur**, sabit değil.

### 5. Güvenlik başlıkları tek kaynaktan

CSP ve diğer başlıklar yalnızca `vercel.json`'da tanımlı. `vite.config.js` onu
okuyup `npm run preview`'a da uyguluyor. Yeni bir dış kaynak (CDN, API) eklerken
CSP'yi `vercel.json`'da güncelleyin ve **preview'da doğrulayın**:

```bash
npm run build && npm run preview
curl -D - -o /dev/null http://localhost:4173/ | grep -i content-security
```

## Testler

- Zamana bağlı her şey `vi.setSystemTime()` ile sabit tarihte koşar.
- Testler dili `tr`'ye sabitler (`src/test/setup.js`). Bu, "İngilizce çeviri
  eksik" hatalarını **göremez**; İngilizce davranışı sınamak için dili açıkça
  değiştirin (örnek: `src/utils/utilMessages.test.ts`) ve `finally` içinde geri alın.
- Bir hata düzeltirken önce testi yazıp **kırmızı olduğunu görün**; yoksa testin
  gerçekten bir şeyi koruduğundan emin olamazsınız.

## Commit mesajları

Conventional commit öneki + **ölçülmüş sonuç**:

```
perf: sözlükleri dinamik yükle — ilk yük 346 -> 311 kB gzip
fix(i18n): ham çeviri anahtarları ekranda görünüyordu — 9 nokta
```

Mesajlar Türkçe. Gövdede "ne" değil **"neden"** anlatın; kod ne yaptığını
zaten söylüyor.

## Kod stili

- Yorumlar Türkçe ve *neden*i açıklar.
- `supabase/functions/**` Deno kodudur; eslint ve tsconfig'den dışlanmıştır
  (`deno lint` / `deno check` ile denetlenir).
- Lint politikası **0 hata**. Kalan tek uyarı `MaintenanceForm.jsx`'teki
  react-hook-form `watch()` uyarısıdır ve kaçınılmazdır.
