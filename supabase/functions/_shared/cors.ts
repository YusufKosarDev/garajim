/**
 * Ortak CORS başlıkları.
 *
 * Client bu fonksiyonları tarayıcıdan `fetch` ile çağırıyor (bkz.
 * GarageMembers.jsx, AcceptInvite.jsx, Profile.jsx), o yüzden preflight'a
 * cevap vermek zorunlu.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Client her iki dalda da JSON + kararlı bir `error: string` bekliyor. */
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

export const hata = (message: string, status = 400) => json({ error: message }, status)
