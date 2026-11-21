# fcr2: frame catcher over round 2 and later (2026-11-20)

The frame catcher (`tools/frame-catcher/README.md`) compared only round 1 of a challenge (fcs1, `docs/fcs1-catcher-sweep.md`). It now
follows a challenge into round 2 and later on the ROM: the Lobby after a won round, the attendant's new challenge (its menus and the save
dialog), the PreBattleRoom walk and briefing, the second draft and its battles, and the Lobby after round 2 (won or lost). Findings and
catcher changes only: no engine (`src/`) change here. Engine: this branch's tree (Mac master `dbf96bf99`, the fcs1 fixes merged).

## In short

- 7 two-round challenges, both scenes, ran on both sides to the Lobby after round 2: 97 battles (48 of them round 2's), 1,178,499 engine
  frames against 1,245,667 ROM frames, all 4,700 menus followed, every battle-start transition matched. One more trace (seed 2 Scene OFF
  played on) reaches the Factory Head at battle 21 and loses to him: 21 battles, all 1,141 menus followed, the Head's party staged.
- The Lobby between rounds, the attendant's talk, the save dialog and the PreBattleRoom briefing match frame for frame in length (310/310,
  75/75, 95/95, 59/59, 76/76 frames in seed 23) and in pictures. Round 2's rentals (all six, every round) and IVs are the ROM's.
- Findings, most visible first:
  1. **The attendant's scouting report after a win describes the trainer you just beat, not the next one** (both scenes, every round):
     70 of the 83 after-battle reports in these traces say the wrong thing (the other 13 happen to read the same). The same cause takes
     away **the Factory Head's announcement**: before battle 21 the ROM's phone call, "The FACTORY HEAD is demanding you." and "I can't tell
     you anything about the FACTORY HEAD." are missing; ours says the ordinary "Finally, …" and gives an ordinary scouting report.
  2. **The Factory Head says nothing at the end of his battle**: when he beats you the ROM prints "Way to work! That was a good lesson,
     eh?", ours an empty box; his line for your win is empty too (code read: the engine has no lines for him).
  3. **The low-HP alarm comes back after a win and beeps until the next battle** when the winning blow also triggers SHELL BELL: ours
     starts the victory music one message early, and the heal's HP bar, still red, turns the alarm on again (seed 2).
  4. **PETAYA BERRY's stat-rise flash plays on the wrong Pokémon** (Scene ON): the foe's berry, after its SKILL SWAP, flashes the
     player's MASQUERAIN instead of the foe's GIRAFARIG (seed 9).
  5. **Round 2's first opponent comes from another RNG step than the ROM's** (every new challenge): same RNG, other Pokémon (6 of 7
     rounds another trainer too). Not visible as such, but the game does not play the ROM's challenge for the same RNG.
  6. (small) **The bike-riding TRIATHLETEs stand in another sprite frame** in the battle room (seeds 9 ON, 2 OFF).
- Sounds: nothing new beyond finding 3 and the Head's missing call sound (finding 1); the rest is catcher artefacts (the draft
  YES/NO click, fcs1 "Catcher limits left", and the last frames of each trace's Lobby, where no menu anchors the replayed presses).
- Known, seen again: the LOGO_WIGGLE transition drawn as another (box #225), now also at round 2's first battle (seeds 10 ON, 9 OFF);
  the battle room's hand-off before the transition (#225); the room after the swap screen (fcp1); the party icons' bob phase.

Pictures (ROM | ours, or contact sheets: ours on one row, the ROM on the other) are in `.integration/evidence/fcr2/curated/` (not in git).
Each run's report: `.integration/evidence/fcr2/final/<run>/report.md` (seed 8 Scene OFF: `final2/`, the Head trace: `final3/`), frames kept
for `peek.py`. Traces with their battle text: `.integration/evidence/fcr2/traces/`.

## Runs

Traces: `makeTrace.mjs --seed N --scene S --policy winning-swap --battles 14 --lobby-tail 120 --max-frames 260000`: round 1, the Lobby, the
attendant's new challenge (CHALLENGE, LV. 50, YES, the save, "Please step this way."), round 2, and 120 frames of free roam in the Lobby
after it. Seeds from a scan of 0 to 29, both scenes (`.integration/evidence/fcr2/scan/`): 12 of 60 win both rounds (Scene ON 8, 9, 10, 19,
26, 27, 29; Scene OFF 2, 3, 8, 23, 27). Seed 9 Scene OFF loses round 2's sixth battle (the Lobby after a lost round 2, to the save dialog).

| seed | scene | battles | frames ours / ROM | menus followed | ROM stop | stretches content / timing | sound rows |
|---|---|---|---|---|---|---|---|
| 19 | ON | 14 (7 of round 2) | 178,561 / 189,156 | 567/567 | engine-trace-end | 263 / 302 | 0 |
| 9 | ON | 14 (7 of round 2) | 167,963 / 177,462 | 587/587 | engine-trace-end | 256 / 329 | 1 |
| 10 | ON | 14 (7 of round 2) | 218,965 / 229,888 | 819/819 | engine-trace-end | 346 / 470 | 2 |
| 23 | OFF | 14 (7 of round 2) | 155,882 / 165,953 | 746/746 | engine-trace-end | 299 / 445 | 0 |
| 2 | OFF | 14 (7 of round 2) | 163,124 / 172,280 | 741/741 | engine-trace-end | 309 / 429 | 3 |
| 8 | OFF | 14 (7 of round 2) | 164,643 / 175,201 | 715/715 | engine-trace-end | 290 / 423 | 0 |
| 9 | OFF | 13 (6 of round 2, lost the last) | 129,361 / 135,727 | 525/525 | engine-trace-end | 213 / 309 | 2 |
| all 7 | | 97 (48 of round 2) | 1,178,499 / 1,245,667 | 4700/4700 | | | |
| 2 | OFF | 21 (lost to the Factory Head; rounds 1-2 = the seed 2 row) | 256,718 / 271,896 | 1141/1141 | engine-trace-end | 469 / 668 | 7 |

"Menus followed" now includes the Lobby's: "record your last match?", CHALLENGE / INFO / EXIT, the level, "I need to save the game", the
save dialog's "Would you like to save the game?" and "There is already a saved file." In every run: both rounds' six rentals the engine's,
every trainer the engine's (round 2's first from the trapped deal, the others from the held GO ON roll), every transition the engine's, the
battle RNG written at every battle's first turn, the foe and player parties checked at every battle start (no mismatch), and every IV the
same on both sides (rentals 3 in round 1, 6 in round 2; foes 3, 6 at battle 7, in both rounds).

## Findings (game), most visible first

"Ours" frames are engine frames of the run, ROM frames the ROM run's.

### 1. The scouting report after a win describes the trainer just beaten (both scenes, every round)

- **What a player sees:** after each win the attendant says "I've conducted a little investigation about your upcoming opponent." and
  then names the next trainer's favourite type and battle style. Ours describes the team just beaten. Seed 9 Scene ON, after battle 1:
  the ROM says the next trainer (MAXWELL: SEALEO, KRABBY, VOLTORB) "is apparently skilled in the handling of the WATER type." and favours
  "weakening the foe to start."; ours says "appears to have no clear favorites when it comes to type." and "free-spirited and
  unrestrained.", which is CHELSEA's team (LEDIAN, LOMBRE, NOSEPASS), beaten a moment before. After battle 12 the reverse: ours says WATER
  (CHLOE's AZUMARILL, POLIWRATH, beaten), the ROM "no clear favorites" (JAMAL's SEALEO, DELCATTY, MACHOKE).
- **How often:** 70 of the 83 after-battle reports in the 7 traces (seeds 2 and 8 Scene OFF: 12 of 12); the other 13 read the same by
  chance. Round 1 too (the first-round sweep did not report it).
- **Where:** seed 9 Scene ON, after battle 1: ours 6,790-6,930, ROM 6,960-7,076 (`curated/f1-scouting-round1-after-battle1-s9on.png`);
  after battle 12: ours 149,930-150,130, ROM 158,200-158,400 (`curated/f1-scouting-round2-after-battle12-s9on.png`). The ROM's trainer and
  sets are the engine's at that point (the held roll, staging "trainer roll" for battle 13).
- **ROM:** `BattleFrontier_BattleFactoryPreBattleRoom_EventScript_AskSwapMon` (`scripts.inc:137-144`): `factory_generateopponentmons`
  rolls the next opponent first, then `factory_getopponentmontype` / `factory_getopponentstyle` read it (`GetOpponentMostCommonMonType`,
  `battle_factory.c`, from `gFrontierTempParty`). The engine's rule itself is the ROM's (`src/engine/factoryCommentary.ts:190-229`).
- **Cause:** `createPostwinStateFromRound` (`src/engine/postwin.ts:632-690`) builds the four scouting pages at the win from
  `round.rules.currentOpponent.rentalRecords`, which is still the opponent just beaten (checked: the scouting party is the beaten
  trainer's in all 12 postwins of seed 9). The next opponent is generated later, at the GO ON answer.
- **Fix area:** build the scouting pages from the opponent rolled at the GO ON answer (the orchestrator's next opponent generation), not
  from the round's current opponent at the win. The first briefing of a round (the PreBattleRoom's, `buildBriefingMessages`) is right.

### 2. The Factory Head says nothing at the end of his battle

- **What a player sees:** your last Pokémon faints, NOLAND slides in, and the ROM prints his line "Way to work! That was a good lesson,
  eh?" and waits for A, then fades with it on screen. Ours slides him in over an empty message box, waits for the A on it and fades.
  When you beat him, the ROM prints "Good job! You know what you're doing!" (Silver; Gold: its own pair); ours would print an empty box
  there too (code read, not played: the one Head battle here was lost).
- **Where:** seed 2 Scene OFF played on to battle 21: ours 255,898-255,930 (empty box), ROM 270,818-270,904
  (`curated/h2-head-line-missing.png`, ours on top). An ordinary trainer's line prints in ours (seed 9 Scene OFF's loss, ours
  128,255-128,290, ROM 134,644-134,679: both "THANK YOU FROM THE SPEED BOOST HERO !").
- **ROM:** `CopyFrontierBrainText` (`frontier_util.c:2607-2631`) picks the Head's line from `sFrontierBrainPlayerLost/WonSilver/GoldTexts`
  (`:730-770`): `gText_NolandWonSilver`, `gText_NolandDefeatSilver`, `gText_NolandWonGold`, `gText_NolandDefeatGold`
  (`data/text/frontier_brain.inc:30-41`), used for `TRAINER_FRONTIER_BRAIN` in `battle_message.c:2530, 2554`.
- **Cause:** `FRONTIER_BRAIN_PRESENTATION` (`src/engine/factoryTrainerPresentation.ts:103-118`) has empty `speechWin` / `speechLose`
  tuples; its comment calls them "genuinely absent source data", but the lines are in the ROM's text, by symbol (Silver at battle 21, Gold
  at 42).
- **Fix area:** the Head's win / lose lines from `frontier_brain.inc`, chosen by the symbol tier.

### 3. The low-HP alarm comes back after a win (SHELL BELL on the winning blow)

- **What a player hears:** when your Pokémon is in the red, wins with its last hit and SHELL BELL heals it (still in the red), the ROM
  plays the victory music after "…SHELL BELL restored its HP a little!" and the alarm stays off. Ours starts the victory music one message
  early, at "Foe HUNTAIL fainted!", then plays the alarm again when the heal's HP bar stops (still red); it keeps beeping through
  "Player defeated …", the walk back, the attendant's talk, the GO ON and the swap offer, until the next battle's first turn: about 2,500
  frames (42 s).
- **Where:** seed 2 Scene OFF, battle 11 (OCTILLERY, 14/136 to 15/136): ours SE_LOW_HEALTH at 121,497, stopped with MUS_VICTORY_TRAINER at
  121,781 (on "fainted!"), SE_LOW_HEALTH again at 121,920, stopped at 124,432; ROM SE_LOW_HEALTH 127,879, stopped with the victory music at
  128,314 (when the SHELL BELL bar has reached 15), never again. `curated/f2-low-hp-alarm-after-shell-bell-s2off.png`.
- **ROM:** the victory music is played when the turn has ended (`HandleEndTurn_BattleWon`, after the move's end effects, SHELL BELL
  among them); `BattleStopLowHpSound` clears `lowHpSong` and stops the alarm (`battle_gfx_sfx_util.c:1120-1129`), and
  `HandleLowHpMusicChange` plays it only on a red bar with `lowHpSong` clear (`:1090-1103`), which no bar update after the victory music
  meets.
- **Cause:** `emitBattleEndSounds` schedules the victory music `VICTORY_BGM_AFTER_FAINT_DISMISS` (22) ticks after the dismiss of the foe's
  last "fainted!" box (`src/engine/battleEndSounds.ts:23, 62-68`, the schedule at :65), before any message that follows it in the same
  turn; the SHELL BELL bar then ends red after `stopLowHpSound`, and `src/engine/screenSounds.ts`'s low-HP rule (`:199-212`) starts the
  alarm again.
- **Fix area:** the victory music (and the alarm stop) at the end of the turn's last message, not at the faint box; or the low-HP rule
  off once the victory music has stopped it. Other end-of-move messages after the last faint would move the music the same way.

### 4. PETAYA BERRY's stat-rise flash on the wrong Pokémon (Scene ON)

- **What a player sees:** the foe's GIRAFARIG uses SKILL SWAP, then its PETAYA BERRY raises its SP. ATK: the ROM flashes GIRAFARIG
  (the stat-rise colour over the foe); ours flashes the player's MASQUERAIN. The text ("Using PETAYA BERRY, the SP. ATK of Foe GIRAFARIG
  rose!") and the sounds are the same on both sides (SE_M_STAT_INCREASE ours 107,897, ROM 113,518).
- **Where:** seed 9 Scene ON, battle 9: ours 107,880-107,960, ROM 113,504-113,584. `curated/f3-petaya-stat-rise-wrong-pokemon-s9on.png`.
- **ROM:** `TRY_EAT_STAT_UP_BERRY` sets `gEffectBattler` to the berry's holder (`battle_util.c:3246-3253`); `BattleScript_BerryStatRaiseEnd2`
  calls `BattleScript_StatUp`, `playanimation BS_EFFECT_BATTLER, B_ANIM_STATS_CHANGE` (`battle_scripts_1.s:4410-4417, 510-514`).
- **Fix area:** the stat-change animation's battler for a stat-up berry: the holder (the script's scripting battler, which the message
  already uses, `src/engine/battleResolutionPresentation.ts:4038-4059`), not the last move's target. Seen once; not checked whether any
  stat-up berry eaten after the holder's own move does the same.

### 5. Round 2's first opponent comes from another RNG step (every new challenge)

Fixed by fop1 (2026-11-21, `docs/fop1-first-opponent-order.md`).

- **What it means:** at the end of the PreBattleRoom walk the ROM draws the six rental set ids, then the first opponent, then (hundreds
  of frames later, in the draft screen) the six personalities. Ours draws the ids, then the personalities, then the opponent. With the
  same RNG the rentals are the same, the first opponent is not: in all 7 round 2s (and round 3 of the Head trace) the ROM's own order
  gives other Pokémon, and in 6 of the 7 another trainer (seed 19: trainer 119 WIGGLYTUFF, KABUTOPS, CHANSEY where ours rolls 94; seed
  8: 98 LICKITUNG, MAGCARGO, SHARPEDO where ours rolls 84; round 3: 101 where ours rolls 119). A player sees an ordinary random opponent
  either way; replaying a ROM challenge, the engine would face another one.
- **Where:** each run's staging "deal: first opponent" (`final/*/rom/timeline.json`): with the engine's deal cursor written at
  `GenerateInitialRentalMons`, the ROM's cursor at `GenerateOpponentMons` is exactly the engine's own cursor after the six ids
  (`selectionRngValue`) in all 7 rounds, and the engine's own `generateFactoryOpponent` from that cursor gives exactly the ROM's trainer and
  sets (seeds 23, 19 and 8 checked; probe in the staging `romOwnOrder`). The catcher then gives the ROM the engine's cursor so the rounds
  can be compared.
- **ROM:** `BattleFrontier_BattleFactoryPreBattleRoom_EventScript_EnterRoom` (`scripts.inc:30-31`): `factory_generaterentalmons`,
  `factory_generateopponentmons`; the personalities are drawn by `CreateFrontierFactorySelectableMons` when the select screen opens.
- **Cause:** `createFactoryRoundBattleOrchestrator` rolls the first opponent from `initialRentalGeneration.rngValue`, the cursor after
  the personalities (`src/engine/factoryRoundBattleOrchestrator.ts:1031-1068`); `buildBriefingMessages` (`src/engine/prebattleEntry.ts:116`)
  follows the same order, so the briefing and the battle agree with each other.
- **Fix area:** roll the first opponent from `selectionRngValue` (the ROM's order). The personalities would still be drawn back to back
  (#55, parked by Kyle on 2026-08-13: distribution parity); this one is an order, not a VBlank interleave, so it can be exact. A gameplay
  RNG change: every in-game new challenge's first opponent moves (soak pins and fixed traces through a Lobby new challenge re-pin).

### 6. (small) The bike-riding TRIATHLETEs stand in another sprite frame

- **What a player sees:** in the battle room the TRIATHLETE on a bike (male and female) stands facing the player with its wheels and
  pedals in another pose than the ROM's for the whole time it waits (about 190 frames); the position is the same (no shift explains it).
- **Where:** seed 9 Scene ON, before round 2's battle 1 (MALIK): ours 87,060-87,243, ROM 91,728-91,917
  (`curated/f5-bike-triathlete-frame-s9on.png`, ours left); seed 2 Scene OFF before battle 11 (JILL): ours 106,511-106,694, ROM
  112,123-112,357 (`curated/f5-bike-triathlete-f-s2off.png`).
- **ROM:** `gObjectEventGraphicsInfo_CyclingTriathleteM/F` use `sAnimTable_AcroBike` (face west = frame 2) over a 9-frame 32x32 sheet,
  the same layout as the other trainers (`object_event_graphics_info.h:1084-1120`, `object_event_pic_tables.h:709-731`).
- **Fix area:** the battle room's opponent frame for `CYCLING_TRIATHLETE_M/F` (`src/engine/battleRoomRender.ts:379-380`, the extracted
  sheet in `battle-room-npcs.json`). Not traced further.

## The Factory Head

`makeTrace.mjs --seed 2 --scene off --policy winning-swap --battles 21 --lobby-tail 120 --max-frames 400000` (of the 12 seeds that win
two rounds, only this one reaches battle 21; the others lose in round 3). Battles 1 to 14 are the seed 2 row's. Round 3's deal was
trapped like round 2's (rentals the engine's; the ROM's own order would have sent trainer 101 instead of 119), battles 15 to 20 followed
as before, and the Head battle (FACTORY HEAD NOLAND: BAYLEEF, HITMONTOP, DUNSPARCE; the player lost) was followed to the Lobby after the
challenge: all 1,141 menus, 21 of 21 transitions, the Head's three and the player's three the engine's at battle start.

- **The Head's party on the ROM**: built by `FillFactoryBrainParty` at battle start over 21 frames (ROM 261,076-261,097), with the overworld
  VBlank's `Random()` drawn 20 times between its draws. Trapped with the engine's cursor alone, the ROM built the engine's first Pokémon
  (same BAYLEEF, same personality) and then two others; with the VBlank draws undone during the build it builds the engine's three. So for
  the same RNG the ROM's Head brings other Pokémon after the first: the engine draws the build back to back, the #55 class (parked on
  2026-08-13, distribution parity). Not a new finding; the catcher stages it.
- **Before the Head (finding 1, second part)**: ROM 258,909-259,860: SE_POKENAV_CALL, "Excuse me! Excuse me, please! May I get you to
  wait a few moments?", the attendant at the phone ("…Uh-huh? What?! …Whoa! Understood, sir! Will do!"), "Oh, my… Sorry to keep you
  waiting!", "I have a message from this facility's boss, the FACTORY HEAD.", "He says, …", "The FACTORY HEAD is demanding you. Are you
  prepared…", GO ON, "I'm terribly sorry, but I can't tell you anything about the FACTORY HEAD.", the swap offer. Ours 244,900-245,650:
  "Thank you for competing! Let us restore your POKéMON!", "Finally, the …", "I've conducted a little investigation about your upcoming
  opponent." with the beaten trainer's type and style, the swap offer; no call sound. `curated/h1-before-the-head.png` (ours on top).
  ROM: `BattleFrontier_BattleFactoryPreBattleRoom_EventScript_ReturnToRoomFromBattle` (`scripts.inc:54-80`, `frontier_getbrainstatus`)
  and `AskReadyForHead` / `AskSwapBeforeHead` (`:349-376`). Cause: `createPostwinStateFromRound` sets `frontierBrain` from
  `round.rules.currentOpponent.frontierBrain` (`src/engine/postwin.ts:687`), the trainer just beaten, so the engine's call-scene branch
  (walk-up step A, `docs/walkup-step-a-design.md`) was not taken here, and by the code is not taken after any played battle 20. The fix
  of finding 1 (read the next opponent) covers this too.
- **After the Head (finding 2)**: NOLAND's line for beating you is missing (an empty box), see finding 2.
- The Lobby after the lost Head challenge ("Thank you for participating!", the save, "record your last match?") follows and matches.

## Catcher artefacts and leads checked and dropped

- **The player's name in the save dialog** (MEMORY on the ROM's save, PLAYER in ours): set-up, not the game. The engine side now prints the
  oracle save's name, as the ROM comparison harness does (`tools/compare/harnessPlayerName.ts`); same length, so traces made before replay
  the same. `curated/c1-save-dialog-player-name.png`.
- **A Lobby NPC facing another way** (seed 19, the man by the counter, ~500 frames): the overworld's RNG and NPC timers are not synced in
  the Lobby (the ROM reaches it a few hundred frames after ours, 266 in seed 23), so the NPCs' random turns are not compared.
  `curated/n2-lobby-npc-facing.png`.
- **Pictures far apart in long stretches** (e.g. seed 19's WATER PULSE in battle 10, seed 23 "CACTURNE fainted!" in battle 12): the same
  frames once aligned by their sounds (`curated/n1-water-pulse-same-when-aligned.png`); the stretch's replayed presses or a rescue A had
  moved one side.
- **The round-2 draft's menus**: the same draft-screen classes as round 1 (the third rental's RENT leaves the cursor menu for a few frames
  on ours only, the YES/NO click, the rented ball's blink).

## Catcher changes on this branch

1. **Lobby menus** (`engineMenus.mjs`, `romRun.py`): the attendant's CHALLENGE / INFO / EXIT and level multichoices and its YES/NOs are
   menus once drawn, checked before anything else (the last round's orchestrator, postwin and terminal states are still kept in the
   Lobby); on the ROM the save dialog's YES/NO runs under `SaveGameTask` (`SaveConfirmInputCallback` / `SaveOverwriteInputCallback`,
   `start_menu.c:996-1075`), a `field.yesno` menu too.
2. **Rounds on both sides** (`engineRun.mjs`, `plan.py` `RoundCounter`): each round's rentals and deal cursors are recorded; battles are
   keyed `g` = round × 7 + battle number. The ROM's round steps when `curChallengeBattleNum` goes back to 0 (`InitFactoryChallenge` at the
   save before the challenge). That number reads 0 or garbage for a frame or two at every battle start: `CB2_InitBattle` moves the save
   blocks to a new random address (`MoveSaveBlocks_ResetHeap`, `battle_main.c:590`, `load_save.c:84-120`) and a frame boundary can fall
   inside the copy. So only the next number (+1, at most 7, held 3 frames) or 0 (held 30 frames) is taken; seed 8 Scene OFF read 60 once,
   and taken as a battle number it had keyed battle 4's set-up wrongly (the ROM then played battle 4 differently).
3. **The second draft's deal** (`romRun.py` `deal_traps`, `finish_deal`): the frame whose fast run changed the rentals' set ids is stepped
   again with traps at `GenerateInitialRentalMons` (the engine's deal cursor) and `GenerateOpponentMons` (the engine's first-opponent
   cursor), so the ROM draws the engine's six and first trainer itself and the attendant's comments are the ROM's own; both are checked,
   and the opponent the ROM's own order would roll is probed from the saved state (finding 5). When the new select screen's cursor task
   runs, the six get the engine's personalities (`patch_select_mons`, as in round 1).
4. **The Factory Head** (`romRun.py` `brain_traps`): no GO ON roll before the Head (the ROM's `AskSwapBeforeHead` rolls nothing); the Head's
   party is built at battle start by `FillFactoryBrainParty`, trapped at its entry with the engine's cursor, with the overworld VBlank's
   `Random()` undone while the build runs (the build spans frames); the party patch no longer needs `gFrontierTempParty` for the Head.
5. **IVs logged**: the ROM's own rental and foe IVs against the engine's (`sameIvs` in the staging list).
6. `makeTrace.mjs --lobby-tail N` (stop N frames into the Lobby after the wanted battles); its challenge-end stop now reads the event's
   `type` (it never stopped after a loss before), and the battle text marks a battle lost from the round's last battle (a lost battle's
   return hold is a postwin state too, so it said "won"); `compare.py` names the Lobby, the attendant, the PreBattleRoom and the next
   draft.

`python3 -m unittest tools/test_frame_catcher.py`: 31 tests OK (rounds, blips and garbage reads, the GO ON guard, the deal and Head traps,
the attendant menus against the game's own module).

## Still not staged

- **The Factory Head without a seed that gets there**: only the one seed of the 12 tried reaches battle 21 (seed 2 Scene OFF; the others
  lose in round 3). To stage a Head battle at will, a challenge has to start with a streak: on the ROM, write the streak into the save
  before the draft is re-entered, as round 1's staging writes the rentals and zeroes the streak today (`romRun.py`): `factoryWinStreaks[0][0]`
  (`SB2_FACTORY_STREAK`, 0xDE2) = 14 for round 3 (the Silver Head is battle 21, `sFrontierBrainStreakAppearances` = {21, 42},
  `frontier_util.c:92`; 35 for Gold at battle 42) and the rents count (0xDF2, the rental tier); for Gold also the Silver symbol flag
  (`FLAG_SYS_FACTORY_SILVER`, `GetPlayerSymbolCountForFacility`, `frontier_util.c:1847-1851`). The select screen builds from the written
  set ids anyway, the trainer rolls (tier = streak / 7) and transitions are already staged, and the Head's party by the trap above. On
  the engine side the start has no such option: `FactorySession`'s `frontier` record holds only `symbols` and the heard-speech
  bits (`src/factoryContract.ts:47-50`), and `createInitialFactoryCarry` starts every challenge at streak 0 and rents 0
  (`src/engine/factoryRoundChaining.ts:73-83`). It needs a `factoryWinStreak` (and `rentsCount`) in that record, used by
  `createChallengeState`'s draft start (`src/factorySession.ts`), an engine change.
- **The Lobby's overworld RNG and NPC timers** are not synced between the sides, so the NPCs' random turns there are not compared.
- **A start from the Lobby** (`after-save`) is still not staged; round 2 is reached by playing round 1.
- As before: pan changes of a running sound and cry pitch / length are not compared; the draft YES/NO click and the swap picker's
  fade-in stay artefacts (fcs1 "Catcher limits left").
