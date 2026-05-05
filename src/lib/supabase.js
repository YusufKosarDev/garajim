import { createClient } from '@supabase/supabase-js'

// Environment değişkenleri
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Eksik env değişkenleri varsa hata ver
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env değişkenleri eksik! .env dosyasını kontrol et.\n' +
    'VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı olmalı.'
  )
}

/**
 * Supabase client (singleton).
 * Tüm uygulama boyunca aynı instance kullanılır.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Session'ı localStorage'da sakla (Tarayıcı yenilense de oturum kalır)
    autoRefreshToken: true,      // Token süresi dolmadan otomatik yenile
    detectSessionInUrl: true,    // OAuth callback'i otomatik yakala (Google login vs.)
    storage: window.localStorage // Session storage (default zaten bu)
  },
  db: {
    schema: 'public'             // Varsayılan schema
  }
})

/**
 * Bağlantı testi — geliştirme amaçlı, gerektiğinde manuel çağrılır.
 */
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    console.log('✅ Supabase bağlantısı başarılı!', data)
    return true
  } catch (error) {
    console.error('❌ Supabase bağlantı hatası:', error)
    return false
  }
}