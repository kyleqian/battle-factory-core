# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1071 — [MAIN worker, 2026-08-10 night] **Rank-3 item-manipulation family (Covet/Trick/Recycle/Knock Off) promoted: 4 → 2 item gaps**

- **State:** tree is green: full suite **860 files / 8,332 passed / 1
  skipped**, production build, `npm run typecheck` clean. `docs/gate6-coverage-manifest.md`
  regenerates byte-idempotent and now reads **2 item join gaps / 9 ability
  join gaps** (was **4 item / 9 ability** at entry 1070 — ability axis
  untouched, out of scope). Baseline checked live first, matching entry
  1070's headline exactly: unsupported item rows were `MOVE_METRONOME`,
  `MOVE_TRICK`, `MOVE_ASSIST`, `MOVE_RECYCLE`.
- **Did:** consumed tonight's banked evidence
  (`docs/item-manipulation-family-ground-truth.md`, fresh Covet + Recycle
  Battle Scene OFF fixture/receipt pairs, both verify scripts) — no new
  oracle receipts authored this step; reran both fresh verify scripts once
  each via `tools/run-mgba-probe.py` and diffed against the committed
  receipts: byte-identical (Covet: attacker acquires Cheri Berry@332,
  party-synced@191, defender loses it@191, control zero transitions, RNG
  14=14 both arms; Recycle: restore@380 after same-turn cure-and-consume
  [paralysis applied@111], itemless control no-ops, RNG 7 vs 10). Verified
  the pre-existing 2026-07-28 Knock Off/Trick evidence
  (`tests/familyBCluster4OracleEvidence.test.ts`,
  `tests/trickOracleEvidence.test.ts` + fixtures) satisfies the family
  receipt standard (schemaVersion-pinned deterministic requests, byte-hash
  reproducibility, `runs: 2` byte-identical manifests) and cited it as-is —
  no restaging. `tools/extract/extract-level50-move-parameterization.ts`
  adds a **per-move** certificate shape (not a shared moveend state, unlike
  every prior item family): four `auditExactScriptBlock` statement audits
  (`BattleScript_EffectThief`/`EffectTrick`/`EffectRecycle`/`EffectKnockOff`)
  plus ordered C guard-chain token citations into each move's own dedicated
  opcode (`Cmd_seteffectwithchance`'s `MOVE_EFFECT_STEAL_ITEM`/
  `MOVE_EFFECT_KNOCK_OFF` arms, `Cmd_tryswapitems`, `Cmd_tryrecycleitem`).
  Selector is always the exact 4 Rank-3 moves (candidateCount 4,
  promoted 4, 0 exceptions) — unlike Rank 1, membership doesn't depend on
  prior-claim status. `MOVE_COVET`/`MOVE_KNOCK_OFF` were already
  Shell-Bell-claimed (power != 0); this family adds a second, independent
  category (`item-manipulation-steal`/`-knockoff`) to those two rows and
  the first category (`item-manipulation-swap`/`-recycle`) to Trick/Recycle
  — so only 2 of the 4 moved a row from `unsupported`, and item gaps land
  at **2** (`MOVE_ASSIST`/`MOVE_METRONOME`, Rank 1's dynamic-dispatch
  exceptions, not members of this family's selector), not the brief's
  predicted 0. Honest per-row report, not forced: the item axis is *not*
  fully closed. `tools/report/gate6-coverage-manifest.ts` adds a parallel
  `itemManipulationAudit`/`itemManipulationRow` checkpoint plus category
  validation in `sourceProvenFamilies`/`parameterizedHook`/
  `sourceProvenHookEvidence` (generic evidence emission driven by each
  witness's own `familyVerification` fields, since implementation/test
  paths differ per move), and adds 24 new receipt/doc/test paths to
  `sourceInputs` (`requirePath`-verified). `tests/itemManipulationHookJoinBatch.test.ts`
  (Tier-1, asserts four distinct dispatchers — not one shared state) and
  `tests/itemManipulationOracleEvidence.test.ts` (pins the fresh Covet +
  Recycle receipts byte-precisely, references but does not duplicate the
  pre-existing Trick/Knock Off test files) are new and green. Updated
  pinned counts in `tests/level50MoveParameterization.test.ts` (296→298
  item source-proven rows, 4→2 unsupported) and `tests/gate6CoverageManifest.test.ts`
  (adds `ITEM_MANIPULATION_PROOF_PATHS`/category constants, a dedicated
  per-category validation block, `sourceItemManipulation` set-membership
  checks alongside `sourceKingsRock`/`sourceShellBell`/`sourceItemMoveEnd`,
  and re-pins total hook-join gaps 13→11).
- **Next:** continue the ordered family-level Gate-6 worklist from the
  verified **2 item / 9 ability** row-gap frontier. Remaining item gaps:
  `MOVE_ASSIST`, `MOVE_METRONOME` (both dynamic-dispatch, no static moveend
  node — the same structural gap found twice already; likely needs its own
  named exception category rather than a new family, if ever closed).
  Remaining ability gaps: Rank 4 (2 rows, Skill Swap/Role Play — side lane
  banked fresh evidence tonight, not yet wired into the manifest by main
  lane) and Rank 5 (5 rows, Own Tempo guards).
- **Notes:** no engine, controller, round outcome, barrier pin, or canonical
  window changed; `src/engine/battleScriptHitChainOpcode.ts`,
  `battleScriptTryswapitemsOpcode.ts`, `battleScriptTryrecycleitemOpcode.ts`
  were read, not edited (already faithful per the ground-truth doc's source
  audit). Rank-4/5 rows, their evidence packs
  (`tools/battle-lab/mechanic-ability-manipulation-*`), and
  `tools/battle-lab/mechanic-own-tempo-guard-*` untouched (side-lane
  ownership, explicit brief exclusion). Moved entry 1068 to
  `PROGRESS-archive.md` to keep the ledger at 3 live entries.


## 1070 — [MAIN worker, 2026-08-10 night] **Rank-1 item family (generic post-move status-cure/stat-restore) promoted: 118 → 4 item gaps**

- **State:** tree is green: full suite **858 files / 8,324 passed / 1
  skipped**, production build, `npm run typecheck` clean. `docs/gate6-coverage-manifest.md`
  regenerates byte-idempotent and now reads **4 item join gaps / 9 ability
  join gaps** (was **118 item / 9 ability** at entry 1069 — ability axis
  untouched, out of scope). Baseline checked live first, matching entry
  1069's headline exactly (118/9), not the worklist's stale 191/195.
- **Did:** consumed the already-banked evidence from tonight's prep pass
  (`docs/item-move-end-family-ground-truth.md`,
  `tools/battle-lab/mechanic-item-move-end-paralysis-{cheri,control}-off.json`,
  `tools/probe/verify-item-move-end-paralysis-off.py`, both receipts) — no
  new oracle receipts authored. `tools/extract/extract-level50-move-parameterization.ts`
  adds `itemMoveEndRouteEvidence` (same graph/program BFS infra as King's
  Rock/Shell Bell/Immunity) proving each candidate's entry script reaches a
  `moveendall`/`moveendto`/`moveendfromto` handoff whose `Cmd_moveend` state
  range includes state 11 (`MOVEEND_ITEM_EFFECTS_ALL`), unconditional per
  battler regardless of which (if any) of the nine `HOLD_EFFECT_CURE_*`/
  `HOLD_EFFECT_RESTORE_STATS` arms fires. Selector: every item-axis
  unsupported row except the four Rank-3 moves (`MOVE_COVET`, `MOVE_TRICK`,
  `MOVE_RECYCLE`, `MOVE_KNOCK_OFF`), explicitly excluded regardless of their
  current claim status. Live candidate count is **116**, not the worklist's
  stale ~114 guess — re-ran the worklist's quoted python command against the
  live manifest and found only `MOVE_TRICK`/`MOVE_RECYCLE` still unsupported
  among the four Rank-3 moves (`MOVE_COVET`/`MOVE_KNOCK_OFF` were already
  Shell-Bell-claimed by their nonzero power before this step, since Shell
  Bell's selector is power != 0 with no item-manipulation awareness), so only
  2 of the 4 needed subtracting from the 118 pool: 118 − 2 = 116. Promoted
  **114**, two exceptions — `MOVE_ASSIST`/`MOVE_METRONOME` end in a
  dynamic-dispatch opcode (`jumptocalledmove`/`metronome`) with no static
  moveend node of their own, the identical structural gap entry 1069 found
  for the Immunity family's state-4 search (confirmed by first running with
  no hardcoded exceptions and observing the generator throw on exactly these
  two moves). Explicit honest-modeling call: did **not** retroactively
  annotate the 182 rows already proven by King's Rock/Shell Bell with this
  new category, even though those rows' scripts also structurally pass
  through state 11 en route to state 12 in the same moveend sweep — the
  brief's selector is "every unsupported row," annotating already-proven
  rows would need a separate state-11 route derivation per row (not reuse)
  for zero additional gap closure, and it risked the 60-minute cap.
  `tools/report/gate6-coverage-manifest.ts` adds a parallel `itemMoveEndAudit`/
  `itemMoveEndMoveEndRow` checkpoint (King's Rock's shape) plus category
  validation in `sourceProvenFamilies`/`parameterizedHook`/
  `sourceProvenHookEvidence`, and adds the eight new receipt/doc paths to
  `sourceInputs` (`requirePath`-verified; entry 1069's Immunity family did
  not add its own paths there, an existing gap left as-is, not fixed here).
  `tests/itemMoveEndHookJoinBatch.test.ts` (Tier-1, `kingsRockHookJoinBatch`
  shape) and `tests/itemMoveEndOracleEvidence.test.ts` (pins the banked
  receipt pair, `kingsRockOracleEvidence` shape) are new and green. Reran
  `verify-item-move-end-paralysis-off.py`'s live-check arm fresh once via
  `tools/run-mgba-probe.py` — reproduced byte-identically: paralysis
  applied@111 both arms, holder cured@238/item consumed@380/status1 ends 0,
  control persists 0x40, RNG holder=12/control=13. Updated pinned counts in
  `tests/level50MoveParameterization.test.ts` (182→296 item categories/
  source-proven rows, 118→4 unsupported; `MOVE_WITHDRAW`/`MOVE_RAIN_DANCE`/
  `MOVE_SUNNY_DAY`/`MOVE_PROTECT` flip from item-unsupported to
  item-move-end-family-proven, renamed that test's title accordingly) and
  `tests/gate6CoverageManifest.test.ts` (adds `ITEM_MOVE_END_PROOF_PATHS`,
  re-pins `perMoveHookJoins` totals 127→13, adds `sourceItemMoveEnd`
  set-membership check alongside the existing `sourceKingsRock`/
  `sourceShellBell` ones).
- **Next:** continue the ordered family-level Gate-6 worklist from the
  verified **4 item / 9 ability** row-gap frontier. Remaining item gaps:
  `MOVE_ASSIST`, `MOVE_METRONOME`, plus Rank 3's `MOVE_TRICK`/`MOVE_RECYCLE`
  (side lane, in flight — do not touch). Remaining ability gaps: Rank 4 (2
  rows, Skill Swap/Role Play) and Rank 5 (5 rows, Own Tempo guards).
- **Notes:** no engine, controller, round outcome, barrier pin, or canonical
  window changed; `src/engine/battleScriptMoveEndOpcode.ts` was read, not
  edited (already audited faithful per the ground-truth doc). Rank-3 rows,
  their ground-truth doc, and `tools/battle-lab/mechanic-item-manipulation-*`
  untouched (side-lane ownership, explicit brief exclusion). Moved entry
  1067 to `PROGRESS-archive.md` to keep the ledger at 3 live entries.

## 1069 — [MAIN worker, 2026-08-10 night] **Rank-2 ability family (status-immunity cleanup) promoted: 106 → 9 ability gaps**

- **State:** tree is green: full suite **856 files / 8,317 passed / 1
  skipped**, production build, `npm run typecheck` clean. `docs/gate6-coverage-manifest.md`
  regenerates byte-idempotent and now reads **118 item join gaps / 9 ability
  join gaps** (was **118 item / 106 ability** at entry 1068 — item axis
  untouched, out of scope). 9 remaining ability rows: Rank-4's Skill
  Swap/Role Play, Rank-5's five Own Tempo guard moves, plus two new explicit
  exceptions below.
- **Did:** consumed the already-banked 2026-07-29 evidence
  (`docs/immunity-abilities-ground-truth.md`,
  `tools/battle-lab/mechanic-immunity-limber-skill-swap-off.json`,
  `tools/probe/probe-immunity-limber-off.py`, both seed receipts) — no new
  oracle receipts authored. `tools/extract/extract-level50-move-parameterization.ts`
  adds a generic route-certificate walk (`immunityRouteEvidence`, reusing the
  same graph/program BFS infra as Color Change/King's Rock) proving each
  candidate's entry script reaches a `moveendall`/`moveendto`/`moveendfromto`
  handoff whose `Cmd_moveend` state range includes state 4
  (`MOVEEND_IMMUNITY_ABILITIES`), unlike Color Change/King's Rock this needs
  no target `datahpupdate` since state 4 fires unconditionally for every
  move reaching the normal moveend tail. Candidates **99** (selector: every
  ability-unsupported row minus Rank-4's 2 + Rank-5's 5), promoted **97**,
  two new exceptions — `MOVE_ASSIST`/`MOVE_METRONOME` end in a dynamic-dispatch
  opcode (`jumptocalledmove`/`metronome`) with no static moveend node of
  their own, a genuine finding the worklist's 99/99 prediction missed. Also
  fixed a real latent bug in the shared `onDamageCallReturns` helper (used by
  the graph-route BFS's `call`-edge validity check): it only checked a call
  target's *own* last statement for `return`, missing targets like
  `BattleScript_WeatherFormChanges` that fall through a loop label before
  returning — now does a full reachable-subgraph search. This only relaxes a
  false negative (strictly more permissive), verified by rerunning the full
  suite including Color Change's/King's Rock's own batches unchanged.
  `tools/report/gate6-coverage-manifest.ts` adds a parallel `immunityAudit`/
  `immunityMoveEndRow` checkpoint (King's Rock's shape) plus category
  validation in `sourceProvenFamilies`/`parameterizedHook`/
  `sourceProvenHookEvidence`. `tests/statusImmunityHookJoinBatch.test.ts`
  (Tier-1, `kingsRockHookJoinBatch` shape) and
  `tests/statusImmunityOracleEvidence.test.ts` (pins both banked receipts
  byte-precisely, `kingsRockOracleEvidence` shape) are new and green.
  Reran `probe-immunity-limber-off.py` fresh once — reproduced the
  610839776-seed receipt byte-identically. Updated pinned counts in
  `tests/level50MoveParameterization.test.ts` (348→445 ability categories,
  194→291 source-proven, 106→9 unsupported; `MOVE_WITHDRAW`/`MOVE_RAIN_DANCE`/
  `MOVE_SUNNY_DAY`/`MOVE_PROTECT` flip from ability-unsupported to
  immunity-family-proven) and `tests/gate6CoverageManifest.test.ts` (adds
  `IMMUNITY_PROOF_PATHS`, six numeric re-pins).
- **Next:** continue the ordered family-level Gate-6 worklist from the
  verified **9 ability / 118 item** row-gap frontier. Ranks 4 (2 rows,
  Skill Swap/Role Play) and 5 (5 rows, Own Tempo guards) remain on the
  ability axis; Rank 1 (item, 191 rows) is in flight on the side lane.
- **Notes:** no engine, controller, round outcome, or canonical window
  changed; `src/engine/battleScriptMoveEndOpcode.ts` was read, not edited
  (already audited faithful in `docs/immunity-abilities-ground-truth.md`).
  Item-axis rows, Rank-1/3/4/5 families, and Shell Bell untouched (out of
  scope). `docs/gate6-family-worklist.md` gets a one-line Rank-2 STATUS note
  only, per side-lane ownership of the rest of that doc.
