<div align="center">

# 🚗 Garajım

### Araç Bakım & MTV Takip Asistanı

**Aracını takip etmenin en kolay yolu — Bakım, MTV, sigorta, lastik ve yakıt takibi tek uygulamada.**

[![Live Demo](https://img.shields.io/badge/🌐_Canlı_Demo-garajim--sage.vercel.app-blue?style=for-the-badge)](https://garajim-sage.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Source_Code-181717?style=for-the-badge&logo=github)](https://github.com/YusufKosarDev/garajim)

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## 🌟 Hakkında

**Garajım**, Türkiye'deki araç sahiplerinin tüm araç işlerini takip edebileceği modern bir Progressive Web App (PWA). Bakım kayıtları, MTV ödemeleri, sigorta yenilemeleri, lastik durumu ve yakıt tüketimi — hepsi tek bir uygulamada.

🎯 **Kimin İçin?** Aracını profesyonelce takip etmek isteyen herkes için.

🔥 **Ne Yapar?** Yaklaşan bakımları hatırlatır, yıllık masrafını gösterir, yakıt tüketimini hesaplar, lastik diş derinliğini takip eder.

---

## ✨ Özellikler

### 🚙 Araç Yönetimi
- ✅ **Çoklu araç desteği** — Sahip olduğun tüm araçları tek yerde
- ✅ **Detaylı bilgi** — Plaka, marka, model, yıl, yakıt tipi, KM
- ✅ **Çoklu fotoğraf** — Aracının fotoğraflarını ekle
- ✅ **Otomatik plaka formatı** — TR plaka formatı doğrulaması

### 📅 Tarih Takibi
- ✅ **Muayene** — Yaklaşan muayene tarihlerini hatırla
- ✅ **MTV** — Motorlu Taşıt Vergisi takibi (Ocak/Temmuz)
- ✅ **Sigorta + Kasko** — Yenileme tarihleri
- ✅ **Akıllı bildirimler** — 30 gün, 7 gün ve 1 gün kala uyarı

### 🔧 Bakım Modülü
- ✅ **15+ bakım türü** — Yağ, filtre, balata, vs.
- ✅ **Özel periyot ayarı** — Her araç için ayrı periyot
- ✅ **KM ve tarih bazlı uyarı** — Hangisi önce gelirse
- ✅ **Maliyet takibi** — Toplam harcama analizi
- ✅ **Fatura fotoğrafı** — Cloud storage'a otomatik yükleme

### ⛽ Yakıt Takibi
- ✅ **Detaylı kayıt** — Litre, fiyat, toplam, istasyon
- ✅ **Otomatik hesaplama** — Fiyat × litre = toplam
- ✅ **Tüketim analizi** — L/100km hesabı (full-tank metoduyla)
- ✅ **İstasyon karşılaştırması** — Hangi istasyon daha ucuz?

### 🛞 Lastik Modülü
- ✅ **Yazlık + Kışlık set** — Mevsimlik takip
- ✅ **DOT kod analizi** — Lastik yaşı tespiti
- ✅ **Diş derinliği** — Risk seviyesi (4 kademe)
- ✅ **Mevsim değişim geçmişi** — Tüm değişimler kayıtlı
- ✅ **Türkiye kış lastiği takvimi** — Yasal zorunluluk hatırlatması

### 📊 İstatistikler & Raporlar
- ✅ **Yıllık masraf grafikleri** — Aylık trend analizi
- ✅ **Bakım kategorileri** — Hangi alana ne kadar harcadın
- ✅ **Tahmin algoritmaları** — Sonraki bakım öngörüsü
- ✅ **PDF rapor üretimi** — Türkçe karakter destekli (jsPDF + Roboto)
- ✅ **Paylaşılabilir rapor** — QR kod ile link paylaş

### 🔔 Bildirimler
- ✅ **In-app bildirim merkezi** — Slack/Linear tarzı
- ✅ **Browser notifications** — Native API
- ✅ **Akıllı deduplication** — Tekrar eden uyarılar tek seferde

### 🎨 Modern UX
- ✅ **Koyu tema** — Modern ve göze yormaz
- ✅ **Responsive tasarım** — Mobile-first
- ✅ **Swipe-to-action** — iOS Mail benzeri kart kaydırma
- ✅ **Klavye kısayolları** — Ctrl+K komut paleti
- ✅ **Global fuzzy arama** — Türkçe karakter normalize
- ✅ **Bottom navigation** — Mobile için optimize

### 🔐 Güvenlik
- ✅ **Email + Şifre auth** — Email doğrulama zorunlu
- ✅ **Şifre sıfırlama** — Email ile güvenli reset
- ✅ **Row Level Security** — PostgreSQL seviyesinde
- ✅ **HTTPS** — Otomatik SSL (Vercel)

### 📱 PWA
- ✅ **Yüklenebilir** — Ana ekrana ekle, native gibi çalış
- ✅ **Offline cache** — İnternet olmadan da temel özellikler
- ✅ **Otomatik güncelleme** — Workbox ile
- ✅ **Push notifications ready** — Browser API entegrasyon

---

## 🛠️ Tech Stack

### Frontend
- **React 18** — UI library
- **Vite 8** — Build tool (HMR, hızlı build)
- **React Router v7** — Client-side routing
- **Tailwind CSS v4** — Utility-first styling
- **Lucide React** — Modern ikonlar
- **Framer Motion** — Animasyonlar
- **Recharts** — Grafik ve istatistikler
- **react-hot-toast** — Toast bildirimleri
- **date-fns** — Tarih işlemleri
- **jsPDF + autoTable** — PDF rapor üretimi
- **lz-string** — URL'de paylaşım için sıkıştırma
- **qrcode.react** — QR kod üretimi
- **Vite PWA Plugin** — Service Worker, manifest

### Backend (Supabase)
- **PostgreSQL** — Database (7 tablo)
- **Row Level Security** — Kullanıcı bazlı veri izolasyonu
- **Supabase Auth** — Email/Password + email confirmation
- **Supabase Storage** — Fotoğraf yönetimi (CDN)
- **Real-time** (hazır) — Multi-cihaz sync için

### DevOps
- **GitHub** — Source control
- **Vercel** — Hosting + CI/CD (otomatik deploy on push)

---

## 🏗️ Mimari

\`\`\`
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   React + PWA   │     │   Supabase API   │     │   PostgreSQL DB  │
│                 │────▶│                  │────▶│                  │
│  - VehicleCtx   │     │  - Auth          │     │  - 7 tablo       │
│  - AuthCtx      │◀────│  - REST API      │◀────│  - RLS policies  │
│  - Components   │     │  - Storage       │     │  - Triggers      │
└─────────────────┘     └──────────────────┘     └──────────────────┘
        │                       │                          │
        ▼                       ▼                          ▼
   Vercel CDN          Supabase Storage              7 Index'li
   (HTTPS, hızlı)      (Fotoğraflar, CDN)          PostgreSQL
\`\`\`

### Database Schema

\`\`\`
auth.users (Supabase Auth)
    │
    ├── profiles (1-1)
    │
    └── vehicles (1-N)
            │
            ├── maintenance_records (1-N)
            ├── fuel_records (1-N)
            ├── tire_sets (1-N)
            ├── tire_changes (1-N)
            └── custom_intervals (1-N)
\`\`\`

**Özellikler:**
- 12 Foreign Key ilişkisi
- 13 performans index'i
- 7 RLS policy (her tablo için)
- Otomatik `updated_at` trigger'ları
- CASCADE delete (araç silinince bağlı kayıtlar otomatik silinir)

---

## 🚀 Canlı Demo

🌐 **[garajim-sage.vercel.app](https://garajim-sage.vercel.app)**

Test hesabı:
- Email: `demo@garajim.com`
- Şifre: `demo1234`

> Veya kendi hesabını oluşturabilirsin (gerçek email gerekli — confirm email aktif).

---

## 📦 Kurulum (Geliştirme)

### Gereksinimler
- Node.js 20+
- npm veya pnpm
- Supabase hesabı (ücretsiz tier yeterli)

### 1. Repo'yu klonla
\`\`\`bash
git clone https://github.com/YusufKosarDev/garajim.git
cd garajim
\`\`\`

### 2. Bağımlılıkları yükle
\`\`\`bash
npm install --legacy-peer-deps
\`\`\`

### 3. Environment variables
`.env.example`'ı `.env` olarak kopyala:
\`\`\`bash
cp .env.example .env
\`\`\`

İçini Supabase bilgilerinle doldur:
\`\`\`env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
\`\`\`

### 4. Database setup
Supabase SQL Editor'da:
- Tüm tabloları oluştur (vehicles, maintenance_records, fuel_records, tire_sets, tire_changes, custom_intervals, profiles)
- RLS policy'lerini yaz
- Storage bucket'larını oluştur (vehicle-photos, maintenance-photos)

> Detaylı SQL scriptler için: [docs/database-setup.md](docs/database-setup.md) (yakında)

### 5. Geliştirme sunucusunu başlat
\`\`\`bash
npm run dev
\`\`\`

→ http://localhost:5173 açılır

### 6. Production build
\`\`\`bash
npm run build
\`\`\`

---

## 📂 Proje Yapısı

\`\`\`
garajim/
├── public/                  # Statik dosyalar, PWA manifest
├── src/
│   ├── components/          # UI component'ler
│   ├── context/             # React Context (Auth, Vehicle, Notification)
│   ├── fonts/               # Türkçe PDF için Roboto fontu
│   ├── hooks/               # Custom hook'lar (useAuth, usePWA, vs.)
│   ├── lib/                 # Supabase client, mappers, helpers
│   ├── pages/               # Sayfalar (Dashboard, Login, Register, vs.)
│   ├── utils/               # Yardımcı fonksiyonlar
│   ├── App.jsx              # Ana uygulama
│   └── main.jsx             # Giriş noktası
├── .env.example             # Environment variables şablonu
├── .gitignore
├── .npmrc                   # legacy-peer-deps for Vite 8 + plugins
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
\`\`\`

---

## 🎨 Öne Çıkan Teknik Detaylar

### 1. Custom Fuzzy Search
Türkçe karakter normalize (ç→c, ğ→g) + weighted multi-field scoring + LRU cache.

### 2. Türkçe PDF Rapor
jsPDF VFS'e Roboto fontu gömülerek Türkçe karakterler düzgün renderlanır.

### 3. PWA Optimizasyonu
Workbox cache stratejileri, install prompt UX, offline indicator, otomatik update kontrolü.

### 4. DOT Kod Algoritması
Lastik üretim haftası/yılını otomatik parse edip yaş/risk değerlendirmesi yapar.

### 5. Supabase Migration
LocalStorage'dan Supabase'e veri taşıma için ID mapping algoritması, kısmi başarı yönetimi, fotoğraf otomatik upload.

### 6. RLS Strategy
Her CRUD operasyon `auth.uid() = user_id` kontrolüyle korunur. Defense in depth — DB seviyesinde güvenlik.

### 7. Optimistic Updates
UI anında güncellenir, async DB call arka planda — kullanıcıya akıcı deneyim.

---

## 🗺️ Roadmap

### v1.0 (Mevcut) ✅
- [x] Auth (email + password + email confirmation)
- [x] Tüm CRUD operasyonları
- [x] Fotoğraf yönetimi (Supabase Storage)
- [x] PDF rapor üretimi
- [x] Migration tool
- [x] PWA desteği

### v1.1 (Yakında)
- [ ] Google OAuth
- [ ] Real-time sync (multi-cihaz)
- [ ] Açık tema
- [ ] Profil sayfası (şifre değiştir)
- [ ] Hesap silme (KVKK uyumu)

### v1.2 (Planlanan)
- [ ] Email push notifications (yaklaşan bakım)
- [ ] Çoklu kullanıcı (aile hesabı)
- [ ] Servis istasyonu önerileri (Google Places)
- [ ] OBD-II Bluetooth entegrasyonu

---

## 📝 License

MIT © [Yusuf Koşar](https://github.com/YusufKosarDev)

---

## 👨‍💻 Geliştirici

**Yusuf Koşar**

- GitHub: [@YusufKosarDev](https://github.com/YusufKosarDev)
- Proje: [garajim](https://github.com/YusufKosarDev/garajim)
- Demo: [garajim-sage.vercel.app](https://garajim-sage.vercel.app)

---

<div align="center">

⭐ **Faydalı bulduysan repo'yu yıldızlamayı unutma!** ⭐

Yapıldı ❤️ ile, kahve ☕ ile, ve çok fazla `console.log` ile.

</div>