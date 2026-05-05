import { useState } from 'react'
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
  { id: 'all', label: 'Tümü' },
  { id: 'last12', label: 'Son 12 Ay' },
  { id: 'year', label: 'Bu Yıl' },
  { id: 'quarter', label: 'Son 3 Ay' },
  { id: 'month', label: 'Bu Ay' },
]

const exportTypes = [
  {
    id: 'all',
    label: 'Hepsi',
    description: '3 ayrı CSV: araçlar, bakımlar, yakıtlar',
    icon: FileSpreadsheet,
    color: 'blue',
  },
  {
    id: 'vehicles',
    label: 'Sadece Araçlar',
    description: 'Araç bilgileri ve tarihler',
    icon: Car,
    color: 'purple',
  },
  {
    id: 'maintenance',
    label: 'Sadece Bakımlar',
    description: 'Tüm bakım kayıtları',
    icon: Wrench,
    color: 'orange',
  },
  {
    id: 'fuel',
    label: 'Sadece Yakıt',
    description: 'Tüm yakıt alımları',
    icon: Droplet,
    color: 'green',
  },
]

export default function ExportDataModal({ isOpen, onClose, vehicles, maintenanceRecords, fuelRecords }) {
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
          resultMessage = `${result.vehicles} araç + ${result.maintenance} bakım + ${result.fuel} yakıt kaydı`
          break
        }
        case 'vehicles': {
          const count = exportVehiclesCSV(vehicles)
          resultMessage = `${count} araç`
          break
        }
        case 'maintenance': {
          const count = exportMaintenanceCSV(filteredMaintenance, vehicles)
          resultMessage = `${count} bakım kaydı`
          break
        }
        case 'fuel': {
          const count = exportFuelCSV(filteredFuel, vehicles)
          resultMessage = `${count} yakıt kaydı`
          break
        }
      }

      toast.success(`CSV indirildi: ${resultMessage} 📊`)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Export sırasında hata oluştu')
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
        return `${vehicles.length} araç + ${filteredMaintenance.length} bakım + ${filteredFuel.length} yakıt`
      case 'vehicles':
        return `${vehicles.length} araç`
      case 'maintenance':
        return `${filteredMaintenance.length} bakım kaydı`
      case 'fuel':
        return `${filteredFuel.length} yakıt kaydı`
      default:
        return ''
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isExporting ? () => {} : onClose}
      title="Verileri CSV Olarak İndir"
      maxWidth="max-w-2xl"
    >
      <div className="p-5 space-y-5">
        {/* Tip seçimi */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Ne indirmek istiyorsun?
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
                      <div className="font-semibold text-sm">{type.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{type.description}</div>
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
              Tarih Aralığı
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
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">
            İndirilecek
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
              <p className="font-semibold text-blue-400 mb-1">Excel & Google Sheets Uyumlu</p>
              <p className="text-slate-400">
                Dosya UTF-8 + BOM formatında oluşturulur — Türkçe karakterler doğru görünür. İndirdikten sonra çift tıklayarak aç veya Google Sheets'e yükle.
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
            İptal
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                İndiriliyor...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                CSV İndir
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}