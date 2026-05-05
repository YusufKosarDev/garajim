// Versiyon yönetimi: her yeni özellik için veri yapısını güncelle
const CURRENT_VERSION = 4

export const migrateData = (data) => {
  if (!data) return {
    vehicles: [],
    maintenanceRecords: [],
    fuelRecords: [],
    tireSets: [],
    tireChanges: [],
    customIntervals: {},
    version: CURRENT_VERSION,
  }

  const version = data.version || 1
  let migrated = { ...data }

  // V1 → V2: fuelRecords ve customIntervals ekle
  if (version < 2) {
    migrated = {
      ...migrated,
      fuelRecords: migrated.fuelRecords || [],
      customIntervals: migrated.customIntervals || {},
    }
  }

  // V2 → V3: tireSets ve tireChanges ekle
  if (version < 3) {
    migrated = {
      ...migrated,
      tireSets: migrated.tireSets || [],
      tireChanges: migrated.tireChanges || [],
    }
  }

  // V3 → V4: vehicle.photo → vehicle.photos[]
  if (version < 4) {
    migrated.vehicles = (migrated.vehicles || []).map(v => {
      // Eğer hâlâ eski photo field'ı varsa, photos array'ine taşı
      if (v.photo && (!v.photos || v.photos.length === 0)) {
        return {
          ...v,
          photos: [v.photo],
          // photo'yu silmek yerine bırakıyoruz — eski versiyonlar uyumlu kalsın diye
        }
      }
      return v
    })
  }

  // Vehicle'larda eksik alanları tamamla
  migrated.vehicles = (migrated.vehicles || []).map(v => ({
    notes: '',
    photos: [],
    ...v,
    // photos'un her zaman array olmasını garanti et
    photos: Array.isArray(v.photos) ? v.photos : (v.photo ? [v.photo] : []),
  }))

  // Maintenance kayıtlarında eksik alanları tamamla
  migrated.maintenanceRecords = (migrated.maintenanceRecords || []).map(r => ({
    cost: 0,
    notes: '',
    photo: null, // Fatura fotoğrafı için yer ayır (opsiyonel)
    ...r,
  }))

  // Fuel kayıtlarında eksik alanları tamamla
  migrated.fuelRecords = (migrated.fuelRecords || []).map(r => ({
    fullTank: false,
    station: '',
    notes: '',
    ...r,
  }))

  // Tire sets'te eksik alanları tamamla
  migrated.tireSets = (migrated.tireSets || []).map(t => ({
    notes: '',
    ...t,
    tires: (t.tires || []).map(tire => ({
      dot: '',
      treadDepth: 0,
      ...tire,
    })),
  }))

  // Tire changes'te eksik alanları tamamla
  migrated.tireChanges = (migrated.tireChanges || []).map(c => ({
    cost: 0,
    notes: '',
    ...c,
  }))

  migrated.version = CURRENT_VERSION
  return migrated
}