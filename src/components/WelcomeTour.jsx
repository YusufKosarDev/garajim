import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Car, Calendar, Wrench, Droplet, Bell, ChevronRight, ChevronLeft, X } from 'lucide-react'

const steps = [
  {
    icon: Car,
    color: 'blue',
    title: 'welcomeTour.araclarini_ekle',
    description: 'welcomeTour.ilk_olarak_garajindaki_araclari_ekle_plaka_mar',
    tip: 'welcomeTour.ne_kadar_arac_eklersen_o_kadar_kolay_takip_ede',
  },
  {
    icon: Calendar,
    color: 'purple',
    title: 'welcomeTour.onemli_tarihleri_gir',
    description: 'welcomeTour.muayene_mtv_sigorta_ve_kasko_tarihlerini_ekle',
    tip: 'welcomeTour.kirmizi_suresi_gecmis_sari_30_gun_ve_alti_yesi',
  },
  {
    icon: Wrench,
    color: 'green',
    title: 'welcomeTour.bakim_kayitlari',
    description: 'welcomeTour.her_yag_degisimi_filtre_lastik_gibi_bakimi_kay',
    tip: 'welcomeTour.ileride_araci_satarken_pdf_rapor_olarak_aliciy',
  },
  {
    icon: Droplet,
    color: 'orange',
    title: 'welcomeTour.yakit_takibi',
    description: 'welcomeTour.her_yakit_alimini_kaydet_uygulama_ortalama_tuk',
    tip: 'welcomeTour.tam_depo_doldurunca_depo_dolu_secenegini_isare',
  },
  {
    icon: Bell,
    color: 'red',
    title: 'welcomeTour.bildirimlere_izin_ver',
    description: 'welcomeTour.sag_ustteki_bildirimleri_ac_butonuyla_tarayici',
    tip: 'welcomeTour.30_15_7_1_gun_kala_ve_bitince_bildirim_alirsin',
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
  const { t } = useTranslation()

  const [currentStep, setCurrentStep] = useState(0)

  // "Prop değişince state'i sıfırla" — React'in belgelediği desen: efekt yerine
  // render sırasında ayarla. Efektle yapıldığında tur bir kare boyunca ESKİ
  // adımı gösterip sonra başa dönüyordu.
  const [prevOpen, setPrevOpen] = useState(isOpen)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) setCurrentStep(0)
  }

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
              aria-label={t('welcomeTour.turu_kapat')}
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
                <h2 className="text-2xl font-bold mb-3">{t(step.title)}</h2>
                <p className="text-slate-300 leading-relaxed">{t(step.description)}</p>
              </div>

              <div className={`${color.bg} ${color.border} border rounded-lg p-3 text-center text-sm text-slate-300 mb-6`}>
                {t(step.tip)}
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
                    {t('welcomeTour.geri')}
                  </button>
                )}

                {!isLast ? (
                  <>
                    <button
                      onClick={handleFinish}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg transition text-slate-400"
                    >
                      {t('welcomeTour.atla')}
                    </button>
                    <button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className={`flex-1 flex items-center justify-center gap-1 ${color.button} py-2.5 rounded-lg transition font-semibold`}
                    >
                      {t('welcomeTour.ileri')}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleFinish}
                    className={`flex-1 ${color.button} py-2.5 rounded-lg transition font-semibold`}
                  >
                    {t('welcomeTour.baslayalim')}
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