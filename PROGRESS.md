# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1068 — [MAIN worker, 2026-08-09 night] **Shell Bell family complete: OFF receipt, census/manifest promotion, both sibling batches green**

- **State:** tree is green: full suite **854 files / 8,312 passed / 1
  skipped**, production build, `npm run typecheck` clean. `docs/gate6-coverage-manifest.md`
  regenerates byte-idempotent and now reads **118 item join gaps / 106
  ability join gaps** (was **195 item / 106 ability** at entry 1067 — Shell
  Bell moves **77** previously-unsupported item rows to `source-proven-family`
  and adds a second category to the **105** rows King's Rock already proved,
  for **182** total item-axis source-proven rows; King's Rock's 105 stay a
  full subset of Shell Bell's 182). `npm test`'s default heap now needs
  `NODE_OPTIONS=--max-old-space-size=8192` (added to the `test` script,
  matching the existing `build`/`typecheck` precedent) — the Shell Bell
  census duplicates full graph/program route arrays for 182 more rows,
  pushing `level50-move-parameterization.json` past Node's default heap
  under plain `vitest run`; this was a real OOM on the unmodified command,
  not a flake.
- **Did (rung A):** `tools/battle-lab/mechanic-shell-bell-heal-off.json` /
  `mechanic-shell-bell-control-off.json` stage a slower, defensively-built
  Shuckle (Shell Bell holder, item 219) against a faster no-item Swellow,
  both locked to 100%-accuracy Pound. Swellow's earlier action this same turn
  damages Shuckle first (127→122 HP), satisfying `gBattlerAttacker !=
  gBattlerTarget` / `hp != maxHP` / `hp != 0` on Shuckle's own qualifying hit
  without needing a second turn (the staging trap named in the brief). Holder
  arm heals `max(1, floor(7/8))=1` HP (122→123); no-item control arm's HP
  never moves past the incoming Pound. Both arms consume byte-identical
  action-RNG values/order/counts and spend exactly 1 PP each side.
  `tools/probe/probe-shell-bell-heal-off.py` captures each arm through its
  own `EmeraldOracle` instance (two instances cannot share one process —
  observed native segfault) and merges the two raw ledgers in a pure-Python
  pass; reproduced byte-identical across two independent fresh two-arm runs.
  Committed alone first (`0d9c309c`).
- **Did (rung B):** `tools/extract/extract-level50-move-parameterization.ts`
  adds `shellBellRouteEvidence`, transforming (not recomputing)
  `colorChangeRouteEvidenceByMove`'s 182 already-proven witnesses into Shell
  Bell witnesses retargeted at `MOVEEND_KINGSROCK_SHELLBELL`/state 12, per
  entry 1067's reuse recipe. Candidates **183** (power != 0, same population
  as Color Change), promoted **182**, exception **1** (`MOVE_FUTURE_SIGHT`,
  its own `battle_util.c:1816` `IGNORE_SHELL_BELL` reason — kept textually
  distinct from Color Change's state-3 `moveendfromto` skip reason for the
  same move, per entry 1067's finding). `hooks.item` is generalized from a
  King's-Rock-only slot to an array of families (mirroring `hooks.ability`'s
  existing shape), since King's Rock and Shell Bell now legitimately overlap
  for 105 moves. `tools/report/gate6-coverage-manifest.ts` adds a parallel
  `shellBellAudit`/`shellBellMoveEndRow` checkpoint (King's Rock's shape) plus
  category validation in `sourceProvenFamilies`/`parameterizedHook`.
  `tests/shellBellHookJoinBatch.test.ts` (Tier-1, `kingsRockHookJoinBatch`
  shape) and `tests/shellBellOracleEvidence.test.ts` (pins the rung-A
  receipt, `kingsRockOracleEvidence` shape) are new and green. Updated three
  pinned counts in `tests/level50MoveParameterization.test.ts` and eleven in
  `tests/gate6CoverageManifest.test.ts` that hard-coded the old 195/105
  King's-Rock-only item state.
- **Next:** continue the ordered family-level Gate-6 worklist from the
  verified **106 ability / 118 item** row-gap frontier (side lane's
  `docs/gate6-family-worklist.md` still cites the pre-Shell-Bell 195 number
  in its own ranked list — out of scope for this step, side lane's to
  refresh).
- **Notes:** no engine, controller, round outcome, barrier pin, or canonical
  window changed; `src/engine/battleScriptMoveEndOpcode.ts` was read, not
  edited (already audited faithful at entry 1067, now in `PROGRESS-archive.md`).
  `docs/gate6-family-worklist.md` intentionally untouched (side-lane ownership).
