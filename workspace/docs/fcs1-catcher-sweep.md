# fcs1: frame catcher sweep over whole rounds, both scenes (2026-11-20)

The frame catcher (`tools/frame-catcher/README.md`) had only compared battles 1 to 3 of a first round. This sweep plays 26 whole
first rounds on master `869b52918` (engine) and on the ROM, Scene ON and Scene OFF, through battle 7, the round's end and the Lobby,
and compares every frame and every sound. Findings only: no engine (`src/`) change here. The catcher needed four set-up fixes to
follow whole rounds; they are on this branch.

## In short

- Every one of the 26 rounds is now followed by the ROM to the round's end: 170 battles (92 of them battles 4 to 7, battle 7 itself
  22 times), 2,414,955 engine frames against 2,550,904 ROM frames, all 9,812 menus followed (table below).
- Six new game bugs, most visible first: no rain picture at "Rain continues to fall." (Scene ON); after a lost battle the foe's
  Pokémon vanishes instead of going back into its ball; "PKMN BREEDER" printed in plain letters with stray spaces; a battle-start
  Intimidate drop is silent; an extra ball sound when the foe's Baton Pass leaves (Scene ON); the music does not go quiet for
  GrassWhistle (Scene ON). One small one: a 1-pixel bounce offset after the party menu.
- Sounds now match almost everywhere: over the 26 rounds the sound tables hold the three sound bugs above (10 rows) and catcher
  artefacts only (the draft's YES/NO click, see "Catcher limits left", and the last frames of the Lobby walk after each trace, where
  no menu anchors the replayed presses).
- Battles 4 to 7 brought nothing new beyond these: the late battles look and sound like the early ones. Battle 7's harder trainers,
  the GO ON menus after battles 4 to 6, the later swap screens and the Lobby return after the round (won and lost) all followed.
- Known and seen again (not new): the LOGO_WIGGLE transition drawn as CIRCLES_MEET (box #225), the room after the swap screen
  (fcp1 "Not fixed" 4), the party icons' bob phase, the battle room's hand-off before the transition (#225, ~20 frames early).
- Checked and dropped: "pressing A does not speed up battle text" is not a gap at this save's FAST speed: both sides print one letter
  per frame with A pressed (`curated/n1-text-print-pace-same.png`).

Pictures (ROM | ours | diff, and contact sheets: ours on one row, the ROM's on the other) are in
`.integration/evidence/fcs1/curated/` (not in git). Each run's ranked report is `.integration/evidence/fcs1/final/<run>/report.md`
(frames kept, so `peek.py` works on them).

## Runs

Traces: `makeTrace.mjs --seed N --scene S --policy P --battles 7 --max-frames 170000` (seed 23: 300000), cut 120 frames into the Lobby
after the round (`.integration/evidence/fcs1/scan/trim.mjs`); copies with their battle text in `.integration/evidence/fcs1/traces2/`.
Seeds were picked by scanning seeds 0 to 29 (the soak tool's depth scan does not predict a trace's depth: the soak plays one fixed
challenge for every seed, `makeTrace` a challenge of each seed's own). `ws` = winning-swap, `win` = winning, `full` = full.

| seed | scene | policy | battles | frames ours / ROM | menus followed | ROM stop | transitions matched |
|---|---|---|---|---|---|---|---|
| 0 | OFF | winning-swap | 7 (lost the last) | 100,515 / 106,667 | 501/501 | engine-trace-end | all |
| 0 | ON | winning-swap | 7 (lost the last) | 130,816 / 139,202 | 537/537 | engine-trace-end | all |
| 10 | OFF | winning-swap | 7 (all won) | 83,202 / 87,996 | 409/409 | engine-trace-end | all |
| 10 | ON | winning-swap | 7 (all won) | 101,814 / 106,997 | 415/415 | engine-trace-end | all |
| 13 | ON | winning-swap | 7 (all won) | 95,324 / 100,981 | 290/290 | engine-trace-end | all |
| 15 | OFF | winning-swap | 7 (all won) | 78,896 / 83,527 | 315/315 | engine-trace-end | all |
| 15 | ON | winning-swap | 7 (all won) | 112,177 / 118,173 | 431/431 | engine-trace-end | all |
| 16 | ON | winning-swap | 7 (all won) | 123,043 / 131,412 | 483/483 | engine-trace-end | all |
| 17 | OFF | winning-swap | 7 (all won) | 85,267 / 89,430 | 277/277 | engine-trace-end | all |
| 18 | ON | winning-swap | 7 (all won) | 90,717 / 95,449 | 323/323 | engine-trace-end | all |
| 19 | OFF | winning-swap | 7 (all won) | 68,089 / 71,831 | 249/249 | engine-trace-end | all |
| 19 | ON | winning-swap | 7 (all won) | 90,217 / 95,645 | 251/251 | engine-trace-end | all |
| 2 | OFF | winning-swap | 7 (all won) | 71,683 / 76,762 | 323/323 | engine-trace-end | all |
| 2 | ON | winning-swap | 7 (lost the last) | 96,647 / 104,004 | 391/391 | engine-trace-end | all |
| 22 | OFF | full | 5 (lost the last) | 73,612 / 76,980 | 388/388 | engine-trace-end | all |
| 22 | ON | full | 5 (lost the last) | 96,015 / 101,313 | 438/438 | engine-trace-end | all |
| 23 | ON | full | 7 (lost the last) | 202,959 / 211,977 | 905/905 | engine-trace-end | all |
| 25 | OFF | winning | 7 (all won) | 71,589 / 75,068 | 243/243 | engine-trace-end | all |
| 26 | OFF | full | 3 (lost the last) | 58,159 / 61,800 | 301/301 | engine-trace-end | all |
| 26 | OFF | winning | 7 (all won) | 79,857 / 83,678 | 350/350 | engine-trace-end | all |
| 26 | ON | full | 3 (lost the last) | 72,713 / 76,461 | 299/299 | engine-trace-end | all |
| 3 | OFF | winning-swap | 7 (all won) | 84,206 / 88,840 | 369/369 | engine-trace-end | all |
| 4 | ON | winning-swap | 7 (all won) | 112,630 / 118,158 | 413/413 | engine-trace-end | all |
| 8 | OFF | winning-swap | 7 (all won) | 81,299 / 86,905 | 351/351 | engine-trace-end | all |
| 9 | OFF | winning-swap | 7 (all won) | 68,524 / 72,078 | 273/273 | engine-trace-end | all |
| 9 | ON | winning-swap | 7 (all won) | 84,985 / 89,570 | 287/287 | engine-trace-end | all |
| all 26 | | | 170 | 2,414,955 / 2,550,904 | 9812/9812 | | |

"Menus followed" counts every menu where the engine waited for the player (draft, battle menus, party menus, swap screen, GO ON,
the Lobby's record question); "transitions matched": every battle started with the engine's transition on the ROM too.

## Findings (game), most visible first

"Ours" frames are engine frames of the run, ROM frames the ROM run's. Most were read in the first sweep (`all/`, before the last two
catcher fixes); the engine frames are the same in `final/`, the ROM frames can differ by a few.

### 1. No rain at "Rain continues to fall." (Scene ON)

- **What a player sees:** at the end of a rainy turn the ROM darkens the screen and draws falling rain for about 80 frames while
  "Rain continues to fall." is up; ours shows the text over the normal field. Every rainy turn's end in Scene ON: 16 times in 5 rounds.
  The rain sound plays on both sides.
- **Where:** seed 19 Scene ON, battle 2: ours 12,440-12,620, ROM 13,186-13,258 (and the 3 later rain turns of that battle); seeds 10,
  18, 22, 23 Scene ON. `curated/f1-rain-continues-not-drawn.png`, `curated/f1-rain-continues-sheet.png`.
- **ROM:** `BattleScript_RainContinuesOrEnds` (`battle_scripts_1.s:3192-3198`) plays `B_ANIM_RAIN_CONTINUES` = `General_Rain`
  (`battle_anim_scripts.s:10511-10522`: blend the field to black 4/16, two `AnimTask_CreateRaindrops` (0, 3, 60), delay 50, blend back).
  It is not Rain Dance's body.
- **Cause (code read):** wth236's `weatherContinuesBodyEffect` (`src/engine/battleResolutionPresentationRender.ts:1823-1853`) draws Rain
  Dance's body (move 240) and asks the presentation RNG for its words under the move key `move:<request>:<segment>:<command>`; but a
  general-animation command is never activated under that key (`tickLiveMovePresentationRngSession`, `src/engine/liveMovePresentationRng.ts:
  202-205`, activates move-animation commands only; General_Rain's words are recorded as a sub-stream under the general key). The
  words are null, the Rain Dance adapter returns null (`liveMoveAnimation.ts` case 240), and nothing is drawn. Sun, Sandstorm and Hail
  have no Random2 plan, so they are not affected.
- **Fix area:** draw General_Rain itself from its recorded sub-stream (`generalRainDropsAtAge` in `src/animation/rainDance.ts` already
  places its drops), with its own blend and length.

### 2. After a lost battle the foe's Pokémon vanishes (both scenes)

- **What a player sees:** when your last Pokémon faints, the ROM sends the foe's Pokémon back into its ball (it flashes pink and
  shrinks with sparkles, about 24 frames) before the trainer slides in; ours removes it at once, then plays the ball sound 22 frames
  later over the empty field. Every lost battle: 8 of the 8 lost rounds.
- **Where:** seed 0 Scene OFF, battle 7: ours 99,680 (still there) to 99,692 (gone), ball sound 99,714; ROM ball sound 105,599, pink
  105,614, sparkles 105,626, gone 105,638. Seed 2 Scene ON, battle 7: ours 95,789, ROM 102,982. `curated/f2-loss-recall-sheet-off.png`,
  `curated/f2-loss-recall-on.png`.
- **ROM:** `BattleScript_LocalBattleLostPrintTrainersWinText` (`battle_scripts_1.s:2960-2968`) runs `returnopponentmon1toball`, which
  sends `ReturnMonToBall(..., FALSE)` (animated, `battle_script_commands.c:6455-6461`): the opponent controller's `DoSwitchOutAnimation`.
- **Fix area:** the loss tail's `returnopponentmon1toball` is presented as a plain sprite-visibility hide (`src/engine/battleEndSounds.ts:
  49-58` times the sound on it); it needs the opponent's switch-out animation, with the hide at its end.

### 3. "PKMN BREEDER" in plain letters with stray spaces

- **What a player sees:** the trainer class prints as " PKMN  BREEDER" (a blank, four ordinary capitals, two blanks) where the ROM
  draws its small two-glyph PKMN symbol: "PKMN BREEDER RAFAEL sent out WAILMER!", "Player defeated PKMN BREEDER ...!". Seen in 8 of 26
  rounds (Breeders Marisa, Pamela, Payton, Rafael, 28 messages); the same for PKMN RANGER and PKMN TRAINER.
- **Where:** seed 13 Scene ON, battle 4: ours 47,174, ROM 49,874. `curated/f3-pkmn-breeder-text.png`.
- **ROM:** `trainer_class_names.h`: `_("{PKMN} BREEDER")`; `{PKMN}` is the two glyph codes 0x53 0x54 (charmap.txt).
- **Cause:** `src/data/gen/facility-class-lookups.json` keeps the class name as "{PKMN} BREEDER", and `drawText`
  (`src/engine/font.ts:50-100`) draws it character by character: "{" and "}" have no glyph and advance a space each. The party menu
  already draws the two glyphs (`DO_WHAT_WITH_MON_TAIL_CODES`, `src/engine/battlePartySelect.ts:944-950`).
- **Fix area:** expand "{PKMN}" to the glyph codes 0x53, 0x54 wherever a class name is drawn (or in the text encoder).

### 4. A battle-start Intimidate is silent

- **What a player sees (hears):** when a lead has Intimidate, both sides draw the Attack-drop animation and print "Foe GROWLITHE's
  INTIMIDATE cuts LICKITUNG's ATTACK!", but only the ROM plays the stat-drop sound (SE_M_STAT_DECREASE). 11 of 11 battle-start
  Intimidates in the sweep, both scenes, the foe's and the player's own (seed 23 leads with one in all 7 battles); every other
  stat-drop sound is on both sides.
- **Where:** seed 10 Scene OFF, battle 6: ROM SE at 58,136 (panned to the player), ours animation at 55,750-55,782 with no sound;
  seed 10 Scene ON battle 6, seed 17 Scene OFF battle 7, seed 26 Scene OFF (winning) battle 3, seed 23 Scene ON battles 1 to 7.
  `curated/f4-intimidate-battle-start-sheet.png`.
- **ROM:** `BattleScript_IntimidateActivates` plays `B_ANIM_STATS_CHANGE`, which `Cmd_playanimation` launches even with animations
  off (`battle_script_commands.c:4011-4017`); `AnimTask_StatsChange` plays the sound.
- **Fix area:** the battle-start (intro) Intimidate's stat-change command; the in-battle one already has its sound.

### 5. An extra ball sound when the foe's Baton Pass leaves (Scene ON)

- **What a player hears:** after the foe's Baton Pass the foe's Pokémon leaves with no sound on the ROM; ours plays SE_BALL_OPEN 46
  frames after the Baton Pass sound, then the normal one for the send-out. The pictures match. 2 rounds (seed 10 battle 5, seed 0
  battle 6).
- **Where:** seed 10 Scene ON: ours SE_BALL_OPEN at 59,254 and 59,329, ROM only at 62,079 (Baton Pass sound ours 59,208 / ROM 61,972).
  `curated/f5-baton-pass-sheet.png`.
- **ROM:** `BattleScript_EffectBatonPass` uses `returntoball BS_ATTACKER` (`battle_scripts_1.s:1706`), which sends
  `ReturnMonToBall(..., TRUE)` (`battle_script_commands.c:5346-5353`): the sprite is removed with no animation and no sound
  (`OpponentHandleReturnMonToBall`, `battle_controller_opponent.c:1200-1215`).
- **Fix area:** the sound of the Baton Pass `returntoball` receipt in Scene ON (Scene OFF and Roar / Whirlwind already follow the
  instant rule, `src/engine/battleResolutionPresentation.ts:2351-2357`).

### 6. The music does not go quiet for GrassWhistle (Sing, Perish Song) (Scene ON)

- **What a player hears:** while the GrassWhistle animation plays, the ROM halves the battle music's volume (about 220 frames) and
  then restores it; ours keeps the music at full volume. Seen once (a GrassWhistle that worked; the others in the sweep failed and
  play no animation).
- **Where:** seed 15 Scene ON, battle 5: ROM BGM volume 128 at 68,348 (`LaunchBattleAnimation`), back to 256 at 68,568
  (`DestroyAnimSoundTask`); ours SE_M_GRASSWHISTLE at 65,511 with no volume change.
- **ROM:** `LaunchBattleAnimation` (`battle_anim.c:248-256`) lowers the BGM to 128 for the moves in `gMovesWithQuietBGM`
  (`battle_anim_scripts.s:14-15`: Sing, Perish Song, GrassWhistle); the restore is at `battle_anim.c:520`.
- **Fix area:** `src/engine/moveAnimSounds.ts`: a BGM duck at the animation's start and a restore at its end for these three moves.

### 7. (small) A 1-pixel bounce offset after the party menu

- **What a player sees:** on the first frames of the action menu after leaving the party menu, the player's Pokémon and its HP box sit
  1 pixel off from the ROM's (the idle bounce in another phase). In every round, on many party-menu returns; 1 pixel for a few frames.
- **Where:** seed 0 Scene OFF: ours 8,861, ROM 9,281. `curated/f6-bounce-after-party.png`.
- **Fix area:** the bounce phase on return from the party menu. Not checked further.

## Timing leads (not checked frame by frame)

Stretch lengths, ours minus the ROM's, over all 26 rounds (median; a stretch runs from one menu to the next):
- a turn (move chosen to the next menu): -10 frames (10 % of turns -60 or less). The pressed-A pages in a turn wait for the replayed
  presses, so part of this is the catcher's replay, not the game.
- "Before starting the battle, would you like to swap?" YES to the swap screen: ours shows the screen about 15 frames later (seed 10
  Scene OFF: YES ours 9,682 / ROM 10,140, first swap-screen picture ours ~9,740 / ROM 10,184).
- the draft's last YES/NO to the first battle: -40 frames; the swap screen's return to the room: -57 (fcp1 "Not fixed" 4 accounts for
  about 30 of them).

## Worth a look (not checked further)

- **A colour flash in the ROM's send-in after Roar** (seed 16 Scene ON, battle 3, "MAGCARGO was dragged out!"): for 5 frames in the
  middle of the pink fade-in the ROM shows MAGCARGO in its own colours on a white field (ROM 38,392-38,396), then pink again; ours
  fades without the flash (ours 36,370-36,384). It may be the "white background at send-out" lead from Kyle's 11-20 report.
- **1-pixel offsets of an opponent sprite** in a few stretches (seed 10 Scene ON, battle 6, ONIX at "Foe ONIX's SITRUS BERRY
  restored health!": ours 81,256, ROM 85,470).

## Known, seen again

- **LOGO_WIGGLE drawn as CIRCLES_MEET** (box #225): `frontierTransitionRenderKind` (`src/engine/battleTransition.ts:362-378`) has no case
  for id 29 and falls back; one battle start in 12 (table row 0). Seed 9 Scene OFF, battles 5 and 6: ours 37,200-37,312, ROM
  39,102-39,214. `curated/k1-logo-wiggle-drawn-as-circles.png`.
- **The room after the swap screen** (fcp1 "Not fixed" 4): in 21 of 26 rounds, every swap.
- **The battle room's hand-off before the transition** (#225 "unmeasured"): ours starts the circles ~20 frames sooner after the gray
  fade (seed 16 Scene ON, battle 5: ours 60,540-60,580, ROM 64,620-64,680).
- **The party icons' bob phase** (fcp1 "Seen, not in this brief"): most party-menu stretches.

## Catcher fixes on this branch

1. **The RECORD question after a battle** (`engineMenus.mjs`, `engineRun.mjs`): the question was a menu from the A on RECORD, about 70
   frames before its YES/NO box; the ROM's YES/NO was then bound to the next GO ON menu and answered YES, and the ROM left the round
   (seed 19 Scene OFF, after battle 2: 86 of 247 menus). Now a menu from the frame its box is drawn. `curated/c1-record-question.png`.
2. **The Lobby's "record your last match?" after the round** (`engineMenus.mjs`): no menu on the engine side (the terminal keeps a
   postwin state, checked first), so the ROM stopped there. `curated/c2-lobby-record-question.png`.
3. **A press on the round's first frame** (`plan.py`): the plan started at frame 1, so seed 15's A on frame 1 was dropped, the ROM never
   rented that Pokémon and stopped in the draft (6 of 313 menus, both scenes). The plan starts at frame 0; a test pins it.
4. **The battle-start transition** (`romRun.py`): the trap that gives the ROM the engine's transition was armed only on the frame whose
   fast run showed the transition task. The party build can run past a frame boundary, and the draw then lands a frame earlier (seed 9
   Scene ON, battle 6: draw in ROM frame 62,979, task from 62,980): the ROM kept its own transition in 9 battles of 8 rounds. The trap
   now stays armed from the frame `Task_StartBattleAfterTransition` is live until it has fired, and it writes the value at the draw
   itself (`Random()` called from `GetSpecialBattleTransition`), not at the function's entry: the overworld VBlank draws `Random()`
   once per frame, and a frame boundary between the entry and the draw let that draw take the value (3 of the 9 battles).

`python3 -m unittest tools/test_frame_catcher.py`: 22 tests OK.

## Catcher limits left

- **The draft's YES/NO cursor is read too early on the ROM**: `Select_Task_HandleYesNo` is live about 43 frames before
  `battle_factory_screen.c:1850` sets the cursor to YES, so the driver reads "NO" and steers, and the comparator then drops the ROM's own
  A click as a steer press: a false "ours plays SE_SELECT" in the draft of 6 rounds.
- **The engine's swap-screen picker is a menu while it is still fading in** (`swap.pick` from the first frame of the phase): its stretch
  lengths do not compare.
- **Stretch lengths**: presses between menus are replayed by frame offset and the pressed-A pages wait for them, so the timing leads
  above are leads, not measurements.
- **Round 2 and later** are not staged: the ROM plays round 1 itself, so its Factory record is right for round 2, but round 2's draft
  builds the ROM's own rentals. What it would take: run the draft staging (`patch_select_mons` and the first trainer write) again when
  the second select screen opens, then the existing trainer-roll and transition traps cover its battles. The Lobby walk and the
  attendant between the rounds would need anchors too (no Lobby menu is a catcher menu yet).
- **Symbols and the Factory Head**: a Factory Head battle needs 20 wins first (round 3, battle 7); no test-player seed gets near it
  (the soak's deepest carry is 0). Staging it means writing a streak into the save before the draft, as the lab's frontier record
  writes do, with the same `frontier` start on the engine side; Noland's room scenes are not staged either.
- **A start from the Lobby** (`after-save`) is not staged.
- Pan changes of a running sound and cry pitch / length are still not compared.
