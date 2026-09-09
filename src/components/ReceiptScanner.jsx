import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ScanText, Check, Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { readTextFromReceipt, closeOcrWorker } from '../lib/ocr'
import { parseReceiptText } from '../utils/receiptParser'
import { captureError } from '../lib/errorTracking'

// Bu eşiğin altında Tesseract'ın kendi güveni düşük demektir (buruşuk fiş, gölge,
// düşük çözünürlük). Öneriyi gizlemiyoruz ama kullanıcıyı açıkça uyarıyoruz.
const LOW_CONFIDENCE = 60

const FIELDS = [
  { key: 'amount', label: 'receiptScanner.field.maliyet', format: v => `${v.toLocaleString('tr-TR')} ₺` },
  { key: 'date', label: 'receiptScanner.field.tarih', format: v => v },
  { key: 'km', label: 'receiptScanner.field.km', format: v => v.toLocaleString('tr-TR') },
]

/**
 * Fiş fotoğrafından tutar/tarih/km önerir.
 *
 * Kasıtlı olarak forma DOĞRUDAN YAZMIYOR: OCR yanılabilir ve yanlış bir km
 * aracın tüm bakım geçmişini bozar. Öneriler kaynak satırlarıyla birlikte
 * gösteriliyor, kullanıcı hangisini istiyorsa onu işaretleyip uyguluyor.
 */
export default function ReceiptScanner({ photo, onApply }) {
  const { t } = useTranslation()

  const [scanning, setScanning] = useState(false)
  // Sonuç, ÜRETİLDİĞİ FOTOĞRAFLA birlikte tutuluyor. Böylece kullanıcı fotoğrafı
  // değiştirdiğinde eski öneriler bir an bile görünemiyor — bunu bir effect'le
  // temizlemek zorunda kalmadan, render sırasında karşılaştırarak.
  const [result, setResult] = useState(null)

  const valid = result && result.photo === photo ? result : null

  // Modal kapanınca WASM worker'ını bırak
  useEffect(() => () => { closeOcrWorker() }, [])

  const scan = async () => {
    setScanning(true)
    try {
      const { text, confidence } = await readTextFromReceipt(photo)
      const suggestions = parseReceiptText(text)
      const hasAny = FIELDS.some(a => suggestions[a.key])

      setResult({
        photo,
        suggestions,
        confidence,
        // Bulunan her alan varsayılan işaretli — kullanıcı istemediğini kaldırır
        selected: Object.fromEntries(FIELDS.map(a => [a.key, Boolean(suggestions[a.key])])),
      })

      if (!hasAny) toast(t('receiptScanner.fisten_okunabilir_bilgi_cikmadi'), { icon: '🔍' })
    } catch (error) {
      captureError(error, { where: t('receiptScanner.fis_ocr') })
      toast.error(t('receiptScanner.fis_okunamadi_internet_baglantini_kontrol_et'))
    } finally {
      setScanning(false)
    }
  }

  const secimDegistir = (key, value) =>
    setResult(s => (s ? { ...s, selected: { ...s.selected, [key]: value } } : s))

  const apply = () => {
    const selectedFields = {}
    for (const { key } of FIELDS) {
      if (valid.selected[key] && valid.suggestions[key]) {
        selectedFields[key] = valid.suggestions[key].value
      }
    }
    if (Object.keys(selectedFields).length === 0) {
      toast.error(t('receiptScanner.uygulanacak_alan_secilmedi'))
      return
    }
    onApply(selectedFields)
    setResult(null)
    toast.success(t('receiptScanner.alanlar_dolduruldu_kaydetmeden_once_kontrol_et'))
  }

  if (!photo) return null

  const foundFields = valid ? FIELDS.filter(a => valid.suggestions[a.key]) : []

  return (
    <div className="mt-2">
      {!valid ? (
        <button
          type="button"
          onClick={scan}
          disabled={scanning}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-blue-500/60 text-sm font-semibold text-slate-300 transition disabled:opacity-60"
        >
          {scanning ? (
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
          {foundFields.length === 0 ? (
            <div className="text-xs text-slate-400">
              {t('receiptScanner.fisten_tutar_tarih_veya_kilometre_okunamadi')}
            </div>
          ) : (
            <>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {t('receiptScanner.fiste_bulunanlar')}
              </div>

              {valid.confidence > 0 && valid.confidence < LOW_CONFIDENCE && (
                <div className="flex items-start gap-1.5 text-[11px] text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                  {t('receiptScanner.goruntu_net_okunamadi_degerleri_kontrol_et')}
                </div>
              )}

              {foundFields.map(({ key, label, format }) => (
                <label
                  key={key}
                  className="flex items-start gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-slate-700/40 transition"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(valid.selected[key])}
                    onChange={e => secimDegistir(key, e.target.checked)}
                    className="mt-1 accent-blue-500"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="text-slate-400">{label}: </span>
                    <span className="font-semibold text-white">{format(valid.suggestions[key].value)}</span>
                    {/* Kaynak satır: kullanıcı neye onay verdiğini görsün */}
                    <span className="block text-[11px] text-slate-500 truncate" title={valid.suggestions[key].sourceLine}>
                      {valid.suggestions[key].sourceLine}
                    </span>
                  </span>
                </label>
              ))}
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setResult(null)}
              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
            >
              {t('receiptScanner.vazgec')}
            </button>
            {foundFields.length > 0 && (
              <button
                type="button"
                onClick={apply}
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
