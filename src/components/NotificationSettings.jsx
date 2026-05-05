import { useState, useEffect } from 'react'
import { Bell, BellOff, Globe, RotateCcw, Trash2, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNotifications } from '../context/NotificationContext'
import { requestBrowserPermission, DEFAULT_NOTIFICATION_SETTINGS, getTypeConfig } from '../utils/notificationManager'
import { isHapticSupported, isHapticEnabled, setHapticEnabled, hapticMedium } from '../utils/hapticFeedback'
import ConfirmDialog from './ConfirmDialog'

const NOTIFICATION_TYPES = [
  { key: 'inspection', label: 'Muayene', description: 'Araç muayene tarihleri', hasThresholds: true },
  { key: 'mtv', label: 'MTV', description: 'Motorlu Taşıt Vergisi son ödeme', hasThresholds: true },
  { key: 'insurance', label: 'Trafik Sigortası', description: 'Sigorta yenileme tarihleri', hasThresholds: true },
  { key: 'kasko', label: 'Kasko', description: 'Kasko yenileme tarihleri', hasThresholds: true },
  { key: 'maintenance', label: 'Bakım Önerileri', description: 'Yağ değişimi, balata vb.', hasThresholds: false },
  { key: 'tireSeason', label: 'Lastik Mevsim Değişimi', description: 'Yazlık/kışlık geçiş uyarısı', hasThresholds: false },
]

const PRESET_THRESHOLDS = [
  { value: [60, 30, 7, 1], label: '60-30-7-1 gün (Sık)' },
  { value: [30, 7, 1], label: '30-7-1 gün (Önerilen)' },
  { value: [14, 3], label: '14-3 gün (Az)' },
  { value: [7], label: 'Sadece 7 gün' },
  { value: [1], label: 'Sadece son gün' },
]

export default function NotificationSettings() {
  const {
    settings,
    updateSettings,
    updateTypeSettings,
    clearAll,
    notifications,
  } = useNotifications()

  const [isClearOpen, setIsClearOpen] = useState(false)
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [hapticEnabled, setHapticState] = useState(isHapticEnabled())
  const hapticSupported = isHapticSupported()

  const handleToggleMaster = () => {
    updateSettings({ enabled: !settings.enabled })
    toast.success(settings.enabled ? 'Bildirimler kapatıldı' : 'Bildirimler açıldı')
  }

  const handleToggleBrowser = async () => {
    if (settings.browserNotifications) {
      updateSettings({ browserNotifications: false })
      toast.success('Tarayıcı bildirimleri kapatıldı')
    } else {
      const result = await requestBrowserPermission()
      if (result.granted) {
        updateSettings({ browserNotifications: true })
        toast.success('Tarayıcı bildirimleri aktif')
      } else if (result.denied) {
        toast.error('Tarayıcı izni reddedildi — tarayıcı ayarlarından açabilirsin')
      } else if (!result.supported) {
        toast.error('Tarayıcın bildirim desteklemiyor')
      }
    }
  }

  const handleToggleHaptic = () => {
    const newValue = !hapticEnabled
    setHapticState(newValue)
    setHapticEnabled(newValue)
    if (newValue) {
      hapticMedium() // Test titreşim
      toast.success('Titreşim açıldı')
    } else {
      toast.success('Titreşim kapatıldı')
    }
  }

  const handleToggleType = (typeKey) => {
    const current = settings[typeKey]?.enabled
    updateTypeSettings(typeKey, { enabled: !current })
  }

  const handleThresholdChange = (typeKey, newThresholds) => {
    updateTypeSettings(typeKey, { daysBefore: newThresholds })
    toast.success('Eşikler güncellendi')
  }

  const handleResetSettings = () => {
    Object.keys(DEFAULT_NOTIFICATION_SETTINGS).forEach(key => {
      if (typeof DEFAULT_NOTIFICATION_SETTINGS[key] === 'object') {
        updateTypeSettings(key, DEFAULT_NOTIFICATION_SETTINGS[key])
      } else {
        updateSettings({ [key]: DEFAULT_NOTIFICATION_SETTINGS[key] })
      }
    })
    toast.success('Bildirim ayarları varsayılana döndürüldü')
    setIsResetOpen(false)
  }

  const handleClearAll = () => {
    clearAll()
    toast.success('Tüm bildirimler silindi')
    setIsClearOpen(false)
  }

  const isMasterDisabled = !settings.enabled

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Bell className="w-5 h-5 text-blue-400" />
        Bildirim Ayarları
      </h2>
      <p className="text-sm text-slate-400 mb-5">
        Hangi olaylar için ve ne zaman bildirim alacağını seç
      </p>

      {/* Ana toggle */}
      <div className={`p-4 rounded-lg border-2 mb-4 transition ${
        settings.enabled
          ? 'bg-blue-500/10 border-blue-500/30'
          : 'bg-slate-800/50 border-slate-700'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              settings.enabled ? 'bg-blue-500/20' : 'bg-slate-800'
            }`}>
              {settings.enabled ? (
                <Bell className="w-5 h-5 text-blue-400" />
              ) : (
                <BellOff className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold">
                {settings.enabled ? 'Bildirimler Aktif' : 'Bildirimler Kapalı'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {settings.enabled
                  ? 'Yaklaşan tarihler ve bakım önerileri için uyarılar gelir'
                  : 'Hiçbir bildirim gelmeyecek'
                }
              </div>
            </div>
          </div>

          <ToggleSwitch
            checked={settings.enabled}
            onChange={handleToggleMaster}
          />
        </div>
      </div>

      {/* Browser bildirimleri */}
      <div className={`p-4 rounded-lg border mb-4 transition ${
        isMasterDisabled ? 'opacity-50 pointer-events-none' : ''
      } ${
        settings.browserNotifications
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-slate-800/50 border-slate-700'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Globe className={`w-5 h-5 shrink-0 ${
              settings.browserNotifications ? 'text-green-400' : 'text-slate-500'
            }`} />
            <div className="min-w-0">
              <div className="font-semibold text-sm">Tarayıcı Bildirimleri</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Önemli bildirimleri sistem üzerinden alır (uygulama açık olmasa bile)
              </div>
            </div>
          </div>

          <ToggleSwitch
            checked={settings.browserNotifications}
            onChange={handleToggleBrowser}
            disabled={isMasterDisabled}
          />
        </div>
      </div>

      {/* Haptic feedback (sadece destek varsa) */}
      {hapticSupported && (
        <div className={`p-4 rounded-lg border mb-4 transition ${
          hapticEnabled
            ? 'bg-purple-500/10 border-purple-500/30'
            : 'bg-slate-800/50 border-slate-700'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Smartphone className={`w-5 h-5 shrink-0 ${
                hapticEnabled ? 'text-purple-400' : 'text-slate-500'
              }`} />
              <div className="min-w-0">
                <div className="font-semibold text-sm">Titreşim (Haptic)</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Mobilde swipe ve önemli aksiyonlarda hafif titreşim
                </div>
              </div>
            </div>

            <ToggleSwitch
              checked={hapticEnabled}
              onChange={handleToggleHaptic}
            />
          </div>
        </div>
      )}

      {/* Türler */}
      <div className={`mb-4 ${isMasterDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Bildirim Türleri
        </h3>

        <div className="space-y-2">
          {NOTIFICATION_TYPES.map(type => {
            const typeSettings = settings[type.key] || { enabled: false, daysBefore: [30, 7, 1] }
            const config = getTypeConfig(type.key === 'tireSeason' ? 'tire-season' : type.key)

            return (
              <div
                key={type.key}
                className={`p-3 rounded-lg border transition ${
                  typeSettings.enabled
                    ? 'bg-slate-800/50 border-slate-700'
                    : 'bg-slate-800/20 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-base shrink-0">{config.icon}</span>
                    <div className="min-w-0">
                      <div className={`font-semibold text-sm ${
                        typeSettings.enabled ? 'text-white' : 'text-slate-400'
                      }`}>
                        {type.label}
                      </div>
                      <div className="text-xs text-slate-500">
                        {type.description}
                      </div>
                    </div>
                  </div>

                  <ToggleSwitch
                    checked={typeSettings.enabled}
                    onChange={() => handleToggleType(type.key)}
                    small
                  />
                </div>

                {/* Eşik seçimi */}
                {typeSettings.enabled && type.hasThresholds && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">
                      Kaç gün önceden uyar?
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_THRESHOLDS.map(preset => {
                        const isActive = JSON.stringify(typeSettings.daysBefore) === JSON.stringify(preset.value)
                        return (
                          <button
                            key={preset.label}
                            onClick={() => handleThresholdChange(type.key, preset.value)}
                            className={`text-[11px] px-2.5 py-1 rounded font-semibold transition border ${
                              isActive
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500">
                      Aktif eşikler: {typeSettings.daysBefore.join(', ')} gün
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Aksiyon butonları */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800">
        <button
          onClick={() => setIsResetOpen(true)}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg font-semibold transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Varsayılana Dön
        </button>

        {notifications.length > 0 && (
          <button
            onClick={() => setIsClearOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Tüm Bildirimleri Sil ({notifications.length})
          </button>
        )}
      </div>

      {/* Bilgi */}
      <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
        <p className="text-xs text-slate-400">
          💡 <strong className="text-slate-300">İpucu:</strong> Bildirimler her uygulama açılışında ve veri değişikliğinde otomatik güncellenir. Aynı uyarı 2 kez gösterilmez (deduplication).
        </p>
      </div>

      {/* Dialoglar */}
      <ConfirmDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirm={handleResetSettings}
        title="Ayarları varsayılana döndür?"
        message="Tüm bildirim türleri ve eşikleri varsayılan değerlere dönecek. Mevcut bildirimler silinmez."
        confirmText="Evet, sıfırla"
      />

      <ConfirmDialog
        isOpen={isClearOpen}
        onClose={() => setIsClearOpen(false)}
        onConfirm={handleClearAll}
        title="Tüm bildirimleri sil?"
        message={`${notifications.length} bildirim kalıcı olarak silinecek. Geçmiş bilgiler kaybolur ama kriterlere uyan yeni bildirimler tekrar oluşturulabilir.`}
        confirmText="Evet, hepsini sil"
      />
    </div>
  )
}

// Toggle switch bileşeni
function ToggleSwitch({ checked, onChange, disabled = false, small = false }) {
  const sizes = small
    ? { container: 'w-9 h-5', dot: 'w-3 h-3', translate: 'translate-x-4' }
    : { container: 'w-11 h-6', dot: 'w-4 h-4', translate: 'translate-x-5' }

  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative ${sizes.container} rounded-full transition shrink-0 ${
        checked ? 'bg-blue-600' : 'bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`absolute top-1 left-1 ${sizes.dot} bg-white rounded-full transition-transform ${
          checked ? sizes.translate : 'translate-x-0'
        }`}
      />
    </button>
  )
}