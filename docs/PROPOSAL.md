# Digital Footprint Proposal — GUNI GUNI Hostel & Bistro

| | |
| --- | --- |
| **Client** | GUNI GUNI Hostel & Bistro — 263 Manalo Extension, Brgy. Milagrosa, Puerto Princesa City, Palawan 5300 |
| **Prepared by** | [merqato.digital](https://merqato.digital/) — digital agency, Palawan Island · serving globally |
| **Date** | September 2026 |
| **Document set** | [README (overview & build)](../../#readme) · **this proposal** · [GitHub-as-proposal strategy](GITHUB-AS-PROPOSAL.md) · [Technical reference](DEVELOPMENT.md) |
| **Validity** | 30 days from issue; figures finalized after discovery |

> This document states what we will deliver, in what order, and how we will know it is done. The working
> platform it describes already exists in this repository — read anything here as *implemented*, not
> *imagined*, unless explicitly marked as a phase-2+ item.

---

## 1. Background & understanding

GUNI GUNI is already loved. Public listings place it among the most-reviewed specialty stays in Puerto
Princesa — **8.8/10 on Booking.com across hundreds of guest reviews, "Very good" 4.6 on Tripadvisor** —
with reviewers repeatedly singling out the bistro: homemade pizza, generous breakfast, cocktails at
happy hour (4–7 PM daily). The hostel (adults-only, ~30 dorm beds) feeds the bar; the bar feeds the word.

What the business does not yet own is the layer in between: a **digital footprint** —

- a website that ranks for *"where to eat Puerto Princesa"* instead of a directory doing it for you;
- ordering that flows from table to kitchen without verbal relays;
- knowledge of which of the 75 menu items actually make money;
- an online voice that answers questions while the team is on the floor.

This proposal delivers all four, built around how the bistro already works (counter payment, table
numbers, daily 7 AM–11 PM service, hospitality-first staff).

## 2. Objectives

| # | Objective | Measure |
| --- | --- | --- |
| O1 | Give the brand an owned, beautiful, updatable web presence | Site live on client domain; owner edits anything via back-office without developer help |
| O2 | Remove friction from table ordering | Orders placed & paid-at-counter through the platform; zero price disputes (server-side validation) |
| O3 | Make margin visible daily | Costing configured for top 20 items in week 2; food/bev cost % in one glance |
| O4 | Answer guests 24/7 in the house voice | AI host live with menu grounding + ≥3 knowledge files; green "Working" status |
| O5 | Grow the footprint, not just hold it | Review-platform links wired in footer; content cadence agreed for Phase 3 |

## 3. Scope of delivery

### 3.1 Guest experience (Phase 1)

- Editorial home page faithful to the brand system (mustard/cream/ink, oversized condensed type,
  handwritten accents), with the 14 brand photography slots the client will fill.
- Menu pages: homemade pasta · pizza/burgers/sides/starters · drinks with Glass/Bottle pricing,
  vegetarian markers, 5% service-charge note.
- **Order-from-your-table**: item sheets (notes/variants/quantities), cart, table number, order placed,
  live **order-status page** (`/order/:id`) — submitted → accepted → preparing → ready → completed.
- Custom pages (About, Blog, Location with map embed, Gallery, Video, FAQ, Hours, Contact, CTA bands) —
  creatable entirely in the back-office, auto-added to navigation.
- Footer connects the *existing* footprint: Instagram, Facebook, Tripadvisor, Hostelworld, Booking.com —
  plus phone, email, address, hours, directions.

### 3.2 Operations (Phase 1)

- Staff dashboard (`/staff`): order pipeline with one-tap status moves, availability (86-list) toggles.
- Sound/refresh-friendly mobile layout designed for the counter and the kitchen.
- Access via PIN (bundled server) or staff accounts (Supabase Auth).

### 3.3 Back-office (Phase 1)

- Theme: 8 color tokens + presets; 4 type roles with a Google-Fonts catalogue or custom families.
- Content: header/footer (4 footer blocks incl. review platforms), every home-page string, sections &
  pages builder with reordering and per-block visibility.
- Menu editor: sections/items/prices, Glass vs Bottle, vegetarian flags, service-charge rate.
- Media library: upload (auto-resized, transparency-safe), video upload or YouTube/Vimeo, per-slot
  management, download/remove.
- **Publish** workflow: draft edits preview live, publish writes to storage, full JSON export/import
  (the whole config is inspectable and portable).

### 3.4 Money & AI (Phase 2)

- **Private costing & recipes** — cost per dish and per pour (glass *and* bottle, pours-per-bottle
  helper), ingredient lists with ₱/unit and supplier notes, automatic gross profit, food/beverage
  cost % and margin %, menu-wide averages, thin-margin watchlist (>45% cost), ingredient index for the
  future inventory tool, one-click CSV/JSON exports. **Never public**: staff-read / admin-write only,
  excluded from the AI guest host's knowledge.
- **Finance view** — sales, COGS, net, food/bev %, covers, average check; weekly / monthly / YTD with
  top sellers.
- **AI guest host** — OpenRouter-powered "Ask us" widget: your model choice, your system prompt, your
  knowledge files (txt/md/csv/json/html), menu grounding, test-before-trust status light.
- **AI operations console** — staff-side assistant with scheduled tasks already drafted: morning and
  afternoon (pre-happy-hour) briefings, numbers check, low-stock walk, 86 board readout — grounded in
  live orders, availability and costing.

### 3.5 Explicitly out of scope (initially)

- In-app payments (counter payment stays; a GCash/Maya checkout is a clean Phase-3 add).
- Hostel room booking engine (today's traffic is well served by Booking/Hostelworld links; a direct-book
  module is scoped as the Phase-3 hostel item).
- Printed QR collateral, photography shoots (client supplies originals; we can arrange locally).

## 4. Approach & engagement packages

Three shapes of engagement; pick one per phase. *Final figures are issued as a formal quotation after the
discovery call — publishing rates per-repo here would age badly, and every bistro's scope differs.*

| Package | What it means | Best for |
| --- | --- | --- |
| 🚀 **Launch** | Fixed-scope delivery of Phase 1 (site + ordering + staff + back-office), domain setup, staff training, 2 weeks post-launch support | Getting the platform live and owned |
| 🌱 **Growth** | Launch **plus** Phase 2 (costing/recipes onboarding, AI host tuning, finance cadence) and a monthly content + SEO rhythm | Treating the footprint as a revenue channel |
| 🤝 **Partner** | Quarterly retained roadmap: inventory tool, loyalty, hostel module, experiments on the public footprint, priority support | Making digital a permanent capability |

**Working assumptions**

- Client supplies: brand photography (originals), menu sign-off, a staff roster for training, and access
  to the preferred domain registrar / social accounts.
- Hosting: Supabase free/Pro tier or the client's own machine running the bundled Node server —
  the platform supports both without code changes.
- Connectivity: designed for Philippine café-internet realities — single-file build, offline-tolerant
  demo stance, idempotent ordering.
- Timeline: Phase 0 ≈ 2 weeks → Phase 1 ≈ 2.5 weeks (see the [roadmap](../../#9-roadmap)).
  We work in [GitHub milestones](../../milestones) so progress is visible without a meeting.

## 5. Acceptance criteria (per phase)

Phase 1 is "done" when, on the client's own domain:

1. A guest can place an order from a real table and watch it move through statuses on their phone —
   with prices recomputed server-side and the 5% service charge applied.
2. A staff member can run a full service on `/staff` (accept → complete, toggle 86-list) unaided.
3. The owner can change a price, edit the footer and publish — without touching code.
4. All 14 photography placements hold the supplied originals (no substitutions anywhere).

Phase 2 adds: costing live for the top-20 sellers with margin drill-down, finance view reconciled
against one real week, AI host answering from client-approved knowledge files, ops console emailing
(or reading out) the morning briefing on request.

## 6. Why work this way?

We place the whole engagement in public view on GitHub — scope, decisions, releases — because we want
you judging evidence, not adjectives. If that candor is what you also want on *your* channels, we're
already aligned. Read the playbook: [GitHub as a proposal platform](GITHUB-AS-PROPOSAL.md).

---

*Next step: a 30-minute discovery call (site visit works too — we're minutes away) to confirm scope,
photography and the Phase-1 date. → [@merqatodigital](https://github.com/merqatodigital) ·
[merqato.digital](https://merqato.digital/)*
