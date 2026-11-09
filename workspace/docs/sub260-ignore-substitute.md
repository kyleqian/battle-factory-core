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
