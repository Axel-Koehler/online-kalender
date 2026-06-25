create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer text not null,
  net_amount numeric(12, 2) not null default 0,
  order_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_orders enable row level security;

drop policy if exists "customer_orders_select_authenticated" on public.customer_orders;
create policy "customer_orders_select_authenticated"
on public.customer_orders
for select
to authenticated
using (true);

drop policy if exists "customer_orders_insert_authenticated" on public.customer_orders;
create policy "customer_orders_insert_authenticated"
on public.customer_orders
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "customer_orders_update_authenticated" on public.customer_orders;
create policy "customer_orders_update_authenticated"
on public.customer_orders
for update
to authenticated
using (true)
with check (true);

drop policy if exists "customer_orders_delete_authenticated" on public.customer_orders;
create policy "customer_orders_delete_authenticated"
on public.customer_orders
for delete
to authenticated
using (true);

create or replace function public.set_customer_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_customer_orders_updated_at on public.customer_orders;
create trigger set_customer_orders_updated_at
before update on public.customer_orders
for each row
execute function public.set_customer_orders_updated_at();

create index if not exists customer_orders_customer_idx
on public.customer_orders (customer);
