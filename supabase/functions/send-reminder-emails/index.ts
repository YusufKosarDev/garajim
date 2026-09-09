/**
 * send-reminder-emails — yaklaşan tarihler için günlük hatırlatma e-postası
 *
 * ⚠️  BU DOSYA EN ÇOK KURGU OLANI. Diğer üç fonksiyonun HTTP sözleşmesi client
 *     kodundan birebir okunabiliyordu; BUNUN HİÇ ÇAĞRI YERİ YOK — pg_cron
 *     tetikliyor. Dolayısıyla payload'ı, auth modeli ve yanıt şekli client'tan
 *     TÜRETİLEMİYOR.
 *
 *     Elde yalnızca davranışsal ipuçları var:
 *       • Her gün 09:00'da çalışıyor          (kök README.md:214, :356)
 *       • Eşikler 30 / 7 / 1 gün              (kök README.md:88)
 *       • Aciliyet renkleri: 1 gün kırmızı, 7 gün turuncu, 30 gün mavi (:94)
 *       • notification_preferences'ın 5 kolonunu okuyor (master + 4 toggle)
 *         (src/components/EmailNotificationSettings.jsx:43)
 *       • Muayene, MTV, sigorta, kasko tarihlerini kontrol ediyor
 *
 *     Aşağıdaki uygulama bu ipuçlarına uyuyor ama production'daki fonksiyonun
 *     kopyası olduğu İDDİA EDİLMİYOR. Ayrıntı: docs/database/README.md
 *
 * Tetikleme (bkz. docs/database/policies.sql'in sonundaki pg_cron taslağı):
 *   POST /functions/v1/send-reminder-emails
 *   Authorization: Bearer <service_role_key>
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json, hata } from '../_shared/cors.ts'

/** Kök README:88'deki eşikler ve :94'teki aciliyet renkleri */
const ESIKLER = [
  { gun: 1, renk: '#ef4444' },
  { gun: 7, renk: '#f97316' },
  { gun: 30, renk: '#3b82f6' },
]

/** Vehicle sütunu -> tercih sütunu -> e-postada görünen ad */
const TARIH_ALANLARI = [
  { sutun: 'inspection_date', tercih: 'notify_inspection', ad: 'Muayene' },
  { sutun: 'mtv_date', tercih: 'notify_mtv', ad: 'MTV' },
  { sutun: 'insurance_date', tercih: 'notify_insurance', ad: 'Trafik Sigortası' },
  { sutun: 'kasko_date', tercih: 'notify_kasko', ad: 'Kasko' },
] as const

const kalanGun = (tarih: string): number => {
  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  const hedef = new Date(tarih)
  hedef.setHours(0, 0, 0, 0)
  return Math.round((hedef.getTime() - bugun.getTime()) / 86_400_000)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

  // Cron dışından çağrılmasın: bu fonksiyon tüm kullanıcıların verisini okuyor.
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.includes(SERVICE_ROLE_KEY)) return hata('Yetkisiz', 401)
  if (!RESEND_API_KEY) return hata('RESEND_API_KEY tanımlı değil', 500)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  try {
    // Master switch kapalı olanları hiç çekmiyoruz.
    const { data: tercihler, error: tercihError } = await admin
      .from('notification_preferences')
      .select('user_id, email_enabled, notify_inspection, notify_mtv, notify_insurance, notify_kasko')
      .eq('email_enabled', true)
    if (tercihError) return hata(tercihError.message, 500)

    let gonderilen = 0

    for (const tercih of tercihler ?? []) {
      const { data: authUser } = await admin.auth.admin.getUserById(tercih.user_id)
      const email = authUser?.user?.email
      if (!email) continue

      const { data: vehicles } = await admin
        .from('vehicles')
        .select('plate, brand, model, inspection_date, mtv_date, insurance_date, kasko_date')
        .eq('user_id', tercih.user_id)

      const satirlar: { ad: string; arac: string; gun: number; renk: string }[] = []

      for (const vehicle of vehicles ?? []) {
        for (const alan of TARIH_ALANLARI) {
          if (!tercih[alan.tercih]) continue
          const tarih = vehicle[alan.sutun] as string | null
          if (!tarih) continue

          const gun = kalanGun(tarih)
          // Yalnızca eşiklerin TAM üstünde olanlar: her gün mail atmamak için.
          const esik = ESIKLER.find((e) => e.gun === gun)
          if (!esik) continue

          satirlar.push({
            ad: alan.ad,
            arac: `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
            gun,
            renk: esik.renk,
          })
        }
      }

      if (satirlar.length === 0) continue

      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:560px">
          <h2 style="margin:0 0 4px">Garajım</h2>
          <p style="color:#64748b;margin:0 0 20px">Yaklaşan tarihler</p>
          ${satirlar.map((s) => `
            <div style="border-left:4px solid ${s.renk};background:#f8fafc;
                        padding:12px 16px;margin-bottom:10px;border-radius:6px">
              <strong>${s.ad}</strong> — ${s.gun} gün kaldı<br />
              <span style="color:#64748b;font-size:13px">${s.arac}</span>
            </div>`).join('')}
          <p style="color:#94a3b8;font-size:12px;margin-top:20px">
            Bu hatırlatmaları Ayarlar → Bildirimler bölümünden kapatabilirsin.
          </p>
        </div>`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: Deno.env.get('RESEND_FROM') ?? 'Garajım <onboarding@resend.dev>',
          to: email,
          subject: `Garajım — ${satirlar.length} yaklaşan tarih`,
          html,
        }),
      })
      if (res.ok) gonderilen++
    }

    return json({ processed: tercihler?.length ?? 0, sent: gonderilen })
  } catch (err) {
    return hata(err instanceof Error ? err.message : 'Beklenmedik hata', 500)
  }
})
