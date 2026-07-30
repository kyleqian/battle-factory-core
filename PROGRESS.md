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

## 735 — [SUPERVISOR 2026-07-30 ~12:10] Session open: animation-main folded (+7, Present/Roar exact); lanes on #53 routing-flip design + Gate-6 remainder

- **State:** master fast-forwarded to `1f31e2af` (fold of
  `animation-main`: MOVE_PRESENT and MOVE_ROAR promoted to exact;
  animation coverage 107 exact / 0 partial / 169 unsupported). Union
  verified by supervisor: **545 files / 5478 tests + 1 deliberate
  animation-lane skip**, production build clean, oracle freshness PASS
  (both profiles current vs harness HEAD `2bcab14`). DEFERRED.md empty.
- **Plan (entry 734 order):** (i) main lane — #53 interactive
  routing-flip design doc (`core.ts` battleRoom handoff → generated
  orchestrator), then flip slices; (ii) side lane — Gate-6 remainder:
  K1-K3 kernel tests, then R4/R7/R8 staged cards + K4-K6; (iii) B+444
  RAM-probe fix-vs-attribute interleaved when a lane frees. Hard stop
  19:59; wind-down entry will supersede this one.
- **Notes:** fold was a fast-forward (master had no unique commits since
  the 734 wind-down fold). Animation top entry carries no "For the main
  program:" line.

---
## 734 — [SUPERVISOR WIND-DOWN 2026-07-30 ~03:15] 8 paired rounds / 16 workers, 0 failed steps: resolution seam CLOSED (128/128), intro lifecycle 1-4, Gate-6 12 rows + #54 fixed, #53 filed

- **State:** master green at **533 files / 5440 tests + 1 deliberate
  animation-lane skip** (final pre-fold union; post-fold union re-run
  below), production build clean, `git diff --check` clean, DEFERRED.md
  **empty all session**, no orphan side worktrees/branches (the sole
  unmerged `worker/animation-*` is the live animation supervisor's own).
  `animation-main` folded at wind-down (+17: Present routes, Secret
  Power exact promotion; post-fold delta 0 — the animation supervisor is
  still live; any newer tail is the next orient's fold).
- **Session headlines:** (1) **Resolution seam design §4 COMPLETE** —
  Slice 6 terminal handoff (typed Turn-17 dispatch, turn flags out) and
  Slice 7 closed via a 3-round diagnostic march (11→26→60→**128/128**,
  supervisor re-verified; trace committed; #52 filed→fixed→deleted);
  each fix source-cited and generic (bounce clock, confirm handoff,
  hit-blink receipts). (2) **Generated battle-start intro lifecycle
  slices 1-4** (contract, pre-send-out, opponent release, player
  release→settled command): whole-window private probe **714/715**, sole
  residual B+444 10px (#18 `sSpriteOrder` family, recorded; fix-vs-
  attribute next session). (3) **Gate-6 interaction program**: matrix
  scouted (28 pairs), **12 rows + K7 proven** at kernel parity with
  two-seed ROM receipts; **#54 Natural Cure party-sync bug found and
  fixed same-session**; 3 dossier mis-scopes self-corrected by workers.
  (4) **User stitching report filed as #53** (draft-disconnected
  canonical railroad) with confirmed wiring diagnosis; its enabling
  chain (128/128 + intro lifecycle) landed this session.
- **Next session (ordered):** (i) design the #53 interactive routing
  flip (`core.ts` battleRoom handoff → generated orchestrator), then
  flip slices; (ii) B+444 RAM-probe → fix-vs-attribute; (iii) Gate-6
  remainder R4/R7/R8 + K1-K6; (iv) **user-level:** the harness-side
  Battle Lab pre-reset-capture decision (entries 690/724) blocks both
  the intro acceptance trace and the commentary checkpoint; (v) #39
  window-by-window retirement continues.
- **Notes:** no deferred questions. Papercuts banked: audit-switchin
  stat-label, battle-lab A-edge pulses, vitest freeze-typing. Next
  session resumes from this entry alone.

---
## 733 — [BOUNDED MAIN WORKER 2026-07-30 ~02:45] Intro Slice 4 complete; player release 249/249

- **State:** implementation `659392a6` + compatibility fix `f9af408a`;
  focused acceptance **2 files / 124 tests** plus ratchet **6/6**. Fresh
  private Scene-OFF pre-reset probe matches **249/249** player-release frames
  B+466..+714; whole B+0..+714 is **714/715**, solely the recorded Slice-3
  B+444 10px summary-slot residual. Full gate green at **531 files / 5433
  tests + 1 deliberate animation-lane skip / 514 modules**.
- **Did:** the typed lifecycle now covers generated player text, source-arc
  trainer throw/release at species y-offset, materialization, healthbox,
  Scene-OFF neutral OAM settle, and readiness/message-clear. Player-ready
  converts to the exact shared settled `action-menu` typed state used by the
  generated command window.
- **Next:** #53's separately designed interactive `core.ts` routing flip is
  the next main-lane step; do not fold it into this intro slice.
- **Notes:** all **25/25** immutable rows and generated command **128/128**
  remain exact. Probe regenerated through `tools/run-mgba-probe.py`; no
  public trace committed. No import/barrier/ratchet pin, core routing,
  battle/turn/absolute-tick branch, capture fitting/thinning, or Gate-6 file.
  PAPERCUT: none.

