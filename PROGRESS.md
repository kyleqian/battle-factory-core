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

## 713 — [BOUNDED MAIN WORKER 2026-07-29 ~19:15] Battle-resolution Slice 2 landed

- **State:** implementation `84374947`; tree green at **521 files / 5317
  tests + 1 deliberate animation-lane skip**, production build, targeted
  Slice-2 acceptance **322/322**, and `git diff --check`.
- **Did:** added the typed non-KO Scene-OFF renderer and source-composed scene
  adapter. Frozen commands now drive one-glyph-per-frame attack/result text,
  source `CalcNewBarValue` HP drain/heal clocks (including Q24.8 low-max-HP),
  stat/status effect views, persistent displayed-field HP/status, turn-end,
  and the six-frame blank next-command handoff. The canonical message helper
  was exported without changing its callers. Pixel acceptance is exact:
  staged OFF **16/16**, SAND_ATTACK **190/190**, and menus 3-13
  **254/254, 44/44, 42/42, 44/44, 93/93, 88/88, 111/111, 83/83, 56/56,
  46/46, 57/57**.
- **Next:** dispatch `docs/battle-resolution-seam-design.md` **Slice 3 —
  orchestrator replacement and generated non-KO handoff** verbatim; retain
  the complete Slice-2 regression table.
- **Notes:** no orchestrator/core, faint/party/send-out/terminal path,
  trace/capture list, canonical-recording import, unsupported barrier, or
  battle/turn/absolute-tick branch changed. The renderer consumes only its
  frozen display field, typed commands, and command-relative lifecycle; it
  imports no canonical duration vector. PAPERCUT: none.

---

## 712 — [SUPERVISOR 2026-07-29 ~19:00] Slice 1 + Synchronize reveal folded; union green; round 7 dispatched

- **State:** master green at **521 files / 5309 tests + 1 deliberate
  animation-lane skip**, production build, `git diff --check` clean, no
  orphan worktrees/branches, DEFERRED.md empty.
- **Did:** (1) verified + accepted resolution Slice 1 (`8dee1d7b`:
  targeted 37/37, staged window 16/16, file surface exactly per design §4,
  battleScene.ts untouched). (2) verified + merged
  `worker/side-20260729-171940`: both Synchronize moveend states
  source-complete (four-status banking, toxic→poison, target-first
  ordering), sites B→A, moveend barriers **4→2**; fresh seed-324508639
  probe reproduced the banked receipt byte-identically; reachability is
  Factory-legal (RALTS set 5 Synchronize vs MAGNETON set 244 Thunder
  Wave). Census delta Synchronize 2→3 recorded honestly. (3) Banked the
  mechanicLab internal-vs-dex species-ID papercut (`15134025`).
- **Next:** round 7 dispatched — main: design §4 Slice 2 (resolution
  renderer, pixel-neutral helper factoring, eleven-menu + sandattack
  regression table); side: next CBM/CV pair by ranked rubric. Then Slice
  3+, Gate-6 matrix. Wind-down target ~21:30 with fold re-check.
- **Notes:** 10 workers so far, 0 failed steps, 1 integrity correction
  (entry 705). Class-B reveal program this session: absorption,
  immunity-cure, Synchronize — moveend barriers 5→2, all with two-seed
  byte-identical live receipts.

---

## 711 — [BOUNDED MAIN WORKER 2026-07-29 ~18:55] Battle-resolution Slice 1 landed

- **State:** implementation `8dee1d7b`; tree green at **521 files / 5301
  tests + 1 deliberate animation-lane skip**, production build, targeted
  seam acceptance **37/37**, and `git diff --check`. The unchanged explicit-OFF
  staged turn remains **16/16** exact.
- **Did:** added the immutable resolution receipt/segment/command/display
  types and structural constructor; it retains the genuine pending battle
  boundary, freezes event-time strings, pairs HP controller events, and fails
  closed on unordered/unpaired facts or a switch without its semantic
  switch-in marker. The existing nine-command Scene-OFF projector is now a
  compatibility wrapper over that typed projection. Canonical request-1 →
  request-3 deep equivalence and noncanonical damage/effectiveness,
  zero-HP/faint/forced-boundary, and marked switch-in fixtures are pinned.
- **Next:** dispatch `docs/battle-resolution-seam-design.md` **Slice 2 —
  live non-KO Scene-OFF renderer** verbatim; do not begin orchestrator
  replacement before Slice 2 acceptance is exact.
- **Notes:** no `battleScene.ts`, renderer, orchestrator, kernel outcome/RNG,
  trace/capture list, canonical-recording import, unsupported barrier, or
  battle/turn/absolute-tick branch changed. Slice 5 still owns emission of the
  typed `switch-in-animation` marker; Slice 1 only consumes a fixture marker.
  The finite Stage 8 reset remains intact. PAPERCUT: none.


---
