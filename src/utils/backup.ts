import { toDateKey } from './dateHelpers'

import type { Vehicle, MaintenanceRecord, FuelRecord, TireSet, TireChange, CustomIntervals } from '../types'

export const exportData = (
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[],
  fuelRecords: FuelRecord[],
  customIntervals: CustomIntervals,
  tireSets: TireSet[] = [],
  tireChanges: TireChange[] = []
) => {
  const data = {
    version: 3,
    exportDate: new Date().toISOString(),
    appName: 'Garajım',
    vehicles,
    maintenanceRecords,
    fuelRecords,
    tireSets,
    tireChanges,
    customIntervals,
  }

  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  const timestamp = toDateKey(new Date())
  link.href = url
  link.download = `garajim-yedek-${timestamp}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const parseImportFile = (file: File): Promise<Record<string, unknown>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        // FileReader sonucu string | ArrayBuffer | null olabilir
        const content = typeof e.target?.result === 'string' ? e.target.result : ''
        const data = JSON.parse(content)

        if (!data.vehicles || !Array.isArray(data.vehicles)) {
          reject(new Error('Geçersiz yedek dosyası: araçlar bulunamadı'))
          return
        }

        if (!data.maintenanceRecords || !Array.isArray(data.maintenanceRecords)) {
          reject(new Error('Geçersiz yedek dosyası: bakım kayıtları bulunamadı'))
          return
        }

        resolve({
          vehicles: data.vehicles,
          maintenanceRecords: data.maintenanceRecords,
          fuelRecords: data.fuelRecords || [],
          tireSets: data.tireSets || [],
          tireChanges: data.tireChanges || [],
          customIntervals: data.customIntervals || {},
          exportDate: data.exportDate,
        })
      } catch (err) {
        reject(new Error('Dosya okunamadı — geçerli bir JSON yedek dosyası olmalı'))
      }
    }

    reader.onerror = () => reject(new Error('Dosya okunurken hata oluştu'))
    reader.readAsText(file)
  })
}