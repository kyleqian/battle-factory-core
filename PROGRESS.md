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
## 630 — [BOUNDED MAIN WORKER 2026-07-28 ~13:32] Audit fixes #50–#52 plus plausible pair source-complete

- **State:** all assigned rungs are green at **398 files / 4528 tests**, production
  build, OFF oracle info, and `git diff --check`; census remains
  **196/214 effects, 336/355 moves, 275/276 distinct, 2955/2957 weighted**.
- **Did:** closed ISSUES #51 by routing successful Sleep and Freeze writes
  through the existing source-complete `CancelMultiTurnMoves` reducer before
  status1 is written. Closed ISSUES #52 with typed item slots for both Trick
  buffers in source order; Furret's result event now carries `LEFTOVERS` then
  `CHOICE BAND`. Closed ISSUES #50 by extending party records with the source
  switch payload and rebuilding the incoming battler's ability, IVs,
  personality, level, friendship, HP ceiling, and battle stats. Tests pin
  Role Play ability retirement, incoming-IV Hidden Power, incoming-maxHP
  Swallow, and the unchanged Baton Pass carve-outs. Closed the plausible pair:
  `seteffectprimary` clears its effect selector before callback resumption,
  while Heal Bell's `RecordAbilityBattle` calls leave `lastUsedAbility`
  untouched.
- **Next:** supervisor verify commits `31702fd6`, `642b1ae6`, `ce0cbd6f`, and
  the final plausible-pair commit; resume the ranked tail plan afterward.
- **Notes:** the reducer clears every engine-owned source field: multi-turn,
  Thrash/Petal Dance lock, Uproar, Bide, semi-invulnerability, Rollout timer,
  and Fury Cutter counter. Source `gLockedMoves` has no engine-owned readback
  and is correctly not part of `CancelMultiTurnMoves`. Trick's display names
  come from the source-extracted Factory item table. Factory party adapters
  materialize their source-fixed IV 3 and controller-computed stats. No
  executability, census, barrier, recording-import, presentation, round,
  tick, roadmap, or canonical-replay pin changed; the obsolete stale-ability
  assertion moved because the replacement behavior is source-correct. The
  primary clear is observable at its pushed callback boundary; it deliberately
  preserves `multiHitEffect`, matching the distinct source dispatchers.

---
## 629 — [BOUNDED MAIN WORKER 2026-07-28 ~13:11] Bide setter and release handoff source-complete

- **State:** tree green at **399 files / 4524 tests**, production build, OFF
  oracle info, and `git diff --check`. Census is exactly **196/214 effects,
  336/355 moves, 275/276 distinct, 2955/2957 weighted**: assigned-baseline
  delta **+1/+1/+0/+0**; all **70** census validations pass.
- **Did:** registered source-exact `SETBIDE`: two-turn counter, multi-turn
  lock, current-move lock, and attacker-only accumulated-damage zero. Physical
  and special `datahpupdate` damage feed the existing accumulator/target; the
  existing canceler stores, restores the saved target, doubles damage, and
  selects release/no-energy. Closed the release script's hidden existing-state
  handoff for `copyword gBattleMoveDamage, sBIDE_DMG`.
- **Next:** supervisor verify this commit, then take the dossier's last-move
  family step. Do not expand into Metronome or other tail rows from this worker.
- **Notes:** full setup, storing, positive release, and no-energy scripts reach
  END. The release proof accumulates **17 physical + 23 special → 80 damage**
  and draws exactly once for accuracy (**16838**, seed 1); all other Bide
  steps draw zero. Canonical replay is exact. Deliberate handler exact-set pin
  **189→190**; Bide's census opcode blocker is now empty. No new barriers,
  recording imports, presentation, round, tick, roadmap, issue, or trace
  changes.

---
## 628 — [BOUNDED MAIN WORKER 2026-07-28 ~13:01] Present + Memento + Role Play + Recycle source-complete

- **State:** tree green at **397 files / 4519 tests**, production build, OFF
  oracle info, and `git diff --check`. Census is exactly **195/214 effects,
  335/355 moves, 275/276 distinct, 2955/2957 weighted**: assigned-baseline
  delta **+4/+4/+4/+4**; all **70** census validations pass.
- **Did:** source-ported Present's exact low-byte damage/heal bands; Memento's
  minimized-stat/Protect/Substitute gates, self-faint ordering, and terminal
  checkteamslost handoff; Role Play's exact NONE/Wonder Guard exclusions and
  ability-name message substitution; Recycle's consumed-item ledger,
  `removeitem` writer, active/party restore, and item-name message.
- **Next:** supervisor verify commits `dd5fd24c`, `7eb51f0b`, `076990f4`,
  and `40e742f2`; all four assigned flips are complete. Resume the ranked
  order without expanding into Metronome or zero-Factory-weight rows.
- **Notes:** predicted-vs-actual is **+1/+1/+1/+1 for every effect**, with
  zero shortfall. Present damage/heal ledgers are 5/2 draws; the other three
  effects draw zero. Memento exposed and closed one hidden registered-opcode
  operand gap (`B_MSG_DEFENDER_STAT_FELL`). Deliberate exact-set move:
  handler surface **185→189**; the regenerated per-effect blocker rows are
  executable. No new barriers, recording imports, presentation, round, tick,
  roadmap, issue, or oracle-trace changes.
