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

## 747 — [BOUNDED MAIN WORKER 2026-07-30 ~15:23] Slice 6 terminal owner bridge in progress

- **State:** first green checkpoint; focused Slice 6 baseline remains **6 files /
  75 tests**, production build clean.
- **Did:** core now discovers generated `roundLost` / `roundCompleted`
  commands, installs their terminal presenter on the terminal-resolution edge,
  renders a pending generated terminal without draft fallback, and acknowledges
  completion on the orchestrator-owned round.
- **Next:** add battle-index and rent-count boundary proofs, then run all named
  terminal compares, immutable traces, full suite, and build.
- **Notes:** production default, terminal policy, BP award, captures, and
  Scene-ON remain unchanged; no new barrier or battle/turn/tick branch.

---
## 746 — [BOUNDED MAIN WORKER 2026-07-30 ~15:15] Slice 5 complete: generated Battles 2-7 reusable re-entry

- **State:** landed in `5c19ef95`; named acceptance **8 files / 107 tests**,
  full gate green at **550 files / 5571 tests + 1 deliberate animation-lane
  skip**, production build clean.
- **Did:** live swap decisions now mutate the persistent orchestrator, complete
  `swapResolved`, generate the next non-repeating opponent, retain the accepted
  rental, and route the current trainer through the shared room/intro owner.
  Accelerated fixtures prove the identical handoff at battle indexes 1 and 5,
  full healing, retained history, and one monotonic facility-call ledger.
- **Next:** supervisor may proceed to design Slice 6 (generated loss and
  seventh-win endings).
- **Notes:** swap exit/NO-return **43/43 + 69/69**, generated command entry /
  intro / command **7/7 + 715/715 + 128/128**; all **25/25** immutable rows
  exact. No new battle/turn/tick dispatch, barrier, trace/capture, issue, or
  Scene-ON change.

---
## 745 — [BOUNDED MAIN WORKER 2026-07-30 ~15:00] Slice 4 complete: live postwin → orchestrator swapOffer

- **State:** landed in `f34fd465` + `2f744ccf`; focused acceptance **7 files /
  119 tests**, full gate green at **550 files / 5569 tests + 1 deliberate
  animation-lane skip**, build clean.
- **Did:** generated `battleWon` now freezes challenge index, live HP/full-heal
  values, opponent rental IDs, and commentary from one typed round snapshot;
  postwin bookkeeping no longer substitutes canonical literals. The core
  fixture proves terminal handoff creates postwin, rules do not change before
  the third-scouting-page edge, that edge publishes `swapOffer`, and YES
  builds every player/enemy/rental row from that same orchestrator round.
- **Next:** supervisor may proceed to design Slice 5 (swap result → reusable
  Battles 2-7 room/intro re-entry).
- **Notes:** production default and canonical constructors remain unchanged;
  postwin/swap exact **199/199, 216/216, 171/171, 164/164, 101/101**;
  generated intro **715/715**, command **128/128**; all **25/25** immutable
  rows exact. No new barrier, trace/capture, issue, opponent selection,
  or Battle-2 work.
