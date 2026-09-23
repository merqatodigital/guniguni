# Technical reference — GUNI GUNI Bistro platform

> This document is the engineering companion to the [proposal README](../README.md): how to run,
> deploy and operate the platform day-to-day.

---

# GUNI GUNI Bistro — website, table ordering & backoffice

Editorial-layout website (home, homemade pasta, pizza/burgers/sides/starters, drinks) with
dine-in table ordering, a customer order-status page, a protected staff dashboard and a
full admin backoffice (CMS) with an OpenRouter-powered AI host.

## Routes

| Route             | What                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| `/#/`             | Home (fully editable; custom sections can be inserted)               |
| `/#/menu/pasta`   | Homemade pasta menu                                                  |
| `/#/menu/pizza`   | Pizza · burgers · sides · starters                                   |
| `/#/menu/drinks`  | Drinks (Glass/Bottle for wine & spirits)                             |
| `/#/<slug>`       | Custom pages created in the admin (About, Blog, Location…)           |
| `/#/order/:id`    | Customer order status                                                |
| `/#/staff`        | Staff orders dashboard + item availability (PIN / Supabase login)    |
| `/#/admin`        | **Backoffice** — theme, fonts, header/footer, home, sections, pages, menu, media, AI agent, publish |

## Run

```bash
npm install
npm run build
STAFF_PIN=2468 ADMIN_PIN=1357 node server/index.mjs   # API + serves dist/ on :8787
```

Dev: `npm run dev` (Vite :5173) + `node server/index.mjs` in another terminal.

## Storage modes (auto-detected)

1. **Supabase** — when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set. Schema, RLS,
   storage bucket and Edge Functions are in `supabase/` (see `supabase/README.md`).
2. **Node server** — `server/index.mjs`, zero dependencies, JSON files in `server/data/`
   (`orders.json`, `site.json`, `secrets.json`, `uploads/`).
3. **Demo** — when neither is reachable (e.g. the static preview). Clearly labelled in the UI;
   orders/config live in this browser only (localStorage + IndexedDB for media). PIN `1234`
   opens both staff and admin.

Prices, availability, Glass/Bottle choice and quantities are validated server-side against the
*published* menu; repeated taps are de-duplicated with an idempotency key.

## Backoffice (`/#/admin`)

**Hidden entrance:** click/tap the round logo **three times** anywhere on the site to open the
admin sign-in. Default admin passkey **5309** (demo mode and the Node server's default; override
with `ADMIN_PIN`). Staff dashboard PIN stays `1234` by default (`STAFF_PIN`).

Footer (Admin → Header & footer): brand, tagline, handwritten note, links, copyright, and the
four blocks — **Contact & Support** (phone, email + note, adults-only policy), **Location &
Hours** (address, hours, happy hour, directions link), **Social Media Connect** (Lucide-style
brand icons + URL per network) and **Review Platforms** (Tripadvisor, Hostelworld, Booking.com…
paste each URL). Every block can be toggled, and the full footer can also be shown under the
menu pages.

- **Theme & fonts** — 8 colour tokens (presets included) and 4 global font roles from a Google
  Fonts catalogue or any custom family (+ custom stylesheet URL). Applied live.
- **Header & footer** — brand, tagline, nav links, CTA, socials, service-charge note, SEO.
- **Home page** — every hero/marquee/place/carousel/CTA string, show/hide per block.
- **Sections** — add / edit / delete / reorder: Text-About, Blog, Location (map embed),
  Gallery, Video (upload or YouTube/Vimeo), FAQ, Hours, CTA band, Contact. Place on the home
  page or on custom **Pages** (auto-added to navigation).
- **Menu** — sections & items (name, price or glass/bottle, description, vegetarian), service charge.
- **Costs & recipes** *(private)* — cost to us per dish and per drink (glass **and** bottle, with a
  pours-per-bottle helper), automatic gross profit, food/beverage cost % and margin % per product,
  menu-wide averages, a "thin margin" watchlist (>45% cost), plus an **ingredient list per product**
  (quantity, unit, ₱/unit, supplier note, include/exclude) that totals into a recipe cost you can
  apply as the product cost. An ingredient index consolidates everything for the future inventory
  tool, and three exports (product costing CSV, recipes CSV, JSON backup) are one click away.
  **This data never leaves the backoffice** — it is stored apart from the published site config, so
  it never reaches the menu pages, visitors or the AI assistant.
- **Media** — every photograph placement from the reference layouts: upload from device
  (images auto-resized, PNG keeps transparency), video upload, paste URL, download, remove.
- **AI agent** — OpenRouter API key (stored server-side / Supabase secret / this device in demo),
  live model catalogue grouped **Free / Top paid / All**, a **green “Working” light** after a
  successful key + model test, system prompt, menu grounding, **knowledge file upload**
  (.txt .md .csv .json .html), test chat. Visitors get an “Ask us” widget.
- **Publish** — draft is saved locally and previewed live; Publish writes to storage.
  Export/import the whole configuration as JSON.

## Blockers / notes

- The original photographs and round logo must be uploaded (Admin → Media) or dropped into
  `src/assets/photos/` — nothing is regenerated or substituted.
- The static preview cannot run the Node server or Edge Functions, so it runs in Demo mode.
- Exact brand fonts couldn't be recovered from the screenshots; closest Google Fonts are set
  and any family can be swapped in Theme & fonts.
