create table if not exists public.orders_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders_tasks enable row level security;

create or replace function public.set_named_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "orders_tasks_select_all_authenticated" on public.orders_tasks;
create policy "orders_tasks_select_all_authenticated"
on public.orders_tasks
for select
to authenticated
using (true);

drop policy if exists "orders_tasks_insert_all_authenticated" on public.orders_tasks;
create policy "orders_tasks_insert_all_authenticated"
on public.orders_tasks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "orders_tasks_update_all_authenticated" on public.orders_tasks;
create policy "orders_tasks_update_all_authenticated"
on public.orders_tasks
for update
to authenticated
using (true)
with check (true);

drop policy if exists "orders_tasks_delete_all_authenticated" on public.orders_tasks;
create policy "orders_tasks_delete_all_authenticated"
on public.orders_tasks
for delete
to authenticated
using (true);

drop trigger if exists set_orders_tasks_updated_at on public.orders_tasks;
create trigger set_orders_tasks_updated_at
before update on public.orders_tasks
for each row
execute function public.set_named_tasks_updated_at();

create index if not exists orders_tasks_created_at_idx
on public.orders_tasks (created_at desc);
