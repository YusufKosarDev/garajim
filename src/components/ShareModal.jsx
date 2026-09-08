import { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeCanvas } from 'qrcode.react'
import { Share2, Copy, Check, ExternalLink, AlertTriangle, Info, Send, QrCode, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  createShareUrl,
  copyToClipboard,
  isNativeShareSupported,
  shareNatively,
  getShareUrlSize,
} from '../utils/shareHelpers'
import { hapticMedium } from '../utils/hapticFeedback'
import Modal from './Modal'

export default function ShareModal({ isOpen, onClose, vehicle, maintenanceRecords, fuelRecords }) {
  const { t } = useTranslation()

  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const qrCanvasRef = useRef(null)

  // Paylaşım URL'i state DEĞİL, türetilmiş değer: girdilerin saf bir
  // fonksiyonu. State'te tutulduğunda modal ilk karede boş bir URL ile
  // render oluyor, sonra efekt ikinci bir render tetikliyordu.
  // lz-string sıkıştırması pahalı olduğu için useMemo ile korunuyor.
  const shareUrl = useMemo(
    () => (isOpen && vehicle ? createShareUrl(vehicle, maintenanceRecords, fuelRecords) : ''),
    [isOpen, vehicle, maintenanceRecords, fuelRecords]
  )
  const urlSize = useMemo(
    () => (shareUrl ? getShareUrlSize(shareUrl) : { chars: 0, kb: '0' }),
    [shareUrl]
  )

  // Modal her açıldığında kopyalandı/QR durumunu sıfırla — efekt yerine
  // render sırasında ayarlama (React'in belgelediği desen).
  const [oncekiAcik, setOncekiAcik] = useState(isOpen)
  if (isOpen !== oncekiAcik) {
    setOncekiAcik(isOpen)
    if (isOpen) {
      setCopied(false)
      setShowQR(false)
    }
  }

  const handleCopy = async () => {
    const success = await copyToClipboard(shareUrl)
    if (success) {
      setCopied(true)
      hapticMedium()
      toast.success(t('shareModal.link_kopyalandi'))
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error(t('shareModal.kopyalama_basarisiz'))
    }
  }

  const handleNativeShare = async () => {
    const result = await shareNatively({
      title: `${vehicle.brand} ${vehicle.model} - Garajım Raporu`,
      text: `${vehicle.brand} ${vehicle.model} (${vehicle.plate}) için detaylı bakım ve yakıt raporu`,
      url: shareUrl,
    })

    if (result.success) {
      hapticMedium()
      toast.success(t('shareModal.paylasildi'))
    } else if (result.reason === 'unsupported') {
      toast.error(t('shareModal.tarayicin_native_paylasimi_desteklemiyor'))
    }
  }

  const handleOpenInNewTab = () => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  const handleToggleQR = () => {
    hapticMedium()
    setShowQR(prev => !prev)
  }

  const handleDownloadQR = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas')
    if (!canvas) {
      toast.error(t('shareModal.qr_kod_henuz_hazir_degil'))
      return
    }

    try {
      // Daha büyük boyutlu yeni canvas oluştur (downloadable kalitede)
      const downloadCanvas = document.createElement('canvas')
      const size = 1024
      downloadCanvas.width = size
      downloadCanvas.height = size
      const ctx = downloadCanvas.getContext('2d')

      // Beyaz arka plan
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)

      // QR'ı ortalayarak çiz
      const padding = 60
      const qrSize = size - (padding * 2)
      ctx.drawImage(canvas, padding, padding, qrSize, qrSize)

      // PNG olarak indir
      const dataUrl = downloadCanvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `garajim-${vehicle.plate.replace(/\s/g, '')}-qr.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      hapticMedium()
      toast.success(t('shareModal.qr_kod_indirildi'))
    } catch (err) {
      console.error(err)
      toast.error(t('shareModal.indirme_basarisiz'))
    }
  }

  if (!vehicle) return null

  const totalRecords = maintenanceRecords.length + fuelRecords.length
  const isLargeUrl = urlSize.chars > 5000
  const isQRTooLarge = urlSize.chars > 2900 // QR kod kapasite limiti
  const nativeSupported = isNativeShareSupported()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('shareModal.araci_paylas')}
      maxWidth="max-w-lg"
    >
      <div className="p-5 space-y-4">
        {/* Header bilgisi */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{vehicle.brand} {vehicle.model}</div>
              <div className="text-xs text-slate-400">
                {vehicle.plate} • {totalRecords} kayıt paylaşılacak
              </div>
            </div>
          </div>
        </div>

        {/* Bilgi kutusu */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <p>
                <strong className="text-blue-400">{t('shareModal.read_only_paylasim')}</strong> {t('shareModal.link_alan_kisi_raporu_sadece_goruntuleyebilir')}
              </p>
              <p className="mt-1.5 text-slate-400">
                {t('shareModal.veriler_url_in_icine_gomuludur_bir')}
              </p>
            </div>
          </div>
        </div>

        {/* Paylaşılacak içerik özeti */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-800">
            <div className="text-xl font-bold text-blue-400">{maintenanceRecords.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{t('shareModal.bakim')}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-800">
            <div className="text-xl font-bold text-orange-400">{fuelRecords.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{t('shareModal.yakit')}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-800">
            <div className={`text-xl font-bold ${isLargeUrl ? 'text-yellow-400' : 'text-green-400'}`}>
              {urlSize.kb}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">KB</div>
          </div>
        </div>

        {/* URL büyük uyarısı */}
        {isLargeUrl && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <strong className="text-yellow-400">{t('shareModal.uzun_url')}</strong> {t('shareModal.cok_fazla_kayit_oldugu_icin_url')}
              </div>
            </div>
          </div>
        )}

        {/* Paylaşım URL */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
            {t('shareModal.paylasim_linki')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              onClick={(e) => e.target.select()}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 truncate"
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-1.5 shrink-0 ${
                copied
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title={t('shareModal.kopyala')}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('shareModal.kopyalandi')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('shareModal.kopyala')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* QR Code Toggle */}
        {!isQRTooLarge && (
          <div>
            <button
              onClick={handleToggleQR}
              className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition border ${
                showQR
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                {showQR ? 'QR Kodu Gizle' : t('shareModal.qr_kod_olustur')}
              </span>
              <span className="text-[10px] text-slate-500">
                {showQR ? '▲' : '▼'}
              </span>
            </button>

            {/* QR Code Display */}
            {showQR && (
              <div className="mt-3 p-4 bg-white rounded-xl border border-slate-700">
                <div className="flex flex-col items-center gap-3">
                  <div ref={qrCanvasRef} className="bg-white p-2 rounded-lg">
                    <QRCodeCanvas
                      value={shareUrl}
                      size={200}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                      includeMargin={false}
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-700">
                      {t('shareModal.telefonla_tara')}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {t('shareModal.kamerayi_qr_koda_tut_link_otomatik')}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadQR}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('shareModal.qr_kodu_png_indir')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* QR çok büyük uyarısı */}
        {isQRTooLarge && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <strong className="text-orange-400">{t('shareModal.qr_kod_olusturulamadi')}</strong> Veri çok büyük (URL {urlSize.chars} karakter). QR kodları en fazla ~2900 karakter destekler. Linki manuel kopyala veya kayıt sayısını azalt.
              </div>
            </div>
          </div>
        )}

        {/* Aksiyon butonları */}
        <div className="space-y-2 pt-2">
          {nativeSupported && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2.5 rounded-lg font-semibold transition"
            >
              <Send className="w-4 h-4" />
              {t('shareModal.paylasim_menusunu_ac')}
            </button>
          )}

          <button
            onClick={handleOpenInNewTab}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg font-semibold transition border border-slate-700"
          >
            <ExternalLink className="w-4 h-4" />
            {t('shareModal.yeni_sekmede_onizle')}
          </button>

          <button
            onClick={onClose}
            className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-400 py-2 rounded-lg text-sm transition"
          >
            Kapat
          </button>
        </div>

        {/* Footer not */}
        <div className="text-[10px] text-slate-500 text-center pt-2 border-t border-slate-800">
          {t('shareModal.fotograflar_paylasima_dahil_edilmez_url_boyut')}
        </div>
      </div>
    </Modal>
  )
}