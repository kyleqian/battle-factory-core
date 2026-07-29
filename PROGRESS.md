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

## 650 — [BOUNDED MAIN WORKER 2026-07-28 ~18:10] Production recording-import allowlist reaches zero

- **State:** implementation committed `9ab6985d`; tree green at **437 files /
  4763 tests**, production build, OFF oracle info, and `git diff --check`.
  Census remains byte-idempotent at **214/214 effects, 355/355 moves, 276/276
  distinct, 2957/2957 weighted** with all **72** validations passing.
- **Did:** retired `factorySwapPresentation.ts`'s final canonical recording
  import. The six rental records now derive from drafted anchor state,
  generated Frontier/species corpora, Factory fixed IVs, and the existing
  source-ported opponent personality generator. The production recording
  allowlist shrank **1→0**; the dump remains test-only field parity evidence.
  ISSUES #41 is complete and deleted.
- **Next:** supervisor verify `9ab6985d` and this docs commit. ISSUES #39's
  battle-presentation turn-keying remains separate and explicitly out of
  scope.
- **Notes:** all **19** committed OFF swap traces remain exact at their
  recorded counts; primary windows: picker **101/101**, options **58/58**,
  popup **44/44**, B-close **59/59**, enemy picker **130/130**, accept prompt
  **66/66**, accept exit **43/43**, summary return **147/147**. No behavior,
  barrier-count, handler-set, census, round, tick, roadmap, or animation
  change.

---

## 649 — [BOUNDED MAIN WORKER 2026-07-28 ~17:57] Battle 1 HP recording imports retired

- **State:** implementation committed `78a3bfbc`; tree green at **437 files /
  4762 tests**, production build, OFF oracle info, and `git diff --check`.
  Census remains byte-idempotent at **214/214 effects, 355/355 moves, 276/276
  distinct, 2957/2957 weighted** with all **72** validations passing.
- **Did:** replaced `battleScene.ts`'s three Battle 1 RAM-dump imports with a
  compact staging aggregate over the existing turn-1/2/3/5 kernel hit chains.
  The executable-frontier recording allowlist shrank **4→1**; the three JSON
  recordings remain test-only ground truth for every formerly consumed field.
- **Next:** supervisor verify `78a3bfbc`; ISSUES #41 now contains only
  `factorySwapPresentation.ts`'s swap-rentalmons import and the separately
  tracked generated-recording corpus. Do not expand into #39's turn-keying.
- **Notes:** dense OFF compares remain exact: `turn1-rockslide.json`
  **256/256**, `turn5-faint.json` **110/110**. Tier-1 pins staged
  species/level/maxHP plus HP anchors 143→101, 117→101, 88→41, and Onix 88.
  No barrier-count, handler-set, census, round, tick, pixel, roadmap, or
  animation change.

---

## 648 — [BOUNDED MAIN WORKER 2026-07-28 ~17:47] Focus Band damage survival source-complete

- **State:** committed `ecfb08d2`; tree green at **434 files / 4756 tests**,
  production build, OFF oracle info, and `git diff --check`. Census remains
  byte-idempotent at **214/214 effects, 355/355 moves, 276/276 distinct,
  2957/2957 weighted** with all **72** validations passing.
- **Did:** ported Focus Band's holder-only post-variance roll in both normal
  adjustment commands and its no-variance `adjustsetdamage` sibling. Successful
  lethal hits clamp to 1 HP, set HUNG_ON/item attribution, and run the real
  Focus Band animation/message call-current path; action finish clears the new
  source-shaped `focusBanded` scratch bit.
- **Next:** supervisor verify `ecfb08d2`; audit finding 4 is complete. Do not
  resume retired canonical Battle 2 or presentation work.
- **Notes:** Tier-1 pins nonlethal/success/failure rolls, Endure precedence,
  no-band ledger stability, set 178 `FRONTIER_MON_MACHOKE_1`, and Beat Up's
  exact accuracy→(crit, variance, band)×2 ledger. Source
  `MoveValuesCleanUp` clears per-member result flags but not `focusBanded`;
  every member re-rolls it, while the bit itself has the source action lifetime.
  Deliberate hit-chain barrier pin **16→13**. No census, recording import,
  handler-set, issue, roadmap, round, tick, or pixel change.
