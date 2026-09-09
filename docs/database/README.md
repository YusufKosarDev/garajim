# Veritabanı şeması — okumadan önce

> ## ⚠️ Bu klasördeki SQL, CLIENT KODUNDAN TÜRETİLMİŞTİR
>
> Production Supabase projesinden alınmış bir dump **değildir**. `schema.sql` ve
> `policies.sql`, uygulamanın kaynak kodundaki iki bağımsız kanıt kümesinden
> yeniden kurgulanmıştır:
>
> - `src/types.ts` içindeki `*Row` arayüzleri (satır 117-206)
> - `src/lib/supabaseMappers.ts` içindeki `*FromDb` / `*ToDb` dönüştürücüleri
>
> İki kaynak birbirini doğruluyor, bu yüzden **tablo ve sütun adları güvenilir.**
> Ama aşağıdaki "Türetilemeyenler" bölümünde sayılanlar kurgudur ve bir kısmı
> production'da kesinlikle farklıdır. Bu dosyaları olduğu gibi çalıştırmak
> çalışan bir kopya vermez; ne yaptığını anlamak için bir referanstır.

## Neden böyle

Depoda hiç SQL yoktu ama `README.md` kullanıcıya `docs/database/schema.sql`
çalıştırmasını söylüyordu. Yani kurulum talimatları var olmayan dosyalara
işaret ediyordu ve README'nin en güçlü iddiası (30+ RLS policy, workspace
pattern, çoklu kullanıcı izolasyonu) depoda doğrulanamıyordu.

Doğru çözüm gerçek dump'ı buraya koymaktır. O yapılana kadar bu dosyalar
boşluğu, ne kadarının kanıtlı ne kadarının tahmin olduğunu açıkça söyleyerek
dolduruyor.

## Ne kanıtlı

| Konu | Durum | Kanıt |
|---|---|---|
| 10 tablonun adı | ✅ kesin | `.from('...')` çağrıları, `src/` genelinde |
| Sütun adları (5 ana tablo + `custom_intervals`) | ✅ kesin | `types.ts` + mapper'lar, iki bağımsız kaynak |
| `notification_preferences` 5 sütunu | ✅ kesin | `EmailNotificationSettings.jsx:43` |
| `garages` / `garage_members` / `garage_invitations` sütunları | 🟡 kısmi | Yalnızca client'ın SELECT ettiği alanlar |
| Para/hacim sütunlarının `numeric` olması | ✅ güçlü kanıt | `supabaseMappers.ts:19-27` — PostgREST numeric'i **string** döndürüyor, mapper bunu `parseFloat` ile çeviriyor |
| NOT NULL / NULL ayrımı | 🟡 iyi kanıt | `*ToDb`'de `?? null` geçen sütun NULL kabul ediyor; çıplak değer geçenler (`liters`, `total_cost`) NOT NULL |
| `full_tank DEFAULT false`, `current_km DEFAULT 0`, `photos DEFAULT '{}'` | 🟡 iyi kanıt | Mapper'ların fallback değerleri |
| `notification_preferences.user_id` UNIQUE | ✅ kesin | `onConflict: 'user_id'` ile upsert |
| `vehicles` → alt tablolar `ON DELETE CASCADE` | ✅ kesin | Yorumlarda yazılı **ve** davranışsal olarak buna güveniliyor (`useVehicleMutations.ts:153`, `useGarageDataMutations.ts:83`) |
| Storage bucket adları ve klasör deseni | ✅ kesin | `storageHelpers.ts:6-9` ve `:99` — yol `{userId}/{dosya}` |
| Edge Function HTTP sözleşmeleri | ✅ kesin | Çağrı yerleri; istek/yanıt şekilleri birebir okunabiliyor |

## Türetilemeyenler — production'da farklı olabilir

1. **`garage_id` trigger'ı — en kritik boşluk.** Client `garage_id`'yi **hiç
   yazmıyor**: hiçbir `*ToDb` mapper'ı üretmiyor, her insert yalnızca `user_id`
   gönderiyor. Ama realtime aboneliği ve RLS ona göre filtreliyor
   (`VehicleContext.tsx:275`, kök `README.md:304`). Demek ki veritabanı tarafında
   `garage_id`'yi dolduran bir `BEFORE INSERT` trigger'ı **olmak zorunda**.
   Gövdesi client'tan çıkarılamıyor ve o trigger olmadan her insert
   `garage_id = NULL` üretir; RLS de o satırları gizler. `schema.sql` içinde
   bir taslak var, ama **gerçeğiyle aynı olduğu iddia edilmiyor.**

2. **Kayıt sonrası bootstrap trigger'ı.** `GarageMembers.jsx:61` garajın
   olmamasını "beklenmedik durum" sayıyor, yani kayıt sırasında `garages` +
   owner `garage_members` satırı otomatik yaratılıyor. Nasıl yaratıldığı
   bilinmiyor.

3. **RLS policy gövdelerinin neredeyse tamamı.** Kök README'de 30+ policy
   iddiası var; depoda **1 helper fonksiyon ve 1 SELECT policy** yazılı
   (`README.md:291-305`). INSERT/UPDATE/DELETE policy'leri, owner/member rol
   ayrımı ve `garage_members` üzerindeki policy'ler (ki kendine referans verdiği
   için en risklisi) kurgudur.

4. **`profiles` tablosu.** Kök README'de listelenmiş ama kodda **hiç
   sorgulanmıyor** — tek iz `GarageMembers.jsx:87`'deki bir yorum. Sütunları
   bilinemiyor, `schema.sql`'de yalnızca yorum olarak duruyor.

5. **`send-reminder-emails`** fonksiyonunun içi. Çağrı yeri yok (pg_cron
   tetikliyor), payload'ı ve auth modeli bilinmiyor. Yalnızca davranışsal ipucu
   var: 30/7/1 gün eşikleri ve `notification_preferences`'ın 5 kolonu.

6. **Kök README'nin saydığı 5. Edge Function.** Adı depoda hiç geçmiyor.
   (README 5 diyor, 4 tane sayıyor — bu düzeltildi.)

7. **İndeksler.** Kök README 13+ index diyor. Hangi sütunların indeksli olduğu
   bilinmiyor; `fetchAllRows`'un `.order()` kullandığı sütunlar aday, o kadar.

8. **`user_id` ve `garage_id` FK'lerinin ON DELETE davranışı.** Yalnızca
   `vehicle_id` cascade'leri kanıtlı.

9. **CHECK constraint'ler.** `season`, `to_season`, `role`, `status`,
   `fuel_type` için TS union'ları değer kümesini gösteriyor ama bir DB
   constraint'i olduğunu kanıtlamıyor (`fuel_type` düz `string` olarak
   tiplenmiş, bu aksini ima ediyor).

10. **`custom_intervals`'ın birincil anahtarı.** `CustomIntervalRow`'da `id`
    yok; yazma yolu "user_id'ye göre hepsini sil, sonra toplu insert"
    (`useGarageDataMutations.ts:22-52`), yani id'ye hiç ihtiyaç duymuyor.
    Surrogate mi bileşik mi, bilinmiyor.

11. **`photos` ve `tires` sütunlarının fiziksel tipi.** `text[]` mi `jsonb` mi
    — client açısından ayırt edilemiyor, ama DDL'i ve realtime payload şeklini
    değiştiriyor.

12. **`updated_at` trigger'ları.** Client hiç yazmıyor, yani bir trigger var;
    gövdesi bilinmiyor.

13. **Realtime publication ve replica identity ayarı**, storage bucket'ının
    `file_size_limit` / `allowed_mime_types` değerleri, pg_cron job tanımı ve
    Vault secret bağlantısı.

## Gerçek dump nasıl alınır

Elinizde production projesi varsa bu dosyaları onunla değiştirin:

```bash
# Supabase CLI ile (projeye link'ledikten sonra)
supabase db dump --schema public       > docs/database/schema.sql
supabase db dump --schema public --data-only=false --role-only  # policy'ler için
```

ya da Supabase Studio → SQL Editor'da `pg_dump` çıktısını alıp buraya koyun.
Değiştirdiğinizde bu dosyanın en üstündeki uyarıyı da kaldırın.
