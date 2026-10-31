-- Çok firmalı (multi-tenant) servis paneli şeması.
-- Her kayıt bir organizasyona (servis firması) aittir; erişim RLS ile üyelikten türetilir.


-- ---------------------------------------------------------------------------
-- Organizasyonlar ve üyelikler
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- ---------------------------------------------------------------------------
-- Müşteri kurumlar: her kurumun kendi çizelge şablonu ve başlığı olur
-- (ör. KGM 1. Bölge -> "kgm-kiralik-arac" şablonu)
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  template_id text not null default 'kgm-kiralik-arac',
  sheet_title text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, org_id)
);
create index clients_org_idx on public.clients (org_id);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  tc text not null default '',
  phone text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index drivers_org_idx on public.drivers (org_id);
create unique index drivers_org_tc_key on public.drivers (org_id, tc) where tc <> '';

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid,
  position integer not null default 0,
  active boolean not null default true,
  plate text not null check (length(trim(plate)) > 0),
  brand text not null default '',
  kind text not null default '',
  model_year text not null default '',
  poz text not null default '',
  layout text not null default 'tek' check (layout in ('tek', 'vardiya')),
  driver_ids uuid[] not null default '{}',
  route text not null default '',
  schedule text not null default 'hafta-ici' check (schedule in ('hafta-ici', 'hafta-ici-cumartesi', 'her-gun')),
  km_min integer not null default 195,
  km_max integer not null default 200,
  last_km integer not null default 0,
  hours jsonb not null default '{"enabled": false, "start": "7", "end": "18", "overtime": 1}'::jsonb,
  shift jsonb not null default '{"dayStart": "06:30", "nightStart": "18:30", "overtime": 1, "blockDays": 4, "anchor": "2026-01-01"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, plate),
  -- araç yalnızca kendi firmasının kurumuna bağlanabilir
  foreign key (client_id, org_id) references public.clients (id, org_id) on delete set null (client_id)
);
create index vehicles_org_idx on public.vehicles (org_id, position);

-- Oluşturulan aylık çizelgeler: tekrar indirme ve geçmiş için anlık görüntü
create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid not null,
  year integer not null check (year between 2000 and 2100),
  month integer not null check (month between 1 and 12),
  template_id text not null,
  context jsonb not null,
  sheets jsonb not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, year, month),
  foreign key (client_id, org_id) references public.clients (id, org_id) on delete cascade
);
create index timesheets_org_idx on public.timesheets (org_id, year desc, month desc);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger touch before update on public.organizations for each row execute function public.touch_updated_at();
create trigger touch before update on public.clients for each row execute function public.touch_updated_at();
create trigger touch before update on public.drivers for each row execute function public.touch_updated_at();
create trigger touch before update on public.vehicles for each row execute function public.touch_updated_at();
create trigger touch before update on public.timesheets for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Yetki yardımcıları (RLS içinde özyinelemeyi önlemek için security definer)
-- ---------------------------------------------------------------------------
create or replace function public.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships where org_id = p_org and user_id = auth.uid());
$$;

create or replace function public.is_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships
    where org_id = p_org and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- Yeni firma oluşturur ve çağıranı sahibi yapar (ilk kurulum)
create or replace function public.create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Giriş yapılmamış';
  end if;
  insert into public.organizations (name) values (trim(p_name)) returning id into new_id;
  insert into public.memberships (org_id, user_id, role) values (new_id, auth.uid(), 'owner');
  insert into public.clients (org_id, name) values (new_id, 'Varsayılan kurum');
  return new_id;
end $$;

-- Ekip üyesi ekleme: kullanıcı önce Supabase Auth'ta (davet ya da kayıt) oluşmuş olmalı
create or replace function public.add_member(p_org uuid, p_email text, p_role text default 'member') returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin(p_org) then
    raise exception 'Yetkiniz yok';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'Geçersiz rol';
  end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then
    raise exception 'Bu e-posta ile kayıtlı kullanıcı yok';
  end if;
  insert into public.memberships (org_id, user_id, role) values (p_org, uid, p_role)
  on conflict (org_id, user_id) do update set role = excluded.role
  where public.memberships.role <> 'owner';
end $$;

-- Üye listesi (e-postalarıyla); yalnızca aynı firmanın üyeleri görür
create or replace function public.org_members(p_org uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from public.memberships m join auth.users u on u.id = m.user_id
  where m.org_id = p_org and public.is_member(p_org)
  order by m.created_at;
$$;

revoke execute on function public.create_organization(text) from public, anon;
revoke execute on function public.add_member(uuid, text, text) from public, anon;
revoke execute on function public.org_members(uuid) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
grant execute on function public.add_member(uuid, text, text) to authenticated;
grant execute on function public.org_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.clients enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.timesheets enable row level security;

create policy org_select on public.organizations for select to authenticated
  using (public.is_member(id));
create policy org_update on public.organizations for update to authenticated
  using (public.is_admin(id)) with check (public.is_admin(id));

create policy membership_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_member(org_id));
create policy membership_delete on public.memberships for delete to authenticated
  using (public.is_admin(org_id) and role <> 'owner');

create policy clients_rw on public.clients for all to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy drivers_rw on public.drivers for all to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy vehicles_rw on public.vehicles for all to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy timesheets_rw on public.timesheets for all to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
