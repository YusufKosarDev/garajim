# Güvenlik politikası

## Açık bildirimi

Bir güvenlik açığı bulduysanız **public issue açmayın.** Bunun yerine
[GitHub Security Advisory](https://github.com/YusufKosarDev/garajim/security/advisories/new)
üzerinden özel bir bildirim oluşturun.

Bildirimi 7 gün içinde yanıtlamaya çalışıyorum. Bu kişisel bir portföy
projesidir; kurumsal bir SLA yoktur.

## Kapsam

Bu depo **istemci** uygulamasını içeriyor. Aşağıdakiler ilgi alanındadır:

- Kimlik doğrulama ve oturum yönetimi akışları
- `/share/:encodedData` — kimlik doğrulaması olmayan tek rota
- `/accept-invite/:token` — davet kabul akışı
- Content Security Policy ve diğer güvenlik başlıkları (`vercel.json`)
- Depoda sızmış gizli bilgi

Kapsam dışı:

- `docs/database/**` ve `supabase/functions/**` — bunlar **client kodundan
  türetilmiş referanslardır**, production'da çalışan kodun kopyası değildir
  (bkz. [docs/database/README.md](docs/database/README.md)). Buradaki RLS
  policy'lerinde bulunan bir eksik production'da var olmayabilir.
- Supabase, Vercel, Resend gibi üçüncü taraf servislerin kendi altyapısı.

## Bilinen tasarım kararları

Bunlar bilinçlidir, açık değildir:

- **Supabase anon key istemcide görünür.** Tasarım gereği böyle. Erişim
  kontrolü anahtarın gizliliğine değil, Row Level Security'ye dayanıyor.
- **Storage bucket'ları public read.** Fotoğraf URL'leri CDN üzerinden
  sunuluyor. Yazma ve silme, yükleyen kullanıcının klasörüyle sınırlı
  (`{userId}/{dosya}`).
- **Paylaşılan rapor bağlantıları imzasızdır.** Veri URL'nin içinde sıkıştırılmış
  olarak taşınıyor; bağlantıyı bilen herkes görebilir. Fotoğraflar yüke dahil
  edilmiyor ve yük bir Zod şemasıyla doğrulanıyor. Bağlantının kendisi bir
  yetkilendirme mekanizması değil, "bilen görür" düzeyinde bir paylaşımdır.
- **Kaynak haritaları `hidden`** üretiliyor ve build sonrası `dist`'ten
  siliniyor (`scripts/strip-sourcemaps.mjs`), yani public sunulmuyor.
- **Sentry varsayılan olarak kapalı.** `VITE_SENTRY_DSN` tanımlı değilse hiç
  yüklenmiyor. Telemetriye kullanıcı verisi değil, sabit İngilizce etiketler
  gönderiliyor.

## Desteklenen sürümler

Yalnızca `main` dalının son hâli desteklenir.
