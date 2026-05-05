import { useState, useMemo } from 'react'
import { Plus, ArrowLeftRight, Sun, Snowflake, Info, AlertTriangle } from 'lucide-react'
import { useVehicles } from '../context/VehicleContext'
import {
  SEASONS,
  getActiveTireSet,
  getSeasonChangeSuggestion,
} from '../utils/tireHelpers'
import TireForm from './TireForm'
import TireCard from './TireCard'
import TireChangeForm from './TireChangeForm'
import TireChangeHistory from './TireChangeHistory'
import ConfirmDialog from './ConfirmDialog'

export default function VehicleTiresTab({ vehicleId }) {
  const { tireSets, tireChanges, deleteTireSet, deleteTireChange } = useVehicles()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteChangeTarget, setDeleteChangeTarget] = useState(null)
  const [isChangeOpen, setIsChangeOpen] = useState(false)

  // Bu araca ait setler ve değişimler
  const vehicleSets = useMemo(
    () => tireSets.filter(t => t.vehicleId === vehicleId),
    [tireSets, vehicleId]
  )

  const vehicleChanges = useMemo(
    () => tireChanges.filter(c => c.vehicleId === vehicleId),
    [tireChanges, vehicleId]
  )

  // Aktif sezon
  const activeSet = useMemo(
    () => getActiveTireSet(vehicleSets, vehicleChanges),
    [vehicleSets, vehicleChanges]
  )
  const activeSeason = activeSet?.season || null

  // Sezon önerisi (Türkiye takvimine göre)
  const suggestion = useMemo(
    () => getSeasonChangeSuggestion(activeSeason),
    [activeSeason]
  )

  const summerSet = vehicleSets.find(t => t.season === 'summer')
  const winterSet = vehicleSets.find(t => t.season === 'winter')
  const hasBothSets = !!summerSet && !!winterSet

  const handleAdd = () => {
    setEditTarget(null)
    setIsAddOpen(true)
  }

  const handleEdit = (tireSet) => {
    setEditTarget(tireSet)
    setIsAddOpen(true)
  }

  const handleClose = () => {
    setIsAddOpen(false)
    setEditTarget(null)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteTireSet(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  const confirmDeleteChange = () => {
    if (deleteChangeTarget) {
      deleteTireChange(deleteChangeTarget.id)
      setDeleteChangeTarget(null)
    }
  }

  // Hiç set yok
  if (vehicleSets.length === 0) {
    return (
      <>
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🛞</div>
          <h3 className="text-xl font-bold mb-2">Henüz lastik seti yok</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Yazlık ve kışlık lastiklerini ekleyerek diş derinliği, yaş ve mevsim değişimlerini takip et.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={handleAdd}
              className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-5 py-2.5 rounded-lg font-semibold transition"
            >
              <Sun className="w-4 h-4" />
              Yazlık Set Ekle
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 px-5 py-2.5 rounded-lg font-semibold transition"
            >
              <Snowflake className="w-4 h-4" />
              Kışlık Set Ekle
            </button>
          </div>
        </div>

        <TireForm
          isOpen={isAddOpen}
          onClose={handleClose}
          vehicleId={vehicleId}
          editTireSet={editTarget}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sezon önerisi */}
      {suggestion && hasBothSets && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${
          suggestion.urgent
            ? 'bg-orange-500/10 border-orange-500/30'
            : 'bg-blue-500/10 border-blue-500/30'
        }`}>
          <AlertTriangle className={`w-4 h-4 shrink-0 ${
            suggestion.urgent ? 'text-orange-400' : 'text-blue-400'
          }`} />
          <div className="flex-1 text-sm">
            <span className={suggestion.urgent ? 'text-orange-300' : 'text-blue-300'}>
              {suggestion.message}
            </span>
          </div>
          <button
            onClick={() => setIsChangeOpen(true)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              suggestion.urgent
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <ArrowLeftRight className="w-3 h-3 inline mr-1" />
            Değiştir
          </button>
        </div>
      )}

      {/* Eylem butonları */}
      <div className="flex flex-wrap gap-2">
        {!summerSet && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Yazlık Ekle
          </button>
        )}
        {!winterSet && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Kışlık Ekle
          </button>
        )}
        {hasBothSets && (
          <button
            onClick={() => setIsChangeOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Sezonu Değiştir
          </button>
        )}
      </div>

      {/* Set kartları */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {summerSet && (
          <TireCard
            tireSet={summerSet}
            isActive={activeSeason === 'summer'}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />
        )}
        {winterSet && (
          <TireCard
            tireSet={winterSet}
            isActive={activeSeason === 'winter'}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />
        )}
      </div>

      {/* Tek set varsa info */}
      {vehicleSets.length === 1 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2 text-xs text-slate-300">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p>
              <strong>İpucu:</strong> Diğer sezon setini de ekleyince mevsim değişimlerini kaydedebilirsin
              {summerSet ? ' (kışlık ekle)' : ' (yazlık ekle)'}.
            </p>
          </div>
        </div>
      )}

      {/* Değişim geçmişi */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          🔄 Mevsim Değişim Geçmişi
          {vehicleChanges.length > 0 && (
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
              {vehicleChanges.length}
            </span>
          )}
        </h3>

        <TireChangeHistory
          tireChanges={vehicleChanges}
          onDelete={setDeleteChangeTarget}
        />
      </div>

      {/* Form modal */}
      <TireForm
        isOpen={isAddOpen}
        onClose={handleClose}
        vehicleId={vehicleId}
        editTireSet={editTarget}
      />

      {/* Mevsim değişimi modal */}
      {hasBothSets && (
        <TireChangeForm
          isOpen={isChangeOpen}
          onClose={() => setIsChangeOpen(false)}
          vehicleId={vehicleId}
          currentSeason={activeSeason || 'summer'}
          targetSeason={activeSeason === 'summer' ? 'winter' : 'summer'}
        />
      )}

      {/* Set sil dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Lastik setini sil?"
        message={
          deleteTarget
            ? `${SEASONS[deleteTarget.season]?.label} lastik seti (${deleteTarget.brand} ${deleteTarget.size}) silinecek.`
            : ''
        }
        confirmText="Evet, sil"
      />

      {/* Değişim sil dialog */}
      <ConfirmDialog
        isOpen={!!deleteChangeTarget}
        onClose={() => setDeleteChangeTarget(null)}
        onConfirm={confirmDeleteChange}
        title="Değişim kaydını sil?"
        message="Bu mevsim değişim kaydı silinecek. Lastik setleri etkilenmez."
        confirmText="Sil"
      />
    </div>
  )
}