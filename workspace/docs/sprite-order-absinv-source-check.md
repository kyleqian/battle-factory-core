# Sprite-order abs-invariant rows: source check (S10A, 23 rows)

Question: for each of the 23 `tier: "abs-invariant"` rows of `tools/integration/fixtures/sprite-order-body-plans-rely.json`
(docs/sprite-order-rely-confirmation.md), does every sprite that lands in a KEYS group (equal priority word, different y: the
groups whose relative y decides the destroy order) have a y that depends only on battler-position constants and script constants?

Paths: `S` = `reference/pokeemerald/data/battle_anim_scripts.s`, `src/…` = `reference/pokeemerald/src/`.

## Position primitives (src/battle_anim_mons.c)

* `GetBattlerSpriteCoord(b, BATTLER_COORD_X | X_2 | Y)` reads `sBattlerCoords[IS_DOUBLE_BATTLE()][position]` (:112-:127): constants.
  `GetBattlerSpriteCoord2` with those coord types calls the same function (:294). `InitSpritePosToAnimAttacker/Target(sprite, FALSE)` uses
  `GetBattlerSpriteCoord2(…, X)` / `(…, Y)` (:820-:846): constants + script args.
* SPECIES-DEPENDENT paths: `BATTLER_COORD_Y_PIC_OFFSET` (:128-:170, `GetBattlerSpriteFinal_Y`, picture coords + elevation),
  `InitSpritePosTo…(sprite, TRUE)` (same), and `GetBattlerYCoordWithElevation` (:~245, `y - gEnemyMonElevation[species]`, opponent side only).
* A sprite whose callback does not overwrite x/y keeps the creation position; `AnimSpriteOnMonPos` and the hit-splat callbacks go through
  `InitSpritePosTo…(…, respectMonPicOffsets)` (`src/battle_anim_mons.c` / `battle_anim_normal.c:1006`), see the per-row notes.
* Species-dependent sprites that exist in a move but are destroyed ALONE in the plan (single-token `D<k>` window, not a KEYS group)
  cannot influence a relative-y order and are noted but do not count.

## Per-sprite callback table

| sprite (template) | callback y | verdict |
|---|---|---|
| gRoarNoiseLineSpriteTemplate | `AnimRoarNoiseLine` `src/battle_anim_effects_3.c:3924-3954`: `GetBattlerSpriteCoord(attacker, Y) + arg1`; step `:3957` adds data-constant velocities | const |
| facade sweat drops (`CreateSweatDroplets`) | `src/battle_anim_effects_3.c:3742-3760,3804-3846`: `tBaseY = GetBattlerSpriteCoord(battler, BATTLER_COORD_Y)`, fixed offsets (+-20, +6), `AnimFacadeSweatDrop` y += -1 | const |
| gWhirlwindLineSpriteTemplate | `AnimWhirlwindLine` `src/battle_anim_flying.c:903-929`: `InitSpritePosToAnimTarget(.., FALSE)`; step only changes x2 | const |
| gSweetScentPetalSpriteTemplate | `AnimSweetScentPetal` `src/battle_anim_effects_3.c:2800-2845`: y = arg (-30 opp), `y -/+= 1`, `y2 = Sin/Cos(...,16)`: no battler coordinate at all | const |
| gDirtPlumeSpriteTemplate | `AnimDirtPlumeParticle` `src/battle_anim_ground.c:504-529`: `GetBattlerYCoordWithElevation(target) + 30`, arc/linear translation relative to that start | common-mode shift only (see 90) |
| gRockScatterSpriteTemplate | `AnimRockScatter` `src/battle_anim_rock.c:808-840`: `GetBattlerSpriteCoord(target, Y) + arg1`, `y2 -= Sin(data[0], data[5])` | const |
| gSoftBoiledEggSpriteTemplate | `AnimSoftBoiledEgg` `src/battle_anim_effects_2.c:2689-2790`: `InitSpritePosToAnimAttacker(.., FALSE)`, y2 integrators with constants | const |
| gThinRingExpandingSpriteTemplate / gBellSpriteTemplate | `AnimSpriteOnMonPos` (`src/battle_anim_mons.c`): `respectMonPicOffsets = !args[3]`; every use here passes arg3 = 1 (`S:7715,7756,7698,7700`) so `InitSpritePosTo…(.., FALSE)` | const |
| gHealBellMusicNoteSpriteTemplate | `AnimHealBellMusicNote` `src/battle_anim_effects_2.c:3053-3064`: `InitSpritePosToAnimAttacker(.., FALSE)`, destination `GetBattlerSpriteCoord(attacker, Y) + arg3` | const |
| gMoonSpriteTemplate / gMoonlightSparkleSpriteTemplate | `src/battle_anim_effects_1.c:4946-4996`: absolute screen y from script args (`S:3372,3376-3384`); sparkle `y++` every other frame | const |
| gAromatherapySmallFlower / BigFlower | `AnimFlyingParticle` `src/battle_anim_effects_1.c` (unk5 switch): every Aromatherapy use has unk5 = 0 or 1 (`S:4146-4156`) -> `y = args[0]` (screen constant); modes 2/3 (PIC_OFFSET) are never used | const |
| gSparklingStarsSpriteTemplate (Heal Bell `S:7742-7744`, Aromatherapy `S:4166-4168`) | `AnimSparklingStars` `src/battle_anim_effects_1.c:4115`: arg6 = 1 -> `BATTLER_COORD_Y_PIC_OFFSET` (species-dependent) | species-dependent, but each star is destroyed ALONE (`D16;D17` in 215, singleton windows in 312): not in a KEYS group |
| gBasicHitSplatSpriteTemplate (Seismic Toss `S:9473,9482`, Endeavor `S:3797,3801`) | `AnimHitSplatBasic` `src/battle_anim_normal.c:1006`: `InitSpritePosToAnimTarget(.., TRUE)` -> pic offsets | species-dependent, destroyed ALONE (`D0`,`D5`,`D10` in 69; `D4`,`D9`,`D13` in 283:player) |
| gHealingBlueStarSpriteTemplate (Moonlight `S:10047`, Soft Boiled `S:10059`) | creation position (+args) | destroyed ALONE (`D7`..`D10` in 236, `D6`..`D8` in 135) |

## Per-row verdicts

| cell | move | KEYS groups (rel y) | verdict | citation |
|---|---|---|---|---|
| 46:opponent, 46:player | ROAR | 2 x 3 noise lines [81,41,0] | SOURCE-CONFIRMED | `S:4965-4981`, `RoarEffect S:4983-4991` (arg y -8/0/8, `AnimRoarNoiseLine`) |
| 336:opponent, 336:player | HOWL | same 2 x 3 noise lines | SOURCE-CONFIRMED | `S:4380-4388`, `RoarEffect` |
| 45:opponent, 45:player | GROWL | same 2 x 3 noise lines | SOURCE-CONFIRMED | `S:4993-5003`, `RoarEffect` (ShakeMon2 tasks create no sprites) |
| 263:opponent, 263:player | FACADE | 6 x 4 sweat drops [6,6,0,0] | SOURCE-CONFIRMED | `S:3538-3543`, `CreateSweatDroplets` |
| 283:player | ENDEAVOR | 4 x 4 sweat drops [6,6,0,0] | SOURCE-CONFIRMED | `S:3789-3803`; hit splats (species-dependent) are singleton windows |
| 90:opponent, 90:player | FISSURE | 3 x 4 dirt plumes [36,21,4,0],[18,13,1,0],[36,21,4,0] | SOURCE-CONFIRMED (relative y) | `S:2609-2634`, `FissureDirtPlumeFar/Close S:2636-2650`, `AnimDirtPlumeParticle`: absolute y = `COORD_Y - gEnemyMonElevation[species]` (opponent target only) is a COMMON offset of all four plumes of a group (same target battler, linear/arc translation relative to the start), so relative y is species-independent; absolute y (not used by the plan) may shift by elevation |
| 69:opponent, 69:player | SEISMIC_TOSS | 3 x 4 rocks [25,22,12,0],[21,18,11,0],[25,22,12,0] | SOURCE-CONFIRMED | `S:9424-9450,9472-9489`, `AnimRockScatter`; hit splats singleton |
| 230:opponent, 230:player | SWEET_SCENT | [15,0] petal pair | SOURCE-CONFIRMED | `S:8324-8360`, `AnimSweetScentPetal` (no battler coordinate) |
| 135:player | SOFT_BOILED | [18,0] two eggs | SOURCE-CONFIRMED | `S:7685-7706`, `AnimSoftBoiledEgg`, ring args `S:7698-7700` |
| 18:opponent, 18:player | WHIRLWIND | 6 lines [40,32,24,16,8,0] | SOURCE-CONFIRMED | `S:2032-2049` (y args -8..32), `AnimWhirlwindLine` |
| 236:player | MOONLIGHT | 6 sprites [64,48,32,16,0,10] (moon + 5 sparkles) | SOURCE-CONFIRMED | `S:3365-3390`, `AnimMoon` / `AnimMoonlightSparkle` (screen constants) |
| 215:opponent, 215:player | HEAL_BELL | [99,97,51,0],[67,0],[61,59,0] (notes + rings) | SOURCE-CONFIRMED | `S:7708-7752`, `HealBellRing S:7753-7758`, `AnimHealBellMusicNote`, ring arg3=1; sparkling stars singleton |
| 312:opponent, 312:player | AROMATHERAPY | [48,0],[33,0],[15,0] flowers | SOURCE-CONFIRMED | `S:4137-4174` (unk5 in {0,1}), `AnimFlyingParticle`; sparkling stars singleton |

23 rows, 23 SOURCE-CONFIRMED, 0 SPECIES-DEPENDENT in a KEYS group, 0 UNCLEAR.
Residual caveat (shared with all rely rows): the plan's *window* structure (which sprites die together, and when) is observed, not derived;
this check only closes the "second absolute-y geometry" gap for the y that orders sprites inside a window.
