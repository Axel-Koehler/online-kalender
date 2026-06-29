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
