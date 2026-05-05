import { useState, useMemo } from 'react'
import { BarChart3, Calendar, Car, Droplet, FileDown } from 'lucide-react'
import { useVehicles } from '../context/VehicleContext'
import { usePageTitle } from '../hooks/usePageTitle'
import PageTransition from '../components/PageTransition'
import EmptyState from '../components/EmptyState'
import SummaryStats from '../components/stats/SummaryStats'
import PredictionCard from '../components/stats/PredictionCard'
import StatsFilterBar from '../components/stats/StatsFilterBar'
import YearComparisonChart from '../components/stats/YearComparisonChart'
import SpendingHeatmap from '../components/stats/SpendingHeatmap'
import TopMonthsTable from '../components/stats/TopMonthsTable'
import YearSummaryCards from '../components/stats/YearSummaryCards'
import CostPerKmTable from '../components/stats/CostPerKmTable'
import VehicleBreakdownCards from '../components/stats/VehicleBreakdownCards'
import VehicleRankingChart from '../components/stats/VehicleRankingChart'
import FuelSummaryCards from '../components/stats/FuelSummaryCards'
import StationAnalysisTable from '../components/stats/StationAnalysisTable'
import FuelPriceTrendChart from '../components/stats/FuelPriceTrendChart'
import ExportDataModal from '../components/stats/ExportDataModal'
import MonthlyCostChart from '../components/charts/MonthlyCostChart'
import MaintenanceTypeChart from '../components/charts/MaintenanceTypeChart'
import VehicleCostChart from '../components/charts/VehicleCostChart'
import FuelConsumptionChart from '../components/charts/FuelConsumptionChart'

const tabs = [
  { id: 'overview', label: 'Genel', icon: BarChart3 },
  { id: 'time', label: 'Zaman', icon: Calendar },
  { id: 'vehicles', label: 'Araçlar', icon: Car },
  { id: 'fuel', label: 'Yakıt', icon: Droplet },
]

export default function Statistics() {
  usePageTitle('İstatistikler')

  const { vehicles, maintenanceRecords, fuelRecords } = useVehicles()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedVehicleId, setSelectedVehicleId] = useState(null)
  const [isExportOpen, setIsExportOpen] = useState(false)

  const filteredMaintenance = useMemo(() => {
    if (!selectedVehicleId) return maintenanceRecords
    return maintenanceRecords.filter(r => r.vehicleId === selectedVehicleId)
  }, [maintenanceRecords, selectedVehicleId])

  const filteredFuel = useMemo(() => {
    if (!selectedVehicleId) return fuelRecords
    return fuelRecords.filter(r => r.vehicleId === selectedVehicleId)
  }, [fuelRecords, selectedVehicleId])

  const vehiclesForComparison = useMemo(() => {
    if (!selectedVehicleId) return vehicles
    return vehicles.filter(v => v.id === selectedVehicleId)
  }, [vehicles, selectedVehicleId])

  if (vehicles.length === 0) {
    return (
      <PageTransition>
        <div className="p-6">
          <EmptyState
            icon={BarChart3}
            title="Henüz araç yok"
            description="İstatistikleri görmek için önce araç ekle."
          />
        </div>
      </PageTransition>
    )
  }

  const hasData = maintenanceRecords.length > 0 || fuelRecords.length > 0

  if (!hasData) {
    return (
      <PageTransition>
        <div className="p-6">
          <EmptyState
            icon={BarChart3}
            title="Henüz kayıt yok"
            description="Bakım ve yakıt kayıtları eklediğinde istatistikler burada görünecek."
          />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">İstatistikler</h1>
            <p className="text-slate-400 text-sm mt-1">
              Araçlarının maliyet, tüketim ve trend analizi
            </p>
          </div>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition shrink-0"
          >
            <FileDown className="w-4 h-4" />
            CSV İndir
          </button>
        </div>

        <StatsFilterBar
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onVehicleChange={setSelectedVehicleId}
        />

        <div className="flex gap-1 border-b border-slate-800 -mx-6 px-6 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition border-b-2 -mb-px ${
                  isActive
                    ? 'text-blue-400 border-blue-500'
                    : 'text-slate-400 border-transparent hover:text-white hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'overview' && (
          <OverviewTab
            maintenanceRecords={filteredMaintenance}
            fuelRecords={filteredFuel}
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
          />
        )}

        {activeTab === 'time' && (
          <TimeTab
            maintenanceRecords={filteredMaintenance}
            fuelRecords={filteredFuel}
          />
        )}

        {activeTab === 'vehicles' && (
          <VehiclesTab
            vehicles={vehiclesForComparison}
            maintenanceRecords={filteredMaintenance}
            fuelRecords={filteredFuel}
            isFiltered={!!selectedVehicleId}
          />
        )}

        {activeTab === 'fuel' && (
          <FuelTab fuelRecords={filteredFuel} />
        )}

        <ExportDataModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          vehicles={vehicles}
          maintenanceRecords={maintenanceRecords}
          fuelRecords={fuelRecords}
        />
      </div>
    </PageTransition>
  )
}

function OverviewTab({ maintenanceRecords, fuelRecords, vehicles, selectedVehicleId }) {
  return (
    <div className="space-y-6">
      <SummaryStats maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PredictionCard maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
        </div>
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-4">📈 Aylık Harcama Trendi</h3>
          <MonthlyCostChart maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-4">🔧 Bakım Türüne Göre Dağılım</h3>
          {maintenanceRecords.length > 0 ? (
            <MaintenanceTypeChart maintenanceRecords={maintenanceRecords} />
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">Bakım kaydı yok</p>
          )}
        </div>

        {!selectedVehicleId && vehicles.length > 1 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-lg font-bold mb-4">🚗 Araç Başına Harcama</h3>
            <VehicleCostChart
              vehicles={vehicles}
              maintenanceRecords={maintenanceRecords}
              fuelRecords={fuelRecords}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function TimeTab({ maintenanceRecords, fuelRecords }) {
  return (
    <div className="space-y-6">
      <YearSummaryCards maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">📊 Yıllık Karşılaştırma</h3>
        <p className="text-xs text-slate-400 mb-4">
          Bu yıl ve geçen yılın aylık harcamalarını karşılaştır
        </p>
        <YearComparisonChart maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">🔥 Harcama Isı Haritası</h3>
        <p className="text-xs text-slate-400 mb-4">
          Son 2 yılın aylık harcama yoğunluğu — hangi aylar daha pahalı?
        </p>
        <SpendingHeatmap maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">🏆 En Çok Harcama Yapılan Aylar</h3>
        <p className="text-xs text-slate-400 mb-4">
          Son 2 yılın en pahalı 6 ayı
        </p>
        <TopMonthsTable maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
      </div>
    </div>
  )
}

function VehiclesTab({ vehicles, maintenanceRecords, fuelRecords, isFiltered }) {
  if (isFiltered && vehicles.length === 1) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Car className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="text-xs text-slate-300">
            Araç filtresi aktif — karşılaştırma için filtreyi kaldırabilirsin
          </p>
        </div>
        <VehicleBreakdownCards
          vehicles={vehicles}
          maintenanceRecords={maintenanceRecords}
          fuelRecords={fuelRecords}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">💰 Araç Maliyet Analizi</h3>
        <p className="text-xs text-slate-400 mb-4">
          Her araç için toplam harcama, KM ve ekonomik performans
        </p>
        <CostPerKmTable vehicles={vehicles} maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
      </div>

      <div>
        <h3 className="text-lg font-bold mb-1">🚗 Araç Detayları</h3>
        <p className="text-xs text-slate-400 mb-4">
          Her araç için bakım/yakıt dağılımı ve metrikler (tıklayarak detaya git)
        </p>
        <VehicleBreakdownCards vehicles={vehicles} maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
      </div>

      {vehicles.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">📊 Araç Karşılaştırma</h3>
          <p className="text-xs text-slate-400 mb-4">
            Farklı metriklere göre araçlarını kıyasla
          </p>
          <VehicleRankingChart vehicles={vehicles} maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
        </div>
      )}
    </div>
  )
}

function FuelTab({ fuelRecords }) {
  if (fuelRecords.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <Droplet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-semibold mb-1">Henüz yakıt kaydı yok</p>
        <p className="text-xs text-slate-500">
          Yakıt alımlarını kaydetmeye başladığında detaylı analizleri burada göreceksin
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Özet kartları */}
      <FuelSummaryCards fuelRecords={fuelRecords} />

      {/* Tüketim trendi grafiği */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">⛽ Yakıt Tüketim Trendi</h3>
        <p className="text-xs text-slate-400 mb-4">
          L/100km bazında tüketim değişimi
        </p>
        <FuelConsumptionChart fuelRecords={fuelRecords} />
      </div>

      {/* Yakıt fiyat trendi */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">💸 Yakıt Fiyat Trendi</h3>
        <p className="text-xs text-slate-400 mb-4">
          Zaman içinde ₺/L değişimi
        </p>
        <FuelPriceTrendChart fuelRecords={fuelRecords} />
      </div>

      {/* İstasyon analizi */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">📍 İstasyon Analizi</h3>
        <p className="text-xs text-slate-400 mb-4">
          Hangi istasyondan ne kadar yakıt aldın?
        </p>
        <StationAnalysisTable fuelRecords={fuelRecords} />
      </div>
    </div>
  )
}