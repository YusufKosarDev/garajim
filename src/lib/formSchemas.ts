import i18n from '../i18n'
import { z } from 'zod'
import { validatePastDate, validateExpiryDate, validateVehicleYear } from '../utils/dateValidation'
import { formatPlate, isValidPlate, platesMatch } from '../utils/plateHelpers'
import { checkFuelKm } from '../utils/kmHelpers'
import { SEASONS } from '../utils/tireHelpers'
import type { Vehicle, FuelRecord, TireSet, Season } from '../types'


/**
 * Form şemaları.
 *
 * NOT: Mevcut doğrulayıcılar YENİDEN YAZILMADI. Hepsi `{ isValid, message }`
 * döndürdüğü için superRefine içinden olduğu gibi çağrılıyorlar; böylece tek
 * doğruluk kaynağı korunuyor ve utils testleri geçerliliğini sürdürüyor.
 *
 * HEPSİ FABRİKA FONKSİYONU — sabit değil. Zod mesajları şema KURULURKEN
 * hesaplanır; şema modül seviyesinde bir sabit olsaydı mesajlar uygulamanın
 * açılış diline donar ve kullanıcı dili değiştirdiğinde form hataları eski
 * dilde kalırdı. Bileşenler şemayı `useMemo` içinde kuruyor.
 */

// { isValid, message } sözleşmesini zod issue'suna çeviren yardımcı
/**
 * zod v4 refinement bağlamı tipini dışa vermiyor. Yalnızca addIssue'yu
 * kullandığımız için yapısal bir tip yeterli — zod'un ctx'i daha geniş bir
 * issue birleşimi kabul ettiğinden buraya sorunsuz atanıyor.
 */
interface RefinementCtx {
  addIssue: (issue: { code: 'custom'; path: (string | number)[]; message: string }) => void
}

const uygula = (ctx: RefinementCtx, path: string, result: { isValid: boolean; message?: string }) => {
  if (!result.isValid) {
    ctx.addIssue({ code: 'custom', path: [path], message: result.message ?? i18n.t('formSchemas.gecersiz_deger') })
  }
}

const requiredText = (message: string) => z.string().trim().min(1, message)

// Sayı alanları formda string olarak tutulur (input value her zaman string)
const sayi = () => z.string().trim()

// ============================================================
// YAKIT
// ============================================================
export const makeFuelSchema = ({ vehicleFuelRecords = [], editId = null }: { vehicleFuelRecords?: FuelRecord[]; editId?: string | null } = {}) =>
  z.object({
    date: requiredText(i18n.t('formSchemas.tarih_zorunlu')),
    km: requiredText(i18n.t('formSchemas.kilometre_zorunlu')),
    liters: requiredText(i18n.t('formSchemas.litre_zorunlu')),
    pricePerLiter: sayi(),
    totalCost: requiredText(i18n.t('formSchemas.toplam_tutar_zorunlu')),
    fullTank: z.boolean(),
    station: z.string(),
    notes: z.string(),
  }).superRefine((val, ctx) => {
    if (val.date) uygula(ctx, 'date', validatePastDate(val.date, i18n.t('formSchemas.field.yakit_alim_tarihi')))
    if (val.km) uygula(ctx, 'km', checkFuelKm(val.km, vehicleFuelRecords, editId))
  })

// ============================================================
// BAKIM
// ============================================================
export const makeMaintenanceSchema = () => z.object({
  type: z.string(),
  customType: z.string(),
  date: requiredText(i18n.t('formSchemas.tarih_zorunlu')),
  km: requiredText(i18n.t('formSchemas.km_zorunlu')),
  cost: sayi(),
  notes: z.string(),
  photo: z.any().nullable(),
}).superRefine((val, ctx) => {
  const isCustom = val.type === 'Diğer'
  const finalType = isCustom ? val.customType.trim() : val.type
  if (!finalType) {
    ctx.addIssue({ code: 'custom', path: ['type'], message: i18n.t('formSchemas.bakim_turu_sec_veya_yaz') })
  }

  if (val.date) uygula(ctx, 'date', validatePastDate(val.date, i18n.t('formSchemas.field.tarih')))

  if (val.km) {
    const kmValue = Number(val.km)
    if (Number.isNaN(kmValue) || kmValue < 0) {
      ctx.addIssue({ code: 'custom', path: ['km'], message: i18n.t('formSchemas.gecerli_km_gir') })
    }
  }

  if (val.cost && Number(val.cost) < 0) {
    ctx.addIssue({ code: 'custom', path: ['cost'], message: i18n.t('formSchemas.negatif_olamaz') })
  }
})

// ============================================================
// ARAÇ
// ============================================================
export const makeVehicleSchema = ({ vehicles = [], editId = null }: { vehicles?: Vehicle[]; editId?: string | null } = {}) =>
  z.object({
    plate: requiredText(i18n.t('formSchemas.plaka_zorunlu')),
    brand: requiredText(i18n.t('formSchemas.marka_zorunlu')),
    model: requiredText(i18n.t('formSchemas.model_zorunlu')),
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
      const formatted = formatPlate(val.plate)
      if (!isValidPlate(formatted)) {
        // Mesaj mevcut davranışla birebir aynı tutuldu — kullanıcıya görünen
        // metni migrasyon sırasında değiştirmemek için.
        ctx.addIssue({
          code: 'custom', path: ['plate'],
          message: i18n.t('formSchemas.gecerli_plaka_formati'),
        })
      } else if (vehicles.some(v => v.id !== editId && platesMatch(v.plate, formatted))) {
        ctx.addIssue({ code: 'custom', path: ['plate'], message: i18n.t('formSchemas.plaka_zaten_kayitli') })
      }
    }

    if (val.year) uygula(ctx, 'year', validateVehicleYear(val.year))

    if (val.currentKm) {
      const km = Number(val.currentKm)
      if (Number.isNaN(km) || km < 0) {
        ctx.addIssue({ code: 'custom', path: ['currentKm'], message: i18n.t('formSchemas.gecerli_km_gir') })
      }
    }

    for (const [field, label] of [
      ['inspectionDate', i18n.t('formSchemas.field.muayene_tarihi')],
      ['mtvDate', i18n.t('formSchemas.field.mtv_tarihi')],
      ['insuranceDate', i18n.t('formSchemas.field.sigorta_tarihi')],
      ['kaskoDate', i18n.t('formSchemas.field.kasko_tarihi')],
    ]) {
      const value = val[field as keyof typeof val] as string
      if (value) uygula(ctx, field, validateExpiryDate(value, label))
    }
  })

// ============================================================
// LASTİK MEVSİM DEĞİŞİMİ
// ============================================================
export const makeTireChangeSchema = () => z.object({
  date: requiredText(i18n.t('formSchemas.tarih_zorunlu')),
  km: z.string(),
  cost: sayi(),
  notes: z.string(),
}).superRefine((val, ctx) => {
  if (!val.km || Number(val.km) <= 0) {
    ctx.addIssue({ code: 'custom', path: ['km'], message: i18n.t('formSchemas.gecerli_km_gir_kisa') })
  }
  // Mesaj mevcut davranışla aynı tutuldu
  if (val.date) {
    const secilen = new Date(val.date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (secilen > today) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: i18n.t('formSchemas.gelecek_tarih_olamaz') })
    }
  }
})

// ============================================================
// LASTİK SETİ
// ============================================================
export const makeTireSetSchema = ({ tireSets = [], vehicleId = null, isEdit = false }: { tireSets?: TireSet[]; vehicleId?: string | null; isEdit?: boolean } = {}) =>
  z.object({
    season: z.string(),
    brand: requiredText(i18n.t('formSchemas.marka_zorunlu')),
    size: requiredText(i18n.t('formSchemas.ebat_zorunlu')),
    purchaseDate: z.string(),
    purchasePrice: sayi(),
    hasSpare: z.boolean(),
    notes: z.string(),
    tires: z.array(z.object({
      position: z.string(),
      dot: z.string(),
      treadDepth: z.union([z.string(), z.number()]),
    })),
  }).superRefine((val, ctx) => {
    // Aynı sezondan ikinci set eklenemez (düzenlemede sezon zaten kilitli)
    if (!isEdit) {
      const existing = tireSets.find(t => t.vehicleId === vehicleId && t.season === val.season)
      if (existing) {
        ctx.addIssue({
          code: 'custom', path: ['season'],
          message: i18n.t('formSchemas.sezon_zaten_tanimli', { season: i18n.t(SEASONS[val.season as Season].label) }),
        })
      }
    }

    val.tires.forEach((tire, i) => {
      // Stepney yoksa kontrol etme
      if (tire.position === 'S' && !val.hasSpare) return

      if (tire.dot && tire.dot.length !== 4) {
        ctx.addIssue({ code: 'custom', path: ['tires', i, 'dot'], message: i18n.t('formSchemas.dot_4_haneli') })
      }

      const treadDepth = Number(tire.treadDepth)
      if (tire.treadDepth && (Number.isNaN(treadDepth) || treadDepth < 0 || treadDepth > 15)) {
        ctx.addIssue({ code: 'custom', path: ['tires', i, 'treadDepth'], message: i18n.t('formSchemas.tread_0_15_mm') })
      }
    })
  })
