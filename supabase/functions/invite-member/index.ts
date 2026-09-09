/**
 * invite-member — garaja e-posta ile üye daveti
 *
 * ⚠️  BU DOSYA CLIENT KODUNDAN TÜRETİLMİŞTİR (bkz. docs/database/README.md).
 *     HTTP SÖZLEŞMESİ KANITLI — istek/yanıt şekli GarageMembers.jsx:130-159'dan
 *     birebir okunabiliyor. İÇ MANTIK ise kurgudur: production'daki fonksiyonun
 *     davet süresi, yeniden davet davranışı ve e-posta şablonu farklı olabilir.
 *
 * Sözleşme:
 *   POST /functions/v1/invite-member
 *   Authorization: Bearer <kullanıcının access_token'ı>
 *   İstek : { email: string }
 *   Yanıt : { email_sent: boolean, invite_url: string }
 *   Hata  : { error: string }  (HTTP != 2xx)
 *
 * `email_sent` alanı client'ta iki farklı toast'ı ayırıyor: e-posta gitmediyse
 * kullanıcıya linki elle paylaşması söyleniyor. Yani Resend hatası ÖLÜMCÜL
 * DEĞİL — davet kaydı yine oluşturulup link döndürülmeli.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json, hata } from '../_shared/cors.ts'

const DAVET_GECERLILIK_GUNU = 7

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return hata('Method not allowed', 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

  try {
    // 1) Çağıranı JWT'den çöz. Client garage_id GÖNDERMİYOR; garaj token'dan
    //    bulunuyor, aksi halde başkasının garajına davet gönderilebilirdi.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return hata('Oturum bulunamadı', 401)

    const asCaller = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await asCaller.auth.getUser()
    if (userError || !user) return hata('Oturum geçersiz', 401)

    const { email } = await req.json().catch(() => ({}))
    const davetliEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (!davetliEmail.includes('@')) return hata('Geçerli bir e-posta adresi gir')
    if (davetliEmail === user.email?.toLowerCase()) return hata('Kendini davet edemezsin')

    // 2) Bundan sonrası service role: davet kaydı ve üyelik kontrolü RLS'in
    //    üstünde yapılmalı (davetli henüz üye değil, kendi satırını göremez).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Çağıranın SAHİBİ olduğu garaj. Yalnızca owner davet edebiliyor.
    const { data: garage } = await admin
      .from('garages').select('id, name').eq('owner_id', user.id).maybeSingle()
    if (!garage) return hata('Bu işlem için garaj sahibi olmalısın', 403)

    // Zaten bekleyen bir davet varsa yenisini üretmeyip mevcudu döndür —
    // idempotent davranış, kullanıcı iki kez tıklayınca iki link çıkmasın.
    const { data: mevcut } = await admin
      .from('garage_invitations')
      .select('token')
      .eq('garage_id', garage.id).eq('email', davetliEmail).eq('status', 'pending')
      .maybeSingle()

    let token = mevcut?.token
    if (!token) {
      token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + DAVET_GECERLILIK_GUNU * 86_400_000).toISOString()
      const { error: insertError } = await admin.from('garage_invitations').insert({
        garage_id: garage.id, email: davetliEmail, token,
        status: 'pending', expires_at: expiresAt,
      })
      if (insertError) return hata('Davet kaydedilemedi: ' + insertError.message, 500)
    }

    // Rota App.jsx:123'te `/accept-invite/:token` — bu yol birebir eşleşmeli.
    const inviteUrl = `${SITE_URL}/accept-invite/${token}`

    // 3) E-posta. Başarısızlığı ölümcül DEĞİL: client email_sent:false ile
    //    kullanıcıya linki elle paylaşmasını söylüyor.
    let emailSent = false
    if (RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: Deno.env.get('RESEND_FROM') ?? 'Garajım <onboarding@resend.dev>',
            to: davetliEmail,
            subject: `${garage.name} garajına davet edildin`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:520px">
                <h2 style="margin:0 0 12px">Garajım</h2>
                <p><strong>${garage.name}</strong> garajına davet edildin.</p>
                <p>
                  <a href="${inviteUrl}"
                     style="display:inline-block;background:#2563eb;color:#fff;
                            padding:12px 20px;border-radius:8px;text-decoration:none">
                    Daveti kabul et
                  </a>
                </p>
                <p style="color:#64748b;font-size:12px">
                  Bu bağlantı ${DAVET_GECERLILIK_GUNU} gün geçerlidir.
                </p>
              </div>`,
          }),
        })
        emailSent = res.ok
      } catch {
        emailSent = false
      }
    }

    return json({ email_sent: emailSent, invite_url: inviteUrl })
  } catch (err) {
    return hata(err instanceof Error ? err.message : 'Beklenmedik hata', 500)
  }
})
