import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Upload, Trash2, Database, AlertTriangle, Info, Smartphone, Wifi, WifiOff, CheckCircle, User, LogOut, CloudUpload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/VehicleContext'
import { useAuth } from '../context/AuthContext'
import { exportData, parseImportFile } from '../utils/backup'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePWA } from '../hooks/usePWA'
import { migrateDataToSupabase, hasLocalStorageData, getLocalStorageData, clearLocalStorageData } from '../lib/dataMigration'
import PageTransition from '../components/PageTransition'
import ConfirmDialog from '../components/ConfirmDialog'
import StorageIndicator from '../components/StorageIndicator'
import MaintenanceIntervals from '../components/MaintenanceIntervals'
import NotificationSettings from '../components/NotificationSettings'
import EmailNotificationSettings from '../components/EmailNotificationSettings'
import MigrationModal from '../components/MigrationModal'

export default function Settings({ onShowTour }) {
  usePageTitle('Ayarlar')

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
  const [hasOldData, setHasOldData] = useState(false)
  const fileInputRef = useRef(null)

  // LocalStorage'da eski veri var mı kontrol et (sayfa açılınca bir kez)
  useEffect(() => {
    setHasOldData(hasLocalStorageData())
  }, [])

  const handleExport = () => {
    if (vehicles.length === 0 && maintenanceRecords.length === 0 && fuelRecords.length === 0) {
      toast.error('Yedeklenecek veri yok')
      return
    }
    exportData(vehicles, maintenanceRecords, fuelRecords, customIntervals, tireSets, tireChanges)
    toast.success('Yedek dosyası indirildi 💾')
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
      toast.error('LocalStorage\'da veri bulunamadı')
      return
    }
    setMigrationData(data)
    setIsMigrationOpen(true)
  }

  // Migration'ı çalıştır (MigrationModal'dan çağrılır)
  const runMigration = async (onProgress) => {
    if (!user?.id) {
      throw new Error('Kullanıcı oturumu yok')
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
    toast.success('Veriler yenilendi! Dashboard\'a dönmek için F5 yapabilirsin.', { duration: 4000 })
  }

  const handleClearLocalStorage = () => {
    const confirmed = window.confirm(
      'LocalStorage\'daki eski yerel verileri silmek istediğine emin misin? Supabase verilerin etkilenmez.'
    )
    if (!confirmed) return

    clearLocalStorageData()
    setHasOldData(false)
    toast.success('Eski yerel veriler temizlendi')
  }

  const handleInstall = async () => {
    const installed = await install()
    if (installed) {
      toast.success('Uygulama yüklendi 📱')
    }
  }

  const handleLogout = async () => {
    setIsLogoutOpen(false)
    const { error } = await signOut()
    if (error) {
      toast.error('Çıkış yapılamadı: ' + error.message)
      return
    }
    toast.success('Görüşürüz! 👋')
    navigate('/login', { replace: true })
  }

  return (
    <PageTransition>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Ayarlar</h1>
          <p className="text-slate-400 text-sm mt-1">Verilerini yönet, yedekle veya geri yükle</p>
        </div>

        {/* LocalStorage'da Eski Veri Uyarısı */}
        {hasOldData && (
          <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2 text-blue-400">
              <CloudUpload className="w-5 h-5" />
              Eski Yerel Verilerin Var!
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              Cihazında eski LocalStorage verilerin var. Buluta yükleyerek tüm cihazlarda kullanabilirsin.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleMigrateLocalStorage}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg font-semibold transition"
              >
                <CloudUpload className="w-4 h-4" />
                Buluta Yükle
              </button>
              <button
                onClick={handleClearLocalStorage}
                className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-lg font-medium transition border border-slate-600"
              >
                Yerel Verileri Temizle
              </button>
            </div>
          </div>
        )}

        {/* Uygulama Durumu */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            Uygulama Durumu
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
                  Yükleme Durumu
                </span>
              </div>
              <div className="text-sm font-bold">
                {isInstalled ? 'Yüklü ✓' : 'Tarayıcıda çalışıyor'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isInstalled
                  ? 'Uygulama cihazına yüklendi, native app gibi çalışıyor'
                  : 'Ana ekranına ekleyerek native app deneyimi yaşayabilirsin'
                }
              </p>
              {canInstall && !isInstalled && (
                <button
                  onClick={handleInstall}
                  className="mt-3 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Şimdi Yükle
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
                  Bağlantı
                </span>
              </div>
              <div className="text-sm font-bold">
                {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isOnline
                  ? 'Tüm özellikler aktif'
                  : 'Verilerin bulutta saklı, internet gerekli'
                }
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300">
                Garajım <strong>Supabase</strong> bulut altyapısıyla çalışır. Verilerin güvenli, şifreli ve farklı cihazlardan erişilebilir.
              </p>
            </div>
          </div>
        </div>

        {/* Veri özeti */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            Veri Özeti
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{vehicles.length}</div>
              <div className="text-xs text-slate-400 mt-1">Araç</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{maintenanceRecords.length}</div>
              <div className="text-xs text-slate-400 mt-1">Bakım Kaydı</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{fuelRecords.length}</div>
              <div className="text-xs text-slate-400 mt-1">Yakıt Kaydı</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{Object.keys(customIntervals).length}</div>
              <div className="text-xs text-slate-400 mt-1">Özel Periyot</div>
            </div>
          </div>
        </div>

        <StorageIndicator />

        <EmailNotificationSettings />

        <NotificationSettings />

        <MaintenanceIntervals />

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <Download className="w-5 h-5 text-green-400" />
            Yedekleme
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Tüm verilerini JSON dosyası olarak indir. Bu dosyayı saklayarak ileride geri yükleyebilirsin.
          </p>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-5 py-2.5 rounded-lg font-semibold transition"
          >
            <Download className="w-4 h-4" />
            Verileri İndir (.json)
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            Buluta Yükleme (Geri Yükleme)
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Daha önce indirdiğin yedek dosyasını buluta yükleyerek verilerini geri getir.
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
            Yedek Dosyası Seç
          </button>

          <div className="mt-4 flex gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              Dosya seçtikten sonra <strong>onay ekranı</strong> gelecek. Mevcut Supabase verilerin etkilenmez, yedektekiler eklenir.
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <span className="text-xl">💡</span>
            Kullanım Rehberi
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Garajım nasıl kullanılır? Tanıtım turunu tekrar izlemek ister misin?
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
            Hesap
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Giriş yaptığın hesap bilgileri ve oturum yönetimi
          </p>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-400 mb-0.5">Email</div>
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
            Çıkış Yap
          </button>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Tehlikeli Bölge
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Tüm verilerini silmek geri alınamaz bir işlemdir. Önce yedek almayı unutma!
          </p>
          <button
            onClick={() => setIsClearOpen(true)}
            disabled={vehicles.length === 0 && maintenanceRecords.length === 0 && fuelRecords.length === 0}
            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-5 py-2.5 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Tüm Verileri Sil
          </button>
        </div>

        <ConfirmDialog
          isOpen={isClearOpen}
          onClose={() => setIsClearOpen(false)}
          onConfirm={clearAllData}
          title="Tüm veriler silinsin mi?"
          message={`${vehicles.length} araç, ${maintenanceRecords.length} bakım ve ${fuelRecords.length} yakıt kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          confirmText="Evet, hepsini sil"
        />

        <ConfirmDialog
          isOpen={isLogoutOpen}
          onClose={() => setIsLogoutOpen(false)}
          onConfirm={handleLogout}
          title="Çıkış yapılsın mı?"
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