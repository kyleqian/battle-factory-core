# Rust M4 opener scout — battle-kernel leaf family

Written 2026-08-11 by the planning session, for the next
`./run-supervisor.sh -l rust` session. **User decision (2026-08-11): open
M4 with the battle-kernel leaf family** — it has been complete for a
while, will not change, and carries a large pinned test surface. This doc
is scouting input for the supervisor's briefs; the supervisor owns the
final step split.

## Family definition (exact modules)

- `src/engine/damageCalc.ts` — 671 lines, **zero imports, fully
  self-contained**. Gen-3 damage/accuracy/crit math ported bit-exact from
  `reference/pokeemerald/src/pokemon.c` (`CalculateBaseDamage`
  :3106-3371) and `battle_script_commands.c` (`Cmd_critcalc` :1253,
  `Cmd_typecalc` :1355, `Cmd_accuracycheck` :1099,
  `ApplyRandomDmgMultiplier` :1639). Contains inline: `TYPE_IDS`, the
  type-effectiveness chart, `STAT_STAGE_RATIOS`, `applyStatStageMod`,
  `calculateBaseDamage`, crit stage/roll, STAB, Endeavor,
  `applyRandomDamageMultiplier`, `ACCURACY_STAGE_RATIOS`,
  `calculateAccuracy`. The header cites exact source-order/truncation
  constraints — truncation order is load-bearing; port in source order.
- `src/engine/turnOrder.ts` — 135 lines; sole engine import is
  `STAT_STAGE_RATIOS` from damageCalc.
- `src/engine/turnRng.ts` — 64 lines; sole import is `GbaRng` from
  `rng.ts`, whose Rust equivalent already exists
  (`core-rs/crates/factory-core/src/rng.rs`, M1).

**Already ported in M3c — do NOT re-port:** `src/engine/stats.ts` →
`core-rs/crates/factory-core/src/stats.rs`; `src/engine/monGender.ts` →
`core-rs/crates/factory-core/src/gender.rs`.

## Conflict check (fresh as of 2026-08-11)

- `rg "damageCalc|turnOrder|turnRng" ISSUES.md` → zero hits; no open or
  parked issue touches the family.
- Main lane is on the round-controller intro/presentation seam
  (PROGRESS 1142–1144); animation lane is on reducer coverage
  (Metal Sound, LEER). Neither reaches these modules.
- The #55 exclusion zone (construction clock, opponent
  selection/orchestrator) is upstream of battle-turn math; this family is
  outside it. Re-run the ISSUES.md/PROGRESS.md check at orient per the
  standing M4 rule.

## Test surface (parity anchors)

- `tests/damageCalc.test.ts` — 783 lines, the direct Tier-1 pin:
  RAM-pinned regression cases, EFFECT_EXPLOSION defense halving,
  WEATHER_HAS_EFFECT2 block, burn, the ability stat/power modifier block
  (pokemon.c:3158,3203-3226), the hold-item block (:3171-3201), crit
  determination.
- `tests/turnOrder.test.ts` — 132 lines.
- ~18 further consumers exercise it indirectly (`gate6*Interactions`
  suites, `factoryAi*LiveReceipt` suites) — regression insurance, not
  parity targets.

## Coverage-scoping rule for the parity matrix

Do NOT scope the matrix from damageCalc.ts's header comment — it predates
later coverage work. Draw rows from:

- `docs/battle-turn-notes.md` §10 — the ported-structurally-vs-exercised
  inventory;
- `docs/gate6-coverage-manifest.md` + `docs/ability-item-parity-census.md`
  — ability/hold-effect universes and per-family counts. Quote counts from
  these docs at brief time (standing rule: never from memory).

Sweep suggestions: full 18×18 type-pair grid (chart parity falls out),
full stat-stage grid (0..12 both sides), the complete ability and
hold-item modifier blocks over their census universes, weather/status
branches, plus seeded random sweeps over the whole input struct. Compare
errors/throws symmetrically (M3b precedent).

## Boundary notes

- Inputs are numeric-friendly; TS-side type names (strings) should map to
  numeric ids via the same `TYPE_IDS` table in the adapter — numbers
  cross the ABI, strings stay TS-side.
- New `fw_` exports are additive; `fw_abi_version` bumps only on a
  breaking change to an existing layout.

## Suggested step split (M2/M3 pattern; supervisor decides)

Naming caution: "m4a" in `docs/issue55-m4a-*` and related #55 artifacts
is the GBA m4a audio engine (MPlayMain/ClearChain cost model), not this
lane's M4a step. Case-insensitive greps for the step label will hit
those files; they are #55 territory and out of scope for this lane.

1. **M4a** — native port of damageCalc's pure functions + native tests
   pinned to TS-generated vectors (no TS files touched; verifies in
   minutes without the npm suite).
2. **M4b** — `fw_` boundary + adapter decoder + differential parity suite
   run in both engine modes.
3. **M4c** — turnOrder + turnRng, same two-step.

## Launch preconditions (verified 2026-08-11)

- OFF oracle :8014 listening (ON :8012 also up); rust workers only need
  it as a launch precondition.
- No orphan rust worker worktrees or branches; `RUST_DEFERRED.md` has no
  open entries; rust-main is fully folded into master.
- Launcher fold-gate hardening landed (`aabaff6f`): main-supervisor folds
  of rust-main now explicitly rebuild the wasm artifact and rerun parity
  in `POKEBENCH_ENGINE=wasm` mode.
