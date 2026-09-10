import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Car } from 'lucide-react'
import { useVehicles } from '../context/vehicle-context'
import { daysUntil } from '../utils/dateHelpers'
import { usePageTitle } from '../hooks/usePageTitle'
import VehicleCard from '../components/VehicleCard'
import VehicleForm from '../components/VehicleForm'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import PageTransition from '../components/PageTransition'
import SearchBar from '../components/SearchBar'
import SortDropdown from '../components/SortDropdown'
import VehicleGridSkeleton from '../components/skeletons/VehicleGridSkeleton'

const sortOptions = [
  { value: 'newest', label: 'vehicles.sort.en_yeni_eklenen' },
  { value: 'oldest', label: 'vehicles.sort.en_eski_eklenen' },
  { value: 'brand', label: 'vehicles.sort.markaya_gore_a_z' },
  { value: 'year-desc', label: 'vehicles.sort.yila_gore_yeni' },
  { value: 'year-asc', label: 'vehicles.sort.yila_gore_eski' },
  { value: 'km-desc', label: 'vehicles.sort.km_cok_az' },
  { value: 'km-asc', label: 'vehicles.sort.km_az_cok' },
  { value: 'urgent', label: 'vehicles.sort.acil_tarihe_gore' },
]

export default function Vehicles({ globalActionsRef }) {
  const { t } = useTranslation()

  usePageTitle(t('vehicles.araclarim'))

  const { vehicles, deleteVehicle, isLoaded } = useVehicles()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // Global kısayol için trigger'ı register et
  useEffect(() => {
    if (!globalActionsRef) return
    // Ref'in .current'ı temizlik fonksiyonu çalışana kadar değişebilir;
    // efekt kurulurken yakalanan nesneyi temizlemek doğru olan.
    const actions = globalActionsRef.current
    actions.newVehicle = () => setIsFormOpen(true)
    return () => {
      actions.newVehicle = null
    }
  }, [globalActionsRef])

  // 🔥 KRİTİK: useMemo TÜM hook'ların yanında, EN ÜSTTE olmalı.
  // Erken return'den (if !isLoaded) ÖNCE çağrılmalı, yoksa
  // hook order ihlali olur ve React Error #300 verir.
  const filteredAndSorted = useMemo(() => {
    let result = [...vehicles]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(v =>
        v.plate?.toLowerCase().includes(q) ||
        v.brand?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q) ||
        v.year?.toString().includes(q) ||
        v.fuelType?.toLowerCase().includes(q)
      )
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => Number(b.id) - Number(a.id))
        break
      case 'oldest':
        result.sort((a, b) => Number(a.id) - Number(b.id))
        break
      case 'brand':
        result.sort((a, b) => (a.brand || '').localeCompare(b.brand || '', 'tr'))
        break
      case 'year-desc':
        result.sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
        break
      case 'year-asc':
        result.sort((a, b) => Number(a.year || 0) - Number(b.year || 0))
        break
      case 'km-desc':
        result.sort((a, b) => Number(b.currentKm || 0) - Number(a.currentKm || 0))
        break
      case 'km-asc':
        result.sort((a, b) => Number(a.currentKm || 0) - Number(b.currentKm || 0))
        break
      case 'urgent':
        result.sort((a, b) => {
          const getMinDays = (v) => {
            const dates = [v.inspectionDate, v.mtvDate, v.insuranceDate, v.kaskoDate]
              .filter(Boolean)
              .map(d => daysUntil(d))
            return dates.length ? Math.min(...dates) : 9999
          }
          return getMinDays(a) - getMinDays(b)
        })
        break
    }

    return result
  }, [vehicles, searchQuery, sortBy])

  // memo()'lu VehicleCard'a prop olarak gidiyor — referansı stabil olmalı,
  // yoksa listedeki tüm kartlar her render'da yeniden çiziliyor.
  const handleEdit = useCallback((vehicle) => {
    setEditVehicle(vehicle)
    setIsFormOpen(true)
  }, [])

  // ✅ Tüm hook'lardan SONRA early return
  if (!isLoaded) {
    return <VehicleGridSkeleton />
  }

  const handleClose = () => {
    setIsFormOpen(false)
    setEditVehicle(null)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteVehicle(deleteTarget.id)
    }
  }

  return (
    <PageTransition>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('vehicles.araclarim')}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {t('vehicles.arac_sayisi', { shown: filteredAndSorted.length, total: vehicles.length })}
              {searchQuery && ` • ${t('vehicles.arama_sonuclari', { query: searchQuery })}`}
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            {t('vehicles.yeni_arac')}
          </button>
        </div>

        {vehicles.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('vehicles.plaka_marka_model_ara')}
            />
            <SortDropdown
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
            />
          </div>
        )}

        {vehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title={t('vehicles.henuz_arac_eklenmedi')}
            description={t('vehicles.ilk_aracini_ekleyerek_bakim_muayene_ve')}
            action={
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                {t('vehicles.ilk_aracini_ekle')}
              </button>
            }
          />
        ) : filteredAndSorted.length === 0 ? (
          <EmptyState
            icon={Car}
            title={t('vehicles.sonuc_bulunamadi')}
            description={t('vehicles.arama_eslesme_yok', { query: searchQuery })}
            action={
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-5 py-2 rounded-lg font-semibold transition"
              >
                {t('vehicles.aramayi_temizle')}
              </button>
            }
          />
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredAndSorted.map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <VehicleForm isOpen={isFormOpen} onClose={handleClose} editVehicle={editVehicle} />

        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          title={t('vehicles.araci_sil')}
          message={
            deleteTarget
              ? t('vehicles.arac_silinecek', { brand: deleteTarget.brand, model: deleteTarget.model, plate: deleteTarget.plate })
              : ''
          }
          confirmText={t('vehicles.evet_sil')}
        />
      </div>
    </PageTransition>
  )
}