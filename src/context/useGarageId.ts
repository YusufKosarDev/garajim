/**
 * Kullanıcının garaj üyeliğini bir kez okur ve iki tüketiciye birden verir:
 * realtime abonelik filtresi ve INSERT'lere eklenen `garage_id`.
 *
 * NEDEN TEK YERDE: ikisi de aynı değere bakmak ZORUNDA. Realtime
 * `garage_id=in.(...)` ile dinlerken insert'ler `garage_id` göndermezse
 * kayıtlar hiçbir zaman ikinci cihaza ulaşmaz — tam olarak bu oluyordu
 * (bkz. lib/garageId.ts).
 *
 * `hazir` bayrağı ayrı duruyor çünkü abonelik BEKLEMEK zorunda: üyelik
 * gelmeden abone olunursa önce `user_id` filtresiyle bağlanılır, sonra
 * yeniden abone olunur ve arada gelen olaylar kaçar.
 */
import { useEffect, useState } from 'react'
import { fetchGarageIds } from '../lib/garageId'

export interface GarageIdState {
  /** Realtime filtresinin dinlediği tüm garajlar */
  garageIds: string[]
  /** Yeni satırların yazılacağı garaj; üyelik yoksa null */
  garageId: string | null
  /** Sorgu tamamlandı mı (başarısız olsa bile true) */
  hazir: boolean
}

const BOS: GarageIdState = { garageIds: [], garageId: null, hazir: false }

/**
 * State içinde HANGİ kullanıcı için okunduğu da tutuluyor.
 *
 * Kullanıcı değişince efektin içinden setState ile sıfırlamak, React'ın
 * yeniden render zincirini tetikliyor ve lint kuralı da haklı olarak buna
 * itiraz ediyor (react-hooks/set-state-in-effect). Bunun yerine değer
 * TÜRETİLİYOR: elimizdeki sonuç başka bir kullanıcıya aitse boş dönüyor.
 * Yan etki olarak bir hata sınıfı da kapanıyor — çıkış yapıp başka hesapla
 * girildiğinde bir an için ÖNCEKİ kullanıcının garaj kimliği görünemiyor.
 */
interface Kayit extends GarageIdState { userId: string | null }

export function useGarageId(userId: string | null | undefined): GarageIdState {
  const [durum, setDurum] = useState<Kayit>({ ...BOS, userId: null })

  useEffect(() => {
    if (!userId) return

    let iptal = false
    fetchGarageIds(userId)
      .then((ids) => {
        if (iptal) return
        setDurum({ garageIds: ids, garageId: ids[0] ?? null, hazir: true, userId })
      })
      .catch((err) => {
        if (iptal) return
        // Üyelik okunamazsa uygulama çalışmaya devam etmeli: `garage_id`
        // gönderilmez (bugünkü davranış) ve abonelik user_id'ye düşer.
        console.warn('Garaj üyeliği okunamadı', err)
        setDurum({ garageIds: [], garageId: null, hazir: true, userId })
      })

    return () => { iptal = true }
  }, [userId])

  // Sonuç istenen kullanıcıya ait değilse (henüz gelmedi ya da kullanıcı
  // değişti) boş dön — 'hazir' de false kalır ve abonelik bekler.
  return durum.userId === (userId ?? null) ? durum : BOS
}
