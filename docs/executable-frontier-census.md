# Executable-frontier census

Generated 2026-07-27. Rerun: `npx tsx tools/report/executable-frontier-census.ts`

Answers ROADMAP S10's Executable-frontier reset question directly: not "how many opcodes are registered" but **how many of the 355 moves can the kernel execute end-to-end today, and what exactly blocks each of the rest.** Every `BattleScript_Effect*` entry in the committed topology (`src/data/gen/battle-script-topology.json` + `battle-script-graph.json`) is walked for full opcode reachability (branches, goto/call targets, the shared hit-chain tail) against the opcode set the engine currently registers (read live from `src/engine/battleScriptRulesContext.ts`'s `createBattleScriptStatusRulesHandlers`, so this doc cannot drift from what the engine actually installs).

**Key finding:** the single highest-leverage next registration is `B_SCR_OP_JUMPIFNEXTTARGETVALID`, `B_SCR_OP_SELECTFIRSTVALIDTARGET` -- registering exactly that set would flip **1 effect / 1 move (1 Factory-L50, 147 weighted)** from blocked to executable in one step (EFFECT_EARTHQUAKE) -- the largest single entry in the ranked table below. This paragraph is generated fresh from the current registered-opcode set every run, so it always names today's actual top blocker, not a past one -- see PROGRESS.md for the registration history (e.g. the 2026-07-25 B_SCR_OP_JUMPIFHALFWORD/JUMPIFSTATUS3CONDITION/ORWORD entry-chokepoint trio).

## Headline counts

| Metric | Executable | Total | % |
| --- | --- | --- | --- |
| Effect scripts | 93 | 214 | 43.5% |
| Moves (unweighted, all 355) | 188 | 355 | 53.0% |
| Level-50 Factory moves (unweighted, distinct moves in the 850-set) | 151 | 276 | 54.7% |
| Level-50 Factory moves (weighted by rental-mon count across the 850-set) | 1894 | 2957 | 64.1% |

"Executable" means every opcode on every statically reachable path from the effect's entry script has a dispatch entry today (registered barriers included, per ROADMAP S10 §1's (a)/(b) policy). It is not a semantic-correctness claim -- see Caveats.

## Ranked next registration by unlocked-move count

Each row is an exact set of missing opcodes -- registering only *some* of a multi-opcode set would not unlock these effects, so opcodes are grouped by the combination an effect actually needs, not credited individually. Effects already blocked only on a subsystem note (no missing opcode) are not rankable here; see the per-effect table.

| Missing opcode(s) | Effects unlocked | Moves unlocked (unweighted) | Factory-L50 moves (unweighted) | Factory-L50 weighted |
| --- | --- | --- | --- | --- |
| `B_SCR_OP_JUMPIFNEXTTARGETVALID`, `B_SCR_OP_SELECTFIRSTVALIDTARGET` | 1 (EFFECT_EARTHQUAKE) | 1 | 1 | 147 |
| `B_SCR_OP_SETPROTECTLIKE` | 2 (EFFECT_PROTECT, EFFECT_ENDURE) | 3 | 3 | 61 |
| `B_SCR_OP_NEGATIVEDAMAGE` | 2 (EFFECT_ABSORB, EFFECT_DREAM_EATER) | 5 | 4 | 49 |
| `B_SCR_OP_TRYSETREST` | 1 (EFFECT_REST) | 1 | 1 | 49 |
| `B_SCR_OP_JUMPIFSTAT`, `B_SCR_OP_PLAYSTATCHANGEANIMATION` | 5 (EFFECT_TICKLE, EFFECT_COSMIC_POWER, EFFECT_BULK_UP, EFFECT_CALM_MIND, EFFECT_DRAGON_DANCE) | 5 | 5 | 45 |
| `B_SCR_OP_TRYINFATUATING` | 1 (EFFECT_ATTRACT) | 1 | 1 | 45 |
| `B_SCR_OP_FORCERANDOMSWITCH`, `B_SCR_OP_INITMULTIHITSTRING`, `B_SCR_OP_JUMPIFHASNOHP` | 1 (EFFECT_ROAR) | 2 | 2 | 40 |
| `B_SCR_OP_CLEARSEMIINVULNERABLEBIT`, `B_SCR_OP_CLEARSTATUSFROMEFFECT`, `B_SCR_OP_SETSEMIINVULNERABLEBIT` | 1 (EFFECT_SEMI_INVULNERABLE) | 4 | 4 | 32 |
| `B_SCR_OP_TRYHEALHALFHEALTH` | 2 (EFFECT_RESTORE_HP, EFFECT_SOFTBOILED) | 4 | 3 | 29 |
| `B_SCR_OP_TRYKO`, `B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN` | 1 (EFFECT_OHKO) | 4 | 4 | 28 |
| `B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED` | 2 (EFFECT_SWAGGER, EFFECT_FLATTER) | 2 | 2 | 25 |
| `B_SCR_OP_JUMPIFNEXTTARGETVALID`, `B_SCR_OP_SETATKHPTOZERO`, `B_SCR_OP_TRYEXPLOSION` | 1 (EFFECT_EXPLOSION) | 2 | 2 | 25 |
| `B_SCR_OP_INITMULTIHITSTRING`, `B_SCR_OP_JUMPIFHASNOHP` | 4 (EFFECT_MULTI_HIT, EFFECT_DOUBLE_HIT, EFFECT_TWINEEDLE, EFFECT_TRIPLE_KICK) | 16 | 10 | 23 |
| `B_SCR_OP_REMAININGHPTOPOWER` | 1 (EFFECT_FLAIL) | 2 | 2 | 20 |
| `B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION` | 2 (EFFECT_RETURN, EFFECT_FRUSTRATION) | 2 | 2 | 18 |
| `B_SCR_OP_CURSETARGET`, `B_SCR_OP_JUMPIFSTAT`, `B_SCR_OP_JUMPIFTYPE2` | 1 (EFFECT_CURSE) | 1 | 1 | 18 |
| `B_SCR_OP_RECOVERBASEDONSUNLIGHT` | 3 (EFFECT_MORNING_SUN, EFFECT_SYNTHESIS, EFFECT_MOONLIGHT) | 3 | 2 | 16 |
| `B_SCR_OP_CLEARSTATUSFROMEFFECT`, `B_SCR_OP_JUMPIFABILITYPRESENT` | 1 (EFFECT_SOLAR_BEAM) | 1 | 1 | 16 |
| `B_SCR_OP_JUMPIFNOTFIRSTTURN` | 1 (EFFECT_FAKE_OUT) | 1 | 1 | 15 |
| `B_SCR_OP_COPYFOESTATS` | 1 (EFFECT_PSYCH_UP) | 1 | 1 | 14 |
| `B_SCR_OP_JUMPIFCANTSWITCH`, `B_SCR_OP_RETURNTOBALL`, `B_SCR_OP_SWITCHOUTABILITIES` | 1 (EFFECT_BATON_PASS) | 1 | 1 | 13 |
| `B_SCR_OP_JUMPIFNODAMAGE` | 1 (EFFECT_FOCUS_PUNCH) | 1 | 1 | 11 |
| `B_SCR_OP_SETDESTINYBOND` | 1 (EFFECT_DESTINY_BOND) | 1 | 1 | 10 |
| `B_SCR_OP_SETSUBSTITUTE` | 1 (EFFECT_SUBSTITUTE) | 1 | 1 | 10 |
| `B_SCR_OP_TRYCHOOSESLEEPTALKMOVE` | 1 (EFFECT_SLEEP_TALK) | 1 | 1 | 8 |

## Per-effect detail

| Effect | Entry script | Classification | Missing opcode(s) | Subsystem notes | Moves | Factory-L50 moves (weighted) |
| --- | --- | --- | --- | --- | --- | --- |
| EFFECT_HIT | `BattleScript_EffectHit` | executable | - | - | 24 | 12 (162) |
| EFFECT_SLEEP | `BattleScript_EffectSleep` | executable | - | - | 6 | 6 (39) |
| EFFECT_POISON_HIT | `BattleScript_EffectPoisonHit` | executable | - | - | 4 | 3 (44) |
| EFFECT_ABSORB | `BattleScript_EffectAbsorb` | blocked-on-opcodes | `B_SCR_OP_NEGATIVEDAMAGE` (main path) | - | 4 | 3 (43) |
| EFFECT_BURN_HIT | `BattleScript_EffectBurnHit` | executable | - | - | 5 | 5 (76) |
| EFFECT_FREEZE_HIT | `BattleScript_EffectFreezeHit` | executable | - | - | 4 | 3 (109) |
| EFFECT_PARALYZE_HIT | `BattleScript_EffectParalyzeHit` | executable | - | - | 8 | 7 (137) |
| EFFECT_EXPLOSION | `BattleScript_EffectExplosion` | blocked-on-opcodes | `B_SCR_OP_TRYEXPLOSION`, `B_SCR_OP_SETATKHPTOZERO`, `B_SCR_OP_JUMPIFNEXTTARGETVALID` (main path) | - | 2 | 2 (25) |
| EFFECT_DREAM_EATER | `BattleScript_EffectDreamEater` | blocked-on-opcodes | `B_SCR_OP_NEGATIVEDAMAGE` (edge branch only) | - | 1 | 1 (6) |
| EFFECT_MIRROR_MOVE | `BattleScript_EffectMirrorMove` | blocked-on-opcodes | `B_SCR_OP_TRYMIRRORMOVE` (main path) | - | 1 | 0 (0) |
| EFFECT_ATTACK_UP | `BattleScript_EffectAttackUp` | executable | - | - | 3 | 1 (1) |
| EFFECT_DEFENSE_UP | `BattleScript_EffectDefenseUp` | executable | - | - | 2 | 1 (1) |
| EFFECT_SPEED_UP | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_SPECIAL_ATTACK_UP | `BattleScript_EffectSpecialAttackUp` | executable | - | - | 1 | 1 (2) |
| EFFECT_SPECIAL_DEFENSE_UP | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_ACCURACY_UP | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_EVASION_UP | `BattleScript_EffectEvasionUp` | executable | - | - | 1 | 1 (62) |
| EFFECT_ALWAYS_HIT | `BattleScript_EffectHit` | executable | - | - | 6 | 6 (108) |
| EFFECT_ATTACK_DOWN | `BattleScript_EffectAttackDown` | executable | - | - | 1 | 0 (0) |
| EFFECT_DEFENSE_DOWN | `BattleScript_EffectDefenseDown` | executable | - | - | 2 | 2 (2) |
| EFFECT_SPEED_DOWN | `BattleScript_EffectSpeedDown` | executable | - | - | 1 | 0 (0) |
| EFFECT_SPECIAL_ATTACK_DOWN | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_SPECIAL_DEFENSE_DOWN | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_ACCURACY_DOWN | `BattleScript_EffectAccuracyDown` | executable | - | - | 4 | 3 (25) |
| EFFECT_EVASION_DOWN | `BattleScript_EffectEvasionDown` | executable | - | - | 1 | 1 (3) |
| EFFECT_HAZE | `BattleScript_EffectHaze` | blocked-on-opcodes | `B_SCR_OP_NORMALISEBUFFS` (main path) | - | 1 | 1 (1) |
| EFFECT_BIDE | `BattleScript_EffectBide` | blocked-on-opcodes | `B_SCR_OP_SETBIDE` (main path) | - | 1 | 0 (0) |
| EFFECT_RAMPAGE | `BattleScript_EffectRampage` | blocked-on-opcodes | `B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS` (edge branch only) | - | 3 | 2 (6) |
| EFFECT_ROAR | `BattleScript_EffectRoar` | blocked-on-opcodes | `B_SCR_OP_FORCERANDOMSWITCH`, `B_SCR_OP_INITMULTIHITSTRING`, `B_SCR_OP_JUMPIFHASNOHP` (edge branch only) | Cmd_jumpifability: ABILITY_SUCTION_CUPS is outside the engine's widened ability set (battleScriptIngrainLeechSeedWrapOpcode.ts) -- battle_script_commands.c:3105 | 2 | 2 (40) |
| EFFECT_MULTI_HIT | `BattleScript_EffectMultiHit` | blocked-on-opcodes | `B_SCR_OP_INITMULTIHITSTRING`, `B_SCR_OP_JUMPIFHASNOHP` (main path) | - | 12 | 6 (9) |
| EFFECT_CONVERSION | `BattleScript_EffectConversion` | blocked-on-opcodes | `B_SCR_OP_TRYCONVERSIONTYPECHANGE` (main path) | - | 1 | 0 (0) |
| EFFECT_FLINCH_HIT | `BattleScript_EffectFlinchHit` | executable | - | - | 6 | 5 (103) |
| EFFECT_RESTORE_HP | `BattleScript_EffectRestoreHp` | blocked-on-opcodes | `B_SCR_OP_TRYHEALHALFHEALTH` (main path) | - | 2 | 1 (22) |
| EFFECT_TOXIC | `BattleScript_EffectToxic` | executable | - | - | 1 | 1 (26) |
| EFFECT_PAY_DAY | `BattleScript_EffectPayDay` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_PAYDAY is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 0 (0) |
| EFFECT_LIGHT_SCREEN | `BattleScript_EffectLightScreen` | executable | - | - | 1 | 1 (23) |
| EFFECT_TRI_ATTACK | `BattleScript_EffectTriAttack` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_TRI_ATTACK is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 1 (8) |
| EFFECT_REST | `BattleScript_EffectRest` | blocked-on-opcodes | `B_SCR_OP_TRYSETREST` (edge branch only) | - | 1 | 1 (49) |
| EFFECT_OHKO | `BattleScript_EffectOHKO` | blocked-on-opcodes | `B_SCR_OP_TRYKO`, `B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN` (edge branch only) | - | 4 | 4 (28) |
| EFFECT_RAZOR_WIND | `BattleScript_EffectRazorWind` | blocked-on-opcodes | `B_SCR_OP_CLEARSTATUSFROMEFFECT` (edge branch only) | Cmd_seteffectprimary dispatch: MOVE_EFFECT_CHARGING is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522<br>Cmd_seteffectwithchance dispatch: MOVE_EFFECT_CHARGING is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 1 (2) |
| EFFECT_SUPER_FANG | `BattleScript_EffectSuperFang` | blocked-on-opcodes | `B_SCR_OP_DAMAGETOHALFTARGETHP` (main path) | - | 1 | 1 (1) |
| EFFECT_DRAGON_RAGE | `BattleScript_EffectDragonRage` | executable | - | - | 1 | 1 (1) |
| EFFECT_TRAP | `BattleScript_EffectTrap` | executable | - | - | 6 | 5 (14) |
| EFFECT_HIGH_CRITICAL | `BattleScript_EffectHit` | executable | - | - | 8 | 7 (49) |
| EFFECT_DOUBLE_HIT | `BattleScript_EffectDoubleHit` | blocked-on-opcodes | `B_SCR_OP_INITMULTIHITSTRING`, `B_SCR_OP_JUMPIFHASNOHP` (main path) | - | 2 | 2 (12) |
| EFFECT_RECOIL_IF_MISS | `BattleScript_EffectRecoilIfMiss` | executable | - | - | 2 | 1 (1) |
| EFFECT_MIST | `BattleScript_EffectMist` | executable | - | - | 1 | 0 (0) |
| EFFECT_FOCUS_ENERGY | `BattleScript_EffectFocusEnergy` | blocked-on-opcodes | `B_SCR_OP_SETFOCUSENERGY` (edge branch only) | - | 1 | 1 (2) |
| EFFECT_RECOIL | `BattleScript_EffectRecoil` | blocked-on-opcodes | `B_SCR_OP_INCREMENTGAMESTAT` (edge branch only) | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_RECOIL_25 is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 3 | 2 (4) |
| EFFECT_CONFUSE | `BattleScript_EffectConfuse` | executable | - | - | 3 | 3 (48) |
| EFFECT_ATTACK_UP_2 | `BattleScript_EffectAttackUp2` | executable | - | - | 1 | 1 (15) |
| EFFECT_DEFENSE_UP_2 | `BattleScript_EffectDefenseUp2` | executable | - | - | 3 | 3 (12) |
| EFFECT_SPEED_UP_2 | `BattleScript_EffectSpeedUp2` | executable | - | - | 1 | 1 (13) |
| EFFECT_SPECIAL_ATTACK_UP_2 | `BattleScript_EffectSpecialAttackUp2` | executable | - | - | 1 | 1 (1) |
| EFFECT_SPECIAL_DEFENSE_UP_2 | `BattleScript_EffectSpecialDefenseUp2` | executable | - | - | 1 | 1 (13) |
| EFFECT_ACCURACY_UP_2 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_EVASION_UP_2 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_TRANSFORM | `BattleScript_EffectTransform` | blocked-on-opcodes | `B_SCR_OP_TRANSFORMDATAEXECUTION` (main path) | - | 1 | 0 (0) |
| EFFECT_ATTACK_DOWN_2 | `BattleScript_EffectAttackDown2` | executable | - | - | 2 | 2 (8) |
| EFFECT_DEFENSE_DOWN_2 | `BattleScript_EffectDefenseDown2` | executable | - | - | 1 | 1 (12) |
| EFFECT_SPEED_DOWN_2 | `BattleScript_EffectSpeedDown2` | executable | - | - | 2 | 2 (24) |
| EFFECT_SPECIAL_ATTACK_DOWN_2 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_SPECIAL_DEFENSE_DOWN_2 | `BattleScript_EffectSpecialDefenseDown2` | executable | - | - | 2 | 2 (8) |
| EFFECT_ACCURACY_DOWN_2 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_EVASION_DOWN_2 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_REFLECT | `BattleScript_EffectReflect` | executable | - | - | 1 | 1 (16) |
| EFFECT_POISON | `BattleScript_EffectPoison` | executable | - | - | 2 | 0 (0) |
| EFFECT_PARALYZE | `BattleScript_EffectParalyze` | executable | - | - | 3 | 3 (64) |
| EFFECT_ATTACK_DOWN_HIT | `BattleScript_EffectAttackDownHit` | executable | - | - | 1 | 1 (3) |
| EFFECT_DEFENSE_DOWN_HIT | `BattleScript_EffectDefenseDownHit` | executable | - | - | 4 | 3 (32) |
| EFFECT_SPEED_DOWN_HIT | `BattleScript_EffectSpeedDownHit` | executable | - | - | 6 | 4 (48) |
| EFFECT_SPECIAL_ATTACK_DOWN_HIT | `BattleScript_EffectSpecialAttackDownHit` | executable | - | - | 1 | 1 (2) |
| EFFECT_SPECIAL_DEFENSE_DOWN_HIT | `BattleScript_EffectSpecialDefenseDownHit` | executable | - | - | 4 | 4 (188) |
| EFFECT_ACCURACY_DOWN_HIT | `BattleScript_EffectAccuracyDownHit` | executable | - | - | 3 | 3 (16) |
| EFFECT_EVASION_DOWN_HIT | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_SKY_ATTACK | `BattleScript_EffectSkyAttack` | blocked-on-opcodes | `B_SCR_OP_CLEARSTATUSFROMEFFECT` (edge branch only) | Cmd_seteffectprimary dispatch: MOVE_EFFECT_CHARGING is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522<br>Cmd_seteffectwithchance dispatch: MOVE_EFFECT_CHARGING is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 1 (1) |
| EFFECT_CONFUSE_HIT | `BattleScript_EffectConfuseHit` | executable | - | - | 6 | 6 (42) |
| EFFECT_TWINEEDLE | `BattleScript_EffectTwineedle` | blocked-on-opcodes | `B_SCR_OP_INITMULTIHITSTRING`, `B_SCR_OP_JUMPIFHASNOHP` (main path) | - | 1 | 1 (1) |
| EFFECT_VITAL_THROW | `BattleScript_EffectHit` | executable | - | - | 1 | 0 (0) |
| EFFECT_SUBSTITUTE | `BattleScript_EffectSubstitute` | blocked-on-opcodes | `B_SCR_OP_SETSUBSTITUTE` (edge branch only) | - | 1 | 1 (10) |
| EFFECT_RECHARGE | `BattleScript_EffectRecharge` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_RECHARGE is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 4 | 1 (4) |
| EFFECT_RAGE | `BattleScript_EffectRage` | blocked-on-subsystem | - | Cmd_seteffectprimary dispatch: MOVE_EFFECT_RAGE is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 0 (0) |
| EFFECT_MIMIC | `BattleScript_EffectMimic` | blocked-on-opcodes | `B_SCR_OP_MIMICATTACKCOPY` (edge branch only) | - | 1 | 0 (0) |
| EFFECT_METRONOME | `BattleScript_EffectMetronome` | blocked-on-opcodes | `B_SCR_OP_METRONOME` (main path) | - | 1 | 1 (2) |
| EFFECT_LEECH_SEED | `BattleScript_EffectLeechSeed` | executable | - | - | 1 | 1 (12) |
| EFFECT_SPLASH | `BattleScript_EffectSplash` | blocked-on-opcodes | `B_SCR_OP_INCREMENTGAMESTAT` (main path) | - | 1 | 0 (0) |
| EFFECT_DISABLE | `BattleScript_EffectDisable` | blocked-on-opcodes | `B_SCR_OP_DISABLELASTUSEDATTACK` (main path) | - | 1 | 1 (5) |
| EFFECT_LEVEL_DAMAGE | `BattleScript_EffectLevelDamage` | executable | - | - | 2 | 2 (10) |
| EFFECT_PSYWAVE | `BattleScript_EffectPsywave` | executable | - | - | 1 | 1 (2) |
| EFFECT_COUNTER | `BattleScript_EffectCounter` | executable | - | - | 1 | 1 (40) |
| EFFECT_ENCORE | `BattleScript_EffectEncore` | blocked-on-opcodes | `B_SCR_OP_TRYSETENCORE` (main path) | - | 1 | 1 (4) |
| EFFECT_PAIN_SPLIT | `BattleScript_EffectPainSplit` | blocked-on-opcodes | `B_SCR_OP_PAINSPLITDMGCALC` (main path) | - | 1 | 1 (2) |
| EFFECT_SNORE | `BattleScript_EffectSnore` | executable | - | - | 1 | 1 (1) |
| EFFECT_CONVERSION_2 | `BattleScript_EffectConversion2` | blocked-on-opcodes | `B_SCR_OP_SETTYPETORANDOMRESISTANCE` (main path) | - | 1 | 0 (0) |
| EFFECT_LOCK_ON | `BattleScript_EffectLockOn` | blocked-on-opcodes | `B_SCR_OP_SETALWAYSHITFLAG` (edge branch only) | - | 2 | 0 (0) |
| EFFECT_SKETCH | `BattleScript_EffectSketch` | blocked-on-opcodes | `B_SCR_OP_COPYMOVEPERMANENTLY` (edge branch only) | - | 1 | 0 (0) |
| EFFECT_UNUSED_60 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_SLEEP_TALK | `BattleScript_EffectSleepTalk` | blocked-on-opcodes | `B_SCR_OP_TRYCHOOSESLEEPTALKMOVE` (edge branch only) | - | 1 | 1 (8) |
| EFFECT_DESTINY_BOND | `BattleScript_EffectDestinyBond` | blocked-on-opcodes | `B_SCR_OP_SETDESTINYBOND` (main path) | - | 1 | 1 (10) |
| EFFECT_FLAIL | `BattleScript_EffectFlail` | blocked-on-opcodes | `B_SCR_OP_REMAININGHPTOPOWER` (main path) | - | 2 | 2 (20) |
| EFFECT_SPITE | `BattleScript_EffectSpite` | blocked-on-opcodes | `B_SCR_OP_TRYSPITEPPREDUCE` (main path) | - | 1 | 1 (2) |
| EFFECT_FALSE_SWIPE | `BattleScript_EffectHit` | executable | - | - | 1 | 0 (0) |
| EFFECT_HEAL_BELL | `BattleScript_EffectHealBell` | blocked-on-opcodes | `B_SCR_OP_HEALPARTYSTATUS` (main path) | - | 2 | 2 (4) |
| EFFECT_QUICK_ATTACK | `BattleScript_EffectHit` | executable | - | - | 3 | 3 (28) |
| EFFECT_TRIPLE_KICK | `BattleScript_EffectTripleKick` | blocked-on-opcodes | `B_SCR_OP_INITMULTIHITSTRING`, `B_SCR_OP_JUMPIFHASNOHP` (main path) | - | 1 | 1 (1) |
| EFFECT_THIEF | `BattleScript_EffectThief` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_STEAL_ITEM is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 2 | 1 (1) |
| EFFECT_MEAN_LOOK | `BattleScript_EffectMeanLook` | blocked-on-subsystem | - | Cmd_seteffectprimary dispatch: MOVE_EFFECT_PREVENT_ESCAPE is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 3 | 3 (6) |
| EFFECT_NIGHTMARE | `BattleScript_EffectNightmare` | blocked-on-subsystem | - | Cmd_seteffectprimary dispatch: MOVE_EFFECT_NIGHTMARE is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 1 (2) |
| EFFECT_MINIMIZE | `BattleScript_EffectMinimize` | blocked-on-opcodes | `B_SCR_OP_SETMINIMIZE` (main path) | - | 1 | 1 (5) |
| EFFECT_CURSE | `BattleScript_EffectCurse` | blocked-on-opcodes | `B_SCR_OP_JUMPIFTYPE2`, `B_SCR_OP_JUMPIFSTAT`, `B_SCR_OP_CURSETARGET` (main path) | - | 1 | 1 (18) |
| EFFECT_UNUSED_6E | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_PROTECT | `BattleScript_EffectProtect` | blocked-on-opcodes | `B_SCR_OP_SETPROTECTLIKE` (main path) | - | 2 | 2 (37) |
| EFFECT_SPIKES | `BattleScript_EffectSpikes` | blocked-on-opcodes | `B_SCR_OP_TRYSETSPIKES` (main path) | - | 1 | 1 (3) |
| EFFECT_FORESIGHT | `BattleScript_EffectForesight` | blocked-on-opcodes | `B_SCR_OP_SETFORESIGHT` (main path) | - | 2 | 1 (3) |
| EFFECT_PERISH_SONG | `BattleScript_EffectPerishSong` | blocked-on-opcodes | `B_SCR_OP_TRYSETPERISHSONG` (main path) | Cmd_jumpifability: ABILITY_SOUNDPROOF is outside the engine's widened ability set (battleScriptIngrainLeechSeedWrapOpcode.ts) -- battle_script_commands.c:3105 | 1 | 1 (4) |
| EFFECT_SANDSTORM | `BattleScript_EffectSandstorm` | executable | - | - | 1 | 1 (14) |
| EFFECT_ENDURE | `BattleScript_EffectEndure` | blocked-on-opcodes | `B_SCR_OP_SETPROTECTLIKE` (main path) | - | 1 | 1 (24) |
| EFFECT_ROLLOUT | `BattleScript_EffectRollout` | blocked-on-opcodes | `B_SCR_OP_ROLLOUTDAMAGECALCULATION` (edge branch only) | - | 2 | 2 (7) |
| EFFECT_SWAGGER | `BattleScript_EffectSwagger` | blocked-on-opcodes | `B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED` (edge branch only) | - | 1 | 1 (23) |
| EFFECT_FURY_CUTTER | `BattleScript_EffectFuryCutter` | blocked-on-opcodes | `B_SCR_OP_FURYCUTTERCALC` (main path) | - | 1 | 1 (5) |
| EFFECT_ATTRACT | `BattleScript_EffectAttract` | blocked-on-opcodes | `B_SCR_OP_TRYINFATUATING` (main path) | - | 1 | 1 (45) |
| EFFECT_RETURN | `BattleScript_EffectReturn` | blocked-on-opcodes | `B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION` (main path) | - | 1 | 1 (8) |
| EFFECT_PRESENT | `BattleScript_EffectPresent` | blocked-on-opcodes | `B_SCR_OP_PRESENTDAMAGECALCULATION` (main path) | - | 1 | 1 (1) |
| EFFECT_FRUSTRATION | `BattleScript_EffectFrustration` | blocked-on-opcodes | `B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION` (main path) | - | 1 | 1 (10) |
| EFFECT_SAFEGUARD | `BattleScript_EffectSafeguard` | executable | - | - | 1 | 1 (7) |
| EFFECT_THAW_HIT | `BattleScript_EffectThawHit` | executable | - | - | 2 | 1 (2) |
| EFFECT_MAGNITUDE | `BattleScript_EffectMagnitude` | blocked-on-opcodes | `B_SCR_OP_SELECTFIRSTVALIDTARGET`, `B_SCR_OP_MAGNITUDEDAMAGECALCULATION`, `B_SCR_OP_JUMPIFNEXTTARGETVALID` (main path) | - | 1 | 1 (2) |
| EFFECT_BATON_PASS | `BattleScript_EffectBatonPass` | blocked-on-opcodes | `B_SCR_OP_JUMPIFCANTSWITCH`, `B_SCR_OP_SWITCHOUTABILITIES`, `B_SCR_OP_RETURNTOBALL` (edge branch only) | - | 1 | 1 (13) |
| EFFECT_PURSUIT | `BattleScript_EffectHit` | executable | - | - | 1 | 1 (6) |
| EFFECT_RAPID_SPIN | `BattleScript_EffectRapidSpin` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_RAPIDSPIN is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 1 (1) |
| EFFECT_SONICBOOM | `BattleScript_EffectSonicboom` | executable | - | - | 1 | 1 (1) |
| EFFECT_UNUSED_83 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_MORNING_SUN | `BattleScript_EffectMorningSun` | blocked-on-opcodes | `B_SCR_OP_RECOVERBASEDONSUNLIGHT` (main path) | - | 1 | 0 (0) |
| EFFECT_SYNTHESIS | `BattleScript_EffectSynthesis` | blocked-on-opcodes | `B_SCR_OP_RECOVERBASEDONSUNLIGHT` (main path) | - | 1 | 1 (13) |
| EFFECT_MOONLIGHT | `BattleScript_EffectMoonlight` | blocked-on-opcodes | `B_SCR_OP_RECOVERBASEDONSUNLIGHT` (main path) | - | 1 | 1 (3) |
| EFFECT_HIDDEN_POWER | `BattleScript_EffectHiddenPower` | blocked-on-opcodes | `B_SCR_OP_HIDDENPOWERCALC` (main path) | - | 1 | 1 (1) |
| EFFECT_RAIN_DANCE | `BattleScript_EffectRainDance` | executable | - | - | 1 | 1 (28) |
| EFFECT_SUNNY_DAY | `BattleScript_EffectSunnyDay` | executable | - | - | 1 | 1 (25) |
| EFFECT_DEFENSE_UP_HIT | `BattleScript_EffectDefenseUpHit` | executable | - | - | 1 | 1 (12) |
| EFFECT_ATTACK_UP_HIT | `BattleScript_EffectAttackUpHit` | executable | - | - | 2 | 2 (16) |
| EFFECT_ALL_STATS_UP_HIT | `BattleScript_EffectAllStatsUpHit` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_ALL_STATS_UP is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 2 | 2 (33) |
| EFFECT_UNUSED_8D | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_BELLY_DRUM | `BattleScript_EffectBellyDrum` | blocked-on-opcodes | `B_SCR_OP_MAXATTACKHALVEHP` (main path) | - | 1 | 1 (2) |
| EFFECT_PSYCH_UP | `BattleScript_EffectPsychUp` | blocked-on-opcodes | `B_SCR_OP_COPYFOESTATS` (main path) | - | 1 | 1 (14) |
| EFFECT_MIRROR_COAT | `BattleScript_EffectMirrorCoat` | executable | - | - | 1 | 1 (14) |
| EFFECT_SKULL_BASH | `BattleScript_EffectSkullBash` | blocked-on-opcodes | `B_SCR_OP_CLEARSTATUSFROMEFFECT` (edge branch only) | Cmd_seteffectprimary dispatch: MOVE_EFFECT_CHARGING is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522<br>Cmd_seteffectwithchance dispatch: MOVE_EFFECT_CHARGING is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 0 (0) |
| EFFECT_TWISTER | `BattleScript_EffectTwister` | executable | - | - | 1 | 0 (0) |
| EFFECT_EARTHQUAKE | `BattleScript_EffectEarthquake` | blocked-on-opcodes | `B_SCR_OP_SELECTFIRSTVALIDTARGET`, `B_SCR_OP_JUMPIFNEXTTARGETVALID` (main path) | - | 1 | 1 (147) |
| EFFECT_FUTURE_SIGHT | `BattleScript_EffectFutureSight` | blocked-on-opcodes | `B_SCR_OP_TRYSETFUTUREATTACK` (main path) | - | 2 | 1 (5) |
| EFFECT_GUST | `BattleScript_EffectGust` | executable | - | - | 1 | 0 (0) |
| EFFECT_FLINCH_MINIMIZE_HIT | `BattleScript_EffectStomp` | executable | - | - | 4 | 4 (10) |
| EFFECT_SOLAR_BEAM | `BattleScript_EffectSolarBeam` | blocked-on-opcodes | `B_SCR_OP_JUMPIFABILITYPRESENT`, `B_SCR_OP_CLEARSTATUSFROMEFFECT` (main path) | Cmd_seteffectprimary dispatch: MOVE_EFFECT_CHARGING is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522<br>Cmd_seteffectwithchance dispatch: MOVE_EFFECT_CHARGING is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 1 (16) |
| EFFECT_THUNDER | `BattleScript_EffectThunder` | executable | - | - | 1 | 1 (15) |
| EFFECT_TELEPORT | `BattleScript_EffectTeleport` | executable | - | - | 1 | 0 (0) |
| EFFECT_BEAT_UP | `BattleScript_EffectBeatUp` | blocked-on-opcodes | `B_SCR_OP_TRYDOBEATUP` (main path) | - | 1 | 0 (0) |
| EFFECT_SEMI_INVULNERABLE | `BattleScript_EffectSemiInvulnerable` | blocked-on-opcodes | `B_SCR_OP_CLEARSTATUSFROMEFFECT`, `B_SCR_OP_SETSEMIINVULNERABLEBIT`, `B_SCR_OP_CLEARSEMIINVULNERABLEBIT` (edge branch only) | Cmd_seteffectprimary dispatch: MOVE_EFFECT_CHARGING is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522<br>Cmd_seteffectwithchance dispatch: MOVE_EFFECT_CHARGING is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 4 | 4 (32) |
| EFFECT_DEFENSE_CURL | `BattleScript_EffectDefenseCurl` | blocked-on-opcodes | `B_SCR_OP_SETDEFENSECURLBIT` (main path) | - | 1 | 1 (6) |
| EFFECT_SOFTBOILED | `BattleScript_EffectSoftboiled` | blocked-on-opcodes | `B_SCR_OP_TRYHEALHALFHEALTH` (main path) | - | 2 | 2 (7) |
| EFFECT_FAKE_OUT | `BattleScript_EffectFakeOut` | blocked-on-opcodes | `B_SCR_OP_JUMPIFNOTFIRSTTURN` (main path) | - | 1 | 1 (15) |
| EFFECT_UPROAR | `BattleScript_EffectUproar` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_UPROAR is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 1 (1) |
| EFFECT_STOCKPILE | `BattleScript_EffectStockpile` | blocked-on-opcodes | `B_SCR_OP_STOCKPILE` (main path) | - | 1 | 1 (2) |
| EFFECT_SPIT_UP | `BattleScript_EffectSpitUp` | blocked-on-opcodes | `B_SCR_OP_STOCKPILETOBASEDAMAGE` (edge branch only) | - | 1 | 1 (1) |
| EFFECT_SWALLOW | `BattleScript_EffectSwallow` | blocked-on-opcodes | `B_SCR_OP_STOCKPILETOHPHEAL` (main path) | - | 1 | 1 (2) |
| EFFECT_UNUSED_A3 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_HAIL | `BattleScript_EffectHail` | executable | - | - | 1 | 1 (7) |
| EFFECT_TORMENT | `BattleScript_EffectTorment` | blocked-on-opcodes | `B_SCR_OP_SETTORMENT` (main path) | - | 1 | 1 (4) |
| EFFECT_FLATTER | `BattleScript_EffectFlatter` | blocked-on-opcodes | `B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED` (edge branch only) | - | 1 | 1 (2) |
| EFFECT_WILL_O_WISP | `BattleScript_EffectWillOWisp` | blocked-on-subsystem | - | Cmd_jumpifability: ABILITY_WATER_VEIL is outside the engine's widened ability set (battleScriptIngrainLeechSeedWrapOpcode.ts) -- battle_script_commands.c:3105 | 1 | 1 (10) |
| EFFECT_MEMENTO | `BattleScript_EffectMemento` | blocked-on-opcodes | `B_SCR_OP_TRYMEMENTO`, `B_SCR_OP_SETATKHPTOZERO`, `B_SCR_OP_PLAYSTATCHANGEANIMATION` (edge branch only) | - | 1 | 1 (1) |
| EFFECT_FACADE | `BattleScript_EffectFacade` | executable | - | - | 1 | 1 (19) |
| EFFECT_FOCUS_PUNCH | `BattleScript_EffectFocusPunch` | blocked-on-opcodes | `B_SCR_OP_JUMPIFNODAMAGE` (main path) | - | 1 | 1 (11) |
| EFFECT_SMELLINGSALT | `BattleScript_EffectSmellingsalt` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_REMOVE_PARALYSIS is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 1 (1) |
| EFFECT_FOLLOW_ME | `BattleScript_EffectFollowMe` | blocked-on-opcodes | `B_SCR_OP_SETFORCEDTARGET` (main path) | - | 1 | 1 (5) |
| EFFECT_NATURE_POWER | `BattleScript_EffectNaturePower` | blocked-on-opcodes | `B_SCR_OP_CALLENVIRONMENTATTACK` (main path) | - | 1 | 0 (0) |
| EFFECT_CHARGE | `BattleScript_EffectCharge` | blocked-on-opcodes | `B_SCR_OP_SETCHARGE` (main path) | - | 1 | 0 (0) |
| EFFECT_TAUNT | `BattleScript_EffectTaunt` | blocked-on-opcodes | `B_SCR_OP_SETTAUNT` (main path) | - | 1 | 1 (2) |
| EFFECT_HELPING_HAND | `BattleScript_EffectHelpingHand` | blocked-on-opcodes | `B_SCR_OP_TRYSETHELPINGHAND` (main path) | - | 1 | 1 (5) |
| EFFECT_TRICK | `BattleScript_EffectTrick` | blocked-on-opcodes | `B_SCR_OP_TRYSWAPITEMS` (edge branch only) | - | 1 | 1 (5) |
| EFFECT_ROLE_PLAY | `BattleScript_EffectRolePlay` | blocked-on-opcodes | `B_SCR_OP_TRYCOPYABILITY` (main path) | - | 1 | 1 (1) |
| EFFECT_WISH | `BattleScript_EffectWish` | blocked-on-opcodes | `B_SCR_OP_TRYWISH` (main path) | - | 1 | 1 (8) |
| EFFECT_ASSIST | `BattleScript_EffectAssist` | blocked-on-opcodes | `B_SCR_OP_ASSISTATTACKSELECT`, `B_SCR_OP_JUMPTOCALLEDMOVE` (main path) | B_SCR_OP_JUMPTOCALLEDMOVE: runtime-resolved jump target (called move's own effect script), not statically enumerable | 1 | 0 (0) |
| EFFECT_INGRAIN | `BattleScript_EffectIngrain` | executable | - | - | 1 | 1 (5) |
| EFFECT_SUPERPOWER | `BattleScript_EffectSuperpower` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_ATK_DEF_DOWN is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 1 (3) |
| EFFECT_MAGIC_COAT | `BattleScript_EffectMagicCoat` | blocked-on-opcodes | `B_SCR_OP_TRYSETMAGICCOAT` (main path) | - | 1 | 1 (3) |
| EFFECT_RECYCLE | `BattleScript_EffectRecycle` | blocked-on-opcodes | `B_SCR_OP_TRYRECYCLEITEM` (main path) | - | 1 | 1 (1) |
| EFFECT_REVENGE | `BattleScript_EffectRevenge` | blocked-on-opcodes | `B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED` (main path) | - | 1 | 1 (3) |
| EFFECT_BRICK_BREAK | `BattleScript_EffectBrickBreak` | executable | - | - | 1 | 1 (46) |
| EFFECT_YAWN | `BattleScript_EffectYawn` | executable | - | - | 1 | 1 (10) |
| EFFECT_KNOCK_OFF | `BattleScript_EffectKnockOff` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_KNOCK_OFF is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 1 | 1 (7) |
| EFFECT_ENDEAVOR | `BattleScript_EffectEndeavor` | executable | - | - | 1 | 1 (4) |
| EFFECT_ERUPTION | `BattleScript_EffectEruption` | blocked-on-opcodes | `B_SCR_OP_SCALEDAMAGEBYHEALTHRATIO` (main path) | - | 2 | 2 (2) |
| EFFECT_SKILL_SWAP | `BattleScript_EffectSkillSwap` | blocked-on-opcodes | `B_SCR_OP_TRYSWAPABILITIES` (main path) | - | 1 | 1 (5) |
| EFFECT_IMPRISON | `BattleScript_EffectImprison` | blocked-on-opcodes | `B_SCR_OP_TRYIMPRISON` (main path) | - | 1 | 0 (0) |
| EFFECT_REFRESH | `BattleScript_EffectRefresh` | blocked-on-opcodes | `B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED` (main path) | - | 1 | 1 (2) |
| EFFECT_GRUDGE | `BattleScript_EffectGrudge` | blocked-on-opcodes | `B_SCR_OP_TRYSETGRUDGE` (main path) | - | 1 | 1 (2) |
| EFFECT_SNATCH | `BattleScript_EffectSnatch` | blocked-on-opcodes | `B_SCR_OP_TRYSETSNATCH` (main path) | - | 1 | 0 (0) |
| EFFECT_LOW_KICK | `BattleScript_EffectLowKick` | blocked-on-opcodes | `B_SCR_OP_WEIGHTDAMAGECALCULATION` (main path) | - | 1 | 1 (2) |
| EFFECT_SECRET_POWER | `BattleScript_EffectSecretPower` | blocked-on-opcodes | `B_SCR_OP_GETSECRETPOWEREFFECT` (main path) | - | 1 | 1 (6) |
| EFFECT_DOUBLE_EDGE | `BattleScript_EffectDoubleEdge` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_RECOIL_33 is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 2 | 1 (52) |
| EFFECT_TEETER_DANCE | `BattleScript_EffectTeeterDance` | blocked-on-opcodes | `B_SCR_OP_JUMPIFARRAYEQUAL`, `B_SCR_OP_JUMPIFHASNOHP` (main path) | - | 1 | 1 (2) |
| EFFECT_BLAZE_KICK | `BattleScript_EffectBurnHit` | executable | - | - | 1 | 1 (1) |
| EFFECT_MUD_SPORT | `BattleScript_EffectMudSport` | blocked-on-opcodes | `B_SCR_OP_SETTYPEBASEDHALVERS` (main path) | - | 1 | 0 (0) |
| EFFECT_POISON_FANG | `BattleScript_EffectPoisonFang` | executable | - | - | 1 | 1 (2) |
| EFFECT_WEATHER_BALL | `BattleScript_EffectWeatherBall` | blocked-on-opcodes | `B_SCR_OP_SETWEATHERBALLTYPE` (main path) | - | 1 | 0 (0) |
| EFFECT_OVERHEAT | `BattleScript_EffectOverheat` | blocked-on-subsystem | - | Cmd_seteffectwithchance dispatch: MOVE_EFFECT_SP_ATK_TWO_DOWN is in the family-B (status2/misc) switch, a named (b) barrier in applySetMoveEffect -- battle_script_commands.c:2522 | 2 | 1 (23) |
| EFFECT_TICKLE | `BattleScript_EffectTickle` | blocked-on-opcodes | `B_SCR_OP_JUMPIFSTAT`, `B_SCR_OP_PLAYSTATCHANGEANIMATION` (main path) | - | 1 | 1 (3) |
| EFFECT_COSMIC_POWER | `BattleScript_EffectCosmicPower` | blocked-on-opcodes | `B_SCR_OP_JUMPIFSTAT`, `B_SCR_OP_PLAYSTATCHANGEANIMATION` (main path) | - | 1 | 1 (7) |
| EFFECT_SKY_UPPERCUT | `BattleScript_EffectSkyUppercut` | executable | - | - | 1 | 1 (3) |
| EFFECT_BULK_UP | `BattleScript_EffectBulkUp` | blocked-on-opcodes | `B_SCR_OP_JUMPIFSTAT`, `B_SCR_OP_PLAYSTATCHANGEANIMATION` (main path) | - | 1 | 1 (5) |
| EFFECT_POISON_TAIL | `BattleScript_EffectPoisonHit` | executable | - | - | 1 | 1 (1) |
| EFFECT_WATER_SPORT | `BattleScript_EffectWaterSport` | blocked-on-opcodes | `B_SCR_OP_SETTYPEBASEDHALVERS` (main path) | - | 1 | 0 (0) |
| EFFECT_CALM_MIND | `BattleScript_EffectCalmMind` | blocked-on-opcodes | `B_SCR_OP_JUMPIFSTAT`, `B_SCR_OP_PLAYSTATCHANGEANIMATION` (main path) | - | 1 | 1 (16) |
| EFFECT_DRAGON_DANCE | `BattleScript_EffectDragonDance` | blocked-on-opcodes | `B_SCR_OP_JUMPIFSTAT`, `B_SCR_OP_PLAYSTATCHANGEANIMATION` (main path) | - | 1 | 1 (14) |
| EFFECT_CAMOUFLAGE | `BattleScript_EffectCamouflage` | blocked-on-opcodes | `B_SCR_OP_SETTYPETOENVIRONMENT` (main path) | - | 1 | 0 (0) |

## Validation (fails the run on drift)

The tool itself asserts these before writing this doc and exits nonzero on any mismatch:

- `EFFECT_HIT`, `EFFECT_POISON_HIT`, `EFFECT_BURN_HIT`, `EFFECT_FREEZE_HIT`, `EFFECT_PARALYZE_HIT` each executable -- the SetMoveEffect quartet's own dispatch was already source-complete (PROGRESS 444), and B_SCR_OP_JUMPIFHALFWORD/JUMPIFSTATUS3CONDITION/ORWORD (registered 2026-07-25) closed the shared-entry chokepoint that used to block all five on an unrelated instruction
- `EFFECT_SLEEP`, `EFFECT_TOXIC` blocked, mentioning `Cmd_seteffectprimary` (still fully unregistered)
- `EFFECT_RECOIL_IF_MISS` executable (a real positive: it enters via `BattleScript_HitFromAtkString`, skipping the chokepoint entirely, and reaches moveend/checkteamslost)
- `EFFECT_ATTACK_DOWN_HIT`, `EFFECT_DEFENSE_DOWN_HIT`, `EFFECT_SPEED_DOWN_HIT`, `EFFECT_SPECIAL_ATTACK_DOWN_HIT`, `EFFECT_SPECIAL_DEFENSE_DOWN_HIT`, `EFFECT_ACCURACY_DOWN_HIT`, `EFFECT_ATTACK_UP_HIT`, `EFFECT_DEFENSE_UP_HIT` each executable (ISSUES #44: `SETMOVEEFFECT_SUPPORTED` is now derived from the engine's own exported `SET_MOVE_EFFECT_SUPPORTED_BYTES`, which spreads `STAT_MOVE_EFFECT_TABLE`'s keys, instead of a hand list that predated that table's registration)

All checks passed for this run.

## Caveats (read before trusting a number here)

- **Registration coverage, not semantic verification.** "Executable" means every reachable opcode has a dispatch entry, not that its behavior is bit-exact or complete. A registered opcode with a narrow (b)-policy barrier still counts as "registered" per ROADMAP S10 §1 unless it is the one named exception below.
- **One deliberate semantic exception:** `Cmd_seteffectwithchance`'s SetMoveEffect dispatch (`applySetMoveEffect`, `src/engine/battleScriptHitChainOpcode.ts:1760-1971`) is opcode-registered but internally branches on the `MOVE_EFFECT_*` byte a script sets via the preceding `setmoveeffect` statement. This is the only production dispatcher today where opcode registration and per-script executability diverge (PROGRESS 444), so this census specifically tracks that one operand value along each walk -- reading the supported-byte set live from the engine's own exported `SET_MOVE_EFFECT_SUPPORTED_BYTES` (ISSUES #44) rather than a second hand-maintained copy, with a name<->id lookup table guarded by an assertion that fails the run if the engine's dispatch grows an id this tool cannot name yet. Every other multi-branch dispatcher's internal barriers are *not* modeled operand-by-operand here -- if a future dispatcher gains the same pattern (registered opcode, narrow-input barrier), this tool will overstate its effects as fully executable until a similar tracked exception is added.
- **Call/return modeling.** A `call` edge is treated as reaching *both* the callee's entry (to collect its opcodes) and the callsite's recorded continuation (`callsiteContinuations`), unconditionally. This assumes the callee always returns; it does not model the callee diverging (e.g. hitting `end` without returning), which would make this census's reachable set a strict superset of the true one in rare cases -- i.e. it can only make an effect look *more* blocked than reality, never less.
- **"Main path" is a conservative proxy, not a dominance analysis.** An opcode is reported as reached "on the main path" only if some route from the entry reaches it using zero conditional forks (unconditional fallthrough, unconditional `goto`, and calls only). Any instruction beyond the first conditional jump in a script is reported as "edge branch only" even if every real branch of that fork reconverges to the same later instruction. This under-claims "main path" rather than over-claiming it.
- **Dynamic dispatch.** `B_SCR_OP_JUMPTOCALLEDMOVE` (Metronome/Sleep Talk/Assist-style "run another move's effect script") has a runtime-computed target with no static label operand; those three call sites are reported as a subsystem note (dynamic move-effect dispatch), not walked further.
- **Factory-L50 legality** is taken directly from the topology's own precomputed `level50FactoryReachableEffects` join (the 850-set boundary); this tool does not recompute Factory legality itself.

