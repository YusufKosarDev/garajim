import i18n from '../i18n'
import { toDateKey } from './dateHelpers'
import { downloadFile } from './downloadFile'

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

  const timestamp = toDateKey(new Date())
  downloadFile(JSON.stringify(data, null, 2), `garajim-yedek-${timestamp}.json`, 'application/json')
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
          reject(new Error(i18n.t('backup.gecersiz_yedek_bakim')))
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
      } catch {
        reject(new Error(i18n.t('backup.dosya_okunamadi')))
      }
    }

    reader.onerror = () => reject(new Error('Dosya okunurken hata oluştu'))
    reader.readAsText(file)
  })
}