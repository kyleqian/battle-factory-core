# Executable-frontier census

Generated 2026-07-28. Rerun: `npx tsx tools/report/executable-frontier-census.ts`

Answers ROADMAP S10's Executable-frontier reset question directly: not "how many opcodes are registered" but **how many of the 355 moves can the kernel execute end-to-end today, and what exactly blocks each of the rest.** Every `BattleScript_Effect*` entry in the committed topology (`src/data/gen/battle-script-topology.json` + `battle-script-graph.json`) is walked for full opcode reachability (branches, goto/call targets, the shared hit-chain tail) against the opcode set the engine currently registers (read live from `src/engine/battleScriptRulesContext.ts`'s `createBattleScriptStatusRulesHandlers`, so this doc cannot drift from what the engine actually installs).

**Key finding:** the single highest-leverage next registration is `B_SCR_OP_SETALWAYSHITFLAG` -- registering exactly that set would flip **1 effect / 2 moves (0 Factory-L50, 0 weighted)** from blocked to executable in one step (EFFECT_LOCK_ON) -- the largest single entry in the ranked table below. This paragraph is generated fresh from the current registered-opcode set every run, so it always names today's actual top blocker, not a past one -- see PROGRESS.md for the registration history (e.g. the 2026-07-25 B_SCR_OP_JUMPIFHALFWORD/JUMPIFSTATUS3CONDITION/ORWORD entry-chokepoint trio).

## Headline counts

| Metric | Executable | Total | % |
| --- | --- | --- | --- |
| Effect scripts | 195 | 214 | 91.1% |
| Moves (unweighted, all 355) | 335 | 355 | 94.4% |
| Level-50 Factory moves (unweighted, distinct moves in the 850-set) | 275 | 276 | 99.6% |
| Level-50 Factory moves (weighted by rental-mon count across the 850-set) | 2955 | 2957 | 99.9% |

"Executable" means every opcode on every statically reachable path from the effect's entry script has a dispatch entry today and every use of the explicitly tracked narrowed operand surfaces is accepted. Other registered runtime barriers remain included per ROADMAP S10 §1's (a)/(b) policy. It is not a semantic-correctness claim -- see Caveats.

## Ranked next registration by unlocked-move count

Each row is an exact set of missing opcodes -- registering only *some* of a multi-opcode set would not unlock these effects, so opcodes are grouped by the combination an effect actually needs, not credited individually. Any effect with an independent subsystem/operand note is not rankable here even when it also has missing opcodes, because opcode registration alone would not unlock it; see the per-effect table.

| Missing opcode(s) | Effects unlocked | Moves unlocked (unweighted) | Factory-L50 moves (unweighted) | Factory-L50 weighted |
| --- | --- | --- | --- | --- |
| `B_SCR_OP_SETALWAYSHITFLAG` | 1 (EFFECT_LOCK_ON) | 2 | 0 | 0 |
| `B_SCR_OP_ASSISTATTACKSELECT` | 1 (EFFECT_ASSIST) | 1 | 0 | 0 |
| `B_SCR_OP_CALLENVIRONMENTATTACK` | 1 (EFFECT_NATURE_POWER) | 1 | 0 | 0 |
| `B_SCR_OP_COPYMOVEPERMANENTLY` | 1 (EFFECT_SKETCH) | 1 | 0 | 0 |
| `B_SCR_OP_MIMICATTACKCOPY` | 1 (EFFECT_MIMIC) | 1 | 0 | 0 |
| `B_SCR_OP_SETBIDE` | 1 (EFFECT_BIDE) | 1 | 0 | 0 |
| `B_SCR_OP_SETCHARGE` | 1 (EFFECT_CHARGE) | 1 | 0 | 0 |
| `B_SCR_OP_SETTYPETOENVIRONMENT` | 1 (EFFECT_CAMOUFLAGE) | 1 | 0 | 0 |
| `B_SCR_OP_SETTYPETORANDOMRESISTANCE` | 1 (EFFECT_CONVERSION_2) | 1 | 0 | 0 |
| `B_SCR_OP_SETWEATHERBALLTYPE` | 1 (EFFECT_WEATHER_BALL) | 1 | 0 | 0 |
| `B_SCR_OP_TRYCONVERSIONTYPECHANGE` | 1 (EFFECT_CONVERSION) | 1 | 0 | 0 |
| `B_SCR_OP_TRYDOBEATUP` | 1 (EFFECT_BEAT_UP) | 1 | 0 | 0 |
| `B_SCR_OP_TRYIMPRISON` | 1 (EFFECT_IMPRISON) | 1 | 0 | 0 |
| `B_SCR_OP_TRYMIRRORMOVE` | 1 (EFFECT_MIRROR_MOVE) | 1 | 0 | 0 |
| `B_SCR_OP_TRYSETSNATCH` | 1 (EFFECT_SNATCH) | 1 | 0 | 0 |

## Per-effect detail

| Effect | Entry script | Classification | Missing opcode(s) | Subsystem notes | Moves | Factory-L50 moves (weighted) |
| --- | --- | --- | --- | --- | --- | --- |
| EFFECT_HIT | `BattleScript_EffectHit` | executable | - | - | 24 | 12 (162) |
| EFFECT_SLEEP | `BattleScript_EffectSleep` | executable | - | - | 6 | 6 (39) |
| EFFECT_POISON_HIT | `BattleScript_EffectPoisonHit` | executable | - | - | 4 | 3 (44) |
| EFFECT_ABSORB | `BattleScript_EffectAbsorb` | executable | - | - | 4 | 3 (43) |
| EFFECT_BURN_HIT | `BattleScript_EffectBurnHit` | executable | - | - | 5 | 5 (76) |
| EFFECT_FREEZE_HIT | `BattleScript_EffectFreezeHit` | executable | - | - | 4 | 3 (109) |
| EFFECT_PARALYZE_HIT | `BattleScript_EffectParalyzeHit` | executable | - | - | 8 | 7 (137) |
| EFFECT_EXPLOSION | `BattleScript_EffectExplosion` | executable | - | - | 2 | 2 (25) |
| EFFECT_DREAM_EATER | `BattleScript_EffectDreamEater` | executable | - | - | 1 | 1 (6) |
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
| EFFECT_HAZE | `BattleScript_EffectHaze` | executable | - | - | 1 | 1 (1) |
| EFFECT_BIDE | `BattleScript_EffectBide` | blocked-on-opcodes | `B_SCR_OP_SETBIDE` (main path) | - | 1 | 0 (0) |
| EFFECT_RAMPAGE | `BattleScript_EffectRampage` | executable | - | - | 3 | 2 (6) |
| EFFECT_ROAR | `BattleScript_EffectRoar` | executable | - | - | 2 | 2 (40) |
| EFFECT_MULTI_HIT | `BattleScript_EffectMultiHit` | executable | - | - | 12 | 6 (9) |
| EFFECT_CONVERSION | `BattleScript_EffectConversion` | blocked-on-opcodes | `B_SCR_OP_TRYCONVERSIONTYPECHANGE` (main path) | - | 1 | 0 (0) |
| EFFECT_FLINCH_HIT | `BattleScript_EffectFlinchHit` | executable | - | - | 6 | 5 (103) |
| EFFECT_RESTORE_HP | `BattleScript_EffectRestoreHp` | executable | - | - | 2 | 1 (22) |
| EFFECT_TOXIC | `BattleScript_EffectToxic` | executable | - | - | 1 | 1 (26) |
| EFFECT_PAY_DAY | `BattleScript_EffectPayDay` | executable | - | - | 1 | 0 (0) |
| EFFECT_LIGHT_SCREEN | `BattleScript_EffectLightScreen` | executable | - | - | 1 | 1 (23) |
| EFFECT_TRI_ATTACK | `BattleScript_EffectTriAttack` | executable | - | - | 1 | 1 (8) |
| EFFECT_REST | `BattleScript_EffectRest` | executable | - | - | 1 | 1 (49) |
| EFFECT_OHKO | `BattleScript_EffectOHKO` | executable | - | - | 4 | 4 (28) |
| EFFECT_RAZOR_WIND | `BattleScript_EffectRazorWind` | executable | - | - | 1 | 1 (2) |
| EFFECT_SUPER_FANG | `BattleScript_EffectSuperFang` | executable | - | - | 1 | 1 (1) |
| EFFECT_DRAGON_RAGE | `BattleScript_EffectDragonRage` | executable | - | - | 1 | 1 (1) |
| EFFECT_TRAP | `BattleScript_EffectTrap` | executable | - | - | 6 | 5 (14) |
| EFFECT_HIGH_CRITICAL | `BattleScript_EffectHit` | executable | - | - | 8 | 7 (49) |
| EFFECT_DOUBLE_HIT | `BattleScript_EffectDoubleHit` | executable | - | - | 2 | 2 (12) |
| EFFECT_RECOIL_IF_MISS | `BattleScript_EffectRecoilIfMiss` | executable | - | - | 2 | 1 (1) |
| EFFECT_MIST | `BattleScript_EffectMist` | executable | - | - | 1 | 0 (0) |
| EFFECT_FOCUS_ENERGY | `BattleScript_EffectFocusEnergy` | executable | - | - | 1 | 1 (2) |
| EFFECT_RECOIL | `BattleScript_EffectRecoil` | executable | - | - | 3 | 2 (4) |
| EFFECT_CONFUSE | `BattleScript_EffectConfuse` | executable | - | - | 3 | 3 (48) |
| EFFECT_ATTACK_UP_2 | `BattleScript_EffectAttackUp2` | executable | - | - | 1 | 1 (15) |
| EFFECT_DEFENSE_UP_2 | `BattleScript_EffectDefenseUp2` | executable | - | - | 3 | 3 (12) |
| EFFECT_SPEED_UP_2 | `BattleScript_EffectSpeedUp2` | executable | - | - | 1 | 1 (13) |
| EFFECT_SPECIAL_ATTACK_UP_2 | `BattleScript_EffectSpecialAttackUp2` | executable | - | - | 1 | 1 (1) |
| EFFECT_SPECIAL_DEFENSE_UP_2 | `BattleScript_EffectSpecialDefenseUp2` | executable | - | - | 1 | 1 (13) |
| EFFECT_ACCURACY_UP_2 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_EVASION_UP_2 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_TRANSFORM | `BattleScript_EffectTransform` | blocked-on-opcodes | `B_SCR_OP_TRANSFORMDATAEXECUTION` (main path) | Operand gate: B_SCR_OP_PRINTFROMTABLE(gTransformUsedStringIds) -- gTransformUsedStringIds is outside the engine's accepted string-table pointer set (src/engine/battleScriptHitChainOpcode.ts:287; battle_script_commands.c:2184) | 1 | 0 (0) |
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
| EFFECT_SKY_ATTACK | `BattleScript_EffectSkyAttack` | executable | - | - | 1 | 1 (1) |
| EFFECT_CONFUSE_HIT | `BattleScript_EffectConfuseHit` | executable | - | - | 6 | 6 (42) |
| EFFECT_TWINEEDLE | `BattleScript_EffectTwineedle` | executable | - | - | 1 | 1 (1) |
| EFFECT_VITAL_THROW | `BattleScript_EffectHit` | executable | - | - | 1 | 0 (0) |
| EFFECT_SUBSTITUTE | `BattleScript_EffectSubstitute` | executable | - | - | 1 | 1 (10) |
| EFFECT_RECHARGE | `BattleScript_EffectRecharge` | executable | - | - | 4 | 1 (4) |
| EFFECT_RAGE | `BattleScript_EffectRage` | executable | - | - | 1 | 0 (0) |
| EFFECT_MIMIC | `BattleScript_EffectMimic` | blocked-on-opcodes | `B_SCR_OP_MIMICATTACKCOPY` (edge branch only) | - | 1 | 0 (0) |
| EFFECT_METRONOME | `BattleScript_EffectMetronome` | blocked-on-opcodes | `B_SCR_OP_METRONOME` (main path) | Dynamic effect-universe gate: B_SCR_OP_METRONOME(selectable-effect-universe) -- the selected runtime effect is not statically enumerable here, so this row remains blocked until every legal Metronome destination is executable (docs/ranked-single-opcodes-notes.md § Metronome gate) | 1 | 1 (2) |
| EFFECT_LEECH_SEED | `BattleScript_EffectLeechSeed` | executable | - | - | 1 | 1 (12) |
| EFFECT_SPLASH | `BattleScript_EffectSplash` | executable | - | - | 1 | 0 (0) |
| EFFECT_DISABLE | `BattleScript_EffectDisable` | executable | - | - | 1 | 1 (5) |
| EFFECT_LEVEL_DAMAGE | `BattleScript_EffectLevelDamage` | executable | - | - | 2 | 2 (10) |
| EFFECT_PSYWAVE | `BattleScript_EffectPsywave` | executable | - | - | 1 | 1 (2) |
| EFFECT_COUNTER | `BattleScript_EffectCounter` | executable | - | - | 1 | 1 (40) |
| EFFECT_ENCORE | `BattleScript_EffectEncore` | executable | - | - | 1 | 1 (4) |
| EFFECT_PAIN_SPLIT | `BattleScript_EffectPainSplit` | executable | - | - | 1 | 1 (2) |
| EFFECT_SNORE | `BattleScript_EffectSnore` | executable | - | - | 1 | 1 (1) |
| EFFECT_CONVERSION_2 | `BattleScript_EffectConversion2` | blocked-on-opcodes | `B_SCR_OP_SETTYPETORANDOMRESISTANCE` (main path) | - | 1 | 0 (0) |
| EFFECT_LOCK_ON | `BattleScript_EffectLockOn` | blocked-on-opcodes | `B_SCR_OP_SETALWAYSHITFLAG` (edge branch only) | - | 2 | 0 (0) |
| EFFECT_SKETCH | `BattleScript_EffectSketch` | blocked-on-opcodes | `B_SCR_OP_COPYMOVEPERMANENTLY` (edge branch only) | - | 1 | 0 (0) |
| EFFECT_UNUSED_60 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_SLEEP_TALK | `BattleScript_EffectSleepTalk` | executable | - | - | 1 | 1 (8) |
| EFFECT_DESTINY_BOND | `BattleScript_EffectDestinyBond` | executable | - | - | 1 | 1 (10) |
| EFFECT_FLAIL | `BattleScript_EffectFlail` | executable | - | - | 2 | 2 (20) |
| EFFECT_SPITE | `BattleScript_EffectSpite` | executable | - | - | 1 | 1 (2) |
| EFFECT_FALSE_SWIPE | `BattleScript_EffectHit` | executable | - | - | 1 | 0 (0) |
| EFFECT_HEAL_BELL | `BattleScript_EffectHealBell` | executable | - | - | 2 | 2 (4) |
| EFFECT_QUICK_ATTACK | `BattleScript_EffectHit` | executable | - | - | 3 | 3 (28) |
| EFFECT_TRIPLE_KICK | `BattleScript_EffectTripleKick` | executable | - | - | 1 | 1 (1) |
| EFFECT_THIEF | `BattleScript_EffectThief` | executable | - | - | 2 | 1 (1) |
| EFFECT_MEAN_LOOK | `BattleScript_EffectMeanLook` | executable | - | - | 3 | 3 (6) |
| EFFECT_NIGHTMARE | `BattleScript_EffectNightmare` | executable | - | - | 1 | 1 (2) |
| EFFECT_MINIMIZE | `BattleScript_EffectMinimize` | executable | - | - | 1 | 1 (5) |
| EFFECT_CURSE | `BattleScript_EffectCurse` | executable | - | - | 1 | 1 (18) |
| EFFECT_UNUSED_6E | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_PROTECT | `BattleScript_EffectProtect` | executable | - | - | 2 | 2 (37) |
| EFFECT_SPIKES | `BattleScript_EffectSpikes` | executable | - | - | 1 | 1 (3) |
| EFFECT_FORESIGHT | `BattleScript_EffectForesight` | executable | - | - | 2 | 1 (3) |
| EFFECT_PERISH_SONG | `BattleScript_EffectPerishSong` | executable | - | - | 1 | 1 (4) |
| EFFECT_SANDSTORM | `BattleScript_EffectSandstorm` | executable | - | - | 1 | 1 (14) |
| EFFECT_ENDURE | `BattleScript_EffectEndure` | executable | - | - | 1 | 1 (24) |
| EFFECT_ROLLOUT | `BattleScript_EffectRollout` | executable | - | - | 2 | 2 (7) |
| EFFECT_SWAGGER | `BattleScript_EffectSwagger` | executable | - | - | 1 | 1 (23) |
| EFFECT_FURY_CUTTER | `BattleScript_EffectFuryCutter` | executable | - | - | 1 | 1 (5) |
| EFFECT_ATTRACT | `BattleScript_EffectAttract` | executable | - | - | 1 | 1 (45) |
| EFFECT_RETURN | `BattleScript_EffectReturn` | executable | - | - | 1 | 1 (8) |
| EFFECT_PRESENT | `BattleScript_EffectPresent` | executable | - | - | 1 | 1 (1) |
| EFFECT_FRUSTRATION | `BattleScript_EffectFrustration` | executable | - | - | 1 | 1 (10) |
| EFFECT_SAFEGUARD | `BattleScript_EffectSafeguard` | executable | - | - | 1 | 1 (7) |
| EFFECT_THAW_HIT | `BattleScript_EffectThawHit` | executable | - | - | 2 | 1 (2) |
| EFFECT_MAGNITUDE | `BattleScript_EffectMagnitude` | executable | - | - | 1 | 1 (2) |
| EFFECT_BATON_PASS | `BattleScript_EffectBatonPass` | executable | - | - | 1 | 1 (13) |
| EFFECT_PURSUIT | `BattleScript_EffectHit` | executable | - | - | 1 | 1 (6) |
| EFFECT_RAPID_SPIN | `BattleScript_EffectRapidSpin` | executable | - | - | 1 | 1 (1) |
| EFFECT_SONICBOOM | `BattleScript_EffectSonicboom` | executable | - | - | 1 | 1 (1) |
| EFFECT_UNUSED_83 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_MORNING_SUN | `BattleScript_EffectMorningSun` | executable | - | - | 1 | 0 (0) |
| EFFECT_SYNTHESIS | `BattleScript_EffectSynthesis` | executable | - | - | 1 | 1 (13) |
| EFFECT_MOONLIGHT | `BattleScript_EffectMoonlight` | executable | - | - | 1 | 1 (3) |
| EFFECT_HIDDEN_POWER | `BattleScript_EffectHiddenPower` | executable | - | - | 1 | 1 (1) |
| EFFECT_RAIN_DANCE | `BattleScript_EffectRainDance` | executable | - | - | 1 | 1 (28) |
| EFFECT_SUNNY_DAY | `BattleScript_EffectSunnyDay` | executable | - | - | 1 | 1 (25) |
| EFFECT_DEFENSE_UP_HIT | `BattleScript_EffectDefenseUpHit` | executable | - | - | 1 | 1 (12) |
| EFFECT_ATTACK_UP_HIT | `BattleScript_EffectAttackUpHit` | executable | - | - | 2 | 2 (16) |
| EFFECT_ALL_STATS_UP_HIT | `BattleScript_EffectAllStatsUpHit` | executable | - | - | 2 | 2 (33) |
| EFFECT_UNUSED_8D | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_BELLY_DRUM | `BattleScript_EffectBellyDrum` | executable | - | - | 1 | 1 (2) |
| EFFECT_PSYCH_UP | `BattleScript_EffectPsychUp` | executable | - | - | 1 | 1 (14) |
| EFFECT_MIRROR_COAT | `BattleScript_EffectMirrorCoat` | executable | - | - | 1 | 1 (14) |
| EFFECT_SKULL_BASH | `BattleScript_EffectSkullBash` | executable | - | - | 1 | 0 (0) |
| EFFECT_TWISTER | `BattleScript_EffectTwister` | executable | - | - | 1 | 0 (0) |
| EFFECT_EARTHQUAKE | `BattleScript_EffectEarthquake` | executable | - | - | 1 | 1 (147) |
| EFFECT_FUTURE_SIGHT | `BattleScript_EffectFutureSight` | executable | - | - | 2 | 1 (5) |
| EFFECT_GUST | `BattleScript_EffectGust` | executable | - | - | 1 | 0 (0) |
| EFFECT_FLINCH_MINIMIZE_HIT | `BattleScript_EffectStomp` | executable | - | - | 4 | 4 (10) |
| EFFECT_SOLAR_BEAM | `BattleScript_EffectSolarBeam` | executable | - | - | 1 | 1 (16) |
| EFFECT_THUNDER | `BattleScript_EffectThunder` | executable | - | - | 1 | 1 (15) |
| EFFECT_TELEPORT | `BattleScript_EffectTeleport` | executable | - | - | 1 | 0 (0) |
| EFFECT_BEAT_UP | `BattleScript_EffectBeatUp` | blocked-on-opcodes | `B_SCR_OP_TRYDOBEATUP` (edge branch only) | - | 1 | 0 (0) |
| EFFECT_SEMI_INVULNERABLE | `BattleScript_EffectSemiInvulnerable` | executable | - | - | 4 | 4 (32) |
| EFFECT_DEFENSE_CURL | `BattleScript_EffectDefenseCurl` | executable | - | - | 1 | 1 (6) |
| EFFECT_SOFTBOILED | `BattleScript_EffectSoftboiled` | executable | - | - | 2 | 2 (7) |
| EFFECT_FAKE_OUT | `BattleScript_EffectFakeOut` | executable | - | - | 1 | 1 (15) |
| EFFECT_UPROAR | `BattleScript_EffectUproar` | executable | - | - | 1 | 1 (1) |
| EFFECT_STOCKPILE | `BattleScript_EffectStockpile` | executable | - | - | 1 | 1 (2) |
| EFFECT_SPIT_UP | `BattleScript_EffectSpitUp` | executable | - | - | 1 | 1 (1) |
| EFFECT_SWALLOW | `BattleScript_EffectSwallow` | executable | - | - | 1 | 1 (2) |
| EFFECT_UNUSED_A3 | `BattleScript_EffectHit` | executable | - | - | 0 | 0 (0) |
| EFFECT_HAIL | `BattleScript_EffectHail` | executable | - | - | 1 | 1 (7) |
| EFFECT_TORMENT | `BattleScript_EffectTorment` | executable | - | - | 1 | 1 (4) |
| EFFECT_FLATTER | `BattleScript_EffectFlatter` | executable | - | - | 1 | 1 (2) |
| EFFECT_WILL_O_WISP | `BattleScript_EffectWillOWisp` | executable | - | - | 1 | 1 (10) |
| EFFECT_MEMENTO | `BattleScript_EffectMemento` | executable | - | - | 1 | 1 (1) |
| EFFECT_FACADE | `BattleScript_EffectFacade` | executable | - | - | 1 | 1 (19) |
| EFFECT_FOCUS_PUNCH | `BattleScript_EffectFocusPunch` | executable | - | - | 1 | 1 (11) |
| EFFECT_SMELLINGSALT | `BattleScript_EffectSmellingsalt` | executable | - | - | 1 | 1 (1) |
| EFFECT_FOLLOW_ME | `BattleScript_EffectFollowMe` | executable | - | - | 1 | 1 (5) |
| EFFECT_NATURE_POWER | `BattleScript_EffectNaturePower` | blocked-on-opcodes | `B_SCR_OP_CALLENVIRONMENTATTACK` (main path) | - | 1 | 0 (0) |
| EFFECT_CHARGE | `BattleScript_EffectCharge` | blocked-on-opcodes | `B_SCR_OP_SETCHARGE` (main path) | - | 1 | 0 (0) |
| EFFECT_TAUNT | `BattleScript_EffectTaunt` | executable | - | - | 1 | 1 (2) |
| EFFECT_HELPING_HAND | `BattleScript_EffectHelpingHand` | executable | - | - | 1 | 1 (5) |
| EFFECT_TRICK | `BattleScript_EffectTrick` | executable | - | - | 1 | 1 (5) |
| EFFECT_ROLE_PLAY | `BattleScript_EffectRolePlay` | executable | - | - | 1 | 1 (1) |
| EFFECT_WISH | `BattleScript_EffectWish` | executable | - | - | 1 | 1 (8) |
| EFFECT_ASSIST | `BattleScript_EffectAssist` | blocked-on-opcodes | `B_SCR_OP_ASSISTATTACKSELECT` (main path) | - | 1 | 0 (0) |
| EFFECT_INGRAIN | `BattleScript_EffectIngrain` | executable | - | - | 1 | 1 (5) |
| EFFECT_SUPERPOWER | `BattleScript_EffectSuperpower` | executable | - | - | 1 | 1 (3) |
| EFFECT_MAGIC_COAT | `BattleScript_EffectMagicCoat` | executable | - | - | 1 | 1 (3) |
| EFFECT_RECYCLE | `BattleScript_EffectRecycle` | executable | - | - | 1 | 1 (1) |
| EFFECT_REVENGE | `BattleScript_EffectRevenge` | executable | - | - | 1 | 1 (3) |
| EFFECT_BRICK_BREAK | `BattleScript_EffectBrickBreak` | executable | - | - | 1 | 1 (46) |
| EFFECT_YAWN | `BattleScript_EffectYawn` | executable | - | - | 1 | 1 (10) |
| EFFECT_KNOCK_OFF | `BattleScript_EffectKnockOff` | executable | - | - | 1 | 1 (7) |
| EFFECT_ENDEAVOR | `BattleScript_EffectEndeavor` | executable | - | - | 1 | 1 (4) |
| EFFECT_ERUPTION | `BattleScript_EffectEruption` | executable | - | - | 2 | 2 (2) |
| EFFECT_SKILL_SWAP | `BattleScript_EffectSkillSwap` | executable | - | - | 1 | 1 (5) |
| EFFECT_IMPRISON | `BattleScript_EffectImprison` | blocked-on-opcodes | `B_SCR_OP_TRYIMPRISON` (main path) | - | 1 | 0 (0) |
| EFFECT_REFRESH | `BattleScript_EffectRefresh` | executable | - | - | 1 | 1 (2) |
| EFFECT_GRUDGE | `BattleScript_EffectGrudge` | executable | - | - | 1 | 1 (2) |
| EFFECT_SNATCH | `BattleScript_EffectSnatch` | blocked-on-opcodes | `B_SCR_OP_TRYSETSNATCH` (main path) | - | 1 | 0 (0) |
| EFFECT_LOW_KICK | `BattleScript_EffectLowKick` | executable | - | - | 1 | 1 (2) |
| EFFECT_SECRET_POWER | `BattleScript_EffectSecretPower` | executable | - | - | 1 | 1 (6) |
| EFFECT_DOUBLE_EDGE | `BattleScript_EffectDoubleEdge` | executable | - | - | 2 | 1 (52) |
| EFFECT_TEETER_DANCE | `BattleScript_EffectTeeterDance` | executable | - | - | 1 | 1 (2) |
| EFFECT_BLAZE_KICK | `BattleScript_EffectBurnHit` | executable | - | - | 1 | 1 (1) |
| EFFECT_MUD_SPORT | `BattleScript_EffectMudSport` | blocked-on-opcodes | `B_SCR_OP_SETTYPEBASEDHALVERS` (main path) | Operand gate: B_SCR_OP_PRINTFROMTABLE(gSportsUsedStringIds) -- gSportsUsedStringIds is outside the engine's accepted string-table pointer set (src/engine/battleScriptHitChainOpcode.ts:287; battle_script_commands.c:2184) | 1 | 0 (0) |
| EFFECT_POISON_FANG | `BattleScript_EffectPoisonFang` | executable | - | - | 1 | 1 (2) |
| EFFECT_WEATHER_BALL | `BattleScript_EffectWeatherBall` | blocked-on-opcodes | `B_SCR_OP_SETWEATHERBALLTYPE` (main path) | - | 1 | 0 (0) |
| EFFECT_OVERHEAT | `BattleScript_EffectOverheat` | executable | - | - | 2 | 1 (23) |
| EFFECT_TICKLE | `BattleScript_EffectTickle` | executable | - | - | 1 | 1 (3) |
| EFFECT_COSMIC_POWER | `BattleScript_EffectCosmicPower` | executable | - | - | 1 | 1 (7) |
| EFFECT_SKY_UPPERCUT | `BattleScript_EffectSkyUppercut` | executable | - | - | 1 | 1 (3) |
| EFFECT_BULK_UP | `BattleScript_EffectBulkUp` | executable | - | - | 1 | 1 (5) |
| EFFECT_POISON_TAIL | `BattleScript_EffectPoisonHit` | executable | - | - | 1 | 1 (1) |
| EFFECT_WATER_SPORT | `BattleScript_EffectWaterSport` | blocked-on-opcodes | `B_SCR_OP_SETTYPEBASEDHALVERS` (main path) | Operand gate: B_SCR_OP_PRINTFROMTABLE(gSportsUsedStringIds) -- gSportsUsedStringIds is outside the engine's accepted string-table pointer set (src/engine/battleScriptHitChainOpcode.ts:287; battle_script_commands.c:2184) | 1 | 0 (0) |
| EFFECT_CALM_MIND | `BattleScript_EffectCalmMind` | executable | - | - | 1 | 1 (16) |
| EFFECT_DRAGON_DANCE | `BattleScript_EffectDragonDance` | executable | - | - | 1 | 1 (14) |
| EFFECT_CAMOUFLAGE | `BattleScript_EffectCamouflage` | blocked-on-opcodes | `B_SCR_OP_SETTYPETOENVIRONMENT` (main path) | - | 1 | 0 (0) |

## Validation (fails the run on drift)

The tool itself asserts these before writing this doc and exits nonzero on any mismatch:

- `EFFECT_HIT`, `EFFECT_POISON_HIT`, `EFFECT_BURN_HIT`, `EFFECT_FREEZE_HIT`, `EFFECT_PARALYZE_HIT` each executable -- the SetMoveEffect quartet's own dispatch was already source-complete (PROGRESS 444), and B_SCR_OP_JUMPIFHALFWORD/JUMPIFSTATUS3CONDITION/ORWORD (registered 2026-07-25) closed the shared-entry chokepoint that used to block all five on an unrelated instruction
- `EFFECT_SLEEP`, `EFFECT_TOXIC`, `EFFECT_POISON`, `EFFECT_PARALYZE`, and `EFFECT_YAWN` executable after semantic restoration of their exact `PRINTFROMTABLE`/`COPYARRAY` callback operands (2026-07-28); the hardened walk's former blocker pins now require all five to remain executable
- `EFFECT_RECOIL` executable with its source-selected recoil callback walked: `ABILITY_ROCK_HEAD` is accepted by the engine's live `JUMPIFABILITY` surface
- Mean Look/Nightmare, Thief/Knock Off, Rapid Spin, Pain Split, Stockpile/Swallow, and Metronome each have an exact operand/dynamic-universe blocker-set ratchet; Rapid Spin and Pain Split also retain their exact missing-opcode sets
- `EFFECT_RECOIL_IF_MISS` executable (a real positive: it enters via `BattleScript_HitFromAtkString`, skipping the chokepoint entirely, and reaches moveend/checkteamslost)
- `EFFECT_ATTACK_DOWN_HIT`, `EFFECT_DEFENSE_DOWN_HIT`, `EFFECT_SPEED_DOWN_HIT`, `EFFECT_SPECIAL_ATTACK_DOWN_HIT`, `EFFECT_SPECIAL_DEFENSE_DOWN_HIT`, `EFFECT_ACCURACY_DOWN_HIT`, `EFFECT_ATTACK_UP_HIT`, `EFFECT_DEFENSE_UP_HIT` each executable (ISSUES #44: `SETMOVEEFFECT_SUPPORTED` is now derived from the engine's own exported `SET_MOVE_EFFECT_SUPPORTED_BYTES`, which spreads `STAT_MOVE_EFFECT_TABLE`'s keys, instead of a hand list that predated that table's registration)
- `EFFECT_MULTI_HIT`, `EFFECT_DOUBLE_HIT`, `EFFECT_TWINEEDLE` each executable (2026-07-27, scout §4 rungs 2-6: `B_SCR_OP_INITMULTIHITSTRING`/`B_SCR_OP_JUMPIFHASNOHP` registered, `JUMPIFHALFWORD`/`JUMPIFBYTE` per-operand widenings for `gChosenMove`/`MOVE_RESULT_FOE_ENDURED`, plus two further hidden barriers found running the committed scripts live rather than trusting the scout dossier -- `COPYARRAY`'s `cEFFECT_CHOOSER<-sMULTIHIT_EFFECT` tuple, and the `sMULTIHIT_STRING+4` hits-landed counter's `ADDBYTE` write / `gBattleTextBuff1` `COPYARRAY` read, both real on every multi-hit iteration, not Triple-Kick-only as the dossier's §1d table claimed)
- `EFFECT_TRIPLE_KICK` executable (2026-07-27, scout §4 rungs 7-9: `damagecalcOpcodeHandler` now reads `rules.tripleKickPower` for the real 10/20/30 dynamic-base-power ramp; `ADDBYTE`'s `sTRIPLE_KICK_POWER` delta literal `10` and `JUMPIFBYTE`'s `sMULTIHIT_STRING+4`/standalone `MOVE_RESULT_DOESNT_AFFECT_FOE` are now resolvable; plus a hidden barrier found live running the committed script that the scout dossier's §1d table wrongly called "registered" -- `COPYARRAY`'s `gDynamicBasePower<-sTRIPLE_KICK_POWER` tuple, now modeled as a pure-advance no-op since `gDynamicBasePower` has no materialized field here)
- `EFFECT_ROAR` executable (2026-07-27, scout §4 rungs 10-14: `B_SCR_OP_FORCERANDOMSWITCH`/`SWITCHOUTABILITIES`/`RETURNTOBALL` registered source-complete; `B_SCR_OP_FINISHACTION` registered as an unconditional (b) barrier per docs/script-terminal-gate3-evidence.md's own deferral, but that barrier sits on `BattleScript_SuccessForceOut`'s not-taken `BATTLE_TYPE_TRAINER == false` fork arm, which this census's static walk always visits regardless of runtime battle-type dominance -- see Caveats -- so the row is executable via its real, taken-for-Factory branch. A real `BATTLE_TYPE_ARENA` value gap found live running this exact script (defined locally in `battleScriptJumpifwordOpcode.ts` but never added to `JUMPIFWORD_VALUES`, despite the scout dossier's §1a table calling it "already registered") was fixed in that file, not a control-flow-extractor regression)

All checks passed for this run.

## Caveats (read before trusting a number here)

- **Registration coverage, not semantic verification.** "Executable" means every reachable opcode has a dispatch entry and the tracked static operand gates accept that script's operands, not that behavior is bit-exact or every durable consumer exists. Registered runtime/state barriers still count as "registered" per ROADMAP S10 §1 unless they are one of the explicit static gates below.
- **Tracked registered-operand gates.** `Cmd_seteffectwithchance`/`Cmd_seteffectprimary`'s SetMoveEffect dispatch (`applySetMoveEffect`, `src/engine/battleScriptHitChainOpcode.ts:1760-1971`) is opcode-registered but internally branches on the `MOVE_EFFECT_*` byte a script sets via the preceding `setmoveeffect` statement. The census tracks that operand along each walk, reading the supported-byte set live from the engine's own exported `SET_MOVE_EFFECT_SUPPORTED_BYTES` (ISSUES #44) rather than a second hand-maintained copy, with a name<->id lookup table guarded by an assertion that fails the run if the engine's dispatch grows an id this tool cannot name yet. It also reads `JUMPIFSTATUS2`, `PLAYANIMATION`, `COPYARRAY`/`COPYBYTE`, and `PRINTFROMTABLE` acceptance directly from the private production declarations that enforce them; `JUMPIFABILITY` keeps using its engine-exported live set. `JUMPIFARRAYEQUAL` is probed through its real installed handler once registered. An unaccepted operand is a subsystem blocker even though the opcode itself is installed. Other registered multi-branch runtime barriers are not modeled operand-by-operand.
- **Fixed C-selected callbacks.** SetMoveEffect callback labels and `Cmd_rapidspinfree`'s cleanup labels do not appear as bytecode operands, so the committed graph cannot expose them. The census derives those fixed labels from the pinned `battle_script_commands.c` and walks them as additional paths. This is what makes recoil's Rock Head gate, Thief/Knock Off's item animations, and Rapid Spin's Wrap-return copy tuple visible without hand-maintaining callback labels.
- **Call/return modeling.** A `call` edge is treated as reaching *both* the callee's entry (to collect its opcodes) and the callsite's recorded continuation (`callsiteContinuations`), unconditionally. This assumes the callee always returns; it does not model the callee diverging (e.g. hitting `end` without returning), which would make this census's reachable set a strict superset of the true one in rare cases -- i.e. it can only make an effect look *more* blocked than reality, never less.
- **"Main path" is a conservative proxy, not a dominance analysis.** An opcode is reported as reached "on the main path" only if some route from the entry reaches it using zero conditional forks (unconditional fallthrough, unconditional `goto`, and calls only). Any instruction beyond the first conditional jump in a script is reported as "edge branch only" even if every real branch of that fork reconverges to the same later instruction. This under-claims "main path" rather than over-claiming it.
- **Dynamic dispatch, three categories.** `B_SCR_OP_JUMPTOCALLEDMOVE` (Sleep Talk/Assist-style "run another move's effect script") has a runtime-computed target with no static label operand. The called script is not walked from that call site; once the dynamic opcode itself is registered, the caller is executable and each possible called effect remains accountable in its own census row. Metronome is the explicit exception: its legal selectable universe is the move's entire contract, so its own row retains a named dynamic-universe blocker even after opcode registration and cannot appear as a one-opcode win. Separately, `B_SCR_OP_FORCERANDOMSWITCH`'s success target (`BattleScript_SuccessForceOut`) is fixed at compile time but never spelled as a bytecode operand -- `Cmd_forcerandomswitch` writes `gBattlescriptCurrInstr` directly (`battle_script_commands.c:7181`) instead of reading one. Since that target IS statically known, it is modeled as a real jump edge (`HARDCODED_SUCCESS_TARGETS` in this tool) so the walk actually visits it, unlike the runtime-resolved `JUMPTOCALLEDMOVE` case.
- **Control-flow correction pass.** `src/data/gen/battle-script-graph.json`'s edge extractor (`tools/extract/extract-battle-script-graph.ts`) only recognizes a script-pointer operand as a jump target when the opcode name matches a fixed pattern (`B_SCR_OP_JUMPIF*`, plus a short unconditional allowlist). Opcodes with a differently-named pointer operand (`accuracycheck`'s failPtr, `statbuffchange`'s jumpptr, `forcerandomswitch`'s ptr, ...) get zero jump edge from the committed graph. This tool corrects that mechanically from the graph's own `labelOperands` (already computed per statement, just not wired into every edge) rather than opcode-by-opcode: any statement with a label operand not already covered by an existing jump/call edge gets one synthesized, which can only make an effect look more blocked than the committed graph claims, never less. The one further correction needed is `B_SCR_OP_FORCERANDOMSWITCH` specifically: audited against `battle_script_commands.c` this session, it never falls through to its assembly successor on any branch (unlike every other audited "ptr"-operand opcode, which do genuinely advance on the non-jump branch), so its one fabricated fallthrough edge is suppressed rather than kept alongside the added jump edges (`NEVER_FALLS_THROUGH_OPCODES` in this tool). See docs/roar-multihit-registration-scout.md for the EFFECT_ROAR case this was found from.
- **Factory-L50 legality** is taken directly from the topology's own precomputed `level50FactoryReachableEffects` join (the 850-set boundary); this tool does not recompute Factory legality itself.

