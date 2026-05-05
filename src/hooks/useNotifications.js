import { useEffect, useState } from 'react'
import { checkAndNotify, getPermissionStatus, requestPermission } from '../utils/notifications'
import { useVehicles } from '../context/VehicleContext'

export const useNotifications = () => {
  const { vehicles, maintenanceRecords, customIntervals, isLoaded } = useVehicles()
  const [permission, setPermission] = useState(getPermissionStatus())

  useEffect(() => {
    if (!isLoaded) return
    if (permission === 'granted' && vehicles.length > 0) {
      checkAndNotify(vehicles, maintenanceRecords, customIntervals)
      const interval = setInterval(
        () => checkAndNotify(vehicles, maintenanceRecords, customIntervals),
        60 * 60 * 1000
      )
      return () => clearInterval(interval)
    }
  }, [permission, vehicles, maintenanceRecords, customIntervals, isLoaded])

  const enable = async () => {
    const result = await requestPermission()
    setPermission(result)
    return result
  }

  return { permission, enable }
}