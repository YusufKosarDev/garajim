import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, Calendar, Car, Droplet, FileDown } from 'lucide-react'
import { useVehicles } from '../context/vehicle-context'
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
import YearEndPrediction from '../components/stats/YearEndPrediction'
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
  const { t } = useTranslation()

  usePageTitle(t('statistics.istatistikler'))

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
            title={t('statistics.henuz_arac_yok')}
            description={t('statistics.istatistikleri_gormek_icin_once_arac_ekle')}
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
            title={t('statistics.henuz_kayit_yok')}
            description={t('statistics.bakim_ve_yakit_kayitlari_eklediginde_istatistikl')}
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
            <h1 className="text-3xl font-bold">{t('statistics.istatistikler')}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {t('statistics.araclarinin_maliyet_tuketim_ve_trend_analizi')}
            </p>
          </div>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition shrink-0"
          >
            <FileDown className="w-4 h-4" />
            {t('statistics.csv_indir')}
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
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <SummaryStats maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />

      <YearEndPrediction maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PredictionCard maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
        </div>
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-4">{t('statistics.aylik_harcama_trendi')}</h3>
          <MonthlyCostChart maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-4">{t('statistics.bakim_turune_gore_dagilim')}</h3>
          {maintenanceRecords.length > 0 ? (
            <MaintenanceTypeChart maintenanceRecords={maintenanceRecords} />
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">{t('statistics.bakim_kaydi_yok')}</p>
          )}
        </div>

        {!selectedVehicleId && vehicles.length > 1 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-lg font-bold mb-4">{t('statistics.arac_basina_harcama')}</h3>
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
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <YearSummaryCards maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">{t('statistics.yillik_karsilastirma')}</h3>
        <p className="text-xs text-slate-400 mb-4">
          {t('statistics.bu_yil_ve_gecen_yilin_aylik')}
        </p>
        <YearComparisonChart maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">{t('statistics.harcama_isi_haritasi')}</h3>
        <p className="text-xs text-slate-400 mb-4">
          {t('statistics.son_2_yilin_aylik_harcama_yogunlugu')}
        </p>
        <SpendingHeatmap maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">{t('statistics.en_cok_harcama_yapilan_aylar')}</h3>
        <p className="text-xs text-slate-400 mb-4">
          {t('statistics.son_2_yilin_en_pahali_6')}
        </p>
        <TopMonthsTable maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
      </div>
    </div>
  )
}

function VehiclesTab({ vehicles, maintenanceRecords, fuelRecords, isFiltered }) {
  const { t } = useTranslation()

  if (isFiltered && vehicles.length === 1) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Car className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="text-xs text-slate-300">
            {t('statistics.arac_filtresi_aktif_karsilastirma_icin_filtreyi')}
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
        <h3 className="text-lg font-bold mb-1">{t('statistics.arac_maliyet_analizi')}</h3>
        <p className="text-xs text-slate-400 mb-4">
          {t('statistics.her_arac_icin_toplam_harcama_km')}
        </p>
        <CostPerKmTable vehicles={vehicles} maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
      </div>

      <div>
        <h3 className="text-lg font-bold mb-1">{t('statistics.arac_detaylari')}</h3>
        <p className="text-xs text-slate-400 mb-4">
          {t('statistics.her_arac_icin_bakim_yakit_dagilimi')}
        </p>
        <VehicleBreakdownCards vehicles={vehicles} maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
      </div>

      {vehicles.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">{t('statistics.arac_karsilastirma')}</h3>
          <p className="text-xs text-slate-400 mb-4">
            {t('statistics.farkli_metriklere_gore_araclarini_kiyasla')}
          </p>
          <VehicleRankingChart vehicles={vehicles} maintenanceRecords={maintenanceRecords} fuelRecords={fuelRecords} />
        </div>
      )}
    </div>
  )
}

function FuelTab({ fuelRecords }) {
  const { t } = useTranslation()

  if (fuelRecords.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <Droplet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-semibold mb-1">{t('statistics.henuz_yakit_kaydi_yok')}</p>
        <p className="text-xs text-slate-500">
          {t('statistics.yakit_alimlarini_kaydetmeye_basladiginda_detayli')}
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
        <h3 className="text-lg font-bold mb-1">{t('statistics.yakit_tuketim_trendi')}</h3>
        <p className="text-xs text-slate-400 mb-4">
          {t('statistics.l_100km_bazinda_tuketim_degisimi')}
        </p>
        <FuelConsumptionChart fuelRecords={fuelRecords} />
      </div>

      {/* Yakıt fiyat trendi */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">{t('statistics.yakit_fiyat_trendi')}</h3>
        <p className="text-xs text-slate-400 mb-4">
          {t('statistics.zaman_icinde_l_degisimi')}
        </p>
        <FuelPriceTrendChart fuelRecords={fuelRecords} />
      </div>

      {/* İstasyon analizi */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold mb-1">{t('statistics.istasyon_analizi')}</h3>
        <p className="text-xs text-slate-400 mb-4">
          {t('statistics.hangi_istasyondan_ne_kadar_yakit_aldin')}
        </p>
        <StationAnalysisTable fuelRecords={fuelRecords} />
      </div>
    </div>
  )
}