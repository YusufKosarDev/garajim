import { useState, useEffect } from 'react'
import { Plus, Calendar, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVehicles } from '../context/VehicleContext'
import { useAutoFocus } from '../hooks/useAutoFocus'
import { formatPlate, isValidPlate, platesMatch } from '../utils/plateHelpers'
import { validateExpiryDate, validateVehicleYear } from '../utils/dateValidation'
import Modal from './Modal'
import MultiImageUploader from './MultiImageUploader'

const fuelTypes = ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik']

export default function VehicleForm({ isOpen, onClose, editVehicle = null }) {
  const { addVehicle, updateVehicle, vehicles } = useVehicles()
  const firstInputRef = useAutoFocus(isOpen)

  const [plate, setPlate] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [fuelType, setFuelType] = useState('Benzin')
  const [currentKm, setCurrentKm] = useState('')
  const [photos, setPhotos] = useState([])
  const [inspectionDate, setInspectionDate] = useState('')
  const [mtvDate, setMtvDate] = useState('')
  const [insuranceDate, setInsuranceDate] = useState('')
  const [kaskoDate, setKaskoDate] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  const isEdit = !!editVehicle

  useEffect(() => {
    if (!isOpen) return

    if (editVehicle) {
      setPlate(editVehicle.plate || '')
      setBrand(editVehicle.brand || '')
      setModel(editVehicle.model || '')
      setYear(editVehicle.year || '')
      setFuelType(editVehicle.fuelType || 'Benzin')
      setCurrentKm(editVehicle.currentKm || '')
      // Eski uyumluluk: photo varsa photos'a taşı
      const existingPhotos = editVehicle.photos || (editVehicle.photo ? [editVehicle.photo] : [])
      setPhotos(existingPhotos)
      setInspectionDate(editVehicle.inspectionDate || '')
      setMtvDate(editVehicle.mtvDate || '')
      setInsuranceDate(editVehicle.insuranceDate || '')
      setKaskoDate(editVehicle.kaskoDate || '')
      setNotes(editVehicle.notes || '')
    } else {
      setPlate('')
      setBrand('')
      setModel('')
      setYear('')
      setFuelType('Benzin')
      setCurrentKm('')
      setPhotos([])
      setInspectionDate('')
      setMtvDate('')
      setInsuranceDate('')
      setKaskoDate('')
      setNotes('')
    }
    setErrors({})
  }, [isOpen, editVehicle])

  const validate = () => {
    const newErrors = {}

    // Plaka
    const formattedPlate = formatPlate(plate)
    if (!formattedPlate.trim()) {
      newErrors.plate = 'Plaka zorunlu'
    } else if (!isValidPlate(formattedPlate)) {
      newErrors.plate = 'Geçerli bir plaka formatı gir (örn: 34 ABC 123)'
    } else {
      // Duplicate kontrolü — platesMatch ile
      const duplicate = vehicles.find(
        v => platesMatch(v.plate, formattedPlate) && v.id !== editVehicle?.id
      )
      if (duplicate) newErrors.plate = 'Bu plaka zaten kayıtlı'
    }

    // Marka
    if (!brand.trim()) newErrors.brand = 'Marka zorunlu'

    // Model
    if (!model.trim()) newErrors.model = 'Model zorunlu'

    // Yıl — validateVehicleYear kullan
    const yearCheck = validateVehicleYear(year)
    if (!yearCheck.isValid) {
      newErrors.year = yearCheck.message
    }

    // Güncel KM (opsiyonel, ama girildiyse geçerli olmalı)
    if (currentKm) {
      const kmValue = Number(currentKm)
      if (isNaN(kmValue) || kmValue < 0) {
        newErrors.currentKm = 'Geçerli bir KM gir'
      }
    }

    // Tarihler — validateExpiryDate kullan
    if (inspectionDate) {
      const check = validateExpiryDate(inspectionDate, 'Muayene tarihi')
      if (!check.isValid) newErrors.inspectionDate = check.message
    }
    if (mtvDate) {
      const check = validateExpiryDate(mtvDate, 'MTV tarihi')
      if (!check.isValid) newErrors.mtvDate = check.message
    }
    if (insuranceDate) {
      const check = validateExpiryDate(insuranceDate, 'Sigorta tarihi')
      if (!check.isValid) newErrors.insuranceDate = check.message
    }
    if (kaskoDate) {
      const check = validateExpiryDate(kaskoDate, 'Kasko tarihi')
      if (!check.isValid) newErrors.kaskoDate = check.message
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

    const data = {
      plate: formatPlate(plate),
      brand: brand.trim(),
      model: model.trim(),
      year: Number(year),
      fuelType,
      currentKm: currentKm ? Number(currentKm) : null,
      photos,
      // Eski uyumluluk için photo'yu photos[0] ile sync tut
      photo: photos[0] || null,
      inspectionDate,
      mtvDate,
      insuranceDate,
      kaskoDate,
      notes: notes.trim(),
    }

    if (isEdit) {
      updateVehicle(editVehicle.id, data)
      toast.success('Araç güncellendi 🚗')
    } else {
      addVehicle(data)
      toast.success('Araç eklendi 🚗')
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Aracı Düzenle' : 'Yeni Araç'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Plaka */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Plaka *
          </label>
          <input
            ref={firstInputRef}
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            onBlur={(e) => setPlate(formatPlate(e.target.value))}
            placeholder="34 ABC 123"
            className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm uppercase tracking-wide focus:outline-none transition ${
              errors.plate ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
            }`}
          />
          {errors.plate && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {errors.plate}
            </p>
          )}
        </div>

        {/* Marka & Model */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Marka *
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="BMW"
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                errors.brand ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.brand && <p className="text-xs text-red-400 mt-1">{errors.brand}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Model *
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="320i"
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                errors.model ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.model && <p className="text-xs text-red-400 mt-1">{errors.model}</p>}
          </div>
        </div>

        {/* Yıl, Yakıt, KM */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Yıl *
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2020"
              min="1950"
              max={new Date().getFullYear() + 1}
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                errors.year ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.year && <p className="text-xs text-red-400 mt-1">{errors.year}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Yakıt
            </label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
            >
              {fuelTypes.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Güncel KM
            </label>
            <input
              type="number"
              value={currentKm}
              onChange={(e) => setCurrentKm(e.target.value)}
              placeholder="0"
              min="0"
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                errors.currentKm ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
              }`}
            />
            {errors.currentKm && <p className="text-xs text-red-400 mt-1">{errors.currentKm}</p>}
          </div>
        </div>

        {/* Fotoğraflar */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Fotoğraflar
          </label>
          <MultiImageUploader photos={photos} onChange={setPhotos} />
        </div>

        {/* Tarihler */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Önemli Tarihler (opsiyonel)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Muayene</label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                  errors.inspectionDate ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
                }`}
              />
              {errors.inspectionDate && <p className="text-xs text-red-400 mt-1">{errors.inspectionDate}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">MTV</label>
              <input
                type="date"
                value={mtvDate}
                onChange={(e) => setMtvDate(e.target.value)}
                className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                  errors.mtvDate ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
                }`}
              />
              {errors.mtvDate && <p className="text-xs text-red-400 mt-1">{errors.mtvDate}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Trafik Sigortası</label>
              <input
                type="date"
                value={insuranceDate}
                onChange={(e) => setInsuranceDate(e.target.value)}
                className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                  errors.insuranceDate ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
                }`}
              />
              {errors.insuranceDate && <p className="text-xs text-red-400 mt-1">{errors.insuranceDate}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Kasko</label>
              <input
                type="date"
                value={kaskoDate}
                onChange={(e) => setKaskoDate(e.target.value)}
                className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
                  errors.kaskoDate ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
                }`}
              />
              {errors.kaskoDate && <p className="text-xs text-red-400 mt-1">{errors.kaskoDate}</p>}
            </div>
          </div>
        </div>

        {/* Notlar */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Notlar (opsiyonel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ek bilgiler..."
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
                Araç Ekle
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}