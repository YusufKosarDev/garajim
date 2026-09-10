/**
 * Kullanıcının garaj kimliği.
 *
 * NEDEN VAR: veriler garaj bazlı. Beş tabloda (`vehicles`,
 * `maintenance_records`, `fuel_records`, `tire_sets`, `tire_changes`)
 * `garage_id` sütunu var ve realtime aboneliği bu sütunla filtreliyor
 * (`garage_id=in.(...)`, bkz. VehicleContext).
 *
 * Ama INSERT'lerde bu sütun HİÇ GÖNDERİLMİYORDU. Sunucu tarafında dolduran
 * bir trigger da yok — bunu ölçtüm: demo hesabına yazılan 86 satırın hepsi
 * `garage_id = NULL` geldi. Sonucu sessiz ama gerçek:
 *
 *   • Realtime filtresi NULL satırlarla asla eşleşmiyor. Kaydı ekleyen cihaz
 *     iyimser güncelleme sayesinde satırı görüyor, ama kullanıcının İKİNCİ
 *     cihazı ve garajı paylaştığı kişi hiçbir zaman görmüyor. Yani realtime
 *     kodunun yazılma sebebi olan "çoklu kullanıcı senkronu" çalışmıyordu.
 *   • Garaj paylaşımı da aynı sebeple yarım kalıyor.
 *
 * Çözüm sunucuda bir trigger olabilirdi; ama şema bu depodan yönetilmiyor
 * (bkz. docs/database/README.md) ve istemci `user_id`'yi zaten gönderiyor.
 * `garage_id`'yi de göndermek aynı yerde, aynı biçimde ve test edilebilir.
 */
import { supabase } from './supabase'

/** Kullanıcının üye olduğu tüm garajlar (realtime filtresi bunların hepsini dinler) */
export const fetchGarageIds = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('garage_members')
    .select('garage_id')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map(r => r.garage_id as string).filter(Boolean)
}

/**
 * Yeni satırların yazılacağı garaj.
 *
 * Birden fazla üyelik varsa İLKİ seçiliyor: uygulamada garaj seçici yok,
 * kullanıcı tek bir garajda çalışıyor. Hiç üyelik yoksa `null` dönüyor ve
 * çağıran taraf `garage_id`'yi hiç göndermiyor — yani bugünkü davranış.
 */
export const fetchPrimaryGarageId = async (userId: string): Promise<string | null> => {
  const ids = await fetchGarageIds(userId)
  return ids[0] ?? null
}
