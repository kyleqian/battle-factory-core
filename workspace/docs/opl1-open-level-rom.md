# opl1: Open Level on the ROM (measured 2026-11-22)

ROM facts for the Open Level option, measured with the tools in `tools/openlevel/` (README there) on the new bootstrap
profiles `oracle/bootstrap/factory-open.json` and `factory-open-battle-scene-off.json` (`oracle/BOOTSTRAP.md`, "Open Level
profiles"). Level 50 runs of the same tools are the control. Nothing was written into the ROM for sections 1-3; every number
is read from RAM, a trapped function argument or the screen. Evidence (outside git) is under
`.integration/evidence/opl1/`.

Frame numbers: "frame N" is 0-indexed from power-on (the bootstrap is frames 0-6969). "Route frame t" counts from the draft
anchor along `oracle/battle_lab.py` `SELECT_TO_ACTION_MENU` (route frame 0 is the first frame after the anchor; absolute frame
= 6970 + t). A value "after frame t" is RAM read when frame t has finished. Older docs count ticks from 1 (their tick 403 is
route frame 402 here; the screen sha256 values match).

## 1. The Open Level anchor

The OPEN LEVEL choice (DOWN before tap 6) gives the ROM's own Open challenge: lvlMode 1, streak flag 0x200, six rentals
406, 381, 466, 438, 382, 430 (KANGASKHAN, LANTURN, METAGROSS, EXEGGUTOR, BRELOOM, NINETALES), built at level 100 with IVs 3,
battle 1 trainer 63 with sets 375, 454, 465. Canonical screen sha256
`9a1d50cd8697d0e507863c2b1f424ca65537837824d220a76fde028e5fd80c06` in both scenes; two fresh processes per profile gave
identical output. `GenerateInitialRentalMons` is entered at frame 5795 with gRngValue `0x08a74230`, the same frame and cursor
as Level 50; the Open deal draws 6 times (Level 50: 11), so everything after it differs. Full table: `oracle/BOOTSTRAP.md`.
Picture: `boot/anchor-open-on.png`.

## 2a. The PreBattleRoom walk ("Right this way, please!")

Measured with `firstBattle.py` on all four profiles (rent slots 1-3, YES, A on the message at route frames 400-401). Both
scenes give the same walk at each level. Pictures: `battle1b/walk-{lv50,open}-{off,on}-t{400,402,418,434,450,466,482,499,519}.png`;
per-frame object events, sprites and camera: `battle1b/*.json` (`walk`) and `walk/walk-tables.json`.

Timing (identical at both levels): the message stays on screen through route frame 401; RAM shows the first steps after
frame 401; the first changed screen is route frame 402 (sha `1ecfabf2…`, the engine doc's tick 403). The player walks 80
frames (5 tiles x 16), last moving RAM after frame 480; the screen is black from route frame 500 to 518 (19 frames); SaveBlock1
shows map 26.33 (the battle room) from frame 506; the battle room is first visible at route frame 519 (`436c0643…`).

Tile steps (room tiles; the object events hold them + 7). Each object's current tile changes on the first frame of its step:

| route frame | Level 50 player | Level 50 attendant | Open player | Open attendant |
| --- | --- | --- | --- | --- |
| before | (8,8) facing N | (8,7) facing S | (8,8) facing N | (8,7) facing S |
| 401 | walk up → (8,7) | walk left → (7,7) | walk up → (8,7) | walk right → (9,7) |
| 417 | walk left → (7,7) | walk left → (6,7) | walk right → (9,7) | walk right → (10,7) |
| 433 | walk left → (6,7) | walk up → (6,6) | walk right → (10,7) | walk up → (10,6) |
| 449 | walk up → (6,6) | walk up → (6,5) | walk up → (10,6) | walk up → (10,5) |
| 465 | walk up → (6,5) | set_invisible | walk up → (10,5) | set_invisible |

So the Open walk goes right, as `scripts.inc:46-48,383-386,404-409,429-434` says.

Engine table. Columns as `src/engine/prebattleRoom.ts` `WALK_STEPS` plus two flips: `[originX, originY, attendantScreenX,
attendantScreenY, attendantInvisible, playerFrame, attendantFrame, playerHFlip, attendantHFlip]`. Row k is RAM after route
frame 401 + k, shown on screen at route frame 402 + k (the engine's elapsed 0 = tick 403). Derivation, no fitted constant:
- origin = the settled origin (16, 56) (`prebattle-room-layout.json`, playerTile 8,8) minus the change of
  (gSpriteCoordOffsetX, gSpriteCoordOffsetY) from their settled (0, 40);
- attendant screen = sprite x + x2 + gSpriteCoordOffsetX + centerToCornerVecX (-8), y likewise (-16); the player's comes out
  (112, 56) on every frame;
- frame = the picture index of the sprite's current anim command (`anims[animNum][animCmdIndex]`), flip = OAM attribute 1
  bit 12, invisible = the attendant object event's invisible flag.

This derivation reproduces the engine's Level 50 table, all 80 rows, in both scenes (its two flip columns are 0 throughout).
The Open table is its mirror: originX = 32 - originX(Lv50), attendantScreenX = 224 - attendantScreenX(Lv50), every other
column equal, plus the flips: the attendant is flipped in rows 0-31 (its two right steps), the player in rows 16-47 (its two
right steps). The Open table, both scenes:

```json
[
  [16, 55, 113, 41, 0, 5, 7, 0, 1], [16, 54, 114, 42, 0, 5, 7, 0, 1], [16, 53, 115, 43, 0, 5, 7, 0, 1], [16, 52, 116, 44, 0, 5, 7, 0, 1],
  [16, 51, 117, 45, 0, 5, 7, 0, 1], [16, 50, 118, 46, 0, 5, 7, 0, 1], [16, 49, 119, 47, 0, 5, 7, 0, 1], [16, 48, 120, 48, 0, 5, 7, 0, 1],
  [16, 47, 121, 49, 0, 1, 2, 0, 1], [16, 46, 122, 50, 0, 1, 2, 0, 1], [16, 45, 123, 51, 0, 1, 2, 0, 1], [16, 44, 124, 52, 0, 1, 2, 0, 1],
  [16, 43, 125, 53, 0, 1, 2, 0, 1], [16, 42, 126, 54, 0, 1, 2, 0, 1], [16, 41, 127, 55, 0, 1, 2, 0, 1], [16, 40, 128, 56, 0, 1, 2, 0, 1],
  [17, 40, 128, 56, 0, 8, 8, 1, 1], [18, 40, 128, 56, 0, 8, 8, 1, 1], [19, 40, 128, 56, 0, 8, 8, 1, 1], [20, 40, 128, 56, 0, 8, 8, 1, 1],
  [21, 40, 128, 56, 0, 8, 8, 1, 1], [22, 40, 128, 56, 0, 8, 8, 1, 1], [23, 40, 128, 56, 0, 8, 8, 1, 1], [24, 40, 128, 56, 0, 8, 8, 1, 1],
  [25, 40, 128, 56, 0, 2, 2, 1, 1], [26, 40, 128, 56, 0, 2, 2, 1, 1], [27, 40, 128, 56, 0, 2, 2, 1, 1], [28, 40, 128, 56, 0, 2, 2, 1, 1],
  [29, 40, 128, 56, 0, 2, 2, 1, 1], [30, 40, 128, 56, 0, 2, 2, 1, 1], [31, 40, 128, 56, 0, 2, 2, 1, 1], [32, 40, 128, 56, 0, 2, 2, 1, 1],
  [33, 40, 127, 55, 0, 7, 5, 1, 0], [34, 40, 126, 54, 0, 7, 5, 1, 0], [35, 40, 125, 53, 0, 7, 5, 1, 0], [36, 40, 124, 52, 0, 7, 5, 1, 0],
  [37, 40, 123, 51, 0, 7, 5, 1, 0], [38, 40, 122, 50, 0, 7, 5, 1, 0], [39, 40, 121, 49, 0, 7, 5, 1, 0], [40, 40, 120, 48, 0, 7, 5, 1, 0],
  [41, 40, 119, 47, 0, 2, 1, 1, 0], [42, 40, 118, 46, 0, 2, 1, 1, 0], [43, 40, 117, 45, 0, 2, 1, 1, 0], [44, 40, 116, 44, 0, 2, 1, 1, 0],
  [45, 40, 115, 43, 0, 2, 1, 1, 0], [46, 40, 114, 42, 0, 2, 1, 1, 0], [47, 40, 113, 41, 0, 2, 1, 1, 0], [48, 40, 112, 40, 0, 2, 1, 1, 0],
  [48, 39, 112, 40, 0, 6, 6, 0, 0], [48, 38, 112, 40, 0, 6, 6, 0, 0], [48, 37, 112, 40, 0, 6, 6, 0, 0], [48, 36, 112, 40, 0, 6, 6, 0, 0],
  [48, 35, 112, 40, 0, 6, 6, 0, 0], [48, 34, 112, 40, 0, 6, 6, 0, 0], [48, 33, 112, 40, 0, 6, 6, 0, 0], [48, 32, 112, 40, 0, 6, 6, 0, 0],
  [48, 31, 112, 40, 0, 1, 1, 0, 0], [48, 30, 112, 40, 0, 1, 1, 0, 0], [48, 29, 112, 40, 0, 1, 1, 0, 0], [48, 28, 112, 40, 0, 1, 1, 0, 0],
  [48, 27, 112, 40, 0, 1, 1, 0, 0], [48, 26, 112, 40, 0, 1, 1, 0, 0], [48, 25, 112, 40, 0, 1, 1, 0, 0], [48, 24, 112, 40, 0, 1, 1, 0, 0],
  [48, 23, 112, 41, 1, 5, 1, 0, 0], [48, 22, 112, 42, 1, 5, 1, 0, 0], [48, 21, 112, 43, 1, 5, 1, 0, 0], [48, 20, 112, 44, 1, 5, 1, 0, 0],
  [48, 19, 112, 45, 1, 5, 1, 0, 0], [48, 18, 112, 46, 1, 5, 1, 0, 0], [48, 17, 112, 47, 1, 5, 1, 0, 0], [48, 16, 112, 48, 1, 5, 1, 0, 0],
  [48, 15, 112, 49, 1, 1, 1, 0, 0], [48, 14, 112, 50, 1, 1, 1, 0, 0], [48, 13, 112, 51, 1, 1, 1, 0, 0], [48, 12, 112, 52, 1, 1, 1, 0, 0],
  [48, 11, 112, 53, 1, 1, 1, 0, 0], [48, 10, 112, 54, 1, 1, 1, 0, 0], [48, 9, 112, 55, 1, 1, 1, 0, 0], [48, 8, 112, 56, 1, 1, 1, 0, 0]
]
```

Frame indices are the same picture-table poses as the Level 50 table (7/8 west-walk legs, 2 face west); with the flip set they
are drawn mirrored, which is how the ROM shows east (`sAnim_GoEast` / `sAnim_FaceEast` are the west frames with `.hFlip`).

## 2b. Battle 1's parties at Open

`FillFactoryTrainerParty` (called by `DoSpecialTrainerBattle`) runs from frame 7812 (route frame 842) to 7843 at Open (Level
50: 7812 to 7838), gRngValue at entry `0xc307142c` (Level 50 `0x7b9fce20`). Its level comes from `SetFacilityPtrsGetLevel` →
`GetFrontierEnemyMonLevel` → `GetHighestLevelInPlayerParty`, which returns 100 (the three level-100 rentals are the party by
then); the trapped `CreateMonWithEVSpreadNatureOTID` calls all get level 100, fixed IV 3 (towerWinStreaks[0][0] = 0 in this
save, the non-BUGFIX branch), OT id 416049562. The three builds start at frames 7812, 7820, 7830 (Level 50: 7812, 7823, 7830),
so the overworld's once-a-frame VBlank `Random()` falls between them, as at Level 50. `SetFacilityPtrsGetLevel` is called once
more right after the fill (frame 7843, again 100, no draw). Same in both scenes; the party read at the fill's return equals the
one at the first action menu.

Opponent (trainer 63, sets 375, 454, 465), gEnemyParty:

| species | level | exp | personality | nature | IVs | EVs (HP Atk Def Spe SpA SpD) | stats (HP/Atk/Def/Spe/SpA/SpD) | moves | PP | item | ability bit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FEAROW | 100 | 1000000 | 0xe0987b9f | ADAMANT | 3 | 0 255 0 255 0 0 | 243/276/138/271/117/130 | DRILL_PECK, TRI_ATTACK, FACADE, MUD_SLAP | 20 10 20 10 | SHARP_BEAK | 0 |
| CHARIZARD | 100 | 1059860 | 0x30b6098d | MODEST | 3 | 0 0 0 255 255 0 | 269/158/164/271/317/178 | FIRE_BLAST, SUNNY_DAY, ROAR, SCARY_FACE | 5 5 20 10 | FOCUS_BAND | 0 |
| SALAMENCE | 100 | 1250000 | 0xa0b508fb | HARDY | 3 | 0 255 0 255 0 0 | 303/341/168/271/228/168 | DRAGON_CLAW, AERIAL_ACE, HEADBUTT, ROCK_SLIDE | 15 20 15 10 | KINGS_ROCK | 0 |

The player's three at the first action menu, gPlayerParty (friendship 0, HP full):

| species | level | exp | personality | nature | IVs | EVs | stats | moves | PP | item | ability bit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KANGASKHAN | 100 | 1000000 | 0xd3ad0720 | ADAMANT | 3 | 255 255 0 0 0 0 | 386/287/168/188/79/168 | DIZZY_PUNCH, BRICK_BREAK, COUNTER, FAKE_OUT | 10 15 20 10 | FOCUS_BAND | 0 |
| LANTURN | 100 | 1250000 | 0xeccc002f | QUIET | 3 | 0 0 255 0 255 0 | 363/124/187/127/245/160 | SURF, CONFUSE_RAY, ATTRACT, THUNDER_WAVE | 15 10 15 20 | CHERI_BERRY | 1 |
| METAGROSS | 100 | 1250000 | 0xf68e9f97 | ADAMANT | 3 | 0 170 0 170 0 170 | 273/352/268/190/178/230 | METEOR_MASH, AERIAL_ACE, FACADE, LIGHT_SCREEN | 10 20 20 30 | LEFTOVERS | 0 |

Experience is each species' level-100 table value. The first action menu appears at route frame 1723 (Open, OFF), 1758
(Open, ON), 1746 (Level 50, both scenes). Evidence: `battle1b/{open,lv50}-{off,on}.json` (`build`, `enemyParty`,
`playerParty`), `battle1d/*.json` (callers).

## 2c. The EXP strip at level 100

`battle_interface.c:2201-2203` reads `gExperienceTables[growth][101]`, one past the row, which is the next growth rate's
level-0 value (0): the player's EXP bar struct at the first action menu (battleBars[0]) holds maxValue -1000000, oldValue 0,
receivedValue 0, currValue 4000000 for KANGASKHAN (Level 50 ONIX: 7651, 0, 0, 0). The drawing does not use them:
`MoveBattleBarGraphically` zeroes the eight tile fills when the level is 100 (`battle_interface.c:2315-2320`).

Measured: the eight EXP-bar tiles in OBJ VRAM (healthbox sprite tile 28 + 0x24.., and the 0xB80 half) are byte-identical at
Open and Level 50, both scenes: every one is the 0-pixel tile
`33333333 77777777 66666666 43434343 43434343 66666666 00000000 00000000` (4bpp rows). On screen the strip is the 64 pixels
x 158-221; no pixel of the fill colour is lit. In the Open captures (y depends on the healthbox's idle bob; Level 50's
captures sit 1 pixel lower, and after that shift the strip rows match pixel for pixel):

| y (Open capture) | x 158-221 |
| --- | --- |
| 104 | (222,214,181) all |
| 105 | (33,57,0) all |
| 106 | (82,107,99) all |
| 107, 108 | (222,214,181) / (198,189,115) alternating, starting (222,214,181) at x 158 |
| 109 | (82,107,99) all |
| 110-111 | background (tile rows 6-7 transparent) |

So at level 100 the strip shows exactly what Level 50 shows for a rental at its level's base experience: an empty bar. The
healthbox text differs: "KANGASKHAN♀Lv100" puts the three-digit level right after the gender sign, and HP reads 386/386.
Pictures: `battle1b/action-menu-{open,lv50}-{off,on}.png`, `battle1b/healthbox-{open,lv50}-{off,on}-x6.png`.

Summary screen (the draft's SUMMARY, second page, rental slot 1, Battle Scene OFF): Open KANGASKHAN shows EXP. POINTS 1000000,
NEXT LV. 0; Level 50 ONIX shows 125000 and 7651. The EXP bar on that page (rows y 146-150, compared over x 150-239) is pixel-identical between
the two: empty. Pictures: `battle1/summary-p1-*.png`, `battle1/summary-p2-*.png`, `battle1/summary-p2-exp-*-x6.png`.

## 3. The ROM generation lab

`tools/openlevel/romGenLab.py` (README in that folder). Tested on 42 deal samples (21 per level: winStreak 0-56 in steps of 7,
rentsCount 0/15/45, battleNum 0-6, hashed cursors, some with opponentCursor, towerLv50Streak, priorTrainerIds) and 8 build
samples. Results: `lab/deal-a.json`, `lab/deal-b.json` (two runs, identical), `lab/build.json`, `lab/build-keepvblank.json`.

- Controls: lvlMode 0 and 1 with streak 0, rents 0, battleNum 0 and dealCursor `0x08a74230` give the bootstraps' own rentals,
  trainer and sets; with `--build --keep-vblank` and the ROM's own construction cursor the six built Pokemon equal the
  bootstraps' own (personalities, return frame and cursor included).
- The slots are the ROM's: with rentsCount written to SaveBlock2 + 0xDF4 (and 0xDF2 left 0), Open's trapped
  `GetNumPastRentalsRank` returns 1 for 15 and 5 for 45; with the streak at + 0xDE4, `GetFactoryMonId` gets challengeNum =
  streak / 7 (0-8, Open's lvlMode 1). Level 50 likewise at 0xDF2 / 0xDE2.
- Trainer rolls: `GetRandomScaledFrontierTrainerId(streak / 7, battleNum)`; battleNum 6 rolls from the hard table (Level 50
  streak 42: 223; 28: 195; 14: 146) and leaves `trainerIds[6]` unwritten. No sample rerolled for a repeat.
- Both deal functions always ran inside frame 5795, back to back, with no VBlank draw inside or between them.
- Time per sample: 0.01-0.02 s for the deal (plus about 1 s per level to start, and 2 s once to build the state cache);
  `--build` 1.1-1.6 s.
- `--build` without `--keep-vblank` undoes 36-62 VBlank draws per build (the construction spans 36-62 frames); with them kept
  the first Pokemon is always the same and 2 to 5 of the other five differ in the test set (the shifted stream sometimes lands on the same personality again).

## Inferred, not measured

- Writing the streak at the deal stands for a save whose Open streak flag was set when `InitFactoryChallenge` ran in the Lobby
  (it zeroes the streak and rents count otherwise, `battle_factory.c:208-212`); the lab writes after that point, so the Lobby
  path with a real streak (its dialogue, its save) was not played.
- The lab rolls battle 2-7 opponents at the deal; the real game rolls them at GO ON with `rentalMons` = the player's three +
  the last opponent's three, so the species excluded differ.
- `towerLv50Streak` only matters for the opponent's fixed IV at battle start, which the lab does not reach.

## Open

- The Lv100 healthbox name/level layout ("KANGASKHAN♀Lv100") was photographed, not compared with the engine.
- The first action menu comes 23 frames earlier at Open than Level 50 in Scene OFF and 12 later in Scene ON; not broken down.
