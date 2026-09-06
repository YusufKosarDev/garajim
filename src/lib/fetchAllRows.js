// PostgREST'in bir istekte döndürdüğü satır sayısı sunucu tarafında sınırlı
// olabilir (Supabase API ayarlarındaki "Max rows"). Tek istekle çekince tavana
// takılan veri SESSİZCE kırpılır ve toplam harcama, bakım önerileri, takvim gibi
// tüm türev hesaplar yanlışlanır — üstelik hata da alınmaz. Bu yüzden .range()
// ile parçalı çekip son parça dolmayana kadar devam ediyoruz.
export const SAYFA_BOYU = 1000
const AZAMI_SATIR = 50000 // sonsuz döngüye karşı emniyet freni

/**
 * Bir tablodaki tüm satırları parça parça çeker.
 *
 * @param {object} client - Supabase client
 * @param {string} table - Tablo adı
 * @param {string} orderBy - Sıralama sütunu
 * @param {boolean} ascending - Artan mı
 * @returns {Promise<object[]>} Tüm satırlar
 */
export async function fetchAllRows(client, table, orderBy, ascending) {
  const rows = []

  for (let from = 0; ; from += SAYFA_BOYU) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .order(orderBy, { ascending })
      .range(from, from + SAYFA_BOYU - 1)

    if (error) throw error

    const page = data || []
    rows.push(...page)

    // Eksik sayfa geldiyse veri bitmiştir
    if (page.length < SAYFA_BOYU) break

    if (rows.length >= AZAMI_SATIR) {
      console.warn(`${table}: ${AZAMI_SATIR} satır sınırına ulaşıldı, çekim durduruldu.`)
      break
    }
  }

  return rows
}
