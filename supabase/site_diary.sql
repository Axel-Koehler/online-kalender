begin;
create table if not exists public.site_diary (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null default gen_random_uuid(),
  project text not null check (length(trim(project)) > 0),
  entry_date date not null,
  address text not null default '',
  editor text not null default '',
  start_time time,
  end_time time,
  technicians text not null default '',
  companies text not null default '',
  work text not null default '',
  materials jsonb not null default '[]'::jsonb,
  system_type text not null default '',
  issues text not null default '',
  next_steps text not null default '',
  status text not null default 'Offen' check (status in ('Offen', 'In Bearbeitung', 'Abgeschlossen')),
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.site_diary enable row level security;
grant select, insert, update, delete on public.site_diary to authenticated;
drop policy if exists site_diary_team on public.site_diary;
create policy site_diary_team on public.site_diary for all to authenticated using (true) with check (true);
drop trigger if exists site_diary_updated_at on public.site_diary;
create trigger site_diary_updated_at before update on public.site_diary
for each row execute function public.set_calendar_events_updated_at();
create index if not exists site_diary_date_idx on public.site_diary (entry_date desc);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-diary-photos', 'site-diary-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;
drop policy if exists site_diary_photos_team on storage.objects;
create policy site_diary_photos_team on storage.objects for all to authenticated
using (bucket_id = 'site-diary-photos') with check (bucket_id = 'site-diary-photos');
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'site_diary') then
    alter publication supabase_realtime add table public.site_diary;
  end if;
end $$;
commit;
