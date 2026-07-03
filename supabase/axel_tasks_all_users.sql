drop policy if exists "axel_tasks_select_axel" on public.axel_tasks;
drop policy if exists "axel_tasks_insert_axel" on public.axel_tasks;
drop policy if exists "axel_tasks_update_axel" on public.axel_tasks;
drop policy if exists "axel_tasks_delete_axel" on public.axel_tasks;

drop policy if exists "axel_tasks_select_all_authenticated" on public.axel_tasks;
create policy "axel_tasks_select_all_authenticated"
on public.axel_tasks
for select
to authenticated
using (true);

drop policy if exists "axel_tasks_insert_all_authenticated" on public.axel_tasks;
create policy "axel_tasks_insert_all_authenticated"
on public.axel_tasks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "axel_tasks_update_all_authenticated" on public.axel_tasks;
create policy "axel_tasks_update_all_authenticated"
on public.axel_tasks
for update
to authenticated
using (true)
with check (true);

drop policy if exists "axel_tasks_delete_all_authenticated" on public.axel_tasks;
create policy "axel_tasks_delete_all_authenticated"
on public.axel_tasks
for delete
to authenticated
using (true);
