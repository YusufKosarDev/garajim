import { useState, useEffect } from 'react'
import { Plus, AlertTriangle, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/VehicleContext'
import { useAutoFocus } from '../hooks/useAutoFocus'
import { checkMaintenanceKm } from '../utils/kmHelpers'
import { validatePastDate } from '../utils/dateValidation'
import Modal from './Modal'
import SingleImageUploader from './SingleImageUploader'

const commonMaintenanceTypes = [
  'Yağ Değişimi',
  'Yağ Filtresi',
  'Hava Filtresi',
  'Yakıt Filtresi',
  'Polen Filtresi',
  'Balata',
  'Disk',
  'Lastik',
  'Triger Seti',
  'Akü',
  'Buji',
  'Antifriz',
  'Fren Hidroliği',
  'Diğer',
]

export default function MaintenanceForm({ isOpen, onClose, vehicleId, editRecord = null, prefilledType = null }) {
  const { addMaintenance, updateMaintenance, vehicles, maintenanceRecords, fuelRecords } = useVehicles()
  const firstInputRef = useAutoFocus(isOpen)

  const vehicle = vehicles.find(v => v.id === vehicleId)
  const currentKm = vehicle?.currentKm || 0

  const [type, setType] = useState('')
  const [customType, setCustomType] = useState('')
  const [date, setDate] = useState('')
  const [km, setKm] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState(null)
  const [errors, setErrors] = useState({})

  const isEdit = !!editRecord
  const isCustom = type === 'Diğer' || (type && !commonMaintenanceTypes.includes(type))

  useEffect(() => {
    if (!isOpen) return

    if (editRecord) {
      const knownType = commonMaintenanceTypes.includes(editRecord.type) ? editRecord.type : 'Diğer'
      setType(knownType)
      setCustomType(knownType === 'Diğer' ? editRecord.type : '')
      setDate(editRecord.date || '')
      setKm(editRecord.km ? String(editRecord.km) : '')
      setCost(editRecord.cost ? String(editRecord.cost) : '')
      setNotes(editRecord.notes || '')
      setPhoto(editRecord.photo || null)
    } else {
      setType(prefilledType || '')
      setCustomType('')
      setDate(new Date().toISOString().split('T')[0])
      setKm(String(currentKm || ''))
      setCost('')
      setNotes('')
      setPhoto(null)
    }
    setErrors({})
  }, [isOpen, editRecord, prefilledType, currentKm])

  const validate = () => {
    const newErrors = {}

    const finalType = isCustom ? customType.trim() : type
    if (!finalType) {
      newErrors.type = 'Bakım türü seç veya yaz'
    }

    if (!date) {
      newErrors.date = 'Tarih zorunlu'
    } else {
      const dateCheck = validatePastDate(date, 'Tarih')
      if (!dateCheck.isValid) {
        newErrors.date = dateCheck.message
      }
    }

    // KM kontrolü (basit)
    if (!km) {
      newErrors.km = 'KM zorunlu'
    } else {
      const kmValue = Number(km)
      if (isNaN(kmValue) || kmValue < 0) {
        newErrors.km = 'Geçerli bir KM gir'
      }
    }

    if (cost && Number(cost) < 0) {
      newErrors.cost = 'Negatif olamaz'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Lütfen hataları düzelt')
      return
    }

    // KM tutarlılık kontrolü (gelişmiş — geçmişe dönük uyarı)
    const kmCheck = checkMaintenanceKm(
      km,
      vehicle,
      maintenanceRecords,
      fuelRecords,
      editRecord?.id
    )

    if (kmCheck.needsConfirm) {
      const confirmed = window.confirm(kmCheck.message + '\n\nDevam etmek istiyor musun?')
      if (!confirmed) return
    }

    const finalType = isCustom ? customType.trim() : type

    const data = {
      vehicleId,
      type: finalType,
      date,
      km: Number(km),
      cost: Number(cost) || 0,
      notes: notes.trim(),
      photo: photo || null,
    }

    if (isEdit) {
      updateMaintenance(editRecord.id, data)
      toast.success('Bakım kaydı güncellendi 🔧')
    } else {
      addMaintenance(data)
      toast.success('Bakım kaydı eklendi 🔧')
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Bakım Kaydını Düzenle' : 'Yeni Bakım Kaydı'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Bakım türü */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Bakım Türü *
          </label>
          <select
            ref={firstInputRef}
            value={isCustom ? 'Diğer' : type}
            onChange={(e) => {
              setType(e.target.value)
              if (e.target.value !== 'Diğer') setCustomType('')
            }}
            className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
              errors.type ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
            }`}
          >
            <option value="">Seç...</option>
            {commonMaintenanceTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Custom type input */}
          {isCustom && (
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Bakım türünü yaz..."
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition mt-2 ${
                errors.type ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
              }`}
            />
          )}

          {errors.type && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {errors.type}
            </p>
          )}
        </div>

        {/* Tarih ve KM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Tarih *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                errors.date ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              KM *
            </label>
            <input
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder="0"
              min="0"
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                errors.km ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.km && <p className="text-xs text-red-400 mt-1">{errors.km}</p>}
            {currentKm > 0 && !km && (
              <p className="text-[10px] text-slate-500 mt-1">
                Aracın güncel KM'si: {Number(currentKm).toLocaleString('tr-TR')}
              </p>
            )}
          </div>
        </div>

        {/* Maliyet */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Maliyet (₺)
          </label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0"
            min="0"
            className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
              errors.cost ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
            }`}
          />
          {errors.cost && <p className="text-xs text-red-400 mt-1">{errors.cost}</p>}
        </div>

        {/* Fatura fotoğrafı */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Receipt className="w-3 h-3" />
            Fatura / Fiş
          </label>
          <SingleImageUploader
            photo={photo}
            onChange={setPhoto}
            label="Fatura"
            hint="Fatura, fiş veya parça fotoğrafı"
            maxSizeMB={1}
          />
        </div>

        {/* Notlar */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Notlar (opsiyonel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Servis adı, marka, ek bilgiler..."
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg font-semibold transition"
          >
            İptal
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg font-semibold transition"
          >
            {isEdit ? 'Güncelle' : (
              <>
                <Plus className="w-4 h-4" />
                Bakım Ekle
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}