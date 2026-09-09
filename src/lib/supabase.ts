import { createClient } from '@supabase/supabase-js'

// Environment değişkenleri
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Yapılandırma tamam mı?
 *
 * Not: Eskiden burada modül seviyesinde throw ediliyordu. Bu, .env yokken
 * uygulamanın hiç boot etmemesine yol açıyordu — kullanıcı beyaz ekran,
 * testler ise "uncaught exception" görüyordu. Artık bayrak olarak dışarı
 * veriliyor; main.jsx bunu görüp açıklayıcı bir kurulum ekranı gösteriyor.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error(
    'Supabase env değişkenleri eksik! .env dosyasını kontrol et.\n' +
    'VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı olmalı.'
  )
}

/**
 * Supabase client (singleton).
 * Tüm uygulama boyunca aynı instance kullanılır.
 *
 * Yapılandırma eksikse createClient'ın patlamaması için yer tutucu değerler
 * veriliyor; bu client'a gerçek bir istek gitmeden önce kurulum ekranı devreye girer.
 */
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'yapilandirilmamis',
  {
    auth: {
      persistSession: true,        // Session'ı localStorage'da sakla (Tarayıcı yenilense de oturum kalır)
      autoRefreshToken: true,      // Token süresi dolmadan otomatik yenile
      detectSessionInUrl: true,    // OAuth callback'i otomatik yakala (Google login vs.)
      storage: window.localStorage // Session storage (default zaten bu)
    },
    db: {
      schema: 'public'             // Varsayılan schema
    }
  }
)
