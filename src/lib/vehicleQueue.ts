import { OfflineQueue, createIndexedDbStore, createMemoryStore } from './offlineQueue'

/**
 * Uygulama genelinde tek kuyruk örneği.
 *
 * Ayrı modülde: VehicleContext bir bileşen dosyası ve oradan bileşen dışı bir
 * değer export etmek Fast Refresh'i bozuyor (react-refresh/only-export-components).
 * Testler de kuyruğu buradan alıp izolasyon için temizliyor.
 *
 * IndexedDB yoksa (test ortamı, çok eski tarayıcı) bellek içi depoya düşer —
 * o durumda kuyruk sekme kapanınca kaybolur, ama uygulama çalışmaya devam eder.
 */
export const vehicleQueue = new OfflineQueue(
  typeof indexedDB !== 'undefined' ? createIndexedDbStore() : createMemoryStore()
)
