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
