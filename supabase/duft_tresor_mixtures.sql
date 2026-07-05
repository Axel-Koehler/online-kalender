create table if not exists public.duft_tresor_mixtures (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  mode text not null default 'percent',
  total_weight numeric not null default 0,
  fragrance_percent numeric not null default 15,
  fragrance_weight numeric not null default 0,
  wax_weight numeric not null default 0,
  oils jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.duft_tresor_mixtures
add column if not exists mode text not null default 'percent';

alter table public.duft_tresor_mixtures
add column if not exists total_weight numeric not null default 0;

alter table public.duft_tresor_mixtures
add column if not exists fragrance_percent numeric not null default 15;

alter table public.duft_tresor_mixtures
add column if not exists fragrance_weight numeric not null default 0;

alter table public.duft_tresor_mixtures
add column if not exists wax_weight numeric not null default 0;

alter table public.duft_tresor_mixtures
add column if not exists oils jsonb not null default '[]'::jsonb;

alter table public.duft_tresor_mixtures enable row level security;

drop policy if exists "duft_tresor_select_public" on public.duft_tresor_mixtures;
create policy "duft_tresor_select_public"
on public.duft_tresor_mixtures
for select
to anon, authenticated
using (true);

drop policy if exists "duft_tresor_insert_public" on public.duft_tresor_mixtures;
create policy "duft_tresor_insert_public"
on public.duft_tresor_mixtures
for insert
to anon, authenticated
with check (true);

drop policy if exists "duft_tresor_update_public" on public.duft_tresor_mixtures;
create policy "duft_tresor_update_public"
on public.duft_tresor_mixtures
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "duft_tresor_delete_public" on public.duft_tresor_mixtures;
create policy "duft_tresor_delete_public"
on public.duft_tresor_mixtures
for delete
to anon, authenticated
using (true);

create or replace function public.set_duft_tresor_mixtures_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_duft_tresor_mixtures_updated_at on public.duft_tresor_mixtures;
create trigger set_duft_tresor_mixtures_updated_at
before update on public.duft_tresor_mixtures
for each row
execute function public.set_duft_tresor_mixtures_updated_at();

create index if not exists duft_tresor_mixtures_name_idx
on public.duft_tresor_mixtures (lower(name));
