/**
 * delete-account — KVKK uyumlu kalıcı hesap silme
 *
 * ⚠️  BU DOSYA CLIENT KODUNDAN TÜRETİLMİŞTİR (bkz. docs/database/README.md).
 *     HTTP SÖZLEŞMESİ KANITLI — Profile.jsx:186-216'dan birebir okunuyor.
 *     İç mantık kurgudur.
 *
 * Sözleşme:
 *   POST /functions/v1/delete-account
 *   Authorization: Bearer <kullanıcının access_token'ı>
 *   İstek : Google ile giriş yapılmışsa {}, aksi halde { password: string }
 *   Yanıt : herhangi bir JSON (client yalnızca response.ok'a bakıyor)
 *   Hata  : { error: string }
 *
 * ŞİFRE KOŞULLU: client Google kullanıcısı için şifre GÖNDERMİYOR (o hesabın
 * şifresi yok). Şifre geldiğinde doğrulanmalı — hassas bir işlem için yeniden
 * kimlik doğrulama.
 *
 * HATA DALINDA CLIENT OTURUMU KAPATMIYOR (Profile.jsx:203'teki yorum): bu
 * yüzden kısmi silme yapıp hata dönmek kullanıcıyı yarı silinmiş bir hesapla
 * bırakır. Sıra bilinçli: önce doğrula, sonra storage, sonra veri, EN SON
 * auth kullanıcısı.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json, hata } from '../_shared/cors.ts'

const BUCKETS = ['vehicle-photos', 'maintenance-photos']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return hata('Method not allowed', 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return hata('Oturum bulunamadı', 401)

    const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await asCaller.auth.getUser()
    if (userError || !user) return hata('Oturum geçersiz', 401)

    const { password } = await req.json().catch(() => ({}))

    // 1) Yeniden kimlik doğrulama — yalnızca şifreli hesaplar için.
    const sifreliHesap = user.app_metadata?.provider === 'email'
    if (sifreliHesap) {
      if (typeof password !== 'string' || !password) {
        return hata('Hesabı silmek için mevcut şifreni gir', 400)
      }
      const { error: signInError } = await asCaller.auth.signInWithPassword({
        email: user.email!, password,
      })
      if (signInError) return hata('Şifre doğrulanamadı', 403)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // 2) Storage temizliği. Dosya yolu deseni `{userId}/{dosyaAdi}`
    //    (src/lib/storageHelpers.ts:99), yani kullanıcının tüm dosyaları
    //    kendi id'sindeki klasörde.
    for (const bucket of BUCKETS) {
      const { data: dosyalar } = await admin.storage.from(bucket).list(user.id)
      if (dosyalar?.length) {
        await admin.storage.from(bucket)
          .remove(dosyalar.map((d) => `${user.id}/${d.name}`))
      }
    }

    // 3) Uygulama verisi. `vehicles` silinince alt tablolar ON DELETE CASCADE
    //    ile temizleniyor (schema.sql) — client de buna güveniyor
    //    (useVehicleMutations.ts:153). garage_id'siz tablolar ayrıca siliniyor.
    await admin.from('vehicles').delete().eq('user_id', user.id)
    await admin.from('custom_intervals').delete().eq('user_id', user.id)
    await admin.from('notification_preferences').delete().eq('user_id', user.id)
    await admin.from('garage_members').delete().eq('user_id', user.id)
    // Sahip olduğu garaj: cascade ile üyelik ve davetleri de gider.
    await admin.from('garages').delete().eq('owner_id', user.id)

    // 4) EN SON auth kullanıcısı. Bundan önce hata olursa client oturumu
    //    kapatmıyor ve kullanıcı tekrar deneyebiliyor.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) return hata('Hesap silinemedi: ' + deleteError.message, 500)

    return json({ deleted: true })
  } catch (err) {
    return hata(err instanceof Error ? err.message : 'Beklenmedik hata', 500)
  }
})
