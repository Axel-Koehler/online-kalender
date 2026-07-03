create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  end_date date not null,
  start_time time not null,
  end_time time not null,
  note text not null default '',
  color text not null default '#2a9187',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_events
add column if not exists end_date date;

update public.calendar_events
set end_date = event_date
where end_date is null;

alter table public.calendar_events
alter column end_date set not null;

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_select_own" on public.calendar_events;
create policy "calendar_events_select_own"
on public.calendar_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "calendar_events_insert_own" on public.calendar_events;
create policy "calendar_events_insert_own"
on public.calendar_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "calendar_events_update_own" on public.calendar_events;
create policy "calendar_events_update_own"
on public.calendar_events
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "calendar_events_delete_own" on public.calendar_events;
create policy "calendar_events_delete_own"
on public.calendar_events
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_calendar_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
create trigger set_calendar_events_updated_at
before update on public.calendar_events
for each row
execute function public.set_calendar_events_updated_at();

drop index if exists public.calendar_events_user_date_idx;
create index calendar_events_user_date_idx
on public.calendar_events (user_id, event_date, end_date, start_time);

create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  customer text not null,
  address text not null,
  system text not null default '',
  customer_type text not null default '',
  has_maintenance_contract boolean not null default false,
  appointment_scheduled boolean not null default false,
  phone text,
  last_maintenance date not null,
  next_maintenance date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.maintenance_records
add column if not exists system text not null default '';

alter table public.maintenance_records
add column if not exists customer_type text not null default '';

alter table public.maintenance_records
add column if not exists has_maintenance_contract boolean not null default false;

alter table public.maintenance_records
add column if not exists appointment_scheduled boolean not null default false;

alter table public.maintenance_records
alter column phone drop not null;

alter table public.maintenance_records enable row level security;

drop policy if exists "maintenance_records_select_all_authenticated" on public.maintenance_records;
create policy "maintenance_records_select_all_authenticated"
on public.maintenance_records
for select
to authenticated
using (true);

drop policy if exists "maintenance_records_insert_all_authenticated" on public.maintenance_records;
create policy "maintenance_records_insert_all_authenticated"
on public.maintenance_records
for insert
to authenticated
with check (true);

drop policy if exists "maintenance_records_update_all_authenticated" on public.maintenance_records;
create policy "maintenance_records_update_all_authenticated"
on public.maintenance_records
for update
to authenticated
using (true)
with check (true);

drop policy if exists "maintenance_records_delete_all_authenticated" on public.maintenance_records;
create policy "maintenance_records_delete_all_authenticated"
on public.maintenance_records
for delete
to authenticated
using (true);

create or replace function public.set_maintenance_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_maintenance_records_updated_at on public.maintenance_records;
create trigger set_maintenance_records_updated_at
before update on public.maintenance_records
for each row
execute function public.set_maintenance_records_updated_at();

drop index if exists public.maintenance_records_next_idx;
create index maintenance_records_next_idx
on public.maintenance_records (next_maintenance, customer);

create table if not exists public.inquiry_records (
  id uuid primary key default gen_random_uuid(),
  inquiry_date date,
  system_type text not null default '',
  customer_type text not null default '',
  name text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inquiry_records
add column if not exists notes text not null default '';

alter table public.inquiry_records enable row level security;

drop policy if exists "inquiry_records_select_all_authenticated" on public.inquiry_records;
create policy "inquiry_records_select_all_authenticated"
on public.inquiry_records
for select
to authenticated
using (true);

drop policy if exists "inquiry_records_insert_all_authenticated" on public.inquiry_records;
create policy "inquiry_records_insert_all_authenticated"
on public.inquiry_records
for insert
to authenticated
with check (true);

drop policy if exists "inquiry_records_update_all_authenticated" on public.inquiry_records;
create policy "inquiry_records_update_all_authenticated"
on public.inquiry_records
for update
to authenticated
using (true)
with check (true);

drop policy if exists "inquiry_records_delete_all_authenticated" on public.inquiry_records;
create policy "inquiry_records_delete_all_authenticated"
on public.inquiry_records
for delete
to authenticated
using (true);

create or replace function public.set_inquiry_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_inquiry_records_updated_at on public.inquiry_records;
create trigger set_inquiry_records_updated_at
before update on public.inquiry_records
for each row
execute function public.set_inquiry_records_updated_at();

drop index if exists public.inquiry_records_date_idx;
create index inquiry_records_date_idx
on public.inquiry_records (inquiry_date, name);

create table if not exists public.work_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  report_date date not null default current_date,
  report_number text not null default '',
  customer text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_reports enable row level security;

drop policy if exists "work_reports_select_all_authenticated" on public.work_reports;
create policy "work_reports_select_all_authenticated"
on public.work_reports
for select
to authenticated
using (true);

drop policy if exists "work_reports_insert_all_authenticated" on public.work_reports;
create policy "work_reports_insert_all_authenticated"
on public.work_reports
for insert
to authenticated
with check (true);

drop policy if exists "work_reports_update_all_authenticated" on public.work_reports;
create policy "work_reports_update_all_authenticated"
on public.work_reports
for update
to authenticated
using (true)
with check (true);

drop policy if exists "work_reports_delete_all_authenticated" on public.work_reports;
create policy "work_reports_delete_all_authenticated"
on public.work_reports
for delete
to authenticated
using (true);

create or replace function public.set_work_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_work_reports_updated_at on public.work_reports;
create trigger set_work_reports_updated_at
before update on public.work_reports
for each row
execute function public.set_work_reports_updated_at();

create index if not exists work_reports_date_idx
on public.work_reports (report_date desc, report_number);

create index if not exists work_reports_customer_idx
on public.work_reports (customer);

create table if not exists public.cooling_load_calculations (
  id uuid primary key default gen_random_uuid(),
  calculation_date date not null default current_date,
  customer text not null default '',
  room_name text not null default '',
  area numeric not null default 0,
  total_watts numeric not null default 0,
  recommended_kw numeric not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cooling_load_calculations enable row level security;

drop policy if exists "cooling_load_select_all_authenticated" on public.cooling_load_calculations;
create policy "cooling_load_select_all_authenticated"
on public.cooling_load_calculations
for select
to authenticated
using (true);

drop policy if exists "cooling_load_insert_all_authenticated" on public.cooling_load_calculations;
create policy "cooling_load_insert_all_authenticated"
on public.cooling_load_calculations
for insert
to authenticated
with check (true);

drop policy if exists "cooling_load_update_all_authenticated" on public.cooling_load_calculations;
create policy "cooling_load_update_all_authenticated"
on public.cooling_load_calculations
for update
to authenticated
using (true)
with check (true);

drop policy if exists "cooling_load_delete_all_authenticated" on public.cooling_load_calculations;
create policy "cooling_load_delete_all_authenticated"
on public.cooling_load_calculations
for delete
to authenticated
using (true);

create or replace function public.set_cooling_load_calculations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cooling_load_calculations_updated_at on public.cooling_load_calculations;
create trigger set_cooling_load_calculations_updated_at
before update on public.cooling_load_calculations
for each row
execute function public.set_cooling_load_calculations_updated_at();

create index if not exists cooling_load_calculations_date_idx
on public.cooling_load_calculations (calculation_date desc, customer);

create table if not exists public.cold_room_load_calculations (
  id uuid primary key default gen_random_uuid(),
  calculation_date date not null default current_date,
  customer text not null default '',
  cell_type text not null default 'Normalkühlung',
  volume numeric not null default 0,
  total_watts numeric not null default 0,
  recommended_kw numeric not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cold_room_load_calculations enable row level security;

drop policy if exists "cold_room_load_select_all_authenticated" on public.cold_room_load_calculations;
create policy "cold_room_load_select_all_authenticated"
on public.cold_room_load_calculations
for select
to authenticated
using (true);

drop policy if exists "cold_room_load_insert_all_authenticated" on public.cold_room_load_calculations;
create policy "cold_room_load_insert_all_authenticated"
on public.cold_room_load_calculations
for insert
to authenticated
with check (true);

drop policy if exists "cold_room_load_update_all_authenticated" on public.cold_room_load_calculations;
create policy "cold_room_load_update_all_authenticated"
on public.cold_room_load_calculations
for update
to authenticated
using (true)
with check (true);

drop policy if exists "cold_room_load_delete_all_authenticated" on public.cold_room_load_calculations;
create policy "cold_room_load_delete_all_authenticated"
on public.cold_room_load_calculations
for delete
to authenticated
using (true);

create or replace function public.set_cold_room_load_calculations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cold_room_load_calculations_updated_at on public.cold_room_load_calculations;
create trigger set_cold_room_load_calculations_updated_at
before update on public.cold_room_load_calculations
for each row
execute function public.set_cold_room_load_calculations_updated_at();

create index if not exists cold_room_load_calculations_date_idx
on public.cold_room_load_calculations (calculation_date desc, customer);
