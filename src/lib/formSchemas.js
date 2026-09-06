import { z } from 'zod'
import { validatePastDate, validateExpiryDate, validateVehicleYear } from '../utils/dateValidation'
import { formatPlate, isValidPlate, platesMatch } from '../utils/plateHelpers'
import { checkFuelKm } from '../utils/kmHelpers'

/**
 * Form şemaları.
 *
 * NOT: Mevcut doğrulayıcılar YENİDEN YAZILMADI. Hepsi `{ isValid, message }`
 * döndürdüğü için superRefine içinden olduğu gibi çağrılıyorlar; böylece tek
 * doğruluk kaynağı korunuyor ve utils testleri geçerliliğini sürdürüyor.
 */

// { isValid, message } sözleşmesini zod issue'suna çeviren yardımcı
const uygula = (ctx, path, sonuc) => {
  if (!sonuc.isValid) {
    ctx.addIssue({ code: 'custom', path: [path], message: sonuc.message })
  }
}

const zorunluMetin = (mesaj) => z.string().trim().min(1, mesaj)

// Sayı alanları formda string olarak tutulur (input value her zaman string)
const sayi = () => z.string().trim()

// ============================================================
// YAKIT
// ============================================================
export const makeFuelSchema = ({ vehicleFuelRecords = [], editId = null } = {}) =>
  z.object({
    date: zorunluMetin('Tarih zorunlu'),
    km: zorunluMetin('Kilometre zorunlu'),
    liters: zorunluMetin('Litre zorunlu'),
    pricePerLiter: sayi(),
    totalCost: zorunluMetin('Toplam tutar zorunlu'),
    fullTank: z.boolean(),
    station: z.string(),
    notes: z.string(),
  }).superRefine((val, ctx) => {
    if (val.date) uygula(ctx, 'date', validatePastDate(val.date, 'Yakıt alım tarihi'))
    if (val.km) uygula(ctx, 'km', checkFuelKm(val.km, vehicleFuelRecords, editId))
  })

// ============================================================
// BAKIM
// ============================================================
export const maintenanceSchema = z.object({
  type: z.string(),
  customType: z.string(),
  date: zorunluMetin('Tarih zorunlu'),
  km: zorunluMetin('KM zorunlu'),
  cost: sayi(),
  notes: z.string(),
  photo: z.any().nullable(),
}).superRefine((val, ctx) => {
  const isCustom = val.type === 'Diğer'
  const finalType = isCustom ? val.customType.trim() : val.type
  if (!finalType) {
    ctx.addIssue({ code: 'custom', path: ['type'], message: 'Bakım türü seç veya yaz' })
  }

  if (val.date) uygula(ctx, 'date', validatePastDate(val.date, 'Tarih'))

  if (val.km) {
    const kmValue = Number(val.km)
    if (Number.isNaN(kmValue) || kmValue < 0) {
      ctx.addIssue({ code: 'custom', path: ['km'], message: 'Geçerli bir KM gir' })
    }
  }

  if (val.cost && Number(val.cost) < 0) {
    ctx.addIssue({ code: 'custom', path: ['cost'], message: 'Negatif olamaz' })
  }
})

// ============================================================
// ARAÇ
// ============================================================
export const makeVehicleSchema = ({ vehicles = [], editId = null } = {}) =>
  z.object({
    plate: zorunluMetin('Plaka zorunlu'),
    brand: zorunluMetin('Marka zorunlu'),
    model: zorunluMetin('Model zorunlu'),
    year: z.string(),
    fuelType: z.string(),
    currentKm: z.string(),
    inspectionDate: z.string(),
    mtvDate: z.string(),
    insuranceDate: z.string(),
    kaskoDate: z.string(),
    notes: z.string(),
    photos: z.array(z.string()),
  }).superRefine((val, ctx) => {
    // Plaka: mevcut yardımcılar aynen kullanılıyor
    if (val.plate) {
      const bicimli = formatPlate(val.plate)
      if (!isValidPlate(bicimli)) {
        ctx.addIssue({
          code: 'custom', path: ['plate'],
          message: 'Geçersiz plaka formatı (örn: 34 ABC 1234)',
        })
      } else if (vehicles.some(v => v.id !== editId && platesMatch(v.plate, bicimli))) {
        ctx.addIssue({ code: 'custom', path: ['plate'], message: 'Bu plaka zaten kayıtlı' })
      }
    }

    if (val.year) uygula(ctx, 'year', validateVehicleYear(val.year))

    if (val.currentKm) {
      const km = Number(val.currentKm)
      if (Number.isNaN(km) || km < 0) {
        ctx.addIssue({ code: 'custom', path: ['currentKm'], message: 'Geçerli bir KM gir' })
      }
    }

    for (const [alan, etiket] of [
      ['inspectionDate', 'Muayene tarihi'],
      ['mtvDate', 'MTV tarihi'],
      ['insuranceDate', 'Sigorta tarihi'],
      ['kaskoDate', 'Kasko tarihi'],
    ]) {
      if (val[alan]) uygula(ctx, alan, validateExpiryDate(val[alan], etiket))
    }
  })
