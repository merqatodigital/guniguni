# Supabase setup — GUNI GUNI Bistro

Everything needed to run the site on Supabase instead of the Node server.

```
supabase/
├── migrations/20260101000000_init.sql      tables, RLS, RPCs, realtime, media bucket
├── migrations/20260102000000_costing.sql   private product costs & recipes (staff-only RLS)
└── functions/
    ├── place-order/index.ts             server-side price validation + order insert
    └── agent-chat/index.ts              OpenRouter proxy for the AI host (key stays secret)
src/lib/supabaseBackend.ts               client adapter (auto-selected when env vars exist)
```

## 1. Create the project & push the schema

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

## 2. Deploy the Edge Functions + secret

```bash
supabase functions deploy place-order
supabase functions deploy agent-chat
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## 3. Create staff / admin accounts

Dashboard → Authentication → Users → *Add user* (email + password), then in the SQL editor:

```sql
insert into public.staff_users (user_id, role) values ('<user-uuid>', 'admin');  -- or 'staff'
```

`admin` can publish the site, upload media and configure the agent; `staff` can only work orders.

## 4. Point the app at the project

Copy `.env.example` to `.env`:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

`npm run build` — the app now uses Supabase (Overview in `/#/admin` shows it).
Sign in at `/#/admin`, then **Publish once**: that stores the menu in `site_config`, which
`place-order` uses to validate prices.

## What lives where

| Data                    | Location                                   |
| ----------------------- | ------------------------------------------ |
| Orders                  | `public.orders` (row `data` = full order)  |
| Item availability       | `public.item_availability`                 |
| Site config (CMS)       | `public.site_config` id = `live`           |
| Costs & recipes         | `public.menu_costing` (staff read, admin write — never public) |
| Uploaded photos/videos  | Storage bucket `media` (public read)       |
| OpenRouter key          | Edge Function secret `OPENROUTER_API_KEY`  |

## Security notes

- Anonymous visitors can: read `site_config`, read availability, place orders through
  the function (prices recomputed there), fetch one order by id via `get_order()`, chat
  with the agent (rate-limited).
- Staff status changes go through `update_order_status()` which enforces the transition
  rules. Only admins can write `site_config` and the `media` bucket (RLS).
- Knowledge files and the menu are public-facing content; never put private data in them.
