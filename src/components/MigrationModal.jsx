import { useState, useEffect } from 'react'
import { CloudUpload, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import Modal from './Modal'

/**
 * Migration sırasında gösterilen modal
 * Progress bar + her tablo için durum
 */
export default function MigrationModal({
  isOpen,
  onClose,
  data,           // { vehicles, maintenance, fuel, ... } - migrate edilecek veri
  onConfirm,      // () => Promise<result> - migration'ı başlatacak fonksiyon
}) {
  const [phase, setPhase] = useState('confirm') // 'confirm' | 'running' | 'done' | 'error'
  const [progress, setProgress] = useState({})
  const [result, setResult] = useState(null)

  useEffect(() => {
    // Modal her açıldığında sıfırla
    if (isOpen) {
      setPhase('confirm')
      setProgress({})
      setResult(null)
    }
  }, [isOpen])

  const handleStart = async () => {
    setPhase('running')
    setProgress({})

    try {
      const res = await onConfirm((step, current, total) => {
        setProgress(prev => ({
          ...prev,
          [step]: { current, total }
        }))
      })
      setResult(res)
      setPhase(res.success ? 'done' : 'error')
    } catch (error) {
      console.error('Migration error:', error)
      setResult({ errors: [error.message || 'Bilinmeyen hata'] })
      setPhase('error')
    }
  }

  const handleClose = () => {
    if (phase === 'running') return // Yükleme devam ediyorken kapatma
    onClose()
  }

  // Veri sayıları
  const counts = {
    vehicles: (data?.vehicles || []).length,
    maintenance: (data?.maintenanceRecords || []).length,
    fuel: (data?.fuelRecords || []).length,
    tireSets: (data?.tireSets || []).length,
    tireChanges: (data?.tireChanges || []).length,
    intervals: Object.keys(data?.customIntervals || {}).length,
  }

  const totalItems = counts.vehicles + counts.maintenance + counts.fuel + counts.tireSets + counts.tireChanges + counts.intervals

  // Genel progress yüzdesi
  const totalProcessed = Object.values(progress).reduce((sum, p) => sum + (p.current || 0), 0)
  const totalToProcess = Object.values(progress).reduce((sum, p) => sum + (p.total || 0), 0)
  const percentage = totalToProcess > 0 ? Math.round((totalProcessed / totalToProcess) * 100) : 0

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={
      phase === 'confirm' ? '☁️ Buluta Yükle' :
      phase === 'running' ? '🔄 Yükleniyor...' :
      phase === 'done' ? '✅ Tamamlandı!' :
      '⚠️ Hata Oluştu'
    }>
      <div className="p-5">
        {/* CONFIRM PHASE */}
        {phase === 'confirm' && (
          <>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <CloudUpload className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300">
                  Cihazındaki/yedeğindeki verileri <strong>Supabase bulutuna</strong> yükle.
                  Bu sayede başka cihazlardan da erişebilirsin.
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
              <div className="text-sm text-slate-400 mb-3">Yüklenecek veriler:</div>
              <div className="space-y-2 text-sm">
                {counts.vehicles > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">🚗 Araç</span>
                    <span className="text-blue-400 font-semibold">{counts.vehicles}</span>
                  </div>
                )}
                {counts.maintenance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">🔧 Bakım Kaydı</span>
                    <span className="text-blue-400 font-semibold">{counts.maintenance}</span>
                  </div>
                )}
                {counts.fuel > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">⛽ Yakıt Kaydı</span>
                    <span className="text-blue-400 font-semibold">{counts.fuel}</span>
                  </div>
                )}
                {counts.tireSets > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">🛞 Lastik Seti</span>
                    <span className="text-blue-400 font-semibold">{counts.tireSets}</span>
                  </div>
                )}
                {counts.tireChanges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">🔄 Lastik Değişimi</span>
                    <span className="text-blue-400 font-semibold">{counts.tireChanges}</span>
                  </div>
                )}
                {counts.intervals > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">⚙️ Özel Periyot</span>
                    <span className="text-blue-400 font-semibold">{counts.intervals}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-700 mt-2">
                  <span className="text-slate-400 font-semibold">Toplam</span>
                  <span className="text-white font-bold">{totalItems} kayıt</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300">
                  Bu işlem mevcut Supabase verilerini <strong>etkilemez</strong>, üzerine ekler.
                  Aynı veriyi 2 kez yüklersen <strong>kopyalanır</strong>.
                  Fotoğraflar Supabase Storage'a yüklenecek (biraz zaman alabilir).
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg font-medium transition"
              >
                İptal
              </button>
              <button
                onClick={handleStart}
                disabled={totalItems === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <CloudUpload className="w-4 h-4" />
                Yüklemeyi Başlat
              </button>
            </div>
          </>
        )}

        {/* RUNNING PHASE */}
        {phase === 'running' && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-3">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
              <p className="text-slate-300">Verilerin yükleniyor, lütfen bekle...</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>İlerleme</span>
                <span>{percentage}%</span>
              </div>
              <div className="bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Aşamalar */}
            <div className="space-y-2 text-sm">
              <ProgressItem label="🚗 Araçlar" progress={progress.vehicles} total={counts.vehicles} />
              <ProgressItem label="🔧 Bakım Kayıtları" progress={progress.maintenance} total={counts.maintenance} />
              <ProgressItem label="⛽ Yakıt Kayıtları" progress={progress.fuel} total={counts.fuel} />
              <ProgressItem label="🛞 Lastik Setleri" progress={progress.tireSets} total={counts.tireSets} />
              <ProgressItem label="🔄 Lastik Değişimleri" progress={progress.tireChanges} total={counts.tireChanges} />
              <ProgressItem label="⚙️ Özel Periyotlar" progress={progress.customIntervals} total={counts.intervals} />
            </div>

            <p className="text-xs text-slate-500 mt-4 text-center">
              ⚠️ Sayfayı kapatma! Yükleme devam ediyor.
            </p>
          </>
        )}

        {/* DONE PHASE */}
        {phase === 'done' && result && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-3">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Başarıyla Yüklendi! 🎉</h3>
              <p className="text-slate-400 text-sm">Tüm verilerin Supabase'de güvende</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <ResultRow label="🚗 Araçlar" stats={result.vehicles} />
              <ResultRow label="🔧 Bakım Kayıtları" stats={result.maintenance} />
              <ResultRow label="⛽ Yakıt Kayıtları" stats={result.fuel} />
              <ResultRow label="🛞 Lastik Setleri" stats={result.tireSets} />
              <ResultRow label="🔄 Lastik Değişimleri" stats={result.tireChanges} />
              <ResultRow label="⚙️ Özel Periyotlar" stats={result.customIntervals} />
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition"
            >
              Tamam
            </button>
          </>
        )}

        {/* ERROR PHASE */}
        {phase === 'error' && result && (
          <>
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/20 rounded-full mb-3">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Kısmi Başarı veya Hata</h3>
              <p className="text-slate-400 text-sm">Bazı kayıtlar yüklenemedi</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <ResultRow label="🚗 Araçlar" stats={result.vehicles} />
              <ResultRow label="🔧 Bakım Kayıtları" stats={result.maintenance} />
              <ResultRow label="⛽ Yakıt Kayıtları" stats={result.fuel} />
              <ResultRow label="🛞 Lastik Setleri" stats={result.tireSets} />
              <ResultRow label="🔄 Lastik Değişimleri" stats={result.tireChanges} />
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
                <div className="text-xs text-red-400 font-semibold mb-1">Hatalar:</div>
                <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                  {result.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li className="text-slate-500">+{result.errors.length - 5} hata daha</li>
                  )}
                </ul>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition"
            >
              Tamam
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

// Progress satırı (running phase)
function ProgressItem({ label, progress, total }) {
  if (total === 0) return null

  const current = progress?.current || 0
  const isDone = current === total
  const isActive = current > 0 && !isDone

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {isDone ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : isActive ? (
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
        )}
        <span className={isDone ? 'text-slate-400' : 'text-slate-300'}>{label}</span>
      </div>
      <span className={`text-xs font-mono ${isDone ? 'text-green-400' : 'text-slate-500'}`}>
        {current}/{total}
      </span>
    </div>
  )
}

// Sonuç satırı (done/error phase)
function ResultRow({ label, stats }) {
  if (!stats || stats.total === 0) return null

  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-300">{label}</span>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-green-400">✓ {stats.success}</span>
        {stats.failed > 0 && (
          <span className="text-red-400">✗ {stats.failed}</span>
        )}
        <span className="text-slate-500">/ {stats.total}</span>
      </div>
    </div>
  )
}