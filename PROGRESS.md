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

## 751 — [BOUNDED MAIN WORKER 2026-07-30 ~18:52] Turn-13 DRAGON_BREATH content re-driven from kernel receipts

- **State:** landed in `77cb49d0`; focused acceptance **4 files / 293
  tests**, full gate green at **551 files / 5586 tests + 1 deliberate
  animation-lane skip**, production build clean.
- **Did:** staged Onix's real DRAGON_BREATH hit chain from the post-SAND RNG
  cursor and consumed its generic damage/HP/faint receipts. Deleted raw
  `TURN13_PIDGEOTTO_STARTING_HP`, `TURN13_PIDGEOTTO_FAINT_HP`,
  `TURN13_FAINTED_LINE1/2`, the raw kickoff-line call, and the
  `turn13KoDismissElapsed` field; renamed the two KO/faint dispatchers and
  removed KO dismissal's `turn12Resolved` guard. Source-cited damage,
  secondary roll (90: no paralysis), HP update, and faint sequencing.
- **Next:** continue #39 outside this bounded half-window: the surrounding
  turn-13 SAND_ATTACK→DRAGON_BREATH timing cascade and post-KO Murkrow
  switch-in/materialization remain keyed. `turn13Resolved` remains mirrored
  because the turn-14 dispatcher and slot-2 PP accounting consume it;
  `TURN13_DRAGONBREATH_MENU_REDRAW_DELAY` remains the turn-14 reopen gate.
- **Notes:** SAND_ATTACK **190/190**, DRAGON_BREATH/faint **141/141**,
  switch-in **242/242**, generated intro **715/715**, generated command
  **128/128**. No capture, route, Scene-ON, barrier, or new
  battle/turn/absolute-tick branch.

---
## 750 — [SUPERVISOR WIND-DOWN 2026-07-30 ~17:50] #53 CLOSED same-day: design→7 slices→flip→6/6 acceptance; Gate-6 program closed; 2 censuses; moveend barrier drained

- **State:** master green at final gate **550 files / 5581 tests + 1
  deliberate animation-lane skip**, production build clean,
  `git diff --check` clean, DEFERRED.md **empty all session**, no orphan
  worktrees/branches (only permanent `.worktrees/animation-main`).
  `animation-main` folded at orient (+7, Present/Roar exact); fold delta
  **0 at wind-down** — nothing new to fold.
- **Session headlines (19 workers, 1 cap-kill salvaged green, 0 failed
  steps):** (1) **ISSUES #53 CLOSED and deleted** — routing-flip design
  doc + all 7 slices landed same-day: route seam, rank-ordered draft
  adapter, anchor session (3 RAM-pinned RNG epochs), generated-intro
  ownership (**715/715** after the B+444 fix), postwin/swap/endings from
  `orchestrator.round`, battles-2-7 re-entry, and the **production
  default flip to the generated orchestrator**. User-visible acceptance
  `interactive-haunter-shadow-punch-off.json` is **6/6 exact** (drafted
  HAUNTER leads, SHADOW PUNCH drives the outcome, opponent FURY CUTTER
  does its real 1 damage after the battle-init RNG-cursor fix);
  different-lead ONIX Tier-1 proof; all 25 immutable rows byte-exact on
  the explicit canonical route. (2) **Gate-6 interaction program fully
  closed**: R4/R7/R8 receipts + K1-K6 kernel proofs (K7 prior) — K2
  caught and fixed a real defect (weather ignored in accuracy checks).
  (3) **Censuses:** seeds 61-90 clean; anchor-draft combos 60/60 found
  **10 reachable moveend halts** → full `ITEMEFFECT_MOVE_END` restoring
  family ported, all 10 rows re-driven to legitimate terminals, barrier
  ratchet 2→1 (sole remainder: census-unreachable doubles branch).
  (4) **B+444 overturned**: OAM probe disproved the #18-family
  assumption; fixed statelessly (summary-exit clock + bounce-seam
  alignment).
- **Next session (ordered):** (i) #39 window-by-window retirement is now
  the top open debt (the flip added semantic missed-attack/stat-rise/
  no-effect owners — continue from those); (ii) **user-level:** the
  harness-side Battle Lab pre-reset-capture decision (entries 690/724)
  still blocks the arbitrary-trainer dense intro trace + commentary
  checkpoint; routing-design §6 also leaves the browser scene-mode
  selector as a user decision; (iii) S10 gate 2+ harness work per
  roadmap.
- **Notes:** no deferred questions all session. Papercuts banked:
  out/latest race (bumped), census line-drift, cap-kill digest
  misreports "unauthenticated", concurrent-suite vitest orphans
  (bumped). Next session resumes from this entry alone.

---
## 749 — [BOUNDED MAIN WORKER 2026-07-30 ~17:30] HAUNTER FURY CUTTER residual closed

- **State:** source/RAM cursor fix landed in `671a8887`; focused acceptance
  **4 files / 97 tests**, full gate green at **550 files / 5581 tests + 1
  deliberate animation-lane skip**, production build clean.
- **Did:** the anchor adapter now enters `BattleStartClearSetData` from the
  OFF-profile RAM cursor instead of the approximate overworld VBlank cursor.
  Source AI therefore selects FURY CUTTER, whose exact typed damage chain is
  pinned **10→5→2→1** with a neutral control; HAUNTER ends **137/138**.
- **Next:** supervisor may close #53's user-visible acceptance: the drafted
  HAUNTER / selected SHADOW PUNCH route is now fully exact.
- **Notes:** HAUNTER **6/6**, generated intro **715/715**, generated command
  **128/128**, and all **25/25** immutable rows exact. No capture, route
  default, barrier, issue, Scene-ON, or battle/turn/tick branch change.

