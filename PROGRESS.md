# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1072 — [MAIN worker, 2026-08-10 night] **Rank-4/5 ability families (opcode manipulation + Own Tempo guard) promoted: ability axis closed to 2 gaps — both axes now match**

- **State:** tree is green: full suite **864 files / 8,347 passed / 1
  skipped**, production build, `npm run typecheck` clean. `docs/gate6-coverage-manifest.md`
  regenerates byte-idempotent and now reads **2 item join gaps / 2 ability
  join gaps** (was **2 item / 9 ability** at entry 1071 — item axis
  untouched except the already-shared Assist/Metronome exception rows, out
  of scope for row content). Baseline checked live first, matching entry
  1071's headline exactly: unsupported ability rows were `MOVE_CONFUSE_RAY`,
  `MOVE_METRONOME`, `MOVE_SWEET_KISS`, `MOVE_SWAGGER`, `MOVE_FLATTER`,
  `MOVE_ROLE_PLAY`, `MOVE_ASSIST`, `MOVE_SKILL_SWAP`, `MOVE_TEETER_DANCE`.
- **Did:** consumed tonight's banked evidence (`docs/ability-manipulation-family-ground-truth.md`,
  `docs/own-tempo-guard-family-ground-truth.md`, both fixture/receipt pairs,
  both verify scripts) — no new oracle receipts authored this step; reran
  both fresh verify scripts once each via `tools/run-mgba-probe.py` and
  diffed against the committed receipts: byte-identical on every
  initial/final/summary field (Role Play: Kadabra copies Ditto's Limber
  @67/gLastUsedAbility set, party record untouched, PP 10→9, RNG 10=10 both
  arms; Shedinja Wonder Guard control never changes the active ability;
  Confuse Ray: Smeargle's Own Tempo blocks confusion, status2 stays 0,
  "prevents confusion" @99, RNG 6 vs. Ditto/Limber control's 10, delta 4
  attributed to the skipped accuracy roll + duration roll + a seed-dependent
  self-hit pair). Rank 4 (`MOVE_ROLE_PLAY`/`MOVE_SKILL_SWAP`) mirrors Rank
  3's per-move-opcode shape (no shared MOVEEND state): `ABILITY_MANIPULATION_DEFINITIONS`
  adds `auditExactScriptBlock` statement audits for `BattleScript_EffectRolePlay`/
  `EffectSkillSwap` plus ordered C guard-chain citations into
  `Cmd_trycopyability`/`Cmd_tryswapabilities`. Rank 5 (the five Own Tempo
  guard moves) reuses the immunity family's graph/program BFS route infra
  (`onDamageRoutePath`), searching for a `jumpifability BS_TARGET,
  ABILITY_OWN_TEMPO` statement instead of a MOVEEND handoff — the same
  reachability-proof shape as King's Rock/Shell Bell/Immunity, applied to a
  different target predicate. Both new selectors are exact finite
  candidate counts with **zero exceptions** (2/2 and 5/5 promoted) —
  candidate counts matched the worklist's own predictions exactly, unlike
  every earlier rank. Respected both ground-truth corrections named in the
  brief: Teeter Dance has no self-hit path (its own `jumpifbyteequal
  gBattlerAttacker, gBattlerTarget` unconditionally skips the attacker's
  slot before the Own Tempo check, confirmed by tracing the BFS's actual
  found route); Swagger/Flatter's stat raise is unconditional and precedes
  the guard (only confusion is gated, encoded in each row's
  `runtimeGuardSignature`, not asserted as a single pass/fail). Also closed
  the honest gap the brief flagged: the ability axis's `unsupported` rows
  previously carried only a generic reason string with no `sourceException`
  object (unlike the item axis's Tickle/Assist/Metronome precedent) — wired
  `IMMUNITY_EXCEPTION_ROWS` into `abilityHook` the same way `itemSourceException`
  already worked for the item axis, so `MOVE_ASSIST`/`MOVE_METRONOME` are now
  explicit documented exception rows on **both** axes, not just item. Did
  **not** invent a new "dynamic-dispatch" manifest category for this, since
  the item axis's existing exception-row shape (still counted in the
  `unsupported`/`gaps` headline, just annotated with `sourceException`)
  already honestly models it and Tickle's own row uses the identical shape.
  `tools/report/gate6-coverage-manifest.ts` adds parallel `abilityManipulationAudit`/
  `abilityManipulationRow` and `ownTempoGuardAudit`/`ownTempoGuardRow`
  checkpoints (King's Rock/Immunity's shape) plus category validation in
  `sourceProvenFamilies`/`parameterizedHook`/`sourceProvenHookEvidence`
  (dedicated evidence-emission blocks for both new category sets — added
  deliberately rather than falling through to the generic absorbing-shaped
  default, which would have fabricated evidence citations), and adds 27 new
  receipt/doc/engine/test paths to `sourceInputs` (`requirePath`-verified).
  `tests/abilityManipulationHookJoinBatch.test.ts` (Tier-1, `itemManipulationHookJoinBatch`
  shape — per-opcode certificates) and `tests/ownTempoGuardHookJoinBatch.test.ts`
  (Tier-1, per-guard certificates including the redirect-target pin
  distinguishing Teeter Dance's own fail script) are new and green.
  `tests/abilityManipulationOracleEvidence.test.ts` pins the fresh Role Play
  receipt pair and cites (without duplicating) `tests/skillSwapOracleEvidence.test.ts`;
  `tests/ownTempoGuardOracleEvidence.test.ts` pins the fresh Confuse Ray
  receipt pair plus source citations for Swagger/Flatter/Teeter Dance's
  guard placement — both new and green. Updated pinned counts in
  `tests/level50MoveParameterization.test.ts` (445→452 ability categories,
  291→298 source-proven, 9→2 unsupported; extended `expectedSourceProven`
  with the two new category maps) and `tests/gate6CoverageManifest.test.ts`
  (adds `ABILITY_MANIPULATION_PROOF_PATHS`/`OWN_TEMPO_GUARD_PROOF_PATHS`
  category constants, dedicated per-category validation blocks, re-pins
  `perMoveHookJoins.total` 11→4, `sourceProven`/`uniqueNonSoundproofProven`
  arithmetic, and both markdown-regex headline assertions).
- **Next:** the ability-axis and item-axis worklists (Ranks 1-5) are both
  now at their honest final state: **2 item / 2 ability gaps**, both being
  the identical `MOVE_ASSIST`/`MOVE_METRONOME` dynamic-dispatch pair
  (`jumptocalledmove`/`metronome` end each script with no static moveend
  node and no static `jumpifability`/opcode target of their own — the
  invoked move's own row independently carries the real hook-join claim at
  runtime, but no route certificate can be fabricated through the dynamic
  dispatch itself). No further family-level promotion is possible on either
  axis without a new engine capability (a runtime trace of the dynamically
  selected move) — this is a legitimate stopping point for the Gate-6
  hook-family worklist as scoped by `docs/gate6-family-worklist.md`. Future
  work: either accept these 4 rows as a permanent documented exception, or
  scope a new session specifically to prove dynamic-dispatch reachability
  (would need a different evidence shape than every other row in this
  census).
- **Notes:** no engine, controller, round outcome, barrier pin, or canonical
  window changed; `src/engine/battleScriptTrycopyabilityOpcode.ts`,
  `battleScriptTryswapabilitiesOpcode.ts`, and
  `battleScriptIngrainLeechSeedWrapOpcode.ts`'s `createJumpifabilityHandler`
  were read, not edited (already faithful per both ground-truth docs' source
  audits — confirmed live against `reference/pokeemerald/src/battle_script_commands.c`
  for `Cmd_trycopyability`/`Cmd_tryswapabilities`/`Cmd_jumpifability` and
  `reference/pokeemerald/data/battle_scripts_1.s` for every cited script).
  Item axis untouched (out of scope beyond the brief's explicit
  Assist/Metronome ability-side exception wiring). Moved entry 1069 to
  `PROGRESS-archive.md` to keep the ledger at 3 live entries.

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

