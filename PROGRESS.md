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

## 739 — [BOUNDED MAIN WORKER 2026-07-30 ~13:15] #53 routing Slice 2 complete

- **State:** source-/oracle-pinned anchor-session adapter landed in
  `bd96c90a`; focused acceptance **5 files / 50 tests**, full gate green at
  **547 files / 5500 tests + 1 deliberate animation-lane skip**, build clean.
- **Did:** fresh OFF probes pinned the zeroed Factory/Tower/rent metadata,
  player OT, DESTIN 50 + sets 188/184/135, and three RNG epochs. The route
  adopts the 5-draw pre-anchor schedule (no reselection), captures live
  56/32/190-draw construction cursors, constructs all three exact opponent
  records, and seeds the round from the live post-transition cursor. Negative
  tests prove one-draw sensitivity, wrong-epoch reselection, and room-trainer
  mismatch; room/intro/round/kernel projections agree.
- **Next:** Slice 3 — store/advance/render the generated intro at this handoff,
  acknowledge `battleStart` only at its settled-command boundary.
- **Notes:** `accept-prebattle` **137/137**, generated command **128/128**,
  all **25/25** immutable rows exact. Default remains canonical; no trace,
  recording/barrier ratchet, issue, design, Gate-6, or recorded
  `BattleSetupState` change. PAPERCUT: concurrent compares race on shared
  `out/latest`; reran serially, ~1 minute lost.

---
## 738 — [SUPERVISOR 2026-07-30 ~12:50] Gate-6 K1-K3 merged (K2 caught a real weather-accuracy kernel defect); Slice 1 supervisor-verified

- **State:** master `54124ee9`, union green **546 files / 5497 tests + 1
  deliberate animation-lane skip**, build clean. Merged side worktree
  removed; R7+R8 side worker live (stacked worktree, base `126c2cf`).
- **Did:** verified Slice 1 myself (route+ratchet tests rerun; generated
  **128/128**; spot-checked `turn13-sandattack` 190/190 and
  `battle2-off-turn1-staged` 16/16). Merged K1-K3
  (`gate6KernelInteractions.test.ts`, 542 lines): K1 end-turn
  weather-vs-item ordering, K2 accuracy×weather (fix `450cf532` —
  `battleScriptHitChainOpcode.ts` hardcoded weather inactive in accuracy
  checks: rain-Thunder bypass, sun-Thunder 50, Sand Veil were all
  missing), K3 status×volatile gate order + RNG ledger. Scout-doc
  coverage rows updated by supervisor.
- **Next:** main — Slice 2 (anchor session, Battle 1 RNG epoch
  reconciliation); side — R7+R8 receipts, then K4-K6, R4, B+444 probe.

---
## 737 — [BOUNDED MAIN WORKER 2026-07-30 ~12:38] #53 routing Slice 1 complete

- **State:** explicit route seam and draft-source adapter landed in
  `8dd8ebcf`; route-tagged regression traces landed in `9bc0b39a`. Focused
  acceptance is **4 files / 38 tests**; full gate green at **546 files /
  5482 tests + 1 deliberate animation-lane skip**, production build clean.
- **Did:** added immutable generated/canonical route ownership at the sole
  battle-room handoff; the pure adapter returns exact compact rental sources
  by one-based pick rank (including HAUNTER-first and a second order). Default
  remains canonical; generated tests inject a session factory. `Trace.appRoute`
  is stripped before both oracle paths; tagged all 25 immutable rows, the
  historical Battle 1/2 intro chain, and generated command evidence.
- **Next:** issue design Slice 2: source-/oracle-pin the anchor facility and
  RNG epochs, then replace the temporary injected generated-session factory.
- **Notes:** all **25/25** immutable rows retain their exact table counts;
  generated command remains **128/128**. No capture/segment/profile, recording
  import, barrier/ratchet pin, renderer/rules/AI/per-turn route branch,
  production-default, issue, docs-design, or Gate-6 change. PAPERCUT: none.

