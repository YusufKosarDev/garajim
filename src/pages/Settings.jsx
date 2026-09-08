import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Download, Upload, Trash2, Database, AlertTriangle, Info, Smartphone, Wifi, WifiOff, CheckCircle, User, LogOut, CloudUpload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/vehicle-context'
import { useAuth } from '../context/auth-context'
import { exportData, parseImportFile } from '../utils/backup'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePWA } from '../hooks/usePWA'
import { migrateDataToSupabase, hasLocalStorageData, getLocalStorageData, clearLocalStorageData } from '../lib/dataMigration'
import LanguageSwitcher from '../components/LanguageSwitcher'
import PageTransition from '../components/PageTransition'
import ConfirmDialog from '../components/ConfirmDialog'
import StorageIndicator from '../components/StorageIndicator'
import MaintenanceIntervals from '../components/MaintenanceIntervals'
import NotificationSettings from '../components/NotificationSettings'
import EmailNotificationSettings from '../components/EmailNotificationSettings'
import GarageMembers from '../components/GarageMembers'
import MigrationModal from '../components/MigrationModal'

export default function Settings({ onShowTour }) {
  const { t } = useTranslation()

  usePageTitle(t('settings.ayarlar'))

  const {
    vehicles,
    maintenanceRecords,
    fuelRecords,
    customIntervals,
    tireSets,
    tireChanges,
    clearAllData,
  } = useVehicles()

  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const { isInstalled, isOnline, canInstall, install } = usePWA()

  const [isClearOpen, setIsClearOpen] = useState(false)
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const [migrationData, setMigrationData] = useState(null)
  const [isMigrationOpen, setIsMigrationOpen] = useState(false)
  // localStorage senkron okunuyor: efekt içinde setState yerine lazy
  // initializer. Efektle yapıldığında ilk render "eski veri yok" diyor,
  // hemen ardından ikinci bir render geliyordu.
  const [hasOldData, setHasOldData] = useState(() => hasLocalStorageData())
  const [isClearLocalOpen, setIsClearLocalOpen] = useState(false)
  const fileInputRef = useRef(null)

  const handleExport = () => {
    if (vehicles.length === 0 && maintenanceRecords.length === 0 && fuelRecords.length === 0) {
      toast.error(t('settings.yedeklenecek_veri_yok'))
      return
    }
    exportData(vehicles, maintenanceRecords, fuelRecords, customIntervals, tireSets, tireChanges)
    toast.success(t('settings.yedek_dosyasi_indirildi'))
  }

  // JSON dosyası seçildiğinde Migration modal'ı aç
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await parseImportFile(file)
      setMigrationData(data)
      setIsMigrationOpen(true)
    } catch (err) {
      toast.error(err.message)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // LocalStorage'daki eski verileri buluta yükle
  const handleMigrateLocalStorage = () => {
    const data = getLocalStorageData()
    if (!data) {
      toast.error(t('settings.localstorage_da_veri_bulunamadi'))
      return
    }
    setMigrationData(data)
    setIsMigrationOpen(true)
  }

  // Migration'ı çalıştır (MigrationModal'dan çağrılır)
  const runMigration = async (onProgress) => {
    if (!user?.id) {
      throw new Error(t('settings.kullanici_oturumu_yok'))
    }
    return await migrateDataToSupabase(migrationData, user.id, onProgress)
  }

  // Migration modal kapatıldığında
  const handleMigrationClose = () => {
    setIsMigrationOpen(false)
    setMigrationData(null)
    // LocalStorage durumunu yeniden kontrol et
    setHasOldData(hasLocalStorageData())
    // Sayfayı reload etmek yerine kullanıcıya bilgi ver
    toast.success(t('settings.veriler_yenilendi_dashboarda_donmek_icin_f5'), { duration: 4000 })
  }

  const handleClearLocalStorage = () => {
    clearLocalStorageData()
    setHasOldData(false)
    toast.success(t('settings.eski_yerel_veriler_temizlendi'))
  }

  const handleInstall = async () => {
    const installed = await install()
    if (installed) {
      toast.success(t('settings.uygulama_yuklendi'))
    }
  }

  const handleLogout = async () => {
    setIsLogoutOpen(false)
    const { error } = await signOut()
    if (error) {
      toast.error(t('settings.cikis_yapilamadi') + error.message)
      return
    }
    toast.success(t('settings.gorusuruz'))
    navigate('/login', { replace: true })
  }

  return (
    <PageTransition>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t('settings.ayarlar')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('settings.verilerini_yonet_yedekle_veya_geri_yukle')}</p>
        </div>

        {/* LocalStorage'da Eski Veri Uyarısı */}
        {hasOldData && (
          <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2 text-blue-400">
              <CloudUpload className="w-5 h-5" />
              {t('settings.eski_yerel_verilerin_var')}
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              {t('settings.cihazinda_eski_localstorage_verilerin_var_buluta')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleMigrateLocalStorage}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg font-semibold transition"
              >
                <CloudUpload className="w-4 h-4" />
                {t('settings.buluta_yukle')}
              </button>
              <button
                onClick={() => setIsClearLocalOpen(true)}
                className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-lg font-medium transition border border-slate-600"
              >
                Yerel Verileri Temizle
              </button>
            </div>
          </div>
        )}

        {/* Dil seçimi (madde 29) */}
        <LanguageSwitcher />

        {/* Uygulama Durumu */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            {t('settings.uygulama_durumu')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Install durumu */}
            <div className={`p-4 rounded-lg border ${
              isInstalled
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-slate-800/50 border-slate-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isInstalled ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Smartphone className="w-4 h-4 text-slate-400" />
                )}
                <span className={`text-xs font-semibold uppercase tracking-wide ${
                  isInstalled ? 'text-green-400' : 'text-slate-400'
                }`}>
                  {t('settings.yukleme_durumu')}
                </span>
              </div>
              <div className="text-sm font-bold">
                {isInstalled ? t('settings.yuklu') : t('settings.tarayicida_calisiyor')}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isInstalled
                  ? t('settings.uygulama_cihazina_yuklendi_native_app_gibi')
                  : t('settings.ana_ekranina_ekleyerek_native_app_deneyimi')
                }
              </p>
              {canInstall && !isInstalled && (
                <button
                  onClick={handleInstall}
                  className="mt-3 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('settings.simdi_yukle')}
                </button>
              )}
            </div>

            {/* Online durumu */}
            <div className={`p-4 rounded-lg border ${
              isOnline
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-yellow-400" />
                )}
                <span className={`text-xs font-semibold uppercase tracking-wide ${
                  isOnline ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {t('settings.baglanti')}
                </span>
              </div>
              <div className="text-sm font-bold">
                {isOnline ? t('settings.cevrimici') : t('settings.cevrimdisi')}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isOnline
                  ? t('settings.tum_ozellikler_aktif')
                  : t('settings.verilerin_bulutta_sakli_internet_gerekli')
                }
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300">
                Garajım <strong>{t('settings.supabase')}</strong> {t('settings.bulut_altyapisiyla_calisir_verilerin_guvenli_sif')}
              </p>
            </div>
          </div>
        </div>

        {/* Veri özeti */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            {t('settings.veri_ozeti')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{vehicles.length}</div>
              <div className="text-xs text-slate-400 mt-1">{t('settings.arac')}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{maintenanceRecords.length}</div>
              <div className="text-xs text-slate-400 mt-1">{t('settings.bakim_kaydi')}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{fuelRecords.length}</div>
              <div className="text-xs text-slate-400 mt-1">{t('settings.yakit_kaydi')}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{Object.keys(customIntervals).length}</div>
              <div className="text-xs text-slate-400 mt-1">{t('settings.ozel_periyot')}</div>
            </div>
          </div>
        </div>

        <StorageIndicator />

        <GarageMembers />

        <EmailNotificationSettings />

        <NotificationSettings />

        <MaintenanceIntervals />

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <Download className="w-5 h-5 text-green-400" />
            {t('settings.yedekleme')}
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            {t('settings.tum_verilerini_json_dosyasi_olarak_indir')}
          </p>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-5 py-2.5 rounded-lg font-semibold transition"
          >
            <Download className="w-4 h-4" />
            {t('settings.verileri_indir_json')}
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            {t('settings.buluta_yukleme_geri_yukleme')}
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            {t('settings.daha_once_indirdigin_yedek_dosyasini_buluta')}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg font-semibold transition"
          >
            <Upload className="w-4 h-4" />
            {t('settings.yedek_dosyasi_sec')}
          </button>

          <div className="mt-4 flex gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              {t('settings.dosya_sectikten_sonra')} <strong>{t('settings.onay_ekrani')}</strong> {t('settings.gelecek_mevcut_supabase_verilerin_etkilenmez_yed')}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <span className="text-xl">💡</span>
            {t('settings.kullanim_rehberi')}
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            {t('settings.garajim_nasil_kullanilir_tanitim_turunu_tekrar')}
          </p>
          <button
            onClick={onShowTour}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg font-semibold transition"
          >
            Rehberi Tekrar Göster
          </button>
        </div>

        {/* Hesap Bölümü */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            {t('settings.hesap')}
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            {t('settings.giris_yaptigin_hesap_bilgileri_ve_oturum')}
          </p>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-400 mb-0.5">{t('settings.email')}</div>
                <div className="text-sm text-white font-medium truncate">
                  {user?.email || 'Misafir'}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsLogoutOpen(true)}
            className="flex items-center gap-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30 px-5 py-2.5 rounded-lg font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            {t('settings.cikis_yap')}
          </button>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            {t('settings.tehlikeli_bolge')}
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            {t('settings.tum_verilerini_silmek_geri_alinamaz_bir')}
          </p>
          <button
            onClick={() => setIsClearOpen(true)}
            disabled={vehicles.length === 0 && maintenanceRecords.length === 0 && fuelRecords.length === 0}
            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-5 py-2.5 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {t('settings.tum_verileri_sil')}
          </button>
        </div>

        <ConfirmDialog
          isOpen={isClearOpen}
          onClose={() => setIsClearOpen(false)}
          onConfirm={clearAllData}
          title={t('settings.tum_veriler_silinsin_mi')}
          message={`${vehicles.length} araç, ${maintenanceRecords.length} bakım ve ${fuelRecords.length} yakıt kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          confirmText="Evet, hepsini sil"
        />

        <ConfirmDialog
          isOpen={isClearLocalOpen}
          onClose={() => setIsClearLocalOpen(false)}
          onConfirm={handleClearLocalStorage}
          title={t('settings.eski_yerel_veriler_silinsin_mi')}
          message="Tarayıcıda kalan eski LocalStorage verileri silinecek. Supabase'deki verilerin etkilenmez."
          confirmText="Evet, temizle"
          variant="warning"
        />

        <ConfirmDialog
          isOpen={isLogoutOpen}
          onClose={() => setIsLogoutOpen(false)}
          onConfirm={handleLogout}
          title={t('settings.cikis_yapilsin_mi')}
          message="Hesabından çıkış yapmak istediğine emin misin? Tekrar giriş yapana kadar verilerine erişemezsin."
          confirmText="Evet, çıkış yap"
        />

        <MigrationModal
          isOpen={isMigrationOpen}
          onClose={handleMigrationClose}
          data={migrationData}
          onConfirm={runMigration}
        />
      </div>
    </PageTransition>
  )
}