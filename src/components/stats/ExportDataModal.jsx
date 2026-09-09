import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet, Car, Wrench, Droplet, Calendar, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../Modal'
import {
  exportVehiclesCSV,
  exportMaintenanceCSV,
  exportFuelCSV,
  exportAllCSV,
  filterByDateRange,
} from '../../utils/csvExporter'

const dateRanges = [
  { id: 'all', label: 'stats.exportDataModal.option.tumu' },
  { id: 'last12', label: 'stats.exportDataModal.option.son_12_ay' },
  { id: 'year', label: 'stats.exportDataModal.option.bu_yil' },
  { id: 'quarter', label: 'stats.exportDataModal.option.son_3_ay' },
  { id: 'month', label: 'stats.exportDataModal.option.bu_ay' },
]

const exportTypes = [
  {
    id: 'all',
    label: 'stats.exportDataModal.option.hepsi',
    description: 'stats.exportDataModal.desc.all',
    icon: FileSpreadsheet,
    color: 'blue',
  },
  {
    id: 'vehicles',
    label: 'stats.exportDataModal.option.sadece_araclar',
    description: 'stats.exportDataModal.desc.vehicles',
    icon: Car,
    color: 'purple',
  },
  {
    id: 'maintenance',
    label: 'stats.exportDataModal.option.sadece_bakimlar',
    description: 'stats.exportDataModal.desc.maintenance',
    icon: Wrench,
    color: 'orange',
  },
  {
    id: 'fuel',
    label: 'stats.exportDataModal.option.sadece_yakit',
    description: 'stats.exportDataModal.desc.fuel',
    icon: Droplet,
    color: 'green',
  },
]

export default function ExportDataModal({ isOpen, onClose, vehicles, maintenanceRecords, fuelRecords }) {
  const { t } = useTranslation()

  const [exportType, setExportType] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Tarih filtresi (araçlar için uygulanmaz, bakım ve yakıt için)
      const filteredMaintenance = filterByDateRange(maintenanceRecords, dateRange)
      const filteredFuel = filterByDateRange(fuelRecords, dateRange)

      let resultMessage = ''

      switch (exportType) {
        case 'all': {
          const result = exportAllCSV(vehicles, filteredMaintenance, filteredFuel)
          resultMessage = t('stats.exportDataModal.result.hepsi', {
            vehicles: result.vehicles, maintenance: result.maintenance, fuel: result.fuel,
          })
          break
        }
        case 'vehicles': {
          const count = exportVehiclesCSV(vehicles)
          resultMessage = t('stats.exportDataModal.result.araclar', { count })
          break
        }
        case 'maintenance': {
          const count = exportMaintenanceCSV(filteredMaintenance, vehicles)
          resultMessage = t('stats.exportDataModal.result.bakimlar', { count })
          break
        }
        case 'fuel': {
          const count = exportFuelCSV(filteredFuel, vehicles)
          resultMessage = t('stats.exportDataModal.result.yakit', { count })
          break
        }
      }

      toast.success(t('stats.exportDataModal.csv_indirildi', { detail: resultMessage }))
      onClose()
    } catch (err) {
      console.error(err)
      toast.error(t('stats.exportDataModal.export_sirasinda_hata_olustu'))
    } finally {
      setIsExporting(false)
    }
  }

  // Export edilecek kayıt sayısını tahmin et
  const previewCount = () => {
    const filteredMaintenance = filterByDateRange(maintenanceRecords, dateRange)
    const filteredFuel = filterByDateRange(fuelRecords, dateRange)

    switch (exportType) {
      case 'all':
        return t('stats.exportDataModal.preview.hepsi', {
          vehicles: vehicles.length, maintenance: filteredMaintenance.length, fuel: filteredFuel.length,
        })
      case 'vehicles':
        return t('stats.exportDataModal.result.araclar', { count: vehicles.length })
      case 'maintenance':
        return t('stats.exportDataModal.result.bakimlar', { count: filteredMaintenance.length })
      case 'fuel':
        return t('stats.exportDataModal.result.yakit', { count: filteredFuel.length })
      default:
        return ''
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isExporting ? () => {} : onClose}
      title={t('stats.exportDataModal.verileri_csv_olarak_indir')}
      maxWidth="max-w-2xl"
    >
      <div className="p-5 space-y-5">
        {/* Tip seçimi */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            {t('stats.exportDataModal.ne_indirmek_istiyorsun')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {exportTypes.map(type => {
              const Icon = type.icon
              const isSelected = exportType === type.id
              const colors = {
                blue: isSelected ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-slate-700 hover:border-slate-600',
                purple: isSelected ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'border-slate-700 hover:border-slate-600',
                orange: isSelected ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'border-slate-700 hover:border-slate-600',
                green: isSelected ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-slate-700 hover:border-slate-600',
              }
              return (
                <button
                  key={type.id}
                  onClick={() => setExportType(type.id)}
                  disabled={isExporting}
                  className={`text-left p-3 rounded-lg border transition ${colors[type.color]} ${
                    !isSelected && 'text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{t(type.label)}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{t(type.description)}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tarih aralığı (sadece bakım/yakıt için anlamlı) */}
        {exportType !== 'vehicles' && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {t('stats.exportDataModal.tarih_araligi')}
            </label>
            <div className="flex flex-wrap gap-2">
              {dateRanges.map(range => (
                <button
                  key={range.id}
                  onClick={() => setDateRange(range.id)}
                  disabled={isExporting}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition border ${
                    dateRange === range.id
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {t(range.label)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">
            {t('stats.exportDataModal.indirilecek')}
          </div>
          <div className="text-sm font-semibold text-white">
            {previewCount()}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2 text-xs text-slate-300">
            <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-400 mb-1">{t('stats.exportDataModal.excel_google_sheets_uyumlu')}</p>
              <p className="text-slate-400">
                {t('stats.exportDataModal.dosya_utf_8_bom_formatinda_olusturulur')}
              </p>
            </div>
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {t('stats.exportDataModal.iptal')}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('stats.exportDataModal.indiriliyor')}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t('stats.exportDataModal.csv_indir')}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}