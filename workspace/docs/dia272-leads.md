# dia272: proven scratch fixes for the seed 53 / 42 / 50 / 60 ROM-driver divergences (diagnosis; no `src/` or `tests/` change)

Evidence (ignored): `.integration/evidence/dia272/{base,fix53,fix42,fix50,fix53b,fix60,draws}/` (`base` = unpatched drives, `fixNN` = drive/engine/timeline/cmp of the patched scratch run + `patch*.diff`).
Recipe: `tools/audio/romDriveSeed.sh SEED on|off DIR` on a scratch copy of the tree (`cp -r` into `/tmp`, symlink `node_modules`, `reference`, `oracle`; `export POKEBENCH_MGBA_PYTHON=/srv/pokebench/vendor/mgba-venv/bin/python3`). Tuple = `[frame, gCurrentMove, hp0, hp1, rng, lastMove0, lastMove1]`. Draw counts use the pokeemerald LCG (`rng' = rng*1103515245 + 24691 mod 2^32`). Per-Random ROM logs: `tools/run-mgba-probe.py OUT -- python3 tools/audio/soundEventProbe.py OUT lab FROZEN.json --profile off --extra-hooks Random,... --from N --frames M` (the `via` field is a nearest-symbol label only and is often wrong).
"Scratch-fixed" = patched copy in `/tmp/dia272-scratch`; the worktree `src/` is untouched (`git diff --stat src` empty). Precedent: `docs/dia269-leads.md`.

## Summary table

matched/total = engine states found in order in the ROM timeline / engine states (excluding the initial state). off/on = Battle Scene.

| seed | #  | baseline | scratch-fixed | cause | confidence |
|---|---|---|---|---|---|
| 53 | #209 | 4/9 off, 4/9 on | **8/8 off, 8/8 on** | stale `MOVE_EFFECT_BYTE` (`gBattleCommunication[3]`) never cleared between actions | high (proven) |
| 42 | #210 | 9/16 off, 9/16 on | **17/17 off, 17/17 on** | NOT the speed-tie draw itself: stale `chosenMovePositions` for a battler that faints before acting, so the replacement inherits the old slot and the tie draw is skipped | high (proven) |
| 50 | -  | 18/25 off | **31/31 off** (won, ROM outcome 1) | same root cause as 53 (stale effect byte), via the general action-finished clear | high (proven, off only) |
| 60 | -  | 36/82 off | **73/82 off** (new first divergence, below) | AI: engine runs the AI move chooser on a forced-Struggle turn; the ROM never calls it (0 AI draws) | high for the 36->73 step; remainder unclassified |

dia269's lead for 42 (speed-tie draw count) was right in area (the missing draw is the `GetWhoStrikesFirst` tie `Random()&1`) but wrong in mechanism; its lead for 53 (end-turn path reads the byte) was right in effect, and the fix belongs in `battleActionFinished.ts`, not in `battleEndTurnOrchestration.ts`.
Scene ON for 50 and 60 was not driven (time cap). Seeds 53 and 42 were each driven on both scenes. No test suite, census or soak was run (shared host).

## 53 (#209) and 50: stale `MOVE_EFFECT_BYTE` across actions (high, proven)

- C: `HandleAction_ActionFinished` (`battle_util.c:658-683`) zeroes `gBattleCommunication[3]` (MOVE_EFFECT_BYTE) and `[4]`, and `gBattleStruct->multihitMoveEffect`, after every action; `BattleTurnPassed` also clears `[0..4]`; `MoveValuesCleanUp` (`battle_script_commands.c:3621-3630`) clears it per move. `Cmd_seteffectwithchance` (`:2908-2939`) always draws `Random() % 100 < percentChance`, then runs `SetMoveEffect` only if the byte is non-zero; `Cmd_confuseifrepeatingattackends` (`:7131`) overwrites it only when LOCK_CONFUSE is clear. So a byte left over from an earlier move (e.g. a trap/rampage/secondary effect that was not consumed) is invisible in C but fires in the engine.
- Engine: `src/engine/battleActionFinished.ts:156` (the returned `rulesContext` resets `moveendState`, `multiHitEffect`, ... but not `moveEffectByte`; its doc comment lines 13-14 say `gBattleCommunication[3]/[4]` are not represented, which is no longer true for `[3]`). The byte lives on `rulesContext.moveEffectByte` and is read by the hit-chain / `seteffectwithchance` path (`src/engine/battleScriptHitChainOpcode.ts`).
- Observed (53): baseline engine ends turn 4 with a stale effect applied (recoil/status on the next action); the ROM KOs and the opponent hp / recoil differ. Seed 50: first divergence engine row `[9172,0,169,144,2538489707,80,0]`; ROM opp hp stays 25 then drops to 3 then 0; the cause is the same leaked effect byte.
- Scratch patch (general, C-faithful; proves 53 8/8 off and on, 50 31/31 off) `evidence/dia272/fix50/patch-actionfinished.diff`:

```diff
--- a/src/engine/battleActionFinished.ts
+++ b/src/engine/battleActionFinished.ts
@@ -154,6 +154,7 @@
       dynamicBasePower: 0,
       battleMovePowerWritten: false,
       moveendState: 0,
+      moveEffectByte: 0,
       multiHitEffect: 0,
     }),
   });
```

- Narrower alternative that also gave 53 8/8 (superseded; clears only at end of turn, `evidence/dia272/fix53/patch.diff`): in `src/engine/battleEndTurnOrchestration.ts:2437` (`finishTurnValuesCleanUp`) pass `clearProtectStructsForNextTurn({ ...rulesContext, moveEffectByte: 0 })`. Prefer the action-finished clear: C clears after every action, and a mid-turn leak (second mover) is exactly what seed 50 hits.
- Fix shape: add the line above and update the doc comment at `battleActionFinished.ts:13-14` (`[3]` is now represented, `[4]` still is not).
- Test idea: (a) unit: run a move that leaves `moveEffectByte` non-zero, call the action-finished step, assert `rulesContext.moveEffectByte === 0`; (b) reducer: two-action turn where the first action ends with a non-zero byte and the second is a plain damaging move with 0% effect chance: no secondary effect on the second. Re-drive seeds 53 (on/off) and 50 (off) expecting 8/8, 8/8, 31/31.
- Confidence: high. Combined with the 42 patch: seed 42 stays 17/17 (checked).

## 42 (#210): stale `chosenMovePositions` for a battler that faints before acting (high, proven)

- C: `chosenMovePositions[battler]` is written only at move selection (`battle_main.c:4398`, `*(gBattleStruct->chosenMovePositions + gActiveBattler) = gBattleBufferB[..][2]`). `GetWhoStrikesFirst` (`battle_main.c` ~4605-4660) has the `ignoreChosenMoves` branch (both movers use `gChosenMoveByBattler`) and the speed-tie `Random() & 1`. When a mon faints before acting and its replacement enters mid-turn, the replacement's action is the forced switch-in, not the old slot; in the round where the survivors both choose, the new mon's position is the one just chosen.
- Engine: reducer `src/engine/factoryBattleScriptFullTurnDecision.ts:3243` (phase awaiting-trainer-command): `clearOverwrittenEncoreAtAction` is applied but `rulesContext.chosenMovePositions` is not updated from the two pending decisions, so a replacement mon inherits the previous slot (Roar, priority -6, here) and the order resolver sees different priorities: the tie draw that the ROM takes is skipped (one fewer `Random()`), shifting the RNG for the rest of the battle.
- Observed: baseline 9/16 (rng differs from the first KO-before-acting turn); after the patch the engine decision count rises 16 -> 17 (the ROM asks one more decision than the engine previously made) and it matches 17/17 off and on.
- Scratch patch (`evidence/dia272/fix42/patch.diff`):

```diff
--- a/src/engine/factoryBattleScriptFullTurnDecision.ts
+++ b/src/engine/factoryBattleScriptFullTurnDecision.ts
@@ -3243,11 +3243,22 @@
-  const rc0 = clearOverwrittenEncoreAtAction(
+  const rc0Encore = clearOverwrittenEncoreAtAction(
     clearOverwrittenEncoreAtAction(rules.rulesContext, 0),
     1,
   );
   const playerSwitch = rules.pendingPlayerDecision.kind === "switch";
   const trainerSwitch = ctx.decision.kind === "switch";
+  const rc0 = createBattleScriptRulesContext({
+    ...rc0Encore,
+    chosenMovePositions: Object.freeze([
+      playerSwitch ? rc0Encore.chosenMovePositions[0] : rules.pendingPlayerDecision.moveSlot,
+      trainerSwitch ? rc0Encore.chosenMovePositions[1] : ctx.decision.moveSlot,
+      rc0Encore.chosenMovePositions[2],
+      rc0Encore.chosenMovePositions[3],
+    ]) as unknown as BattleScriptRulesContext["chosenMovePositions"],
+  });
```

- Related, untested follow-up: for voluntary-switch actions the engine never sets `chosenActionByBattler` to `B_ACTION_SWITCH` (always `[0,0,0,0]`); C sets it at `battle_main.c:4170-4180`. It did not matter for these seeds.
- Fix shape: write `chosenMovePositions` for both battlers when the round's two decisions are accepted (that is C's selection-time write), keep it untouched for switch decisions.
- Test idea: a turn where the player's mon faints before acting, the replacement enters, then a normal move round: assert `chosenMovePositions` equals the submitted slots and that the speed-tie draw count equals the ROM (1). Re-drive seed 42 on/off expecting 17/17.
- Confidence: high (two scenes, 9/16 -> 17/17, no regression with the 53/50 patch).

## 60: AI move chooser runs on a forced-Struggle turn; the ROM does not (high for this step)

- Classification: **AI** (draw count), then an unclassified remainder.
- C: `OpponentHandleChooseMove` (`battle_controller_opponent.c:1551-1567`) is the only place that calls `BattleAI_SetupAIData` + `BattleAI_ChooseMoveOrAction` for the opponent. The engine's equivalent request is only emitted by `HandleTurnActionSelectionState` when `AreAllMovesUnusable()` is false; when it is true (`battle_main.c:4184-4191`) a selection script forces Struggle and no `ChooseMove` is ever sent. `AI_TrySwitchOrUseItem` still runs earlier (`OpponentHandleChooseAction`). Result: zero AI draws (no setup draws, no tie draw) on a turn where every move is unusable (here pp `[0,0,0,0]`). The ROM per-Random log for the Struggle turn (frame ~16812) shows no `BattleAI_SetupAIData` / `BattleAI_ChooseMoveOrAction` rows, while every normal turn shows them.
- Engine: `src/engine/factoryAiLiveDriver.ts:658` (`submitLiveFactoryAiDecision`): after the switch precheck it always calls `chooseFactoryAiScoredDecision` / `chooseFactoryAiMaskZeroDecision`. For an all-unusable battler `legalMoveDecisions` (`src/engine/factoryBattleScriptFullTurnDecision.ts:2284`) returns the single Struggle decision with the stale `chosenMovePositions[battler]` slot (slot 3, Sleep Powder pp 0), so the engine ran CHECK_BAD_MOVE on that stale slot and drew 2 extra RNG values plus the tie draw, shifting the accuracy roll (engine 50 vs ROM 18) so Struggle missed instead of hitting (ROM hp 321 -> 289, 177 -> 169).
- Observed: baseline 36/82, first divergence after matched row 36: engine `[15912,0,321,177,1229236452,92,165]` (miss) vs ROM landing `[16982,165,289,...]`. A first attempt (pp==0 gating of slot scripts only, `legal` flag in the policy) removed 1 draw but not the tie draw and stayed at 36/82; only skipping the whole chooser matched the ROM draw count.
- Scratch patch (`evidence/dia272/fix60/patch.diff`; 36/82 -> 73/82 off):

```diff
--- a/src/engine/factoryAiLiveDriver.ts
+++ b/src/engine/factoryAiLiveDriver.ts
@@ -17,6 +17,7 @@
+import { checkBattleScriptMoveLimitations } from "./battleScriptActionAdmission.ts";
 import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";
@@ -656,7 +657,21 @@
   const mask = selectFactoryAiMask(view.factory).mask;
-  const policyResult: FactoryAiMoveChoice = mask === 0
+  const aiUnusableMask = checkBattleScriptMoveLimitations(state.rules.rulesContext, 1);
+  const allUnusable = state.rules.rulesContext.battlers[1]!.moves.every(
+    (_m, slot) => (aiUnusableMask & (1 << slot)) !== 0,
+  );
+  const policyResult: FactoryAiMoveChoice = allUnusable
+    ? (Object.freeze({
+      submission: Object.freeze({
+        requestId: policyRequest.requestId,
+        side: policyRequest.side,
+        decision: moveDecisions[0]!,
+      }),
+      rng: switchPolicy.rng,
+      trace: Object.freeze({ draws: Object.freeze([]), executedScoringScripts: Object.freeze([]) }),
+    }) as unknown as FactoryAiMoveChoice)
+    : mask === 0
     ? chooseFactoryAiMaskZeroDecision({
@@ -682,7 +697,7 @@
-  const ruleR = mask === 0
+  const ruleR = mask === 0 || allUnusable
     ? null
```

- The cast `as unknown as FactoryAiMoveChoice` is scratch-only; a real fix should return a proper "forced Struggle" `FactoryAiMoveChoice` (empty trace, no draws) from the policy module so the view/trace schemas stay valid. Also decide whether `ruleR` (W2 `gBattleMovePower` presentation register) should stay null here: C runs no AI_CalcDmg on that turn, so null matches.
- **Remaining divergence after the patch (73/82, unclassified):** engine `[31208,0,139,12,2041309668,0,165]` vs ROM `[32692,165,0,12,...]`. The drive stops with "party menu without a switch decision": the ROM's replacement mon (hp 139) is knocked out by a Struggle hit (hp -> 0) that the engine row does not have, so the ROM asks a forced-switch decision the engine never made. First guess: Struggle damage/crit/accuracy for that turn (damage or RNG), not AI. Not investigated further (time).
- Test idea: AI live driver with all four AI moves at pp 0: assert the decision is the Struggle slot, `draws.length === 0`, and `state.rng` unchanged by the move chooser (only the switch precheck may draw). Re-drive seed 60 off expecting >= 73/82.
- Confidence: high for 36 -> 73 (ROM log shows zero AI draws; engine numbers re-derived with the LCG: engine after 9 draws vs ROM 8). Medium that this is the complete AI-side fix (what about Taunt/Disable/Torment/choice-lock all-unusable cases: `AreAllMovesUnusable` covers them, and the patch uses the same mask, but only the pp==0 path was driven).

## Notes

- 50 and 53 share one root cause; the general action-finished clear fixes both. 42 and 60 are independent.
- The 60 run (73/82) had the action-finished clear and the 42 patch also applied in the scratch tree (off scene only); 60 was 36/82 with those two alone, so the 36 -> 73 step is attributable to the 60 patch.
- Suggested briefing order: (1) action-finished `moveEffectByte` (1 line, fixes 53 and 50), (2) `chosenMovePositions` write at decision acceptance (42), (3) skip the AI chooser when all moves are unusable (60, plus its follow-on divergence).

## Papercuts (this step)

- Scratch-tree `romDriveSeed.sh` needs `POKEBENCH_MGBA_PYTHON` exported and an `oracle` symlink; neither is documented in `docs/aud243d-rom-driver.md` (~6 min lost).
- Engine replay `turnEvents`/timeline do not cover the mid-turn forced-switch turn, so aligning engine rows with ROM rows needs hand-counting (~5 min lost).
- `soundEventProbe.py --extra-hooks` rows carry a nearest-symbol `via` label that is misleading (`IsMonDisobedient`, `AI_TypeCalc`, `GetMoveTarget` for plain `Random()` calls) and ~800 `Random2`/`RfuMain1` noise rows per window; a `--only Random --no-noise` filter would save time (~5 min lost).
