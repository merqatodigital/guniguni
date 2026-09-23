-- GUNI GUNI Bistro — private product costing & recipes
-- Cost prices and ingredient lists are business-internal: readable/writable by staff only,
-- never exposed through the public site_config row.

create table if not exists public.menu_costing (
  id          text primary key default 'live',
  data        jsonb not null default '{"version":1,"currency":"PHP","items":{}}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.menu_costing enable row level security;

drop policy if exists "costing staff read"  on public.menu_costing;
drop policy if exists "costing admin write" on public.menu_costing;
create policy "costing staff read"  on public.menu_costing for select using (public.is_staff());
create policy "costing admin write" on public.menu_costing for all    using (public.is_admin()) with check (public.is_admin());

-- No anon access at all: without a staff session the table returns zero rows.

insert into public.menu_costing (id) values ('live') on conflict (id) do nothing;
