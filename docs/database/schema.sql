-- ============================================================================
-- Garajım — tablo şeması
--
-- ⚠️  BU DOSYA CLIENT KODUNDAN TÜRETİLMİŞTİR, production dump'ı DEĞİLDİR.
--     Neyin kanıtlı neyin kurgu olduğu docs/database/README.md'de tablo hâlinde
--     yazıyor. Özellikle `garage_id` trigger'ı, kayıt bootstrap'i ve indeksler
--     kurgudur. Olduğu gibi çalıştırmak çalışan bir kopya vermez.
--
-- Kaynak: src/types.ts (*Row arayüzleri) + src/lib/supabaseMappers.ts
-- ============================================================================

-- ----------------------------------------------------------------------------
-- WORKSPACE (çoklu kullanıcı)
--
-- Her kullanıcının bir garajı var; garaj başka kullanıcılarla paylaşılabiliyor.
-- Veri izolasyonu `garage_id` üzerinden yapılıyor (bkz. policies.sql).
-- ----------------------------------------------------------------------------

create table if not exists public.garages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  -- Client `.eq('owner_id', ...).maybeSingle()` ile sorguluyor, yani sahip
  -- başına en fazla bir garaj bekleniyor (GarageMembers.jsx:54).
  owner_id   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id)  -- KURGU: maybeSingle() bunu ima ediyor, kanıtı yok
);

create table if not exists public.garage_members (
  id        uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  -- Client yalnızca 'owner' değerini özel olarak ele alıyor, gerisini 'member'
  -- sayıyor (GarageMembers.jsx:261, :280, :290).
  role      text not null default 'member',
  joined_at timestamptz not null default now(),
  unique (garage_id, user_id)
);

create table if not exists public.garage_invitations (
  id         uuid primary key default gen_random_uuid(),
  garage_id  uuid not null references public.garages (id) on delete cascade,
  email      text not null,
  -- `token` client tarafından hiç SELECT edilmiyor ama URL'den okunup POST
  -- ediliyor (AcceptInvite.jsx:12, :62), yani sütun var.
  token      text not null unique,
  -- Görülen değerler: 'pending', 'cancelled'. 'accepted' kabul akışından ima.
  status     text not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- KURGU DEĞİL, EKSİK: kök README `profiles` tablosunu listeliyor ama client onu
-- hiç sorgulamıyor (tek iz GarageMembers.jsx:87'deki bir yorum). Sütunları
-- bilinmediği için uydurulmadı. Gerçek dump geldiğinde buraya eklenecek.
-- create table public.profiles (...);

-- ----------------------------------------------------------------------------
-- ARAÇLAR VE KAYITLAR
--
-- Para/hacim sütunları `numeric`: PostgREST bunları STRING olarak döndürüyor ve
-- supabaseMappers.ts:19-27 bunu parseFloat ile çeviriyor. Bu, tipin numeric
-- olduğunun güçlü kanıtı (float8 olsaydı sayı olarak gelirdi).
--
-- NOT NULL kararları: *ToDb mapper'ında `?? null` ile gönderilen sütunlar NULL
-- kabul ediyor; çıplak değer geçenler (liters, total_cost) NOT NULL.
-- ----------------------------------------------------------------------------

create table if not exists public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  -- Client bu sütunu HİÇ YAZMIYOR ama okuyor ve RLS/realtime ona göre
  -- filtreliyor. Aşağıdaki trigger'a bak — en kritik türetilemeyen parça.
  garage_id       uuid references public.garages (id) on delete cascade,
  plate           text not null,
  brand           text not null,
  model           text not null,
  year            integer,
  fuel_type       text,          -- 'Benzin' | 'Dizel' | 'LPG' | 'Hibrit' | 'Elektrik'
  current_km      integer default 0,
  inspection_date date,
  mtv_date        date,
  insurance_date  date,
  kasko_date      date,
  notes           text,
  -- text[] mi jsonb mi olduğu client'tan ayırt edilemiyor (README.md'ye bak)
  photos          text[] default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.maintenance_records (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  garage_id  uuid references public.garages (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  -- DİKKAT: `type` bir VERİDİR, etiket değil. DEFAULT_INTERVALS'ta anahtar
  -- olarak aranıyor ve çevrilmesi yasak (src/i18n/i18n.test.ts sözleşmesi).
  type       text not null,
  date       date not null,
  km         integer,
  cost       numeric default 0,
  notes      text,
  -- Frontend'de `photo` adıyla geçiyor (supabaseMappers.ts:88)
  photo_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fuel_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  garage_id       uuid references public.garages (id) on delete cascade,
  vehicle_id      uuid not null references public.vehicles (id) on delete cascade,
  date            date not null,
  km              integer,
  liters          numeric not null,
  price_per_liter numeric default 0,
  total_cost      numeric not null,
  -- Tüketim hesabı full-tank yöntemine dayanıyor; bu alan onun anahtarı
  full_tank       boolean default false,
  station         text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.tire_sets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  garage_id      uuid references public.garages (id) on delete cascade,
  vehicle_id     uuid not null references public.vehicles (id) on delete cascade,
  -- 'summer' | 'winter' | 'all-season' (types.ts'te union olarak tiplenmiş)
  season         text not null,
  brand          text,
  size           text,
  -- [{ position: 'FL'|'FR'|'RL'|'RR'|'S', dot: '3523', treadDepth: 7 }]
  tires          jsonb default '[]',
  purchase_date  date,
  purchase_price numeric default 0,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.tire_changes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  garage_id   uuid references public.garages (id) on delete cascade,
  vehicle_id  uuid not null references public.vehicles (id) on delete cascade,
  date        date not null,
  from_season text,           -- ilk takılışta null olabiliyor
  to_season   text not null,
  km          integer,
  cost        numeric default 0,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Araç bazlı özel bakım periyotları.
-- CustomIntervalRow'da `id` YOK ve yazma yolu "user_id'ye göre hepsini sil,
-- sonra toplu insert" (useGarageDataMutations.ts:22-52). Bu yüzden birincil
-- anahtarın şekli bilinmiyor; aşağıdaki bileşik anahtar bir TAHMİN.
create table if not exists public.custom_intervals (
  user_id          uuid not null references auth.users (id) on delete cascade,
  vehicle_id       uuid not null references public.vehicles (id) on delete cascade,
  maintenance_type text not null,
  kilometers       integer,
  months           integer,
  primary key (user_id, vehicle_id, maintenance_type)  -- TAHMİN
);

-- Email bildirim tercihleri. user_id UNIQUE olduğu KESİN: client upsert'i
-- `onConflict: 'user_id'` ile yapıyor (EmailNotificationSettings.jsx:87).
create table if not exists public.notification_preferences (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  email_enabled     boolean not null default true,
  notify_inspection boolean not null default true,
  notify_mtv        boolean not null default true,
  notify_insurance  boolean not null default true,
  notify_kasko      boolean not null default true
);

-- ----------------------------------------------------------------------------
-- ⚠️  YENİDEN KURGULANDI — garage_id'yi dolduran trigger
--
-- Client hiçbir insert'te `garage_id` göndermiyor, ama RLS ve realtime ona göre
-- filtreliyor. Demek ki sunucu tarafında dolduruluyor. AŞAĞIDAKİ GÖVDE BİR
-- TAHMİNDİR; production'daki gerçek trigger farklı olabilir. Bu trigger
-- olmadan her insert görünmez satır üretir (garage_id NULL -> RLS gizler).
-- ----------------------------------------------------------------------------

create or replace function public.set_garage_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.garage_id is null then
    select gm.garage_id into new.garage_id
    from public.garage_members gm
    where gm.user_id = new.user_id
    order by gm.joined_at
    limit 1;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['vehicles','maintenance_records','fuel_records','tire_sets','tire_changes']
  loop
    execute format(
      'drop trigger if exists set_garage_id_trg on public.%I;
       create trigger set_garage_id_trg before insert on public.%I
       for each row execute function public.set_garage_id();', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- ⚠️  YENİDEN KURGULANDI — updated_at
-- Client `updated_at` yazmıyor ama okuyor, yani bir trigger var. Gövdesi
-- bilinmiyor; standart desen yazıldı.
-- ----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['vehicles','maintenance_records','fuel_records','tire_sets','tire_changes']
  loop
    execute format(
      'drop trigger if exists touch_updated_at_trg on public.%I;
       create trigger touch_updated_at_trg before update on public.%I
       for each row execute function public.touch_updated_at();', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- ⚠️  YENİDEN KURGULANDI — indeksler
-- Kök README 13+ index diyor, hangileri olduğu bilinmiyor. Aşağıdakiler
-- uygulamanın gerçekten kullandığı erişim yollarından çıkarıldı:
-- fetchAllRows `.order()` ile sıralıyor, mutasyonlar vehicle_id ile filtreliyor,
-- realtime garage_id ile filtreliyor.
-- ----------------------------------------------------------------------------

create index if not exists vehicles_garage_id_idx            on public.vehicles (garage_id);
create index if not exists vehicles_user_id_idx              on public.vehicles (user_id);
create index if not exists vehicles_created_at_idx           on public.vehicles (created_at);

create index if not exists maintenance_vehicle_id_idx        on public.maintenance_records (vehicle_id);
create index if not exists maintenance_garage_id_date_idx    on public.maintenance_records (garage_id, date desc);

create index if not exists fuel_vehicle_id_idx               on public.fuel_records (vehicle_id);
create index if not exists fuel_garage_id_date_idx           on public.fuel_records (garage_id, date desc);

create index if not exists tire_sets_vehicle_id_idx          on public.tire_sets (vehicle_id);
create index if not exists tire_changes_vehicle_id_date_idx  on public.tire_changes (vehicle_id, date desc);

create index if not exists custom_intervals_vehicle_id_idx   on public.custom_intervals (vehicle_id);
create index if not exists garage_members_user_id_idx        on public.garage_members (user_id);
create index if not exists garage_invitations_token_idx      on public.garage_invitations (token);
create index if not exists garage_invitations_email_idx      on public.garage_invitations (email);

-- ----------------------------------------------------------------------------
-- ⚠️  YENİDEN KURGULANDI — realtime
-- VehicleContext beş tabloya postgres_changes ile abone oluyor ve filtre olarak
-- `garage_id=in.(...)` kullanıyor (VehicleContext.tsx:275). Bunun çalışması için
-- tabloların publication'a eklenmesi gerekiyor.
-- ----------------------------------------------------------------------------

alter publication supabase_realtime add table public.vehicles;
alter publication supabase_realtime add table public.maintenance_records;
alter publication supabase_realtime add table public.fuel_records;
alter publication supabase_realtime add table public.tire_sets;
alter publication supabase_realtime add table public.tire_changes;
