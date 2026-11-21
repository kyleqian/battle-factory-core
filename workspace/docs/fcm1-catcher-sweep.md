# fcm1: frame catcher sweep picked for unseen moves, items and abilities (2026-11-21)

The frame catcher (`tools/frame-catcher/README.md`) had compared 34 rounds (fcs1, fcr2), which showed 187 of the Factory's 300 moves,
17 of its 43 held items and 16 abilities: round 1's rental pool (sets 110-199) holds about 150 moves, and most of the rest are dealt only
in rounds 2 and 3 (`sInitialRentalMonRanges`, `battle_factory.c:169-179`). This sweep picks rounds for what was never shown. Findings only:
no engine (`src/`) change here.

Build: branch `trial-fix-20261121` (Mac master `dbf96bf99`, the round-2 catcher of fcr2, and the fixes sct1, hdl1, lha1, fop1 merged;
`tsc -b` clean, full suite 1,914 files / 16,456 tests passed). Evidence (not in git): `.integration/evidence/fcm1/` (`final/<run>/report.md`
with pictures, frames kept for `peek.py`; `traces/` with each trace's battle text; `scan/` the 1,200 candidates).

## In short

- **Picking**: `tools/frame-catcher/pickTraces.py make` played seeds 0-299 in both scenes with the test player's `winning-swap` and
  `winning-coverage` policies, up to battle 21 (1,200 rounds, about 2 minutes on the engine alone); `pick` kept 32 that together add the most.
  Seen in a catcher run, before -> after: moves 187 -> 244 of 300, held items 17 -> 30, abilities 16 -> 41.
- **Runs**: 32 rounds, 410 battles, 5.80 M engine frames against 6.69 M ROM frames, 20,283 of 21,998 menus followed. 24 rounds were
  followed to their end; 5 stop in the Lobby (finding 8), 2 at the Factory Head (open item 1), 1 on a catcher gap.
- **Findings** (all display or sound; the battle rules agree, checked for finding 1 by reading the engine state), most visible first:
  1. Battle start: the foe's WHITE HERB after an INTIMIDATE is not shown (the herb is used: its message and animation are missing).
  2. "{X} was dragged out!" (ROAR) is cut off half printed and does not wait for a press.
  3. "{X}'s WISH came true!" names the Pokemon now in battle, not the one that made the wish.
  4. "{X} fainted!" stays on screen after the press, until the next message.
  5. WILL-O-WISP plays no sound (Scene ON).
  6. A move called by METRONOME plays no sound (Scene ON; AEROBLAST, LEECH LIFE seen).
  7. Scene OFF: a SUBSTITUTE called by METRONOME is not drawn.
  8. The Lobby's "We look forward to your next visit." (and "…battle was recorded…") ignore B.

## Runs

`makeTrace.mjs --seed N --scene S --policy P --battles 21 --lobby-tail 120 --max-frames 400000`, picked by `pickTraces.py pick` against
the fcs1 and fcr2 traces.

| seed | scene | policy | battles | frames ours / ROM | menus followed | ROM stop |
|---|---|---|---|---|---|---|
| 14 | ON | winning-swap | 21 (lost the last) | 283,663 / 298,664 | 1052/1052 | engine-trace-end |
| 17 | ON | winning-coverage | 9 (lost the last) | 124,267 / 130,158 | 446/446 | engine-trace-end |
| 32 | ON | winning-swap | 1 (lost the last) | 14,262 / 15,215 | 64/64 | engine-trace-end |
| 36 | OFF | winning-swap | 8 (lost the last) | 114,598 / 120,995 | 560/560 | engine-trace-end |
| 44 | ON | winning-swap | 18 (lost the last) | 239,952 / 389,923 | 299/778 | None |
| 52 | OFF | winning-swap | 13 (lost the last) | 150,984 / 159,175 | 649/649 | engine-trace-end |
| 77 | ON | winning-swap | 18 (lost the last) | 288,978 / 468,364 | 326/900 | None |
| 89 | OFF | winning-swap | 14 (lost the last) | 150,115 / 147,776 | 566/631 | stuck-at-unplanned-menu |
| 89 | ON | winning-coverage | 17 (lost the last) | 342,108 / 361,632 | 1408/1408 | engine-trace-end |
| 94 | OFF | winning-coverage | 21 | 263,628 / 266,095 | 949/988 | stuck-at-unplanned-menu |
| 94 | ON | winning-coverage | 20 | 400,000 / 418,455 | 1442/1442 | engine-trace-end |
| 96 | ON | winning-swap | 5 (lost the last) | 88,428 / 92,751 | 338/338 | engine-trace-end |
| 100 | ON | winning-coverage | 17 (lost the last) | 255,521 / 267,095 | 908/908 | engine-trace-end |
| 102 | ON | winning-swap | 5 (lost the last) | 70,556 / 74,641 | 213/213 | engine-trace-end |
| 108 | ON | winning-swap | 2 (lost the last) | 25,738 / 27,785 | 104/104 | engine-trace-end |
| 118 | OFF | winning-coverage | 21 (lost the last) | 238,578 / 250,065 | 1037/1037 | engine-trace-end |
| 118 | ON | winning-coverage | 19 (lost the last) | 240,671 / 391,073 | 638/879 | None |
| 125 | ON | winning-coverage | 2 (lost the last) | 47,398 / 49,447 | 194/194 | engine-trace-end |
| 126 | OFF | winning-swap | 15 (lost the last) | 155,668 / 164,121 | 687/687 | engine-trace-end |
| 152 | ON | winning-coverage | 17 (lost the last) | 252,601 / 263,374 | 894/894 | engine-trace-end |
| 160 | ON | winning-coverage | 8 (lost the last) | 125,285 / 132,415 | 450/450 | engine-trace-end |
| 165 | ON | winning-swap | 17 (lost the last) | 255,512 / 269,814 | 858/858 | engine-trace-end |
| 185 | OFF | winning-coverage | 8 (lost the last) | 115,650 / 191,040 | 476/549 | None |
| 186 | ON | winning-swap | 21 | 299,020 / 314,165 | 975/975 | engine-trace-end |
| 207 | ON | winning-coverage | 4 (lost the last) | 84,705 / 89,922 | 312/312 | engine-trace-end |
| 222 | ON | winning-coverage | 21 (lost the last) | 278,022 / 292,659 | 894/895 | stuck-at-unplanned-menu |
| 224 | OFF | winning-coverage | 17 (lost the last) | 182,380 / 191,973 | 796/796 | engine-trace-end |
| 245 | OFF | winning-swap | 5 (lost the last) | 53,280 / 56,409 | 252/252 | engine-trace-end |
| 247 | ON | winning-swap | 14 (lost the last) | 224,491 / 236,385 | 882/882 | engine-trace-end |
| 274 | OFF | winning-coverage | 11 (lost the last) | 107,093 / 111,507 | 453/453 | engine-trace-end |
| 280 | OFF | winning-coverage | 11 (lost the last) | 148,803 / 156,486 | 756/756 | engine-trace-end |
| 281 | ON | winning-swap | 10 (lost the last) | 178,324 / 291,318 | 405/648 | None |
| all 32 | | | 410 | 5,800,279 / 6,690,897 | 20,283/21,998 | |

"None" as the ROM stop: the ROM waited at a
point the engine's presses never reached (finding 8); "stuck-at-unplanned-menu": a ROM menu the engine never opened (the Head's team, open
item 1; the catcher gap below).

## Findings

"Ours" frames are engine frames of the run, ROM frames the ROM run's; each line's evidence is in `final/<run>/`.

### 1. Battle start: the foe's WHITE HERB after an INTIMIDATE is not shown

- **What a player sees:** your Pokemon comes in with INTIMIDATE ("MASQUERAIN's INTIMIDATE cuts Foe PIDGEOTTO's ATTACK!"); the foe holds a
  WHITE HERB. The ROM then plays the held-item animation on the foe (sparkles with SE_SHINY, the green circle) and prints "Foe PIDGEOTTO's
  WHITE HERB restored its status!" before the first action menu. Ours goes straight to the action menu.
- **The rules are right:** at ours' first action menu PIDGEOTTO holds no item and its stat stages are all 6 (engine state read on the
  replayed trace); `factoryBattleStart.ts` runs `BattleScript_WhiteHerbEnd2` after the battle-start abilities, in speed order, as
  `TryDoEventsBeforeFirstTurn`'s `ITEMEFFECT_ON_SWITCH_IN` loop. Its message and animation are not presented. (The WHITE HERB after a
  move's own stat drop, e.g. OVERHEAT, is shown: s14-on-ws.)
- **Where:** s17-on-wc battle 3: ours 21,820-21,960 (Intimidate message, then the move menu), ROM 22,720-22,960 (animation 22,750-22,810,
  message 22,870-22,930, then the action menu); sounds ROM-only SE_SHINY ×2, SE_M_MORNING_SUN ×2, SE_M_TAKE_DOWN ×6 in that stretch.

### 2. ROAR: "{X} was dragged out!" cut off, no wait

- **What a player sees:** the foe's ROAR drags your MAGNETON out. The ROM prints "MAGNETON was dragged out!" in full and waits for a press
  with the arrow. Ours prints "MAGNETON was drag", clears the box and opens "What will MAGNETON do?".
- **Where:** s186-on-ws battle 20 (LAIRON's ROAR): ours 275,260-275,350, ROM 289,180-289,360 (still waiting at 289,360).
  Contact sheet: `.integration/evidence/fcm1/curated/s186-roar.png`.

### 3. WISH names the wrong Pokemon

- **What a player sees:** a WISH comes true after its user has switched out. The ROM: "Foe ILLUMISE's WISH came true!" (the wisher); ours:
  "Foe DRAGONAIR's WISH came true!" (the Pokemon now in that slot). Seen twice.
- **Where:** s89-on-wc battle 9: ours 150,993, ROM 161,745 (`final/s89-on-wc/images/d98-rom-161745.png`); s186-on-ws battle 15 (MINUN's wish,
  STANTLER in): ours 226,637, ROM 238,193 (`d56-ours-226637.png`).
- **ROM:** the message buffers the wisher's nickname (`gWishFutureKnock.wishMonId`), not the battler in the slot.

### 4. "{X} fainted!" stays on screen after the press

- **What a player sees:** after a faint the ROM takes the press and blanks the message box while the party balls slide in (a foe's faint)
  or while it waits for your next Pokemon (yours); ours keeps "{X} fainted!" (with the arrow) until the next message. Hundreds of frames
  on a player's faint (s100-on-wc: 611 frames).
- **Where:** s247-on-ws battle 3 (foe GLOOM): ours 40,620-40,770, ROM 43,140-43,290 (`curated/s247-faint.png`); s100-on-wc battle 16 (your PRIMEAPE):
  ours 234,131, ROM 245,109 (`d17-rom-245109.png`); s165-on-ws battle 16 ours 233,070 (`d36-ours-233070.png`). In many runs (the fcs1 "Fixed since"
  list had it for losses only).

### 5. WILL-O-WISP plays no sound (Scene ON)

- The ROM plays SE_M_FLAME_WHEEL 15 times in WILL-O-WISP's animation; ours none (s14-on-ws battle 14, s17-on-wc battle 8, s222-on-wc
  battle 18, and one more run). Whether the animation itself is drawn is not checked.

### 6. A move called by METRONOME plays no sound (Scene ON)

- s89-on-wc battle 13: CHANSEY's METRONOME -> AEROBLAST (ROM SE_M_RAZOR_WIND, SE_M_JUMP_KICK ×20) and -> LEECH LIFE (SE_M_ABSORB,
  SE_M_CRABHAMMER ×8, SE_M_ABSORB_2); ours plays none of them. AEROBLAST is in no Factory set (reachable only through METRONOME). Not
  checked: whether the called move's animation is drawn, and other called moves.

### 7. Scene OFF: a SUBSTITUTE called by METRONOME is not drawn

- s36-off-ws battle 8: CHANSEY's METRONOME -> SUBSTITUTE. The ROM draws it (SE_M_ATTRACT, SE_M_BUBBLE2 ×2): `Cmd_attackanimation` skips
  animations when they are off except for MOVE_TRANSFORM and MOVE_SUBSTITUTE, tested on the move being executed (the called one). Ours
  draws nothing.

### 8. The Lobby's farewell ignores B

- **What a player sees:** after a round, "Would you like to record your last BATTLE FACTORY match…?" -> "We look forward to your next
  visit." The ROM's box (`msgbox …, MSGBOX_DEFAULT`, `BattleFrontier_BattleFactoryLobby/scripts.inc:86-91`) closes on A or B; ours only on A
  (`advanceFactoryTerminalRecordPrompt`, `src/engine/factoryTerminalPresentation.ts`: `declineDismissAge` and the YES path's
  `recordSavedDismissAge` take `input.pressedA`).
- **Where:** s118-on-wc after battle 14: the test player pressed B 47 frames after the answer (ours 170,402); the ROM closed the box on it
  (about ROM 177,630, the same offset from the menu), the next DOWN presses walked the player off the counter, and the ROM never reached the next challenge. Five rounds stop
  in the Lobby the same way (s44-on-ws, s77-on-ws, s118-on-wc, s185-off-wc, s281-on-ws; traced frame by frame in s118-on-wc).

## Open

1. **The Factory Head's third Pokemon.** On the ROM the Head's party is built at battle start by `FillFactoryBrainParty`, trapped with the
   engine's cursor and the overworld VBlank draws undone during the build (fcr2). His first two Pokemon came out the engine's in every
   case; the third did not in 3 of 5: s222-on-wc (ROM species 24, ours 206), s94-off-wc (387 / 153), sct1's seed 9 Scene ON (312 / 287);
   it did in s94-on-wc and fcr2's seed 2 Scene OFF. Either the engine's rule (`src/engine/factoryBrainOpponentGeneration.ts`: the six
   `frontier.rentalMons` checked, the species and item checks, the personality loop) or the catcher's VBlank undo
   (`tools/frame-catcher/romRun.py` `brain_traps`) differs; not settled. If the engine's, the Head brings another team than the ROM for
   the same RNG (gameplay). **Settled by hdt1** (`docs/hdt1-factory-head-team.md`): the catcher's; its undo stopped 20 frames after the
   entry while the build runs about 30; the engine's rule is the ROM's (no gameplay change).
2. **Catcher gap:** after RECORD -> NO in the after-battle menu, the GO ON menu shown again (one frame before the test player's A) is not a
   menu to `engineMenus.mjs` (s89-off-ws: ours 137,134), so the ROM's menu there is unplanned.

## Seen again (known)

The battle-start transitions (box #225; s152-on-wc's LOGO_WIGGLE while the ROM still shows the room), the swap screen's fade-in and the
draft YES/NO click (fcs1 catcher limits), the party icons' bob phase, one-frame sandstorm phases.

## Still never shown in a catcher run

56 of the 300 moves (among them EXPLOSION, EXTREME SPEED, FOCUS PUNCH, FISSURE, CALM MIND, DRAGON CLAW, DRILL PECK, ANCIENT POWER):
their sets are dealt from round 3 on or are rare, and the test player rarely gets there. Open Level is not in the game.
