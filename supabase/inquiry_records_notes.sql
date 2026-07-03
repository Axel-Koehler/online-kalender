alter table public.inquiry_records
add column if not exists notes text not null default '';
