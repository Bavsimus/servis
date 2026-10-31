-- Bir araç birden fazla kurumda çalışabilir.
-- Araç (plaka, marka, sürücüler) tek kayıt; kuruma özgü bilgiler (poz no, güzergâh,
-- çalışma günleri, km aralığı, sayfa sırası, son km) araç-kurum atamasında tutulur.
-- Her kurumun puantajı kendi km zincirinden devam eder.

alter table public.vehicles add constraint vehicles_id_org_key unique (id, org_id);

create table public.vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  vehicle_id uuid not null,
  client_id uuid not null,
  position integer not null default 0,
  active boolean not null default true,
  poz text not null default '',
  route text not null default '',
  schedule text not null default 'hafta-ici' check (schedule in ('hafta-ici', 'hafta-ici-cumartesi', 'her-gun')),
  km_min integer not null default 195,
  km_max integer not null default 200,
  last_km integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, client_id),
  foreign key (vehicle_id, org_id) references public.vehicles (id, org_id) on delete cascade,
  foreign key (client_id, org_id) references public.clients (id, org_id) on delete cascade
);
create index vehicle_assignments_client_idx on public.vehicle_assignments (client_id, position);
create index vehicle_assignments_org_idx on public.vehicle_assignments (org_id);

create trigger touch before update on public.vehicle_assignments
  for each row execute function public.touch_updated_at();

alter table public.vehicle_assignments enable row level security;
create policy vehicle_assignments_rw on public.vehicle_assignments for all to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));

-- Mevcut verileri taşı: kurumu olmayan araçlar firmanın ilk kurumuna atanır
insert into public.vehicle_assignments (org_id, vehicle_id, client_id, position, poz, route, schedule, km_min, km_max, last_km)
select v.org_id, v.id,
       coalesce(v.client_id, (select c.id from public.clients c where c.org_id = v.org_id order by c.created_at limit 1)),
       v.position, v.poz, v.route, v.schedule, v.km_min, v.km_max, v.last_km
from public.vehicles v
where coalesce(v.client_id, (select c.id from public.clients c where c.org_id = v.org_id order by c.created_at limit 1)) is not null;

alter table public.vehicles
  drop column client_id,
  drop column position,
  drop column poz,
  drop column route,
  drop column schedule,
  drop column km_min,
  drop column km_max,
  drop column last_km;
