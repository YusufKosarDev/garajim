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

## 📸 Önizleme

<div align="center">

### 💻 Desktop

<img src="docs/screenshots/desktop/01-dashboard.png" alt="Dashboard - Desktop" width="800" />

<details>
<summary>📂 Daha fazla ekran görüntüsü</summary>

<br />

**Araçlarım Sayfası**
<img src="docs/screenshots/desktop/02-vehicles.png" alt="Vehicles - Desktop" width="800" />

**Bakım Takibi**
<img src="docs/screenshots/desktop/03-maintenance.png" alt="Maintenance - Desktop" width="800" />

**İstatistikler**
<img src="docs/screenshots/desktop/04-stats.png" alt="Stats - Desktop" width="800" />

</details>

### 📱 Mobile

<table>
  <tr>
    <td align="center">
      <img src="docs/screenshots/mobile/01-dashboard.png" alt="Dashboard" width="220" /><br />
      <sub><b>Dashboard</b></sub>
    </td>
    <td align="center">
      <img src="docs/screenshots/mobile/02-vehicles.png" alt="Vehicles" width="220" /><br />
      <sub><b>Araçlarım</b></sub>
    </td>
    <td align="center">
      <img src="docs/screenshots/mobile/03-maintenance.png" alt="Maintenance" width="220" /><br />
      <sub><b>Bakım Takibi</b></sub>
    </td>
    <td align="center">
      <img src="docs/screenshots/mobile/04-stats.png" alt="Stats" width="220" /><br />
      <sub><b>İstatistikler</b></sub>
    </td>
  </tr>
</table>

</div>

---

## 🌟 Hakkında

**Garajım**, Türkiye'deki araç sahiplerinin tüm araç işlerini takip edebileceği modern bir Progressive Web App (PWA). Bakım kayıtları, MTV ödemeleri, sigorta yenilemeleri, lastik durumu ve yakıt tüketimi — hepsi tek bir uygulamada.

🎯 **Kimin İçin?** Aracını profesyonelce takip etmek isteyen herkes için.

🔥 **Ne Yapar?** Yaklaşan bakımları hatırlatır, yıllık masrafını gösterir, yakıt tüketimini hesaplar, lastik diş derinliğini takip eder.

⚡ **Production-grade fullstack:** Supabase tabanlı (PostgreSQL + RLS + Storage + Edge Functions), real-time multi-device senkron, otomatik email hatırlatmaları (cron + Resend), Google OAuth, PWA.

---

## ✨ Özellikler

### 🔐 Authentication & Hesap
- ✅ **Email + Şifre** — Email doğrulama zorunlu (production-ready)
- ✅ **🆕 Google OAuth** — Tek tıkla giriş ("Sign in with Google")
- ✅ **Şifre sıfırlama** — Email ile güvenli reset
- ✅ **🆕 Profil yönetimi** — Şifre/email değiştir (re-authentication ile)
- ✅ **🆕 Hesap silme (KVKK)** — Tüm verilerle birlikte kalıcı silme

### 🚙 Araç Yönetimi
- ✅ **Çoklu araç desteği** — Sahip olduğun tüm araçları tek yerde
- ✅ **Detaylı bilgi** — Plaka, marka, model, yıl, yakıt tipi, KM
- ✅ **Çoklu fotoğraf** — Cloud storage'a otomatik yükleme (CDN)
- ✅ **Otomatik plaka formatı** — TR plaka formatı doğrulaması

### 📅 Tarih Takibi
- ✅ **Muayene** — Yaklaşan muayene tarihlerini hatırla
- ✅ **MTV** — Motorlu Taşıt Vergisi takibi (Ocak/Temmuz)
- ✅ **Sigorta + Kasko** — Yenileme tarihleri
- ✅ **Akıllı bildirimler** — 30 gün, 7 gün ve 1 gün kala uyarı

### 📧 🆕 Email Bildirimleri (Otomatik)
- ✅ **Cron job** — Her gün 09:00'da otomatik kontrol (pg_cron)
- ✅ **Yaklaşan tarih hatırlatması** — Muayene, MTV, sigorta, kasko
- ✅ **Branded HTML email** — Aciliyet renkleri (1 gün → kırmızı, 7 gün → turuncu, 30 gün → mavi)
- ✅ **Kullanıcı tercihleri** — Master switch + 4 spesifik toggle (DB'de saklı)
- ✅ **Resend entegrasyonu** — Modern email API

### 🔄 🆕 Real-time Multi-cihaz Senkron
- ✅ **WebSocket subscription** — postgres_changes ile canlı dinleyici
- ✅ **Anlık güncelleme** — Telefondan ekleyince bilgisayarda F5'siz görünür
- ✅ **Echo prevention** — Optimistic UI + duplicate engellemesi
- ✅ **Tüm tablolar** — Araç, bakım, yakıt, lastik, lastik değişim

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

### 🔔 In-app Bildirimler
- ✅ **Bildirim merkezi** — Slack/Linear tarzı
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
- ✅ **Row Level Security** — PostgreSQL seviyesinde 8 policy
- ✅ **Storage RLS** — User bazlı klasör izolasyonu
- ✅ **JWT token auth** — Supabase managed
- ✅ **Re-authentication** — Hassas işlemlerde mevcut şifre doğrulama
- ✅ **Vault** — Service role key güvenli saklama
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
- **@supabase/supabase-js** — Supabase client + real-time

### Backend (Supabase)
- **PostgreSQL** — Database (8 tablo, 12+ FK, 13+ index)
- **Row Level Security** — Kullanıcı bazlı veri izolasyonu (8 policy)
- **Supabase Auth** — Email/Password + Google OAuth + email confirmation
- **Supabase Storage** — Fotoğraf yönetimi (2 bucket, 8 RLS policy, CDN)
- **Real-time** — postgres_changes WebSocket (multi-cihaz sync)
- **Edge Functions** — Deno serverless (email reminder + account deletion)
- **pg_cron** — Scheduled tasks (her gün 09:00 email reminder)
- **Vault** — Service role key güvenli secret saklama

### Email
- **Resend** — Modern email API (3000 email/ay free tier)
- **Branded HTML templates** — Türkçe + responsive

### DevOps
- **GitHub** — Source control
- **Vercel** — Hosting + CI/CD (otomatik deploy on push)

---

## 🏗️ Mimari