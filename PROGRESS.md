# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 710 — [BOUNDED MAIN WORKER 2026-07-29 ~18:00] Battle-resolution seam design landed

- **State:** docs-only battle-resolution design complete; tree green at
  **520 files / 5296 tests + 1 deliberate animation-lane skip**, production
  build, and `git diff --check`.
- **Did:** specified the typed command-resolution lifecycle from legal
  A-confirm through messages, HP drain, faint, forced-party handoff, semantic
  switch-in/send-out, and next-command or terminal replacement. Inventoried
  existing kernel events versus the one required `switch-in-animation` marker,
  extended entry 703's per-battler boundary-state pattern, fixed an immutable
  25-window regression table, and split implementation into seven dispatchable
  slices capped at 45 minutes. The last slice is entry 704's honest explicit-OFF
  **128/128** generated-command breadth proof.
- **Next:** dispatch
  `docs/battle-resolution-seam-design.md` **Slice 1 — receipt ownership and
  structural projection** verbatim; do not begin renderer/orchestrator work
  until its structural equivalence acceptance is green.
- **Notes:** no production code, canonical-recording import, oracle/app
  acceptance trace, or capture-list change. Existing banked OFF evidence
  covered the inventory, so no new oracle trace was necessary. The finite
  Stage 8 reset remains intact; this does not resume the canonical Battle 2
  turn march. PAPERCUT: none.

---

## 709 — [SUPERVISOR 2026-07-29 ~17:40] ISSUES #51 + immunity-cure reveal both merged; union green; round 5 dispatched

- **State:** master `b814e791` green at **520 files / 5296 tests + 1
  deliberate animation-lane skip**, production build, `git diff --check`
  clean, no orphan worktrees/branches, DEFERRED.md empty.
- **Did:** (1) verified + accepted entry 708's #51 fix (targeted 22/22;
  draft-menu-slot6 66/66, summary-info-onix 122/122, mon-down-up 87/87
  re-run exact; missing non-anchor layers honestly absent, not
  anchor-substituted). (2) verified + merged
  `worker/side-20260729-164144`: `MOVEEND_IMMUNITY_ABILITIES` status-curing
  reveal, all eight source pairs, site B→A, moveend barriers 5→4; fresh
  seed-610839776 probe reproduced the banked receipt byte-identically;
  live reachability is Factory-legal (Skill Swap on GIRAFARIG set 244 →
  statused Limber holder). Census content idempotent — the only regen
  drift was the doc's embedded generation date crossing UTC midnight
  (restored; future briefs told to restore date-only churn).
- **Next:** round 5 dispatched — main: author
  docs/battle-resolution-seam-design.md (typed action-resolution/send-out
  lifecycle; the named gap holding the 128-capture breadth proof at 0/128
  and blocking the trainer-pic OFF window; design-only, slices dispatched
  verbatim afterward); side: Synchronize moveend reveal (both states,
  battle_util.c:2971/:2987). Then: resolution slices, remaining CBM/CV
  arms, Gate-6 matrix.
- **Notes:** 8 workers so far, 0 failed steps, 1 integrity correction.
  OT/ID summary text: source suppresses it in Battle Factory summaries
  (worker finding, entry 708) — no OT-name extraction needed.

---

## 708 — [BOUNDED MAIN WORKER 2026-07-29 ~17:00] Generated draft summaries consume live rental records

- **State:** implementation `9c342d01` + type fix `804c27a3`; tree green at
  **520 files / 5287 tests + 1 deliberate animation-lane skip**, production
  build, targeted summary/state tests **22/22**, and all required serial
  canonical windows exact: draft
  **13/13 + 38/38 + 66/66**, summary entry **132/132 + 122/122**, mon
  navigation **54/54 + 87/87**, page changes **25/25 + 56/56**.
- **Did:** the generated-rental adapter now preserves six complete
  presentation records (identity, level, item, nature/gender, moves+PP,
  ability surface, stats/EXP, OT ID/source-hidden OT text, front-pic
  identity). Every Info/Skills/Moves/transition renderer and `core.ts`
  consumes those live records; summary DOWN reaches un-rented generated pool
  slots without anchor fallback. Canonical ONIX retains its committed
  byte-exact framebuffer hash. Deleted resolved ISSUES #51.
- **Next:** supervisor can proceed to trainer-pic OFF or Gate-6 work.
- **Notes:** current generated data lacks non-anchor National Dex mapping,
  ability display text/descriptions, and non-anchor summary 64×64 front-pic
  assets; those layers stay absent rather than substituting anchor content.
  No new canonical-recording import, unsupported barrier, trace/capture
  change, swap/party/command/animation change, or tick-keyed branch.
  PAPERCUT: none.

---
