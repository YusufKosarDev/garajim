import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ArrowLeftRight, Sun, Snowflake, Info, AlertTriangle } from 'lucide-react'
import { useVehicles } from '../context/vehicle-context'
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
  const { t } = useTranslation()

  const { tireSets, tireChanges, deleteTireSet, deleteTireChange } = useVehicles()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteChangeTarget, setDeleteChangeTarget] = useState(null)
  const [isChangeOpen, setIsChangeOpen] = useState(false)

  // Bu araca ait setler ve değişimler
  const vehicleSets = useMemo(
    () => tireSets.filter(set => set.vehicleId === vehicleId),
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

  const summerSet = vehicleSets.find(set => set.season === 'summer')
  const winterSet = vehicleSets.find(set => set.season === 'winter')
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
          <h3 className="text-xl font-bold mb-2">{t('vehicleTiresTab.henuz_lastik_seti_yok')}</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            {t('vehicleTiresTab.yazlik_ve_kislik_lastiklerini_ekleyerek_dis')}
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={handleAdd}
              className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-5 py-2.5 rounded-lg font-semibold transition"
            >
              <Sun className="w-4 h-4" />
              {t('vehicleTiresTab.yazlik_set_ekle')}
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 px-5 py-2.5 rounded-lg font-semibold transition"
            >
              <Snowflake className="w-4 h-4" />
              {t('vehicleTiresTab.kislik_set_ekle')}
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
            {t('vehicleTiresTab.degistir')}
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
            {t('vehicleTiresTab.yazlik_ekle')}
          </button>
        )}
        {!winterSet && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            {t('vehicleTiresTab.kislik_ekle')}
          </button>
        )}
        {hasBothSets && (
          <button
            onClick={() => setIsChangeOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <ArrowLeftRight className="w-4 h-4" />
            {t('vehicleTiresTab.sezonu_degistir')}
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
              <strong>{t('vehicleTiresTab.ipucu')}</strong> {t('vehicleTiresTab.diger_sezon_ipucu')}
              {summerSet ? t('vehicleTiresTab.kislik_ekle') : t('vehicleTiresTab.yazlik_ekle')}.
            </p>
          </div>
        </div>
      )}

      {/* Değişim geçmişi */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          🔄 {t('vehicleTiresTab.mevsim_degisim_gecmisi')}
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
        title={t('vehicleTiresTab.lastik_setini_sil')}
        message={
          deleteTarget
            ? t('vehicleTiresTab.set_silinecek', {
                season: t(SEASONS[deleteTarget.season]?.label ?? deleteTarget.season),
                brand: deleteTarget.brand,
                size: deleteTarget.size,
              })
            : ''
        }
        confirmText={t('vehicleTiresTab.evet_sil')}
      />

      {/* Değişim sil dialog */}
      <ConfirmDialog
        isOpen={!!deleteChangeTarget}
        onClose={() => setDeleteChangeTarget(null)}
        onConfirm={confirmDeleteChange}
        title={t('vehicleTiresTab.degisim_kaydini_sil')}
        message={t('vehicleTiresTab.degisim_kaydi_silinecek')}
        confirmText={t('vehicleTiresTab.sil')}
      />
    </div>
  )
}