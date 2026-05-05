import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, Pencil, Trash2, Car, Fuel, Gauge, Calendar, Plus, Wrench, X, FileDown, Droplet, TrendingDown, DollarSign, ImageIcon, Receipt, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/VehicleContext'
import { formatDate, getDateStatus, daysUntil } from '../utils/dateHelpers'
import { generateVehicleReport } from '../utils/pdfGenerator'
import { getAverageConsumption, getTotalFuelCost, getAveragePrice } from '../utils/fuelHelpers'
import { usePageTitle } from '../hooks/usePageTitle'
import VehicleForm from '../components/VehicleForm'
import MaintenanceForm from '../components/MaintenanceForm'
import FuelForm from '../components/FuelForm'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import PageTransition from '../components/PageTransition'
import SearchBar from '../components/SearchBar'
import SortDropdown from '../components/SortDropdown'
import Pagination from '../components/Pagination'
import FuelConsumptionChart from '../components/charts/FuelConsumptionChart'
import DetailSkeleton from '../components/skeletons/DetailSkeleton'
import VehicleMaintenanceOverview from '../components/VehicleMaintenanceOverview'
import VehicleTiresTab from '../components/VehicleTiresTab'
import PhotoGallery from '../components/PhotoGallery'
import Lightbox from '../components/Lightbox'
import SwipeableCard from '../components/SwipeableCard'
import ShareModal from '../components/ShareModal'

const ITEMS_PER_PAGE = 20

const maintenanceSortOptions = [
  { value: 'date-desc', label: 'En Yeni Bakım' },
  { value: 'date-asc', label: 'En Eski Bakım' },
  { value: 'cost-desc', label: 'En Pahalı' },
  { value: 'cost-asc', label: 'En Ucuz' },
  { value: 'km-desc', label: 'KM (Çok → Az)' },
  { value: 'type', label: 'Bakım Türüne Göre' },
]

export default function VehicleDetail({ globalActionsRef }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { vehicles, maintenanceRecords, fuelRecords, deleteVehicle, deleteMaintenance, deleteFuel, isLoaded } = useVehicles()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false)
  const [isFuelOpen, setIsFuelOpen] = useState(false)
  const [isDeleteVehicleOpen, setIsDeleteVehicleOpen] = useState(false)
  const [deleteMaintenanceTarget, setDeleteMaintenanceTarget] = useState(null)
  const [editMaintenanceTarget, setEditMaintenanceTarget] = useState(null)
  const [deleteFuelTarget, setDeleteFuelTarget] = useState(null)
  const [editFuelTarget, setEditFuelTarget] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [activeTab, setActiveTab] = useState('maintenance')
  const [prefilledMaintenanceType, setPrefilledMaintenanceType] = useState(null)
  const [maintenancePage, setMaintenancePage] = useState(1)
  const [fuelPage, setFuelPage] = useState(1)
  const [isHeroLightboxOpen, setIsHeroLightboxOpen] = useState(false)
  const [maintenancePhotoLightbox, setMaintenancePhotoLightbox] = useState(null)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  // Mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const vehicle = vehicles.find(v => v.id === id)
  const allRecords = maintenanceRecords.filter(r => r.vehicleId === id)
  const vehicleFuelRecords = fuelRecords.filter(r => r.vehicleId === id)

  // Çoklu fotoğraf desteği — eski `photo` ile uyumlu
  const photos = Array.isArray(vehicle?.photos) ? vehicle.photos : (vehicle?.photo ? [vehicle.photo] : [])

  usePageTitle(vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Araç Detayı')

  useEffect(() => {
    if (!globalActionsRef) return

    globalActionsRef.current.newVehicle = () => navigate('/vehicles')
    globalActionsRef.current.newMaintenance = () => setIsMaintenanceOpen(true)
    globalActionsRef.current.newFuel = () => setIsFuelOpen(true)

    return () => {
      globalActionsRef.current.newVehicle = null
      globalActionsRef.current.newMaintenance = null
      globalActionsRef.current.newFuel = null
    }
  }, [globalActionsRef, navigate])

  const filteredMaintenance = useMemo(() => {
    let result = [...allRecords]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(r =>
        r.type?.toLowerCase().includes(q) || r.notes?.toLowerCase().includes(q)
      )
    }
    switch (sortBy) {
      case 'date-desc': result.sort((a, b) => new Date(b.date) - new Date(a.date)); break
      case 'date-asc': result.sort((a, b) => new Date(a.date) - new Date(b.date)); break
      case 'cost-desc': result.sort((a, b) => (b.cost || 0) - (a.cost || 0)); break
      case 'cost-asc': result.sort((a, b) => (a.cost || 0) - (b.cost || 0)); break
      case 'km-desc': result.sort((a, b) => (b.km || 0) - (a.km || 0)); break
      case 'type': result.sort((a, b) => (a.type || '').localeCompare(b.type || '', 'tr')); break
    }
    return result
  }, [allRecords, searchQuery, sortBy])

  const sortedFuelRecords = useMemo(() =>
    [...vehicleFuelRecords].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [vehicleFuelRecords]
  )

  const paginatedMaintenance = useMemo(() => {
    const start = (maintenancePage - 1) * ITEMS_PER_PAGE
    return filteredMaintenance.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredMaintenance, maintenancePage])

  const paginatedFuel = useMemo(() => {
    const start = (fuelPage - 1) * ITEMS_PER_PAGE
    return sortedFuelRecords.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedFuelRecords, fuelPage])

  useEffect(() => {
    setMaintenancePage(1)
  }, [searchQuery, sortBy])

  useEffect(() => {
    const listElement = document.getElementById('records-list-top')
    if (listElement) {
      listElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [maintenancePage, fuelPage])

  if (!isLoaded) {
    return <DetailSkeleton />
  }

  if (!vehicle) {
    return (
      <PageTransition>
        <div className="p-6 text-center">
          <p className="text-slate-400 mb-4">Araç bulunamadı</p>
          <Link to="/vehicles" className="text-blue-400 hover:underline">← Araçlara dön</Link>
        </div>
      </PageTransition>
    )
  }

  const confirmDeleteVehicle = () => {
    deleteVehicle(vehicle.id)
    navigate('/vehicles')
  }

  const handleDownloadPDF = async () => {
    const loadingToast = toast.loading('PDF hazırlanıyor...')
    try {
      await generateVehicleReport(vehicle, allRecords, vehicleFuelRecords)
      toast.dismiss(loadingToast)
      toast.success('PDF raporu indirildi 📄')
    } catch (error) {
      console.error(error)
      toast.dismiss(loadingToast)
      toast.error('PDF oluşturulurken hata oluştu')
    }
  }

  const handleQuickAddFromRecommendation = (recommendation) => {
    setPrefilledMaintenanceType(recommendation.type)
    setIsMaintenanceOpen(true)
  }

  const dates = [
    { label: 'Muayene', date: vehicle.inspectionDate },
    { label: 'MTV Son Ödeme', date: vehicle.mtvDate },
    { label: 'Trafik Sigortası', date: vehicle.insuranceDate },
    { label: 'Kasko', date: vehicle.kaskoDate },
  ]

  const statusColors = {
    expired: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    safe: 'bg-green-500/20 text-green-400 border-green-500/30',
    none: 'bg-slate-700/50 text-slate-400 border-slate-600',
  }

  const totalMaintenanceCost = allRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
  const totalFuelCost = getTotalFuelCost(vehicleFuelRecords)
  const totalCost = totalMaintenanceCost + totalFuelCost
  const avgConsumption = getAverageConsumption(vehicleFuelRecords)
  const avgPrice = getAveragePrice(vehicleFuelRecords)

  return (
    <PageTransition>
      <div className="p-4 md:p-6">
        <Link to="/vehicles" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition">
          <ArrowLeft className="w-4 h-4" />
          Araçlara Dön
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {photos.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsHeroLightboxOpen(true)}
                  className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500/50 transition cursor-zoom-in shrink-0 group"
                  title="Fotoğrafları görüntüle"
                >
                  <img
                    src={photos[0]}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  {photos.length > 1 && (
                    <div className="absolute bottom-0 right-0 bg-black/70 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-tl flex items-center gap-0.5">
                      <ImageIcon className="w-2.5 h-2.5" />
                      {photos.length}
                    </div>
                  )}
                </button>
              ) : (
                <div className="w-20 h-20 bg-blue-600/20 rounded-xl flex items-center justify-center shrink-0">
                  <Car className="w-10 h-10 text-blue-400" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{vehicle.brand} {vehicle.model}</h1>
                <p className="text-slate-400">{vehicle.plate} • {vehicle.year}</p>
                <div className="flex gap-4 mt-2 text-sm text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1"><Fuel className="w-4 h-4" />{vehicle.fuelType}</span>
                  {vehicle.currentKm && (
                    <span className="flex items-center gap-1">
                      <Gauge className="w-4 h-4" />
                      {Number(vehicle.currentKm).toLocaleString('tr-TR')} km
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setIsShareOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-4 py-2 rounded-lg transition font-semibold text-white"
                title="Aracı paylaş"
              >
                <Share2 className="w-4 h-4" /> Paylaş
              </button>
              <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2 rounded-lg transition font-semibold">
                <FileDown className="w-4 h-4" /> PDF İndir
              </button>
              <button onClick={() => setIsEditOpen(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition">
                <Pencil className="w-4 h-4" /> Düzenle
              </button>
              <button onClick={() => setIsDeleteVehicleOpen(true)} className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg transition">
                <Trash2 className="w-4 h-4" /> Sil
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-800">
            <StatChip label="Toplam Harcama" value={`${totalCost.toLocaleString('tr-TR')} ₺`} color="emerald" highlighted icon={DollarSign} />
            <StatChip label="Bakım" value={`${totalMaintenanceCost.toLocaleString('tr-TR')} ₺`} color="blue" icon={Wrench} />
            <StatChip label="Yakıt" value={`${totalFuelCost.toLocaleString('tr-TR')} ₺`} color="orange" icon={Droplet} />
            <StatChip label="Ort. Tüketim" value={avgConsumption ? `${avgConsumption.toFixed(1)} L/100km` : '-'} color="purple" />
            <StatChip label="Ort. Litre Fiyatı" value={avgPrice ? `${avgPrice.toFixed(2)} ₺` : '-'} color="slate" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Önemli Tarihler
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dates.map(({ label, date }) => {
              const status = getDateStatus(date)
              const days = daysUntil(date)
              return (
                <div key={label} className={`p-4 rounded-lg border ${statusColors[status]}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{label}</div>
                      <div className="text-sm opacity-80">{formatDate(date)}</div>
                    </div>
                    {days !== null && (
                      <div className="text-sm font-bold">
                        {days < 0 ? `${Math.abs(days)} gün geçti` : `${days} gün kaldı`}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {photos.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-400" />
              Galeri
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">
                {photos.length} foto
              </span>
            </h2>
            <PhotoGallery photos={photos} />
          </div>
        )}

        <VehicleMaintenanceOverview
          vehicle={vehicle}
          maintenanceRecords={maintenanceRecords}
          onQuickAdd={handleQuickAddFromRecommendation}
        />

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex border-b border-slate-800 overflow-x-auto" id="records-list-top">
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'maintenance'
                  ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wrench className="w-4 h-4" />
              Bakım ({allRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('fuel')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'fuel'
                  ? 'bg-slate-800 text-green-400 border-b-2 border-green-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Droplet className="w-4 h-4" />
              Yakıt ({vehicleFuelRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('tires')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'tires'
                  ? 'bg-slate-800 text-purple-400 border-b-2 border-purple-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛞 Lastikler
            </button>
          </div>

          <div className="p-5">
            {activeTab === 'maintenance' ? (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="text-sm text-slate-400">
                    {filteredMaintenance.length}{searchQuery || sortBy !== 'date-desc' ? ` / ${allRecords.length}` : ''} kayıt
                  </div>
                  <button
                    onClick={() => setIsMaintenanceOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                  >
                    <Plus className="w-4 h-4" /> Bakım Ekle
                  </button>
                </div>

                {allRecords.length > 0 && (
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Tür veya not ara..." />
                    <SortDropdown value={sortBy} onChange={setSortBy} options={maintenanceSortOptions} />
                  </div>
                )}

                {allRecords.length === 0 ? (
                  <EmptyState
                    icon={Wrench}
                    title="Henüz bakım kaydı yok"
                    description="Yağ değişimi, filtre, lastik gibi bakımları kaydet."
                    action={
                      <button onClick={() => setIsMaintenanceOpen(true)} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-semibold transition">
                        <Plus className="w-4 h-4" /> İlk Bakımı Ekle
                      </button>
                    }
                  />
                ) : filteredMaintenance.length === 0 ? (
                  <EmptyState
                    icon={Wrench}
                    title="Sonuç bulunamadı"
                    description={`"${searchQuery}" için eşleşen bakım kaydı yok.`}
                    action={
                      <button onClick={() => setSearchQuery('')} className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-5 py-2 rounded-lg font-semibold transition">
                        Aramayı Temizle
                      </button>
                    }
                  />
                ) : (
                  <>
                    <div className="space-y-2">
                      {paginatedMaintenance.map(r => (
                        <SwipeableCard
                          key={r.id}
                          enabled={isMobile}
                          onEdit={() => setEditMaintenanceTarget(r)}
                          onDelete={() => setDeleteMaintenanceTarget(r)}
                        >
                          <div className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-800 hover:border-slate-700 transition">
                            {r.photo && (
                              <button
                                type="button"
                                onClick={() => setMaintenancePhotoLightbox(r.photo)}
                                className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500/50 transition cursor-zoom-in shrink-0 group/thumb"
                                title="Faturayı görüntüle"
                              >
                                <img
                                  src={r.photo}
                                  alt="Fatura"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/40 transition flex items-center justify-center">
                                  <Receipt className="w-4 h-4 text-white opacity-0 group-hover/thumb:opacity-100 transition" />
                                </div>
                              </button>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="font-semibold flex items-center gap-2 flex-wrap">
                                {r.type}
                                {r.photo && (
                                  <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-normal flex items-center gap-0.5">
                                    <Receipt className="w-2.5 h-2.5" />
                                    Fatura
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 flex flex-wrap gap-3 mt-1">
                                <span>📅 {formatDate(r.date)}</span>
                                <span>🎯 {Number(r.km).toLocaleString('tr-TR')} km</span>
                                {r.cost > 0 && <span className="text-green-400">💰 {r.cost.toLocaleString('tr-TR')} ₺</span>}
                              </div>
                              {r.notes && <div className="text-xs text-slate-500 mt-1 italic">{r.notes}</div>}
                            </div>

                            {!isMobile && (
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => setEditMaintenanceTarget(r)}
                                  className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-400 transition"
                                  title="Düzenle"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteMaintenanceTarget(r)}
                                  className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition"
                                  title="Sil"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </SwipeableCard>
                      ))}
                    </div>

                    <Pagination
                      currentPage={maintenancePage}
                      totalItems={filteredMaintenance.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setMaintenancePage}
                    />
                  </>
                )}
              </>
            ) : activeTab === 'fuel' ? (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="text-sm text-slate-400">
                    {vehicleFuelRecords.length} yakıt alımı kayıtlı
                  </div>
                  <button
                    onClick={() => setIsFuelOpen(true)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                  >
                    <Plus className="w-4 h-4" /> Yakıt Ekle
                  </button>
                </div>

                {vehicleFuelRecords.length === 0 ? (
                  <EmptyState
                    icon={Droplet}
                    title="Henüz yakıt kaydı yok"
                    description="Her yakıt alımını kaydederek tüketim ve harcama takibi yap."
                    action={
                      <button onClick={() => setIsFuelOpen(true)} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg font-semibold transition">
                        <Plus className="w-4 h-4" /> İlk Yakıt Kaydını Ekle
                      </button>
                    }
                  />
                ) : (
                  <>
                    <div className="bg-slate-800/30 rounded-lg p-4 mb-4">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-green-400" />
                        Tüketim Trendi (L/100km)
                      </h3>
                      <FuelConsumptionChart fuelRecords={vehicleFuelRecords} />
                    </div>

                    <div className="space-y-2">
                      {paginatedFuel.map(r => (
                        <SwipeableCard
                          key={r.id}
                          enabled={isMobile}
                          onEdit={() => setEditFuelTarget(r)}
                          onDelete={() => setDeleteFuelTarget(r)}
                        >
                          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-800 hover:border-slate-700 transition">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{r.liters} L</span>
                                {r.fullTank && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded">DOLU</span>}
                                {r.station && <span className="text-xs text-slate-400">• {r.station}</span>}
                              </div>
                              <div className="text-xs text-slate-400 flex flex-wrap gap-3 mt-1">
                                <span>📅 {formatDate(r.date)}</span>
                                <span>🎯 {Number(r.km).toLocaleString('tr-TR')} km</span>
                                {r.pricePerLiter > 0 && <span>⛽ {r.pricePerLiter.toFixed(2)} ₺/L</span>}
                                <span className="text-orange-400 font-semibold">💰 {r.totalCost.toLocaleString('tr-TR')} ₺</span>
                              </div>
                              {r.notes && <div className="text-xs text-slate-500 mt-1 italic">{r.notes}</div>}
                            </div>

                            {!isMobile && (
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => setEditFuelTarget(r)}
                                  className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-400 transition"
                                  title="Düzenle"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteFuelTarget(r)}
                                  className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition"
                                  title="Sil"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </SwipeableCard>
                      ))}
                    </div>

                    <Pagination
                      currentPage={fuelPage}
                      totalItems={sortedFuelRecords.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setFuelPage}
                    />
                  </>
                )}
              </>
            ) : (
              <VehicleTiresTab vehicleId={id} />
            )}
          </div>
        </div>

        <VehicleForm isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} editVehicle={vehicle} />

        <MaintenanceForm
          isOpen={isMaintenanceOpen}
          onClose={() => {
            setIsMaintenanceOpen(false)
            setPrefilledMaintenanceType(null)
          }}
          vehicleId={id}
          prefilledType={prefilledMaintenanceType}
        />
        <MaintenanceForm
          isOpen={!!editMaintenanceTarget}
          onClose={() => setEditMaintenanceTarget(null)}
          vehicleId={id}
          editRecord={editMaintenanceTarget}
        />

        <FuelForm isOpen={isFuelOpen} onClose={() => setIsFuelOpen(false)} vehicleId={id} />
        <FuelForm
          isOpen={!!editFuelTarget}
          onClose={() => setEditFuelTarget(null)}
          vehicleId={id}
          editRecord={editFuelTarget}
        />

        <ConfirmDialog
          isOpen={isDeleteVehicleOpen}
          onClose={() => setIsDeleteVehicleOpen(false)}
          onConfirm={confirmDeleteVehicle}
          title="Aracı sil?"
          message={`${vehicle.brand} ${vehicle.model} (${vehicle.plate}) ve tüm kayıtları silinecek.`}
          confirmText="Evet, sil"
        />
        <ConfirmDialog
          isOpen={!!deleteMaintenanceTarget}
          onClose={() => setDeleteMaintenanceTarget(null)}
          onConfirm={() => deleteMaintenanceTarget && deleteMaintenance(deleteMaintenanceTarget.id)}
          title="Bakım kaydını sil?"
          message={deleteMaintenanceTarget ? `"${deleteMaintenanceTarget.type}" kaydı silinecek.` : ''}
          confirmText="Sil"
        />
        <ConfirmDialog
          isOpen={!!deleteFuelTarget}
          onClose={() => setDeleteFuelTarget(null)}
          onConfirm={() => deleteFuelTarget && deleteFuel(deleteFuelTarget.id)}
          title="Yakıt kaydını sil?"
          message={deleteFuelTarget ? `${deleteFuelTarget.liters} L / ${deleteFuelTarget.totalCost} ₺ kaydı silinecek.` : ''}
          confirmText="Sil"
        />

        <Lightbox
          isOpen={isHeroLightboxOpen}
          onClose={() => setIsHeroLightboxOpen(false)}
          photos={photos}
          initialIndex={0}
        />

        <Lightbox
          isOpen={!!maintenancePhotoLightbox}
          onClose={() => setMaintenancePhotoLightbox(null)}
          photos={maintenancePhotoLightbox ? [maintenancePhotoLightbox] : []}
          initialIndex={0}
        />

        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          vehicle={vehicle}
          maintenanceRecords={allRecords}
          fuelRecords={vehicleFuelRecords}
        />
      </div>
    </PageTransition>
  )
}

function StatChip({ label, value, color, highlighted = false, icon: Icon }) {
  const colors = {
    emerald: 'text-emerald-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    slate: 'text-slate-300',
  }

  const bgs = {
    emerald: highlighted ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-800/50',
    green: 'bg-slate-800/50',
    orange: 'bg-slate-800/50',
    blue: 'bg-slate-800/50',
    purple: 'bg-slate-800/50',
    slate: 'bg-slate-800/50',
  }

  return (
    <div className={`rounded-lg p-3 ${bgs[color]}`}>
      {Icon && <Icon className={`w-4 h-4 ${colors[color]} mb-1`} />}
      <div className={`text-base md:text-lg font-bold ${colors[color]}`}>{value}</div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  )
}