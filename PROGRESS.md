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

## 746 — [BOUNDED MAIN WORKER 2026-07-30 ~15:10] Slice 5 implementation green; acceptance in progress

- **State:** generated swap accept/decline and reusable later-battle re-entry
  are implemented; focused route tests and production build green.
- **Did:** live swap decisions now mutate the persistent orchestrator, complete
  `swapResolved`, generate the next non-repeating opponent, retain the accepted
  rental, and route the current trainer through the shared room/intro owner.
  Accelerated fixtures prove the identical handoff at battle indexes 1 and 5,
  full healing, retained history, and one monotonic facility-call ledger.
- **Next:** run the complete Slice-5 named compare/test matrix and full gate,
  then record exact totals here.
- **Notes:** swap exit/NO-return remain **43/43 + 69/69** exact. No new
  battle/turn/tick dispatch, barrier, trace/capture, issue, or Scene-ON change.

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

---
## 744 — [SUPERVISOR 2026-07-30 ~15:00] Slice 3 CLOSED at 715/715 (supervisor re-verified); moveend barrier drained and merged; #53 fix-path updated

- **State:** master union green **550 files / 5568 tests + 1 deliberate
  animation-lane skip**, build clean, no live workers, no side
  worktrees beyond permanent animation-main. Barrier ratchet for
  `battleScriptMoveEndOpcode.ts` deliberately 2→1 (sole remainder: the
  census-unreachable `MOVEEND_NEXT_TARGET` doubles branch).
- **Did:** re-verified the closed intro myself (**715/715**, command
  entry **7/7**). Merged the moveend burn-down: full
  `ITEMEFFECT_MOVE_END` restoring family ported source-cited (per-status
  berry cures, Lum, White Herb, script transfers, party mirror,
  state-11 rescan); all 10 census halts re-driven to legitimate
  terminals (4 seven-win incl. three HAUNTER leads, 6 losses, 0 halts;
  addendum doc committed). ISSUES #53 fix-path text updated to the
  Slices-1-3-landed state.
- **Next:** main — design Slice 4 (postwin/swap generalization over
  `orchestrator.round`), then 5/6/7 in order. Side idle unless a
  disjoint need appears.
