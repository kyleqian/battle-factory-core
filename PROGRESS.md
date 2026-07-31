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

---
## 748 — [BOUNDED MAIN WORKER 2026-07-30 ~17:03] Slice 7 COMPLETE at honest HAUNTER checkpoint

- **State:** landed in `15e9ef33` + `9a94caab`; focused routing/ratchet
  acceptance **2 files / 20 tests**, full gate green at **550 files / 5579
  tests + 1 deliberate animation-lane skip**, production build clean.
- **Did:** the explicit-OFF real-anchor trace drafts HAUNTER/ONIX/BAYLEEF,
  traverses both rooms and generated intro, selects SHADOW PUNCH, and proves
  release/name, action menu, move menu, and use-message exact **4/4**. The
  existing different-lead test proves ONIX's species/moves/PP and move-slot-2
  decision replace HAUNTER without adapter changes; a new automated contract
  pins normal dev startup and reset to the generated default.
- **Next:** supervisor decides whether the newly exposed FURY CUTTER response
  remainder warrants another bounded slice before #53 bookkeeping.
- **Notes:** **Yes, #53's user-visible ONIX/ROCK-SLIDE canonical-railroad
  symptom is gone**: the drafted HAUNTER and selected SHADOW PUNCH own the
  live turn and next request. Trace is honestly **4/6**: frames 2263/2274
  each differ by exactly **27px**, solely ROM HAUNTER HP **137/138** versus
  app **138/138** after FURY CUTTER; opponent HP and HAUNTER PP **19/20** are
  aligned. All **25/25** immutable rows exact; no appStage, existing capture
  change, new barrier, battle/turn/tick branch, issue edit, or Scene-ON work.

---
## 747 — [BOUNDED MAIN WORKER 2026-07-30 ~15:36] Slice 6 complete: orchestrator-owned endings

- **State:** landed in `cca9d54c` + `429c170b`; focused acceptance **6 files /
  78 tests**, full gate green at **550 files / 5574 tests + 1 deliberate
  animation-lane skip**, production build clean.
- **Did:** core now discovers generated `roundLost` / `roundCompleted`
  commands, installs their terminal presenter on the terminal-resolution edge,
  protects the two prior-frame ticks from draft fallback, and acknowledges
  completion on the orchestrator-owned round. Fixtures prove losses at indexes
  0/5, completion only at 6, and accepted-swap rent count **14→15 exactly
  once** on completion but **14→14** on loss.
- **Next:** supervisor may proceed to design Slice 7 (production routing flip
  and user-visible HAUNTER/SHADOW PUNCH acceptance).
- **Notes:** production default, terminal policy, BP award, captures, and
  Scene-ON unchanged. Terminal loss/menu/win/continuation exact **210/210 +
  414/414 + 2513/2513 + 1911/1911**; generated intro/command **715/715 +
  128/128**; all **25/25** immutable rows exact. No new barrier or
  battle/turn/tick branch.
