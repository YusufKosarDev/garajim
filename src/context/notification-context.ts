/**
 * Bildirim context nesnesi ve onu okuyan hook.
 *
 * NEDEN AYRI DOSYA: bkz. auth-context.ts — Fast Refresh yalnızca sadece
 * bileşen export eden modüllerde çalışıyor.
 */
import { createContext, useContext } from 'react'

export const NotificationContext = createContext<Record<string, unknown> | null>(null)

export const useNotifications = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
