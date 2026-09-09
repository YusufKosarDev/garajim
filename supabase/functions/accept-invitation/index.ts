/**
 * accept-invitation — davet bağlantısıyla garaja katılma
 *
 * ⚠️  BU DOSYA CLIENT KODUNDAN TÜRETİLMİŞTİR (bkz. docs/database/README.md).
 *     HTTP SÖZLEŞMESİ KANITLI — AcceptInvite.jsx:54-83'ten birebir okunuyor.
 *     İç mantık kurgudur.
 *
 * Sözleşme:
 *   POST /functions/v1/accept-invitation
 *   Authorization: Bearer <kullanıcının access_token'ı>
 *   İstek : { token: string }
 *   Yanıt : { garage_name: string, already_member?: boolean }
 *   Hata  : { error: string }
 *
 * İDEMPOTENT OLMAK ZORUNDA: client `already_member` alanına bakıp farklı bir
 * toast gösteriyor (AcceptInvite.jsx:80). Yani aynı davet ikinci kez kabul
 * edilirse HATA DEĞİL, `already_member: true` dönmeli — kullanıcı bağlantıya
 * ikinci kez tıkladığında kırmızı bir hata görmemeli.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json, hata } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return hata('Method not allowed', 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return hata('Daveti kabul etmek için giriş yapmalısın', 401)

    const asCaller = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await asCaller.auth.getUser()
    if (userError || !user) return hata('Oturum geçersiz', 401)

    const { token } = await req.json().catch(() => ({}))
    if (typeof token !== 'string' || !token) return hata('Geçersiz davet bağlantısı')

    // Service role: davetli henüz üye değil, RLS altında davet satırını göremez.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: invitation } = await admin
      .from('garage_invitations')
      .select('id, garage_id, email, status, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (!invitation) return hata('Davet bulunamadı', 404)

    const { data: garage } = await admin
      .from('garages').select('id, name').eq('id', invitation.garage_id).maybeSingle()
    const garageName = garage?.name ?? 'Garaj'

    // İdempotenslik: zaten üyeyse hata değil, bilgi döndür. Bu kontrol
    // durum/son kullanma kontrollerinden ÖNCE geliyor — kabul edilmiş bir daveti
    // ikinci kez açan kullanıcı "davet kullanılmış" hatası görmemeli.
    const { data: mevcutUyelik } = await admin
      .from('garage_members')
      .select('id')
      .eq('garage_id', invitation.garage_id).eq('user_id', user.id)
      .maybeSingle()

    if (mevcutUyelik) return json({ garage_name: garageName, already_member: true })

    if (invitation.status === 'cancelled') return hata('Bu davet iptal edilmiş', 410)
    if (invitation.status === 'accepted') return hata('Bu davet daha önce kullanılmış', 410)
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return hata('Bu davetin süresi geçmiş', 410)
    }

    // Davet e-postası ile giriş yapılan hesap uyuşmalı; aksi halde bağlantıyı
    // ele geçiren biri başka bir hesapla garaja girebilirdi.
    if (invitation.email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
      return hata('Bu davet başka bir e-posta adresi için oluşturulmuş', 403)
    }

    const { error: memberError } = await admin.from('garage_members').insert({
      garage_id: invitation.garage_id, user_id: user.id, role: 'member',
    })
    if (memberError) return hata('Üyelik oluşturulamadı: ' + memberError.message, 500)

    await admin.from('garage_invitations')
      .update({ status: 'accepted' }).eq('id', invitation.id)

    return json({ garage_name: garageName, already_member: false })
  } catch (err) {
    return hata(err instanceof Error ? err.message : 'Beklenmedik hata', 500)
  }
})
