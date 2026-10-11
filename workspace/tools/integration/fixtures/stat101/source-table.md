# stat101 source table: General_StatsChange (B_ANIM_STATS_CHANGE)

Base a36a956ac (production src e3c8092c). Source = reference/pokeemerald (pret). Every row cites the line that owns it.

## 1. Entry: who plays it, in which scene

| Input | Source | Effect on the animation |
|---|---|---|
| Scene ON / OFF | `Cmd_playanimation` battle_script_commands.c:4011 exempts B_ANIM_STATS_CHANGE (with SNATCH_MOVE, SUBSTITUTE_FADE) from HITMARKER_NO_ANIMATIONS; `Cmd_playstatchangeanimation` (:4110-4205) never checks it | plays in BOTH scenes, same frames (ROM: ON == OFF, receipts) |
| behind a Substitute | `TryHandleLaunchBattleTableAnimation` battle_gfx_sfx_util.c:468: behindSubstitute && !ShouldAnimBeDoneRegardlessOfSubstitute (STATS_CHANGE not listed, :505-519) -> return TRUE (no task) | NO animation at all: the controller completes at once (doll90 / liveSubstituteSwap.ts:140 already rely on this) |
| clamped stage (+-6) | BattleScript_StatUp / StatDown route around `playanimation` when B_MSG_STAT_WONT_CHANGE (battle_scripts_1.s:495-497, 541-544); production already emits no `stat` command (battleResolutionPresentation.ts:3507-3516) | no animation |
| `gBattleScripting.statAnimPlayed` | Cmd_playstatchangeanimation :4196 plays only if !statAnimPlayed; set after a MULTIPLE_STATS play (:4200) so the per-stat fallback lines (e.g. :2216 / :2664) do not replay | ONE animation per playstatchangeanimation group |
| animArg | `gBattleSpritesDataPtr->animationData->animArg` <- `sB_ANIM_ARG1` (playanimation; set by `setgraphicalstatchangevalues`) or statAnimId (playstatchangeanimation) | switch in AnimTask_StatsChange battle_anim_status_effects.c:482-540 |

## 2. animArg -> (goesDown, palette, sharply)

STAT ids: ATK 1, DEF 2, SPEED 3, SPATK 4, SPDEF 5, ACC 6, EVASION 7 (include/constants/pokemon.h). Bases: PLUS1 14, MINUS1 21, PLUS2 38, MINUS2 45 (include/battle_anim.h:195-202).

| animArg | goesDown | palette (STAT_ANIM_PAL_*) | sharply |
|---|---|---|---|
| 15..21 = PLUS1 + stat | 0 | stat's own (ATK attack, DEF defense, SPEED speed, SPATK sp_attack, SPDEF sp_defense, ACC accuracy, EVA evasion) | 0 |
| 22..28 = MINUS1 + stat | 1 | stat's own | 0 |
| 39..45 = PLUS2 + stat | 0 | stat's own | 1 |
| 46..52 = MINUS2 + stat | 1 | stat's own | 1 |
| 55 MULTIPLE_PLUS1 / 56 PLUS2 / 57 MINUS1 / 58 MINUS2 | 0 / 0 / 1 / 1 | MULTIPLE (gray) | 0 / 1 / 0 / 1 |
| anything else | task destroyed at once (no frames) | | |

Note: 21 = MINUS1 base + 0 is unused; PLUS1 + EVASION = 21 hits the PLUS1 case first in the switch order (EVASION up).

## 3. Parameters -> registers / timeline (StatsChangeAnimation_Step1..3, battle_anim_utility_funcs.c:426-628)

| Parameter | Register / state | Value |
|---|---|---|
| (all) Step1 | WININ = WIN0_ALL / WIN1_ALL; WINOUT = (WIN01_ALL & ~BG1) / WINOBJ_ALL; DISPCNT |= OBJWIN_ON; BLDCNT = TGT1_BG1 / TGT2_ALL / BLEND; BLDALPHA = (0, 16); BG1 priority 0, screen size 0, char base 1 | BG1 is visible ONLY inside the OBJ window |
| battler (attacker of the anim = the stat-changed battler) | `CreateInvisibleSpriteCopy` battle_anim_mons.c:2323: a STRUCT COPY of gSprites[gBattlerSpriteIds[battler]] (x, y, x2, y2, affine, tiles, invisible, anim frame) with objMode = OBJ_WINDOW, priority 0, callback SpriteCallbackDummy | the mask = the battler's sprite silhouette frozen at Step2 (elevation / y2 / x2 / the Substitute doll tiles / an invisible battler -> empty mask). Species (GetMonData) is stored but CreateInvisibleSpriteCopy ignores it (Castform's form = whatever tiles the battler sprite shows) |
| goesDown | gBattle_BG1_X = 64 (down) else 0; tVelocity = -3 (down) / +3 (up); gBattle_BG1_Y += tVelocity EVERY Step3 call | tilemap gStatAnim_Decrease_Tilemap (down) / gStatAnim_Increase_Tilemap (up) |
| palette | LoadCompressedPalette(gStatAnim_<stat>_Pal, BG_PLTT_ID(animBg paletteId)) | 8 palettes, graphics/battle_anims/stat_change/*.pal |
| sharply | tTargetBlend 13 / tWaitTime 30 (else 10 / 20) | fade in: blend +1 every 2nd Step3 call to target; hold until ++tWaitTimer == tWaitTime; fade out: -1 every 2nd call to 0, then ResetBattleAnimBg; state 3 restores WIN / DISPCNT / BLD, destroys the copy sprite(s) |
| side | SOUND_PAN_ATTACKER (audio only); OBJ-window position follows the copy | no other side dependency in the task |
| double battles / contests | battler2 / hidBattler2 / aMultipleBattlers (always FALSE) | not reachable in Factory singles |
| SE | SE_M_STAT_INCREASE / SE_M_STAT_DECREASE (Step2) | audio only |

Source arithmetic (frames of Step3): ON-screen BLDALPHA steps = 2 * target per fade; predicted active span = Step1 + Step2 + 2*T + W + 2*T + reset. The ROM receipts (fixtures/stat101/receipts) are authoritative for the exact span and the per-row blend / scroll phase.

## 4. Who plays it (call sites, data/battle_scripts_1.s)

| Script | Line | Command | animArg | Factory examples |
|---|---|---|---|---|
| BattleScript_StatUpDoAnim / StatUp | 503 / 511 | playanimation BS_ATTACKER / BS_EFFECT_BATTLER, sB_ANIM_ARG1 | PLUS1 / PLUS2 + stat | Swords Dance, Agility, Amnesia, Double Team, Growth, Defense Curl, Harden, ..., Charge-up secondaries (Metal Claw, Steel Wing, Meteor Mash, Ancient Power is AllStatsUp) |
| BattleScript_StatDownDoAnim / StatDown | 549 / 557 | playanimation BS_TARGET / BS_EFFECT_BATTLER | MINUS1 / MINUS2 + stat | Growl, Leer, Sand Attack, Scary Face, Screech, Charm, Fake Tears, Metal Sound, String Shot; secondary drops (Acid, Psychic, Crunch, Shadow Ball, Mud-Slap, Bubble, Icy Wind, Rock Tomb, Mud Shot, Octazooka, ...) via BS_EFFECT_BATTLER |
| BattleScript_EffectSwagger / Flatter | 1621 / 2164 | playanimation BS_TARGET | PLUS2 ATK / PLUS1 SPATK | Swagger, Flatter |
| BattleScript_EffectSkullBash | 1820 | playanimation BS_ATTACKER | PLUS1 DEF | Skull Bash charge |
| BattleScript_EffectMemento | 2215-2224 | playstatchangeanimation BS_TARGET ATK / SPATK, NEGATIVE / BY_TWO (MULTIPLE first) | 58, else 46 / 49 | Memento |
| BattleScript_TickleDoMoveAnim | 2663-2671 | playstatchangeanimation BS_TARGET ATK / DEF, NEGATIVE (MULTIPLE first) | 57, else 22 / 23 | Tickle |
| CosmicPower / BulkUp / CalmMind / DragonDance | 2697 / 2726 / 2751 / 2783 | playstatchangeanimation BS_ATTACKER, 2 stats, 0 | 55 (both change) or PLUS1 + the one stat | Cosmic Power, Bulk Up, Calm Mind, Dragon Dance |
| BattleScript_AllStatsUpAtk | 3460 | playstatchangeanimation BS_ATTACKER, 5 stats, 0 | 55 | Ancient Power / Silver Wind / Ominous Wind secondary |
| BattleScript_AtkDefDown | 3626-3634 | playstatchangeanimation BS_ATTACKER ATK / DEF, CANT_PREVENT / NEGATIVE | 57, else 22 / 23 | Superpower |
| BattleScript_SAtkDown2 | 3700 | playstatchangeanimation BS_ATTACKER SPATK, NEGATIVE / BY_TWO | 49 | Overheat, Psycho Boost |
| BattleScript_SpeedBoostActivates | 3966 | playanimation BS_ATTACKER | PLUS1 SPEED (17) | Speed Boost (end of turn) |
| BattleScript_IntimidateActivatesLoop | 4036 | playanimation BS_TARGET | MINUS1 ATK (22) | Intimidate (switch-in) |

Held items: no Gen 3 held item raises a stage with this animation in singles except the pinch berries (Liechi / Ganlon / Salac / Petaya / Apicot -> BattleScript_BerryStatRaiseEnd -> StatUp path; Starf picks a random stat, sharply). Check per census row (exposure.json lists the actual animArg mix).

## 5. Assets

| Asset | Source | Production catalog |
|---|---|---|
| gStatAnim_Gfx (64 tiles, 4bpp) | graphics/battle_anims/stat_change/tiles.png (graphics.c:869) | `src/assets/gen/stat-anim-banner.json` `tileset` (16 x 4 tiles), extractor `tools/extract/extract-stat-anim.ts` |
| gStatAnim_Increase / Decrease_Tilemap (32x32) | increase.bin / decrease.bin (:870-871) | same file `tilemaps.increase` / `tilemaps.decrease` |
| 8 palettes (attack, defense, accuracy, speed, evasion, sp_attack, sp_defense, multiple) | *.pal (:872-879) | same file `palettes.*` (all 8, incl. `multiple`) |
| the OBJ-window mask | the battler's live sprite (field art + live x2 / y2 / elevation / doll / invisibility) | live renderer state (liveBattlerX2History, substitute doll, field art); no new asset |

Existing renderers (production): `battleScene.ts` `statAnimBg1PixelAt` / `drawStatIncreaseBannerForBattler` / `drawStatDecreaseBannerForBattlerPalette` (BG1 wrap sample + alpha blend under a tile mask) and `sceneOffStatStageBannerView` (a 2-frame frozen sample at source ages 94 / 96 of the Sand Attack ACC cadence); battleSceneCanonical.ts `drawStatsBanner` (retired canonical turn 1). So NO asset extraction is needed: slice (a) is a pure reducer over existing assets.
