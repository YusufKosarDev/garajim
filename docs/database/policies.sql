-- ============================================================================
-- Garajım — Row Level Security
--
-- ⚠️  BU DOSYADA YALNIZCA İKİ SATIR KANITLI. Gerisi aynı desenle KURGULANMIŞTIR.
--
--     Kanıtlı olanlar (kök README.md:291-305'te birebir yazılı):
--       • public.user_garage_ids() helper fonksiyonu
--       • vehicles üzerindeki SELECT policy'si
--
--     Geri kalan her şey — INSERT/UPDATE/DELETE policy'leri, owner/member rol
--     ayrımı, garage_* tablolarının policy'leri ve storage policy'leri —
--     `-- KURGU` ile işaretlenmiştir. Kök README 30+ policy diyor; bunlar o
--     policy'lerin kopyası DEĞİL, aynı desenden türetilmiş makul bir
--     yeniden yazımıdır.
--
--     Ayrıntı ve türetilemeyenlerin listesi: docs/database/README.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Workspace helper — KANITLI (kök README.md:291-297'de birebir)
--
-- SECURITY DEFINER olması kritik: garage_members'ın kendi RLS'i bu fonksiyonun
-- içinde tekrar değerlendirilseydi sonsuz özyineleme olurdu.
-- ----------------------------------------------------------------------------

create or replace function public.user_garage_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select garage_id from public.garage_members where user_id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- RLS'i aç
-- ----------------------------------------------------------------------------

alter table public.garages                  enable row level security;
alter table public.garage_members            enable row level security;
alter table public.garage_invitations        enable row level security;
alter table public.vehicles                  enable row level security;
alter table public.maintenance_records       enable row level security;
alter table public.fuel_records              enable row level security;
alter table public.tire_sets                 enable row level security;
alter table public.tire_changes              enable row level security;
alter table public.custom_intervals          enable row level security;
alter table public.notification_preferences  enable row level security;

-- ----------------------------------------------------------------------------
-- vehicles — SELECT policy'si KANITLI (kök README.md:299-305'te birebir)
-- ----------------------------------------------------------------------------

create policy "Users see their garage data"
on public.vehicles for select
using (garage_id in (select public.user_garage_ids()));

-- KURGU: yazma tarafı. Client insert'lerde user_id gönderiyor ve UPDATE'ten
-- önce user_id'yi ÖZELLİKLE siliyor (useVehicleMutations.ts, offlineDispatcher.ts)
-- — bu, sahipliği yeniden iddia etmenin reddedildiğini ima ediyor.
--
-- DÜZELTME: burada önce "garage_id'yi trigger dolduruyor" yazıyordu. Ölçüldü,
-- yanlış: trigger yok, insert'ler garage_id = NULL üretiyordu ve o satırlar
-- yine de OKUNABİLİYORDU — yani aşağıdaki garaj bazlı SELECT kurgusu
-- production'daki gerçek policy ile örtüşmüyor (bkz. README.md, madde 1).
-- Client artık garage_id'yi kendisi gönderiyor (src/lib/garageId.ts).
create policy "Users insert into their garage"
on public.vehicles for insert
with check (auth.uid() = user_id);

create policy "Users update their garage data"
on public.vehicles for update
using (garage_id in (select public.user_garage_ids()))
with check (garage_id in (select public.user_garage_ids()));

create policy "Users delete their garage data"
on public.vehicles for delete
using (garage_id in (select public.user_garage_ids()));

-- ----------------------------------------------------------------------------
-- KURGU: kayıt tabloları. Dördü de aynı deseni izliyor.
-- ----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['maintenance_records','fuel_records','tire_sets','tire_changes']
  loop
    execute format($f$
      create policy "Users see their garage %1$s"
        on public.%1$I for select
        using (garage_id in (select public.user_garage_ids()));

      create policy "Users insert their garage %1$s"
        on public.%1$I for insert
        with check (auth.uid() = user_id);

      create policy "Users update their garage %1$s"
        on public.%1$I for update
        using (garage_id in (select public.user_garage_ids()))
        with check (garage_id in (select public.user_garage_ids()));

      create policy "Users delete their garage %1$s"
        on public.%1$I for delete
        using (garage_id in (select public.user_garage_ids()));
    $f$, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- KURGU: custom_intervals — garage_id sütunu YOK (CustomIntervalRow'da geçmiyor),
-- o yüzden yalnızca user_id üzerinden izole ediliyor. Bu, paylaşılan bir garajda
-- özel periyotların üyeler arasında paylaşılMADIĞI anlamına gelir; client de
-- silme/yazma işlemini user_id ile yapıyor (useGarageDataMutations.ts:23).
-- ----------------------------------------------------------------------------

create policy "Users manage their own intervals"
on public.custom_intervals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- KURGU: notification_preferences — tamamen kişisel
-- ----------------------------------------------------------------------------

create policy "Users manage their own notification preferences"
on public.notification_preferences for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- KURGU: workspace tabloları.
--
-- garage_members EN RİSKLİ policy: kendi tablosuna referans veren bir USING
-- ifadesi özyinelemeye girer. Bu yüzden helper fonksiyon (SECURITY DEFINER)
-- üzerinden gidiliyor.
--
-- Client davranışından okunabilenler:
--   • garages: yalnızca SELECT (owner_id ile)
--   • garage_members: SELECT + DELETE (üye çıkarma). INSERT client'tan DEĞİL,
--     accept-invitation edge function'ından yapılıyor (service role).
--   • garage_invitations: SELECT + UPDATE (status='cancelled'). INSERT
--     invite-member edge function'ından.
-- ----------------------------------------------------------------------------

create policy "Members see their garages"
on public.garages for select
using (id in (select public.user_garage_ids()));

create policy "Members see co-members"
on public.garage_members for select
using (garage_id in (select public.user_garage_ids()));

-- Yalnızca owner üye çıkarabiliyor (GarageMembers.jsx:195 çağrısı owner'a
-- gösterilen bir butondan geliyor).
create policy "Owner removes members"
on public.garage_members for delete
using (
  exists (
    select 1 from public.garages g
    where g.id = garage_members.garage_id and g.owner_id = auth.uid()
  )
);

create policy "Members see garage invitations"
on public.garage_invitations for select
using (garage_id in (select public.user_garage_ids()));

create policy "Owner cancels invitations"
on public.garage_invitations for update
using (
  exists (
    select 1 from public.garages g
    where g.id = garage_invitations.garage_id and g.owner_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- KURGU: Storage policy'leri.
--
-- Bucket adları ve klasör deseni KANITLI: storageHelpers.ts:6-9 ve :99 —
-- dosya yolu `{userId}/{dosyaAdi}`. Bu, izolasyonun garaja değil YÜKLEYEN
-- KULLANICIYA göre yapıldığını gösteriyor.
--
-- ⚠️  BUNUN BİR SONUCU VAR: paylaşılan bir garajda A üyesinin yüklediği
--     fotoğrafı B üyesi SİLEMEZ (DB satırını silebilse bile). Kök README bunu
--     hiç anlatmıyor; gerçek policy'ler farklı olabilir.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', true),
       ('maintenance-photos', 'maintenance-photos', true)
on conflict (id) do nothing;

do $$
declare b text;
begin
  foreach b in array array['vehicle-photos','maintenance-photos']
  loop
    execute format($f$
      create policy "Public read %1$s"
        on storage.objects for select
        using (bucket_id = %1$L);

      create policy "Owner uploads to own folder %1$s"
        on storage.objects for insert
        with check (
          bucket_id = %1$L
          and (storage.foldername(name))[1] = auth.uid()::text
        );

      create policy "Owner updates own files %1$s"
        on storage.objects for update
        using (
          bucket_id = %1$L
          and (storage.foldername(name))[1] = auth.uid()::text
        );

      create policy "Owner deletes own files %1$s"
        on storage.objects for delete
        using (
          bucket_id = %1$L
          and (storage.foldername(name))[1] = auth.uid()::text
        );
    $f$, b);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- KURGU: pg_cron — her gün 09:00'da hatırlatma e-postaları
--
-- Kök README:214 ve :356 bunu anlatıyor ama ne cron ifadesi ne tetikleme
-- mekanizması yazılı. Aşağıdaki pg_net + Vault deseni Supabase'in standart
-- önerisi; production'daki tanım farklı olabilir.
-- ----------------------------------------------------------------------------

-- select cron.schedule(
--   'send-reminder-emails-daily',
--   '0 9 * * *',
--   $$
--     select net.http_post(
--       url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
--                  || '/functions/v1/send-reminder-emails',
--       headers := jsonb_build_object(
--         'Content-Type',  'application/json',
--         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--       ),
--       body    := '{}'::jsonb
--     );
--   $$
-- );
