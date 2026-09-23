-- GUNI GUNI Bistro — Supabase schema
-- Run with:  supabase db push   (or paste into the SQL editor)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- site config
create table if not exists public.site_config (
  id          text primary key default 'live',
  config      jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- orders
create table if not exists public.orders (
  id               text primary key,
  number           text not null unique,
  table_number     text not null,
  status           text not null check (status in ('submitted','accepted','preparing','ready','completed','cancelled')),
  total            numeric(12,2) not null,
  idempotency_key  text unique,
  data             jsonb not null,           -- full order object as the app understands it
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);
create sequence if not exists public.order_number_seq;

-- ---------------------------------------------------------------- availability (86'd items)
create table if not exists public.item_availability (
  item_id     text primary key,
  available   boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- staff / admin users
create table if not exists public.staff_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'staff' check (role in ('staff','admin')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_users where user_id = auth.uid());
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_users where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.next_order_number() returns text
language sql security definer set search_path = public as $$
  select 'GG-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
$$;

-- Customers read their own order by its unguessable id (no table-wide select for anon)
create or replace function public.get_order(p_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select data from public.orders where id = p_id;
$$;
grant execute on function public.get_order(text) to anon, authenticated;

-- Staff status transitions, enforced in the database
create or replace function public.update_order_status(p_id text, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  cur      text;
  allowed  text[];
  ts       timestamptz := now();
  new_data jsonb;
begin
  if not public.is_staff() then
    raise exception 'AUTH: staff only' using errcode = '42501';
  end if;
  select status into cur from public.orders where id = p_id for update;
  if cur is null then
    raise exception 'NOT_FOUND: order not found';
  end if;
  allowed := case cur
    when 'submitted' then array['accepted','cancelled']
    when 'accepted'  then array['preparing','cancelled']
    when 'preparing' then array['ready','cancelled']
    when 'ready'     then array['completed','cancelled']
    else array[]::text[] end;
  if not (p_status = any(allowed)) then
    raise exception 'CONFLICT: cannot move an order from % to %', cur, p_status;
  end if;
  update public.orders
     set status = p_status,
         updated_at = ts,
         data = jsonb_set(
                  jsonb_set(
                    jsonb_set(data, '{status}', to_jsonb(p_status)),
                    '{updatedAt}', to_jsonb(ts)),
                  '{history}', coalesce(data->'history', '[]'::jsonb) || jsonb_build_object('status', p_status, 'at', ts))
   where id = p_id
   returning data into new_data;
  return new_data;
end $$;
grant execute on function public.update_order_status(text, text) to authenticated;

-- ---------------------------------------------------------------- row level security
alter table public.site_config        enable row level security;
alter table public.orders             enable row level security;
alter table public.item_availability  enable row level security;
alter table public.staff_users        enable row level security;

drop policy if exists "site read"          on public.site_config;
drop policy if exists "site admin write"   on public.site_config;
create policy "site read"        on public.site_config for select using (true);
create policy "site admin write" on public.site_config for all    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "availability read"        on public.item_availability;
drop policy if exists "availability staff write" on public.item_availability;
create policy "availability read"        on public.item_availability for select using (true);
create policy "availability staff write" on public.item_availability for all    using (public.is_staff()) with check (public.is_staff());

drop policy if exists "orders staff read" on public.orders;
create policy "orders staff read" on public.orders for select using (public.is_staff());
-- inserts happen only through the place-order Edge Function (service role); updates via update_order_status()

drop policy if exists "staff self read" on public.staff_users;
create policy "staff self read" on public.staff_users for select using (user_id = auth.uid());

-- ---------------------------------------------------------------- realtime
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table public.item_availability;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table public.site_config;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- media storage bucket
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media public read"  on storage.objects;
drop policy if exists "media admin insert" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;
create policy "media public read"  on storage.objects for select using (bucket_id = 'media');
create policy "media admin insert" on storage.objects for insert with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects for update using (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete using (bucket_id = 'media' and public.is_admin());

-- ---------------------------------------------------------------- first admin (edit + uncomment)
-- insert into public.staff_users (user_id, role)
-- values ('00000000-0000-0000-0000-000000000000', 'admin');
