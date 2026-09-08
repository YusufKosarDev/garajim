import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Mail, Save, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth-context'

/**
 * EmailNotificationSettings
 * 
 * Kullanıcının email bildirim tercihlerini yönetir.
 * Tablo: notification_preferences
 * 
 * - email_enabled: master switch
 * - notify_inspection: muayene
 * - notify_mtv: MTV
 * - notify_insurance: sigorta
 * - notify_kasko: kasko
 */
export default function EmailNotificationSettings() {
  const { t } = useTranslation()

  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState({
    email_enabled: true,
    notify_inspection: true,
    notify_mtv: true,
    notify_insurance: true,
    notify_kasko: true,
  })

  // Mevcut tercihleri yükle
  useEffect(() => {
    if (!user) return

    const loadPrefs = async () => {
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('email_enabled, notify_inspection, notify_mtv, notify_insurance, notify_kasko')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) {
          console.error('Notification prefs load error:', error)
          // Hata olsa bile default'la devam et
          return
        }

        // Kayıt varsa state'e yükle
        if (data) {
          setPrefs(data)
        }
        // Kayıt yoksa default'lar zaten state'te (hepsi true)
      } catch (err) {
        console.error('loadPrefs:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPrefs()
  }, [user])

  // Toggle değiştir
  const handleToggle = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Kaydet (upsert)
  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            ...prefs,
          },
          {
            onConflict: 'user_id',
          }
        )

      if (error) throw error

      toast.success(t('emailNotificationSettings.bildirim_tercihleri_kaydedildi'))
    } catch (err) {
      console.error('savePrefs:', err)
      toast.error(t('emailNotificationSettings.kaydedilemedi') + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Master switch kapalıysa diğer toggle'lar gri görünür
  const isMasterOff = !prefs.email_enabled

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Mail className="w-5 h-5 text-blue-400" />
        {t('emailNotificationSettings.email_bildirimleri')}
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        {t('emailNotificationSettings.yaklasan_muayene_mtv_sigorta_ve_kasko')}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Master Switch */}
          <ToggleRow
            label={t('emailNotificationSettings.tum_email_bildirimleri')}
            description={t('emailNotificationSettings.kapatirsan_hicbir_email_gonderilmez')}
            checked={prefs.email_enabled}
            onChange={() => handleToggle('email_enabled')}
            isMaster
          />

          <div className="h-px bg-slate-800 my-4" />

          {/* Specific Toggles */}
          <div className={`space-y-2 ${isMasterOff ? 'opacity-40' : ''}`}>
            <ToggleRow
              label={t('emailNotificationSettings.muayene_yaklasiyor')}
              description={t('emailNotificationSettings.arac_muayenesi_yaklastiginda_bildir')}
              checked={prefs.notify_inspection}
              onChange={() => handleToggle('notify_inspection')}
              disabled={isMasterOff}
            />
            <ToggleRow
              label={t('emailNotificationSettings.mtv_odemesi_yaklasiyor')}
              description={t('emailNotificationSettings.mtv_odeme_tarihi_yaklastiginda_bildir')}
              checked={prefs.notify_mtv}
              onChange={() => handleToggle('notify_mtv')}
              disabled={isMasterOff}
            />
            <ToggleRow
              label={t('emailNotificationSettings.sigorta_yenilemesi_yaklasiyor')}
              description={t('emailNotificationSettings.trafik_sigortasi_bitis_tarihi_yaklastiginda_bild')}
              checked={prefs.notify_insurance}
              onChange={() => handleToggle('notify_insurance')}
              disabled={isMasterOff}
            />
            <ToggleRow
              label={t('emailNotificationSettings.kasko_yenilemesi_yaklasiyor')}
              description={t('emailNotificationSettings.kasko_bitis_tarihi_yaklastiginda_bildir')}
              checked={prefs.notify_kasko}
              onChange={() => handleToggle('notify_kasko')}
              disabled={isMasterOff}
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-5 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-semibold transition"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('emailNotificationSettings.kaydediliyor')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t('emailNotificationSettings.kaydet')}
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}

/**
 * ToggleRow — Tek bir toggle satırı
 */
function ToggleRow({ label, description, checked, onChange, disabled, isMaster }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-full flex items-start justify-between gap-4 p-3 rounded-lg transition text-left ${
        disabled ? 'cursor-not-allowed' : 'hover:bg-slate-800/50 cursor-pointer'
      } ${isMaster ? 'bg-blue-500/5 border border-blue-500/20' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${isMaster ? 'text-blue-300' : 'text-white'}`}>
          {label}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          {description}
        </div>
      </div>
      <div
        className={`relative w-11 h-6 rounded-full transition flex-shrink-0 mt-0.5 ${
          checked ? 'bg-blue-600' : 'bg-slate-700'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  )
}