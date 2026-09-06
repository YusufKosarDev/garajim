/**
 * Uygulama genelinde kullanılan tip tanımları.
 *
 * NOT: Bu tipler `supabase gen types typescript` ile ÜRETİLMEDİ — o komut
 * Supabase oturumu gerektiriyor (Faz 0 bekliyor). Bunun yerine tipler
 * src/lib/supabaseMappers.js'ten türetildi; uygulamanın DB ile gerçekten
 * kullandığı sözleşme zaten orada tanımlı. Faz 0 tamamlandığında üretilen
 * tiplerle karşılaştırılıp bu dosya sadeleştirilebilir.
 */

// ============================================================
// FRONTEND (camelCase)
// ============================================================

export type YakitTipi = 'Benzin' | 'Dizel' | 'LPG' | 'Hibrit' | 'Elektrik'
export type Sezon = 'summer' | 'winter' | 'all-season'
export type LastikPozisyonu = 'FL' | 'FR' | 'RL' | 'RR' | 'S'

export interface Vehicle {
  id: string
  plate: string
  brand: string
  model: string
  year: number | null
  fuelType: string | null
  currentKm: number | null
  inspectionDate: string | null
  mtvDate: string | null
  insuranceDate: string | null
  kaskoDate: string | null
  notes: string | null
  photos: string[]
  /** Eski tek fotoğraf alanı — bazı kayıtlarda hâlâ olabilir */
  photo?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface MaintenanceRecord {
  id: string
  vehicleId: string
  type: string
  date: string
  km: number | null
  cost: number
  notes: string | null
  /** DB'de photo_url olarak duruyor */
  photo: string | null
  createdAt?: string
  updatedAt?: string
}

export interface FuelRecord {
  id: string
  vehicleId: string
  date: string
  km: number | null
  liters: number
  pricePerLiter: number
  totalCost: number
  fullTank: boolean
  station: string | null
  notes: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Tire {
  position: LastikPozisyonu | string
  dot: string
  treadDepth: number
}

export interface TireSet {
  id: string
  vehicleId: string
  season: Sezon
  brand: string | null
  size: string | null
  tires: Tire[]
  purchaseDate: string | null
  purchasePrice: number
  notes: string | null
  createdAt?: string
  updatedAt?: string
}

export interface TireChange {
  id: string
  vehicleId: string
  date: string
  fromSeason: Sezon | null
  toSeason: Sezon
  km: number | null
  cost: number
  notes: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CustomInterval {
  kilometers: number | null
  months: number | null
}

/**
 * Anahtar biçimi: `${vehicleId}-${bakımTürü}`.
 * vehicleId bir UUID olduğu ve kendisi tire içerdiği için bu anahtar
 * split('-') ile ayrıştırılamaz — parseIntervalKey kullanılmalı.
 */
export type CustomIntervals = Record<string, CustomInterval | number>

// ============================================================
// DATABASE (snake_case)
// ============================================================

export interface VehicleRow {
  id: string
  user_id: string
  garage_id?: string | null
  plate: string
  brand: string
  model: string
  year: number | null
  fuel_type: string | null
  current_km: number | null
  inspection_date: string | null
  mtv_date: string | null
  insurance_date: string | null
  kasko_date: string | null
  notes: string | null
  photos: string[] | null
  created_at?: string
  updated_at?: string
}

export interface MaintenanceRow {
  id: string
  user_id: string
  garage_id?: string | null
  vehicle_id: string
  type: string
  date: string
  km: number | null
  cost: string | number | null
  notes: string | null
  photo_url: string | null
  created_at?: string
  updated_at?: string
}

export interface FuelRow {
  id: string
  user_id: string
  garage_id?: string | null
  vehicle_id: string
  date: string
  km: number | null
  liters: string | number | null
  price_per_liter: string | number | null
  total_cost: string | number | null
  full_tank: boolean | null
  station: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

export interface TireSetRow {
  id: string
  user_id: string
  garage_id?: string | null
  vehicle_id: string
  season: Sezon
  brand: string | null
  size: string | null
  tires: Tire[] | null
  purchase_date: string | null
  purchase_price: string | number | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

export interface TireChangeRow {
  id: string
  user_id: string
  garage_id?: string | null
  vehicle_id: string
  date: string
  from_season: Sezon | null
  to_season: Sezon
  km: number | null
  cost: string | number | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

export interface CustomIntervalRow {
  vehicle_id: string
  user_id: string
  maintenance_type: string
  kilometers: number | null
  months: number | null
}

// ============================================================
// TÜREV / YARDIMCI
// ============================================================

/** Doğrulayıcıların ortak sözleşmesi */
export interface ValidationResult {
  isValid: boolean
  message?: string
}

/** checkMaintenanceKm bir hata değil, onay ister */
export interface ConfirmResult {
  needsConfirm: boolean
  message?: string
}

export type DateStatus = 'expired' | 'warning' | 'safe' | 'none'
export type RecommendationStatus = 'overdue' | 'urgent' | 'soon' | 'ok'
export type TireStatus = 'critical' | 'danger' | 'warning' | 'ok'
