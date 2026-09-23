# GitHub as a Proposal Platform — the strategy

Most proposals are PDFs: beautiful, static, and dead the moment scope changes. This document explains
the strategy behind the [GUNI GUNI proposal](../README.md): **presenting digital work as a living GitHub
repository** — and why any business, technical or not, benefits from it.

```
deck       = README.md            → the pitch, so everyone can read it
proof      = working code          → run it, don't take our word for it
contract   = docs/PROPOSAL.md      → scope, phases, acceptance criteria
dialogue   = Issues                → questions answered in the open, forever searchable
changes    = Pull Requests         → scope evolves with consent and history
delivery   = Releases + Milestones → "Phase 1" is something you can download and keep
```

## 1. The insight

Clients don't buy code; they buy **confidence**. A repository provides evidence a deck cannot:

| Claim in a classic proposal | The same claim on GitHub |
| --- | --- |
| "We'll build a beautiful site" | The site builds from source; screenshots are of *this* code |
| "Our stack is modern" | `package.json` is right there, with versions |
| "Security is taken seriously" | RLS policies, server-side pricing and secrets handling are readable, line by line |
| "We iterate with you" | Every iteration *is* a commit; history cannot be faked |

## 2. The anatomy of a repo-proposal

1. **README = the deck.** Cover art, badges, diagrams (Mermaid renders natively on GitHub — flowcharts,
   Gantt, mind maps), tables for scope. Write for the owner first, the engineer second.
2. **`docs/PROPOSAL.md` = the contract.** Numbered, objective, with acceptance criteria. When it changes,
   the diff *is* the negotiation record.
3. **Working tree = the prototype.** Even unfinished, it demonstrates taste and throughput in a way a
   mock-up cannot.
4. **Issues = the meeting that never sleeps.** Client asks in their own words; answers persist. New
   stakeholders onboard by reading a thread, not an inbox.
5. **PRs = change requests with consent.** "Add a drinks sub-page" becomes a diff the client can see
   touch exactly the words and buttons they care about.
6. **Releases = milestones you can hold.** `v1.0-phase1` is a zip the client owns even if we disappear.
   That is portability as a sales feature, not a concession.
7. **Topics, description, pinned repos = the storefront.** The repo badge row and about panel do the SEO
   of an agency homepage on a platform engineers actually trust.

## 3. Presenting it to non-technical clients

- Lead with the **URL**, not the jargon: "your proposal is a page — here's the link."
- Walk them through the **README on your own screen** first; let *them* scroll the code tree afterward.
  (Curiosity does the convincing.)
- Use the **demo mode**: hash-routed, runs from any static preview. No logins, no servers — tap the logo
  three times, show them their own back-office.
- Put acceptance criteria in plain English; the code can wait in a `<details>` block if needed.
- End calls by writing their feedback **into an Issue together** — it demonstrates responsiveness better
  than any slide about responsiveness.

## 4. Why it's new (and why now)

Agencies have portfolios; few let the client *watch the proposal being built and version it as law*.
Three shifts make this practical today:

1. **GitHub renders rich docs natively** — Mermaid diagrams, callouts (`> [!NOTE]`), math, images —
   READMEs now read like designer decks.
2. **Static previews & Codespaces** make "run it yourself" a click, not a sysadmin task.
3. **AI-assisted development** compresses the prototype phase from weeks to days, so showing real code
   at proposal time is economically sane.

This repository is the working reference of the strategy: an agency profile (`@merqatodigital`), a pinned
client repo that is simultaneously *proposal · prototype · contract · delivery log*.

## 5. Template checklist (reuse for the next client)

- [ ] Cover image on brand; badges for the stack; one-line value statement
- [ ] README sections: opportunity → proposal → walk-through → stack → **code tree** → architecture →
      security → run → roadmap → about
- [ ] `docs/PROPOSAL.md` with objectives, scope, acceptance criteria
- [ ] Clean `.gitignore` (no secrets, no `node_modules`, no build output in the tree)
- [ ] Repo description + topics + homepage
- [ ] First milestone and first Issue created *before* the discovery call
- [ ] Release `v0.1-proposal` so the client owns a snapshot from day one

---

*Part of the GUNI GUNI digital footprint proposal · [merqato.digital](https://merqato.digital/) ·
Palawan Island → the world*
