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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
