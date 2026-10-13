# act156 — action-time engine fixes: ISSUES #169 (dragged in before acting) + #170 (Encored mid-turn)

Main-lane engine step under `docs/factory-finish-scope.md`, in the #140 family (`HandleAction_UseMove` / turn-order
actions). Ground truth: `docs/rcp154-action-time-receipts.md`. Before any code change all four verifiers failed exactly as
that doc says: C1 at turn 1 index 2, C1f by dispatch count only, C2 and C2u at turn 2 index 2.

## Fixes

| fix | site | change | receipts | commit |
|---|---|---|---|---|
| F1 #169 | `battleScriptSwitchinOpcode.ts` (`Cmd_switchineffects` no-ability/no-item arm) | writes `actionsByTurnOrder[slot] = 12` (B_ACTION_CANCEL_PARTNER == B_ACTION_FINISHED, `include/battle.h:39-40`) for the switched-in battler's turn-order slot (`battle_script_commands.c:5270-5274`) | C1, C1f PASS | `021cbae40` |
| | `factoryBattleScriptFullTurnDecision.ts` | action 2 is skipped on 12 as well as on Pursuit's TRY_FINISH. New `withTurnStartActions` models `SetActionsAndBattlersTurnOrder` (`battle_main.c:4816-4850`): it rewrites slots 0-1 from the chosen actions every turn. The port never reset this array, so without the reset an end-of-turn replacement's 12 (or a Pursuit TRY_FINISH) would cancel the next turn's action 2 | | |
| F2 #170 | `factoryBattleScriptFullTurnDecision.ts` `runMoveAction` + new `actionEncoreArm` | both Encore arms (`battle_util.c:111-117` match, `:119-128` overwritten) are evaluated on the action-time battler. They come after the noValidMoves arm (`forcedStruggle`) and the MULTIPLETURNS/RECHARGE lock, and before `:130-134`. The executed move, `currentMovePosition` (ppreduce / no-PP canceler) and the `GetMoveTarget` retarget come from `encoredMovePos`. `chosenMovePositions[attacker]` keeps the selected slot, as in source, where only the globals `gCurrMovePos` / `gChosenMovePos` are written (Grudge reads `chosenMovePositions`). For a turn-start Encore this is the same move, slot and retarget as before | C2, C2u PASS | `5ccc4f035` |

The switch-in ability path is unchanged. Intimidate and Trace mark `status3` and fall into the cancel arm, as in source,
where `AbilityBattleEffects` returns 0. Drizzle, Sand Stream, Drought, Forecast and Spikes return to `switchineffects`
(`call-current`), and the cancel lands on the final pass. A dragged-in Intimidate holder still intimidates after action 1
(`HandleAction_TryFinish` → `HandleFaintedMonActions` case 6, `battle_util.c:1959`) and then takes no action. This is pinned
synthetically, with no ROM receipt.

**Tier-1:** `tests/act156ActionTimeFixes.test.ts` (6 tests) replays C1 / C1f / C2 / C2u through the live kernel via
`verifyReceipt`, including per-turn USEDMOVE == ROM dispatch counts. It adds the synthetic Intimidate drag plus a next-turn
no-leak check, and a C2 turn-2 draw-order pin. Every test fails without its fix. `tests/rcp154Receipts.test.ts` flips the
four `verdictToday` pins to PASS. The receipts were refolded with `--write`; their ROM sides are untouched.

**Other verifiers:** rcp143 R2 / R3 / R3-control PASS. R1 (#141a THRASH, sibling lane) and R4 (#139 Focus Punch) FAIL with
output byte-identical to base. `issue140GetMoveTargetReceipt` (forced Struggle / Encore match / overwritten Encore) and
`rng146RngDrawFixes` pass.

## Ripple

**Census 0..999** (`liveShareCensus.ts`, 10 `--index-from` shards). The baseline is `thr153/census-master`, which has the
same `workspace/src` tree as this branch's base `c4a28fff1` (`7dc3a7fc`); its numbers equal rng146's landed census.

| tree | commands | live | by count | frames (live) | by frames | battle frames | player turns | changed battles |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| base | 27,271 | 27,090 | 99.34 % | 4,158,655 (4,142,021) | 99.60 % | 15,964,011 | 20,381 | — |
| F1 `021cbae40` | 27,271 | 27,090 | 99.34 % | 4,158,655 (4,142,021) | 99.60 % | 15,963,861 | 20,381 | 1: battle 811 (F1) |
| F1+F2 `5ccc4f035` | 27,336 | 27,145 | 99.30 % | 4,167,745 (4,150,338) | 99.58 % | 15,986,885 | 20,422 | +11 vs F1, all F2 |

- **F1.** The command keys and `battleDigestExcludingFrames` are identical to base. Only battle **811** moved: 22,984 →
  22,834 frames (−150). This is exactly the C1f shape. Player BEAUTIFLY's faster WHIRLWIND drags in GLOOM before RHYHORN's
  banked ROAR, and GLOOM's MOONLIGHT at full HP ("used MOONLIGHT!" / "HP is full") is no longer announced. That MOONLIGHT
  drew nothing and played no animation, so only text frames (and one PP) change.
- **F2.** A scratch env-gated stderr trace (`.integration/validation/act156/trace.patch`, never committed) logged every action
  where `actionEncoreArm` fired with no turn-start Encore, i.e. an Encore set earlier in the same turn by the faster foe.
  - **Population:** 18 such actions in 12 battles: 59, 143 ×2, 161 ×2, 228, 277 ×2, 468, 526 ×2, 553, 567, 771, 803 ×2,
    941 ×2. Two were same-move Encores (277, 553), where only the retarget draw is new.
  - **Changed battles vs F1:** 11 (59, 143, 161, 228, 277, 468, 526, 567, 771, 803, 941). Every one carries an F2 event.
    553's single same-move event did not change its battle.
  - **0 unattributed.**
- **Both trees:** stalls are the same three (seeds 434 / 796 / 881), 0 errors, 0 render throws.

**Tests:** the full suite (2 shards) passes, 7,233 + 6,575 passed, 0 failed. No test, pin or trajectory moved besides the
four rcp154 `verdictToday` pins.

**Soak vanilla 0:20 `--parallel 5`:** 20 / 20 OK. Every seed is `b2 t16`, budget, carry ≤ 7, depth ≤ 10. That is identical
to rng146's landed-tree soak, whose census equals this base command for command. 0 seeds moved.

## Not done / notes

- **core-rs is not edited.** A name search found no Rust port of `Cmd_switchineffects`, `gActionsByTurnOrder` or the
  `HandleAction_UseMove` prologue. Only the `trysetencore` opcode exists there (`battle_script_trysetencore.rs`), and it is
  unaffected. Any future Rust full-turn port must carry the cancel write, the per-turn rewrite and the action-time Encore arms.
- **Residual, pre-existing, not changed:** `clearOverwrittenEncoreAtAction` is still hoisted to turn start for both
  battlers. Source clears an overwritten Encore only at the battler's own action (`:119-128`). So with an overwritten Encore,
  a faster foe's `Cmd_trysetencore` sees the slower battler as un-Encored. In source it would fail on `encoredMove != 0`.
  The selection-time `AreAllMovesUnusable` also runs on the cleared state. Reaching this needs an Encored battler whose
  own moves were rewritten (Mimic / Transform / Sketch), and there is no receipt.
- **Mid-turn Encore into a locking move** (Thrash family / Uproar / Rollout): next turn the lock runs from the selected
  `chosenMovePositions` slot, as in source. `factoryRoundBattleOrchestrator`'s retained-lock identity check compares that slot
  with the action's `currentMovePosition`, so this rare shape may need a look. Census 0..999 does not hit it.
- **Scratch:** `.integration/validation/act156/` holds both censuses, the trace patch, suite shard logs, the soak log and
  the build log.
