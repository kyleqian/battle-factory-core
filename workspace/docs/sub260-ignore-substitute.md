# sub260: Cmd_datahpupdate clears HITMARKER_IGNORE_SUBSTITUTE (ISSUES #201)

Authorized source-proven gameplay correction (main/ts lane, `docs/factory-finish-scope.md`): intentional, C-cited, shared by both scene modes.
Diagnosis: `docs/aud243c-alignment.md` section 4.

## 1. Audit: every site that sets / clears / reads HITMARKER_IGNORE_SUBSTITUTE (bit 8)

C: `grep IGNORE_SUBSTITUTE reference/pokeemerald/src/*.c data/battle_scripts_1.s include`. Engine: `grep` over `src/` (generated data excluded).

| C site | effect | engine site | status |
|---|---|---|---|
| `battle_script_commands.c:1895` Cmd_datahpupdate else-branch (no active substitute, or bit set) | **clear** | `battleScriptHitChainOpcode.ts` datahpupdate handler | **was missing; fixed (this step)**: `hitMarkerAfterIgnoreSubstituteClear` feeds both the heal and the damage branch |
| `battle_script_commands.c:1865` Cmd_datahpupdate test | read (`!(bit)` gates the substitute-absorb branch) | same handler, `substituteActive` | correct |
| `battle_script_commands.c:1816` Cmd_healthbarupdate | read (substitute -> STRINGID_SUBSTITUTEDAMAGED) | `createHealthbarupdateOpcodeHandler` `substituteActive` | correct (runs before datahpupdate, so it still sees the bit) |
| `battle_script_commands.c:5566` Cmd_hitanimation | read | `battleScriptHitChainOpcode.ts` hitanimation `suppressedBySubstitute` | correct |
| `battle_script_commands.c:7829` Cmd_setsubstitute | **set** | `battleScriptSetsubstituteOpcode.ts:67` | correct; the following `datahpupdate BS_ATTACKER` of BattleScript_EffectSubstitute now clears it as in C |
| `battle_util.c:651` HandleAction_NothingIsFainted | clear (mask) | none | not modeled; the pseudo-action is only chosen for absent battlers (`battle_main.c:4152`, doubles), unreachable in the singles Factory battle |
| `battle_util.c:664` HandleAction_ActionFinished | clear (mask) | `battleActionFinished.ts` `BATTLE_ACTION_FINISHED_HITMARKER_CLEAR_MASK` | correct |
| `battle_scripts_1.s:3223` DamagingWeatherContinuesEnd `bicword` | clear | `battleScriptDamagingWeatherOpcode.ts:303-318` | correct |
| `battle_scripts_1.s` `orword` sites (28 lines: 344 Absorb, 454 DreamEater, 679 RestoreHp, 867 MoveMissedDoDamage, 1247 PainSplit, 1521 DoGhostCurse, 1781 BellyDrum, 2035 PresentHealTarget, 3211 DamagingWeatherLoop, 3267 / 3278 LeechSeed, 3382 DestinyBond, 3389 / 3404 / 3419 Spikes, 3441 PerishSong, 3594 Wish, 3613 Ingrain, 3742 DoTurnDmg, 3809 SelfConfusionDmg, 3942 DoRecoil, 3980 RainDish, 4083 MoveHPDrain, 4185 RoughSkin, 4360 / 4381 ItemHealHP, 4400 BerryConfuseHeal) | **set** | `battleScriptOrwordOpcode.ts` (generic `orword gHitMarker` evaluator; the constant table covers HITMARKER_IGNORE_SUBSTITUTE) | correct: the scripts are the real battle_scripts_1.s, so every one is followed by its own `datahpupdate`, which now clears the bit |

Result: one wrong engine site (datahpupdate), fixed. No other site needed a change.

## 2. Tests

`tests/sub260IgnoreSubstitute.test.ts` (6 tests). Without the fix 4 fail (the heal, damage and substitute-bit-set handler tests, and the staged
Leftovers -> Tackle test); the Substitute-absorb and MOVE_RESULT_NO_EFFECT tests pass on both sides, as they should.

## 3. Fix

`battleScriptHitChainOpcode.ts` Cmd_datahpupdate: after the `substituteActive` branch, `hitMarkerAfterIgnoreSubstituteClear = hitMarker & ~HITMARKER_IGNORE_SUBSTITUTE`
feeds both the negative-damage (heal) and the damage branch, as :1895 does. MOVE_RESULT_NO_EFFECT still skips the whole block. No Random() draw changes.

Re-pinned (one): `tests/battleScriptSetsubstituteOpcode.test.ts` "success spends PP ...". It asserted `hitMarker & IGNORE_SUBSTITUTE` stayed 256 after
BattleScript_EffectSubstitute. In C the script's own `datahpupdate BS_ATTACKER` runs the :1895 clear, so the bit is 0 afterwards. Re-pinned to 0 with the reason in a comment;
no assertion weakened (the same field is still asserted, to the source value).

## 4. ROM proof: seed 177 Scene ON (turn 2 now matches)

Evidence (ignored): `.integration/validation/sv-20261108/sub260/rom177/`. Same staging as aud243c section 3 (`setup.json` from `soundEventProbe.py lab --setup-out`, replay
with `soundCensusRomReplay.ts`, ROM timeline from `romStateTimeline.py`, `compare`). The unshifted aud243c request drifts on input timing (the ROM picked Toxic where the engine
picked Attract, A presses landing before the menu opened), so the lab request carries a +30 frame delay on the idle segment. That is a request-only change; no driver change.

| turn | ROM | engine before fix | engine after fix |
|---|---|---|---|
| T1 | 6 / 165, RNG 1970019264, [164 Substitute, 57 Surf] | same | same |
| T2 Shadow Ball (crit) | Substitute absorbs it; player HP 6 -> 11 after Leftovers; opp 165; RNG 2525390639; last moves [213 Attract, 247 Shadow Ball] | player KO (HP 0), RNG 185369341 | **11 / 165, RNG 2525390639, last moves [213, 247]** |

`compare` (`cmp-shift.json`): 3 engine timeline states match in order among the 50 ROM states: T1 (engine frame 9 -> ROM 772, 6 / 165, RNG 1970019264), T2 end (778 -> 2615,
11 / 165, RNG 2525390639, last moves [213, 247]) and the turn-3 KO (1573 -> 4191, 0 / 165, RNG 2144907480). HP, RNG and last moves are equal in every matched row.
The first unmatched engine row (frame 2093) is after the ROM input trace is exhausted. The engine-side Substitute absorb itself is asserted by
`tests/sub260IgnoreSubstitute.test.ts` (STRINGID_SUBSTITUTEDAMAGED, HP unchanged), not read from the ROM timeline.

## 5. Census delta, seeds 0..999, both scenes

Arms: baseline = the aud243a full arms (commit 28394735e, `.integration/validation/sv-20261108/aud243a/full/`); fixed = `.../sub260/census/{on,off}-9b4332163`
(lsd194Census, LSD194_SPLIT=4, 25-seed parts). Classifier: `tools/integration/sub260Classify.py`, instrumented tree: `sub260Instrument.py` (the UNFIXED code
plus a log of every healthbarupdate that sees the IGNORE_SUBSTITUTE bit set on a Substitute holder while the running script is not the one that did the `orword`).

* Instrumented unfixed tree reproduces the baseline digests 1000/1000 in both scenes, so the instrumentation is observation only.
* Changed seeds (digest differs from baseline), **ON == OFF, 13 each**: **26, 164, 177, 186, 221, 391, 418, 506, 564, 587, 649, 881, 961**.
* Leak-event seeds (stale bit hit a Substitute holder) = the same 13 seeds. Only-changed [], only-leak []. **Unexplained: 0.**
* Origin script of the stale bit: BattleScript_ItemHealHP_Ret 12 (Leftovers), BattleScript_LeechSeedTurnPrintAndUpdateHp 1 (seed 649).
  Consuming script: BattleScript_HitFromAtkAnimation 11, BattleScript_DoHitAllWithUndergroundBonus 1 (seed 221, Earthquake), BattleScript_EffectAbsorb 1 (seed 506, Giga Drain).
* Every one is a hit on a Substitute holder in the turn after an end-of-turn HP-change script. The first divergent command in the fixed arm is the Substitute absorb
  (ON: hit-animation, OFF: move-animation event ordering) in the same attacker/target slot as the leak.

| seed | consumer (first leak) | origin | target sub HP |
|---|---|---|---|
| 26 | HitFromAtkAnimation, move 53 | ItemHealHP_Ret | 20 |
| 164 | HitFromAtkAnimation, move 32 | ItemHealHP_Ret | 36 |
| 177 | HitFromAtkAnimation, move 57 | ItemHealHP_Ret | 22 |
| 186 | HitFromAtkAnimation, move 231 | ItemHealHP_Ret | 39 |
| 221 | DoHitAllWithUndergroundBonus, move 89 | ItemHealHP_Ret | 40 |
| 391 | HitFromAtkAnimation, move 58 | ItemHealHP_Ret | 22 |
| 418 | HitFromAtkAnimation, move 211 | ItemHealHP_Ret | 39 |
| 506 | EffectAbsorb, move 202 | ItemHealHP_Ret | 79 |
| 564 | HitFromAtkAnimation, move 348 | ItemHealHP_Ret | 80 |
| 587 | HitFromAtkAnimation, move 188 | ItemHealHP_Ret | 36 |
| 649 | HitFromAtkAnimation, move 56 | LeechSeedTurnPrintAndUpdateHp | 40 |
| 881 | HitFromAtkAnimation, move 76 | ItemHealHP_Ret | 20 |
| 961 | HitFromAtkAnimation, move 56 | ItemHealHP_Ret | 39 |

## 6. Gates

ENGINE_BUILD `eb-52789eb6d9c84998` -> `eb-12d5aa7535f49c46` (before = tree at a73be6deb built with the same headless config; after = this tree). Tell the website.
ENGINE_BUILD above is the headless-config hash of both trees. typecheck / build / build:lib 0; `npm run test:gate` 0 (362 files, 2835 tests); soak vanilla 0:20 20/20 OK;
full suite in 6 foreground shards (`POKEBENCH_VITEST_MAX_WORKERS=5 npm test -- --shard=i/6`): shards 1, 2, 4, 5, 6 green, shard 3 has ONE failure (below).

## 7. Open: tests/substituteSwapAttdollCells.test.ts (shard 3), not re-pinned

"SHUCKLE 243/35 [Substitute, Attract, Toxic, Double Team]" fails at line 144 (`view.field.player.substituteDoll` undefined at Toxic). Cause (boundary dump, `generatedCommandAnimationReplay(243,"on",[0,2],35,...)`):
requests are identical before and after the fix (86:1->0 164:0->0 85:1->0 92:0->1). Before: Leftovers leaked hitMarker 256 into turn 2, so the opponent's Thunderbolt bypassed the Substitute
(player 73 -> 51, sub stays 22) and the doll was still up at Toxic. After: Thunderbolt hits the Substitute and breaks it (sub 22 -> 0, player HP 73 -> 78 from Leftovers), so there is no doll at Toxic.
That is the source-correct outcome, so the staged premise (a live Substitute during Toxic) no longer holds on this seed. It needs a route where the Substitute survives turn 2
(different seed / streak with the same 316-row / tail assertions); a scan of seeds 0..85 and 244..~400 (streak 35, inputs [0,2]) found none. Left failing, unweakened.
