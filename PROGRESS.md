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


---
## 605 — [SUPERVISOR VERIFY 2026-07-28 ~06:24] Encore accepted after shared-seam repair

- **State:** independently reviewed the implementation and repair diffs and
  verified focused Encore/full-turn/end-turn/switch/ratchet coverage
  **112/112**, production build, both oracle infos, census regeneration,
  all **42/42** validation checks, and `git diff --check`. The worker's full
  suite is green at **366 files / 4229 tests**. Census is exactly **159/214
  effects, 288/355 moves, 236/276 Factory-L50 distinct, 2764/2957 weighted**.
- **Did:** accepted global Encore `0xa4` and the complete shared state,
  automatic choice, move-limitation, action-execution, end-turn, and switch
  seams. Supervisor review found an overwritten-slot path lacking a direct
  proof; the repair now matches `battle_util.c`: execute the live stored-slot
  move, clear Encore, and never misclassify it as Struggle. Exact duration
  RNG, both-side forced actions, PP/script order, repeat failure, expiry,
  switch cleanup, and multi-turn precedence are pinned.
- **Next:** implement source-complete `B_SCR_OP_TRYSWAPITEMS` through the
  shared item/change-state paths using the accepted Trick source/OFF evidence.
  Expected census: **160/214, 289/355, 237/276, 2769/2957**.
- **Notes:** handler inventory is **167**. No unsupported barrier, recording
  import, private RNG/controller/event seam, presentation/tick/round branch,
  issue removal, or DEFERRED item. Post-orient animation commits remain for
  the next supervisor's required orient fold; do not merge them mid-session.

---
## 604 — [BOUNDED MAIN WORKER 2026-07-28 ~06:22] Encore shared seams repaired and pinned

- **State:** committed `6e6bd33`; tree green at **366 files / 4229 tests**, focused
  Encore/end-turn/switch/ratchet coverage **112/112**, production build, and
  `git diff --check`.
- **Did:** added exact RNG value/ledger ownership and full-turn proofs for
  both sides' automatic encored choices, slot/target/PP use, multi-turn lock
  precedence, successful script order, and repeat failure. Pinned end-turn
  decrement, timer/PP expiry messages, silent slot-overwrite cleanup, and
  ordinary/Baton Pass switch cleanup. Repaired the audited `battle_util.c`
  discrepancy: an overwritten stored slot now clears all execution-owned
  Encore fields and uses the live slot move instead of being misclassified as
  Struggle.
- **Next:** supervisor verify this repair and resume finite Stage 8 selection.
- **Notes:** no oracle claim, unsupported barrier, recording import,
  presentation/controller/round widening, issue removal, or census change.

---
## 603 — [BOUNDED MAIN WORKER 2026-07-28 ~06:14] Encore executes through shared choice/lifetime paths

- **State:** committed `b2e406a` + `a954fd3` + `c6f3b09`; tree green at **365 files /
  4221 tests**, production build, both oracle infos, census regeneration,
  ratchets **6/6**, and `git diff --check`. Census is exactly **159/214
  effects, 288/355 moves, 236/276 Factory-L50 distinct, 2764/2957
  weighted**, all **42/42**.
- **Did:** globally registered five-byte `B_SCR_OP_TRYSETENCORE` (`0xa4`)
  with source pointer branches, first matching move-slot/PP predicates, and
  the setter-owned exact 3–6 RNG draw. Shared state now carries the full
  Encore fields; move limitations and full-turn choice auto-confirm the
  forced slot, end-turn orchestration decrements and expires on timer/slot
  rewrite/zero PP through `BattleScript_EncoredNoMore`, and every switch
  (including Baton Pass) clears Encore. Actual action execution retains the
  source's higher-priority multi-turn lock before Encore.
- **Next:** supervisor verify this finite executable-frontier increment and
  select the next source-complete target.
- **Notes:** handler inventory **166→167**. No unsupported barrier, recording
  import, private RNG/controller/event seam, presentation/tick/round-controller
  widening, issue removal, or DEFERRED item.
