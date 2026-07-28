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
## 575 — [SUPERVISOR VERIFY 2026-07-28 ~03:01] Corrected Follow Me accepted; Trick and game-stat evidence folded

- **State:** reviewed union green at **333 files / 4055 tests** and focused
  **95/95**; production build, both-oracle freshness/info, census
  regeneration, ratchets, and `git diff --check` pass. Census is exactly
  **144/214 effects, 270/355 moves, 221/276 Factory-L50 distinct,
  2716/2957 weighted**, all **42/42**.
- **Did:** accepted Follow Me only after `aeb56de` implemented both source
  cleanup calls and proved an early end-turn barrier cannot retain the timer.
  Merged and independently replayed Trick's active+persistent Choice Band /
  Leftovers swap (`165501dd…1adf37`) and Splash's PP-before-hidden-game-stat
  receipt (`3a4f4af1…1fc9ff`). Game stats **26/27** are save/meta counters
  (24-bit saturation), not round-rule state.
- **Next:** register operandless `0xe4`
  `B_SCR_OP_GETSECRETPOWEREFFECT` globally with a source-shaped battle
  environment field and Factory **BUILDING → paralysis** handoff through the
  existing secondary-effect chain. Expected census:
  **145/214, 271/355, 222/276, 2722/2957**.
- **Notes:** handler inventory is **153**; no new unsupported barrier/import
  ratchet, private handler, recording import, animation/presentation/tick
  branch, DEFERRED item, issue removal, or oracle lifecycle action.

---
## 574 — [BOUNDED MAIN WORKER CORRECTION 2026-07-28 ~03:00] Follow Me clears at both source cleanup calls

- **State:** committed `aeb56de`; tree green at **331 files / 4048 tests**,
  focused **108/108**, and ratchets **6/6**. Production build, both-oracle
  freshness/info, census regeneration, and `git diff --check` pass. Census
  remains exactly **144/214 effects, 270/355 moves, 221/276 Factory-L50
  distinct, 2716/2957 weighted**, all **42/42**.
- **Did:** matched `BattleTurnPassed` source order: the shared Follow Me helper
  clears both timers at entry `TurnValuesCleanUp(TRUE)` before field/battler/
  faint/delayed barriers, then runs idempotently again at the
  `TurnValuesCleanUp(FALSE)` tail/terminal completion paths. A live
  `ENDTURN_ITEMS1` case-barrier proof returns with zero timers while retaining
  inert targets and all unrelated side fields. `setforcedtarget` now reuses
  the shared battler-role validator.
- **Next:** supervisor verify this bounded correction, then select the next
  finite shared registration target; do not extend the retired Battle-2 march.
- **Notes:** opcode behavior, handler inventory **153**, full-turn outcome,
  census, and scenario/manifest hashes `b1015a6a…07f00f` /
  `e150f267…889ece` are unchanged. No new handler/barrier, ratchet/import,
  recording, animation/presentation/scenario, issue, oracle lifecycle, or
  PAPERCUT change.

---
## 573 — [BOUNDED MAIN WORKER 2026-07-28 ~02:52] Follow Me executes and expires generically

- **State:** committed `b29ecd1`; tree green at **331 files / 4047 tests**,
  focused **100/100**, and ratchets **6/6**. Production build, both-oracle
  freshness/info, census regeneration, and `git diff --check` pass. Census is
  exactly **144/214 effects, 270/355 moves, 221/276 Factory-L50 distinct,
  2716/2957 weighted**, all **42/42**.
- **Did:** globally registered operandless `0xca`: after ordinary PP spend it
  always advances and immutably writes only the attacker side's timer **1**
  and target, including same-side overwrite. The shared BattleTurnPassed entry
  clears both timers before field/battler/faint/delayed work and the tail
  repeats that idempotent clear, retaining inert targets; a generic singles
  full turn spends both Follow Me PP and reaches the next decision with zero
  HP/stat/lock/RNG changes.
- **Next:** supervisor verify this finite executable-frontier increment and
  select the next shared registration target; do not extend the retired
  canonical Battle-2 march.
- **Notes:** the six source retarget readers/HP guards remain evidence-pinned;
  Counter/Mirror Coat/GetMoveTarget doubles ownership was not widened. Handler
  inventory ratchet **152→153** only; no unsupported-branch/import ratchet,
  recording import, private handler, animation/presentation/scenario branch,
  issue removal, oracle lifecycle action, or PAPERCUT.
