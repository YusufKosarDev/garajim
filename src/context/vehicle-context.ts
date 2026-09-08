/**
 * Araç context nesnesi, sözleşme tipi, hook'u ve sorgu anahtarları.
 *
 * NEDEN AYRI DOSYA: bkz. auth-context.ts — Fast Refresh yalnızca sadece
 * bileşen export eden modüllerde çalışıyor. VehicleContext.tsx artık sadece
 * `VehicleProvider` bileşenini export ediyor.
 */
import { createContext, useContext } from 'react'
import type {
  Vehicle, MaintenanceRecord, FuelRecord, TireSet, TireChange, CustomIntervals,
} from '../types'

export interface VehicleContextValue {
  vehicles: Vehicle[]
  maintenanceRecords: MaintenanceRecord[]
  fuelRecords: FuelRecord[]
  tireSets: TireSet[]
  tireChanges: TireChange[]
  customIntervals: CustomIntervals
  isLoaded: boolean
  /** Çevrimdışıyken kuyruğa alınmış, henüz gönderilmemiş kayıt sayısı */
  pendingCount: number
  addVehicle: (vehicle: Partial<Vehicle>) => Promise<Vehicle | null>
  updateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<void>
  deleteVehicle: (id: string) => Promise<void>
  addMaintenance: (record: Partial<MaintenanceRecord>) => Promise<MaintenanceRecord | null>
  updateMaintenance: (id: string, updates: Partial<MaintenanceRecord>) => Promise<void>
  deleteMaintenance: (id: string) => Promise<void>
  addFuel: (record: Partial<FuelRecord>) => Promise<FuelRecord | null>
  updateFuel: (id: string, updates: Partial<FuelRecord>) => Promise<void>
  deleteFuel: (id: string) => Promise<void>
  addTireSet: (tireSet: Partial<TireSet>) => Promise<TireSet | null>
  updateTireSet: (id: string, updates: Partial<TireSet>) => Promise<void>
  deleteTireSet: (id: string) => Promise<void>
  addTireChange: (change: Partial<TireChange>) => Promise<TireChange | null>
  updateTireChange: (id: string, updates: Partial<TireChange>) => Promise<void>
  deleteTireChange: (id: string) => Promise<void>
  updateCustomIntervals: (intervals: CustomIntervals) => Promise<void>
  clearAllData: () => Promise<void>
}

export const VehicleContext = createContext<VehicleContextValue | null>(null)

export const useVehicles = (): VehicleContextValue => {
  const ctx = useContext(VehicleContext)
  if (!ctx) throw new Error('useVehicles must be used within VehicleProvider')
  return ctx
}

// Sorgu anahtarları — realtime ve mutasyonlar cache'e bunlarla yazıyor
export const vehicleQueryKeys = {
  all: (userId?: string) => ['garaj', userId],
  list: (userId: string | undefined, name: string) => ['garaj', userId, name],
}
