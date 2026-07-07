create table if not exists public.uwe_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kevin_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.holger_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.uwe_tasks enable row level security;
alter table public.kevin_tasks enable row level security;
alter table public.holger_tasks enable row level security;

create or replace function public.set_named_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "uwe_tasks_select_all_authenticated" on public.uwe_tasks;
create policy "uwe_tasks_select_all_authenticated"
on public.uwe_tasks
for select
to authenticated
using (true);

drop policy if exists "uwe_tasks_insert_all_authenticated" on public.uwe_tasks;
create policy "uwe_tasks_insert_all_authenticated"
on public.uwe_tasks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "uwe_tasks_update_all_authenticated" on public.uwe_tasks;
create policy "uwe_tasks_update_all_authenticated"
on public.uwe_tasks
for update
to authenticated
using (true)
with check (true);

drop policy if exists "uwe_tasks_delete_all_authenticated" on public.uwe_tasks;
create policy "uwe_tasks_delete_all_authenticated"
on public.uwe_tasks
for delete
to authenticated
using (true);

drop trigger if exists set_uwe_tasks_updated_at on public.uwe_tasks;
create trigger set_uwe_tasks_updated_at
before update on public.uwe_tasks
for each row
execute function public.set_named_tasks_updated_at();

create index if not exists uwe_tasks_created_at_idx
on public.uwe_tasks (created_at desc);

drop policy if exists "kevin_tasks_select_all_authenticated" on public.kevin_tasks;
create policy "kevin_tasks_select_all_authenticated"
on public.kevin_tasks
for select
to authenticated
using (true);

drop policy if exists "kevin_tasks_insert_all_authenticated" on public.kevin_tasks;
create policy "kevin_tasks_insert_all_authenticated"
on public.kevin_tasks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "kevin_tasks_update_all_authenticated" on public.kevin_tasks;
create policy "kevin_tasks_update_all_authenticated"
on public.kevin_tasks
for update
to authenticated
using (true)
with check (true);

drop policy if exists "kevin_tasks_delete_all_authenticated" on public.kevin_tasks;
create policy "kevin_tasks_delete_all_authenticated"
on public.kevin_tasks
for delete
to authenticated
using (true);

drop trigger if exists set_kevin_tasks_updated_at on public.kevin_tasks;
create trigger set_kevin_tasks_updated_at
before update on public.kevin_tasks
for each row
execute function public.set_named_tasks_updated_at();

create index if not exists kevin_tasks_created_at_idx
on public.kevin_tasks (created_at desc);

drop policy if exists "holger_tasks_select_all_authenticated" on public.holger_tasks;
create policy "holger_tasks_select_all_authenticated"
on public.holger_tasks
for select
to authenticated
using (true);

drop policy if exists "holger_tasks_insert_all_authenticated" on public.holger_tasks;
create policy "holger_tasks_insert_all_authenticated"
on public.holger_tasks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "holger_tasks_update_all_authenticated" on public.holger_tasks;
create policy "holger_tasks_update_all_authenticated"
on public.holger_tasks
for update
to authenticated
using (true)
with check (true);

drop policy if exists "holger_tasks_delete_all_authenticated" on public.holger_tasks;
create policy "holger_tasks_delete_all_authenticated"
on public.holger_tasks
for delete
to authenticated
using (true);

drop trigger if exists set_holger_tasks_updated_at on public.holger_tasks;
create trigger set_holger_tasks_updated_at
before update on public.holger_tasks
for each row
execute function public.set_named_tasks_updated_at();

create index if not exists holger_tasks_created_at_idx
on public.holger_tasks (created_at desc);
