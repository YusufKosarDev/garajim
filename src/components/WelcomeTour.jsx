import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Car, Calendar, Wrench, Droplet, Bell, ChevronRight, ChevronLeft, X } from 'lucide-react'

const steps = [
  {
    icon: Car,
    color: 'blue',
    title: 'Araçlarını Ekle',
    description: 'İlk olarak garajındaki araçları ekle. Plaka, marka, model ve opsiyonel olarak fotoğraf ekleyebilirsin.',
    tip: '💡 Ne kadar araç eklersen o kadar kolay takip edersin',
  },
  {
    icon: Calendar,
    color: 'purple',
    title: 'Önemli Tarihleri Gir',
    description: 'Muayene, MTV, sigorta ve kasko tarihlerini ekle. Uygulama tarih yaklaşınca seni uyarır.',
    tip: '🔴 Kırmızı = süresi geçmiş, 🟡 Sarı = 30 gün ve altı, 🟢 Yeşil = güvende',
  },
  {
    icon: Wrench,
    color: 'green',
    title: 'Bakım Kayıtları',
    description: 'Her yağ değişimi, filtre, lastik gibi bakımı kaydet. Harcamalarını ve geçmişini tek yerde gör.',
    tip: '📄 İleride aracı satarken PDF rapor olarak alıcıya verebilirsin',
  },
  {
    icon: Droplet,
    color: 'orange',
    title: 'Yakıt Takibi',
    description: 'Her yakıt alımını kaydet. Uygulama ortalama tüketimini hesaplar ve trend grafiği gösterir.',
    tip: '⛽ Tam depo doldurunca "Depo dolu" seçeneğini işaretle',
  },
  {
    icon: Bell,
    color: 'red',
    title: 'Bildirimlere İzin Ver',
    description: 'Sağ üstteki "Bildirimleri Aç" butonuyla tarayıcı bildirimlerine izin ver. Tarih yaklaşınca haber verelim.',
    tip: '🔔 30, 15, 7, 1 gün kala ve bitince bildirim alırsın',
  },
]

const colors = {
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', button: 'bg-blue-600 hover:bg-blue-700' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', button: 'bg-purple-600 hover:bg-purple-700' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', button: 'bg-green-600 hover:bg-green-700' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', button: 'bg-orange-600 hover:bg-orange-700' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', button: 'bg-red-600 hover:bg-red-700' },
}

export default function WelcomeTour({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (isOpen) setCurrentStep(0)
  }, [isOpen])

  const step = steps[currentStep]
  const Icon = step?.icon
  const color = colors[step?.color]
  const isLast = currentStep === steps.length - 1

  const handleFinish = () => {
    localStorage.setItem('garajim_onboarding_completed', 'true')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && step && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl relative"
          >
            <button
              onClick={handleFinish}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* İçerik */}
            <div className="p-8">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${color.bg} ${color.border} border`}>
                <Icon className={`w-8 h-8 ${color.text}`} />
              </div>

              <div className="text-center mb-5">
                <div className="text-xs text-slate-500 font-semibold mb-2">
                  ADIM {currentStep + 1} / {steps.length}
                </div>
                <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
                <p className="text-slate-300 leading-relaxed">{step.description}</p>
              </div>

              <div className={`${color.bg} ${color.border} border rounded-lg p-3 text-center text-sm text-slate-300 mb-6`}>
                {step.tip}
              </div>

              {/* Progress Bar */}
              <div className="flex gap-1.5 mb-6">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      i <= currentStep ? color.text.replace('text', 'bg') : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Navigasyon */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Geri
                  </button>
                )}

                {!isLast ? (
                  <>
                    <button
                      onClick={handleFinish}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg transition text-slate-400"
                    >
                      Atla
                    </button>
                    <button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className={`flex-1 flex items-center justify-center gap-1 ${color.button} py-2.5 rounded-lg transition font-semibold`}
                    >
                      İleri
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleFinish}
                    className={`flex-1 ${color.button} py-2.5 rounded-lg transition font-semibold`}
                  >
                    🚀 Başlayalım!
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}