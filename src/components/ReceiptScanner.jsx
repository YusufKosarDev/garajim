import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ScanText, Check, Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { fistenMetinOku, ocrKapat } from '../lib/ocr'
import { parseFisMetni } from '../utils/receiptParser'
import { captureError } from '../lib/errorTracking'

// Bu eşiğin altında Tesseract'ın kendi güveni düşük demektir (buruşuk fiş, gölge,
// düşük çözünürlük). Öneriyi gizlemiyoruz ama kullanıcıyı açıkça uyarıyoruz.
const DUSUK_GUVEN = 60

const ALANLAR = [
  { anahtar: 'tutar', etiket: 'Maliyet', bicim: v => `${v.toLocaleString('tr-TR')} ₺` },
  { anahtar: 'tarih', etiket: 'Tarih', bicim: v => v },
  { anahtar: 'km', etiket: 'KM', bicim: v => v.toLocaleString('tr-TR') },
]

/**
 * Fiş fotoğrafından tutar/tarih/km önerir.
 *
 * Kasıtlı olarak forma DOĞRUDAN YAZMIYOR: OCR yanılabilir ve yanlış bir km
 * aracın tüm bakım geçmişini bozar. Öneriler kaynak satırlarıyla birlikte
 * gösteriliyor, kullanıcı hangisini istiyorsa onu işaretleyip uyguluyor.
 */
export default function ReceiptScanner({ photo, onUygula }) {
  const { t } = useTranslation()

  const [okunuyor, setOkunuyor] = useState(false)
  // Sonuç, ÜRETİLDİĞİ FOTOĞRAFLA birlikte tutuluyor. Böylece kullanıcı fotoğrafı
  // değiştirdiğinde eski öneriler bir an bile görünemiyor — bunu bir effect'le
  // temizlemek zorunda kalmadan, render sırasında karşılaştırarak.
  const [sonuc, setSonuc] = useState(null)

  const gecerli = sonuc && sonuc.photo === photo ? sonuc : null

  // Modal kapanınca WASM worker'ını bırak
  useEffect(() => () => { ocrKapat() }, [])

  const tara = async () => {
    setOkunuyor(true)
    try {
      const { metin, guven } = await fistenMetinOku(photo)
      const oneriler = parseFisMetni(metin)
      const varMi = ALANLAR.some(a => oneriler[a.anahtar])

      setSonuc({
        photo,
        oneriler,
        guven,
        // Bulunan her alan varsayılan işaretli — kullanıcı istemediğini kaldırır
        secili: Object.fromEntries(ALANLAR.map(a => [a.anahtar, Boolean(oneriler[a.anahtar])])),
      })

      if (!varMi) toast(t('receiptScanner.fisten_okunabilir_bilgi_cikmadi'), { icon: '🔍' })
    } catch (hata) {
      captureError(hata, { yer: t('receiptScanner.fis_ocr') })
      toast.error(t('receiptScanner.fis_okunamadi_internet_baglantini_kontrol_et'))
    } finally {
      setOkunuyor(false)
    }
  }

  const secimDegistir = (anahtar, deger) =>
    setSonuc(s => (s ? { ...s, secili: { ...s.secili, [anahtar]: deger } } : s))

  const uygula = () => {
    const secilenler = {}
    for (const { anahtar } of ALANLAR) {
      if (gecerli.secili[anahtar] && gecerli.oneriler[anahtar]) {
        secilenler[anahtar] = gecerli.oneriler[anahtar].deger
      }
    }
    if (Object.keys(secilenler).length === 0) {
      toast.error(t('receiptScanner.uygulanacak_alan_secilmedi'))
      return
    }
    onUygula(secilenler)
    setSonuc(null)
    toast.success(t('receiptScanner.alanlar_dolduruldu_kaydetmeden_once_kontrol_et'))
  }

  if (!photo) return null

  const bulunanAlanlar = gecerli ? ALANLAR.filter(a => gecerli.oneriler[a.anahtar]) : []

  return (
    <div className="mt-2">
      {!gecerli ? (
        <button
          type="button"
          onClick={tara}
          disabled={okunuyor}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-blue-500/60 text-sm font-semibold text-slate-300 transition disabled:opacity-60"
        >
          {okunuyor ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              {t('receiptScanner.fis_okunuyor')}
            </>
          ) : (
            <>
              <ScanText className="w-4 h-4" aria-hidden="true" />
              {t('receiptScanner.fisten_bilgileri_oku')}
            </>
          )}
        </button>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 space-y-2">
          {bulunanAlanlar.length === 0 ? (
            <div className="text-xs text-slate-400">
              {t('receiptScanner.fisten_tutar_tarih_veya_kilometre_okunamadi')}
            </div>
          ) : (
            <>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {t('receiptScanner.fiste_bulunanlar')}
              </div>

              {gecerli.guven > 0 && gecerli.guven < DUSUK_GUVEN && (
                <div className="flex items-start gap-1.5 text-[11px] text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                  {t('receiptScanner.goruntu_net_okunamadi_degerleri_kontrol_et')}
                </div>
              )}

              {bulunanAlanlar.map(({ anahtar, etiket, bicim }) => (
                <label
                  key={anahtar}
                  className="flex items-start gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-slate-700/40 transition"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(gecerli.secili[anahtar])}
                    onChange={e => secimDegistir(anahtar, e.target.checked)}
                    className="mt-1 accent-blue-500"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="text-slate-400">{etiket}: </span>
                    <span className="font-semibold text-white">{bicim(gecerli.oneriler[anahtar].deger)}</span>
                    {/* Kaynak satır: kullanıcı neye onay verdiğini görsün */}
                    <span className="block text-[11px] text-slate-500 truncate" title={gecerli.oneriler[anahtar].kaynak}>
                      {gecerli.oneriler[anahtar].kaynak}
                    </span>
                  </span>
                </label>
              ))}
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSonuc(null)}
              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
            >
              Vazgeç
            </button>
            {bulunanAlanlar.length > 0 && (
              <button
                type="button"
                onClick={uygula}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold transition"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                {t('receiptScanner.alanlari_doldur')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
