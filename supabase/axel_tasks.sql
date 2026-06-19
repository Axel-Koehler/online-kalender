create table if not exists public.axel_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.axel_tasks enable row level security;

drop policy if exists "axel_tasks_select_axel" on public.axel_tasks;
create policy "axel_tasks_select_axel"
on public.axel_tasks
for select
to authenticated
using ((auth.jwt() ->> 'email') = 'axel.brueckner1401@gmail.com');

drop policy if exists "axel_tasks_insert_axel" on public.axel_tasks;
create policy "axel_tasks_insert_axel"
on public.axel_tasks
for insert
to authenticated
with check (
  (auth.jwt() ->> 'email') = 'axel.brueckner1401@gmail.com'
  and auth.uid() = user_id
);

drop policy if exists "axel_tasks_update_axel" on public.axel_tasks;
create policy "axel_tasks_update_axel"
on public.axel_tasks
for update
to authenticated
using ((auth.jwt() ->> 'email') = 'axel.brueckner1401@gmail.com')
with check ((auth.jwt() ->> 'email') = 'axel.brueckner1401@gmail.com');

drop policy if exists "axel_tasks_delete_axel" on public.axel_tasks;
create policy "axel_tasks_delete_axel"
on public.axel_tasks
for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'axel.brueckner1401@gmail.com');

create or replace function public.set_axel_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_axel_tasks_updated_at on public.axel_tasks;
create trigger set_axel_tasks_updated_at
before update on public.axel_tasks
for each row
execute function public.set_axel_tasks_updated_at();

create index if not exists axel_tasks_created_at_idx
on public.axel_tasks (created_at desc);
