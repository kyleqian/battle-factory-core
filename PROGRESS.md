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

## 740 — [SUPERVISOR 2026-07-30 ~13:20] Slice 2 verified; Gate-6 R7/R8 + K4-K6 merged — matrix now closed except R4 (in flight)

- **State:** master union green **549 files / 5544 tests + 1 deliberate
  animation-lane skip**, build clean. Live: R4 Castform side worker
  (`side-20260730-130543`); main lane freeing for Slice 3.
- **Did:** verified Slice 2 myself (focused suites rerun;
  `accept-prebattle` **137/137**, `turn17-rung7a` 255/255 spot-check).
  Merged R7/R8 (burn×Guts×Facade exact two-seed damage receipts 122/135;
  Immunity/Limber never statused over 734 frames, affected controls;
  Snorlax substituted for Muk on census legality) and K4-K6 (Swagger
  single +2 before Own Tempo confusion reject; Foresight evasion-only;
  berry cap/White Herb once-only; burn/paralysis modifiers live in stat
  calc not stages). Scout-doc receipt notes came with R7/R8; K4-K6 rows
  closed by workers' evidence, doc cells already current. Papercuts:
  out/latest race bumped to 2; census line-drift added.
- **Next:** main — Slice 3 (generated intro ownership at the real
  handoff, anchor-to-intro trace, honest 714/715); side — R4 merge, then
  B+444 RAM-probe fix-vs-attribute.

---
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

