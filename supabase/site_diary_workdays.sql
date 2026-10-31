begin;
alter table public.site_diary add column if not exists project_id uuid;
-- Existing days with the same site name and address belong to one site.
with grouped as (
  select id, first_value(coalesce(project_id, id)) over (
    partition by lower(trim(project)), lower(trim(address))
    order by created_at, id
  ) as site_id
  from public.site_diary
)
update public.site_diary d set project_id = g.site_id
from grouped g where d.id = g.id and d.project_id is null;
alter table public.site_diary alter column project_id set default gen_random_uuid();
alter table public.site_diary alter column project_id set not null;
create index if not exists site_diary_project_date_idx on public.site_diary (project_id, entry_date);
commit;
