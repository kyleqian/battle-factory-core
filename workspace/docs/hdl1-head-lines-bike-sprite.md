# hdl1: the Factory Head's end-of-battle lines and the bike TRIATHLETEs' place (2026-11-21)

The fixes for findings 2 and 6 of the round-2 frame catcher sweep (`docs/fcr2-catcher-round2.md`): "The Factory Head says nothing at
the end of his battle" and "(small) The bike-riding TRIATHLETEs stand in another sprite frame". Presentation only: no gameplay or RNG
change.

## 1. The Factory Head's end-of-battle lines

### What was wrong

- When NOLAND beat the player, ours slid him in over an empty message box, waited for A on it and faded; the ROM prints his line.
  When the player beats him, ours would have printed an empty box too.
- `FRONTIER_BRAIN_PRESENTATION` (`src/engine/factoryTrainerPresentation.ts`) had empty `speechWin` / `speechLose` tuples under a
  comment calling them "genuinely absent source data". The lines are in the ROM: `CopyFrontierTrainerText`
  (`frontier_util.c:1695-1774`) sends `TRAINER_FRONTIER_BRAIN` to `CopyFrontierBrainText` (`:2607-2631`), which copies
  `sFrontierBrainPlayerLostTexts` / `sFrontierBrainPlayerWonTexts` (`:774-785`) at the tier `GetFronterBrainSymbol` gives
  (`:2587-2604`), from `data/text/frontier_brain.inc:30-44`:

  | tier | the Head wins (`STRINGID_TRAINER1WINTEXT`, ours `speechWin`) | the player wins (`STRINGID_TRAINER1LOSETEXT`, ours `speechLose`) |
  |---|---|---|
  | Silver (battle 21; with both symbols, every streak 21) | `gText_NolandWonSilver`: "Way to work!" / "That was a good lesson, eh?" | `gText_NolandDefeatSilver`: "Good job!" / "You know what you're doing!" |
  | Gold (battle 42, then every 21) | `gText_NolandWonGold`: "Hey, hey, hey!" / "You're finished already?" | `gText_NolandDefeatGold`: "What happened here?" (one line) |

  "Won" is Noland's line when he wins, so it goes where an ordinary trainer's `speechWin` goes (`FRONTIER_PLAYER_LOST_TEXT`).
  `BufferStringBattle` adds the `PAUSE_UNTIL_PRESS` after the copied line for every trainer (`battle_message.c:2741-2748`), so the
  box waits for A with no down arrow, as for the ordinary trainers.

### ROM evidence

- **Head wins, Silver** (seed 2 Scene OFF played to battle 21, `.integration/evidence/fcr2/final3/s2-off-ws21-head`): Noland slides
  in over ROM 270,788-270,811, the first glyph of "Way to work!" is on 270,814 and the last of "That was a good lesson, eh?" on
  270,852: 39 glyphs in 39 frames (the line break costs no frame), then the box holds still (no arrow) until the replayed A and
  fades with the line on screen (from 270,880 in that run). Ours, same run: the same slide over 255,876-255,899 frame for frame (same picture hashes), and on
  255,902 (the ROM's 270,814) the box cleared to empty, waiting.
- **Player wins, Silver**: the oracle lab `tools/battle-lab/aud241c-brain-win-off.json` (factoryBrain, challenge 2, level-50 Seismic
  Toss RATTATAs against level-12 ones), captured densely
  (`.integration/evidence/fix-head-bike/lab/brain-win-dense.json`): "Player defeated / FACTORY HEAD NOLAND!", the slide-in settling on
  lab frame 1,653, "Good job!" from 1,656, "You know what you're doing!" done on 1,691 (36 glyphs, 36 frames), then the A wait.
- **Gold, both outcomes**: the same lab at challenge 5 (player sets 564-566, as `factory-brain-gold-turn1-off.json`): player wins,
  "What happened here?" on one line (`lab/gold-win-coarse.json`, captured every 4 frames: printing from 1,656, done by 1,676; 19
  glyphs); the parties swapped and the two send-outs pressed
  (`lab/gold-loss-dense.json`), Noland settles on 1,750, "Hey, hey, hey!" from 1,753, "You're finished already?" done on 1,790
  (38 glyphs, 38 frames).
- Pixels: each line drawn by the engine's battle printer (`drawBattleMessageTextLines`) into the empty box of ours 255,902 matches
  the ROM's fully printed box (rows 112-159) with 0 differing pixels, all four lines (`lab/head-lines-box-compare.json`,
  `lab/head-lines-rom-over-ours.png`: ROM above ours for each). In the three dense captures the first glyph comes 3 frames after
  the slide-in settles, as ours does (the message starts where the ordinary trainer's line starts).

### The change

- `frontierBrainSymbolTier(status)` (`src/engine/frontierBrainStatus.ts`): `GetFronterBrainSymbol` from the battle's status, silver
  and streak to Silver, gold and streak-long to Gold (the same mapping the battle room's walk-up speech already used). The streak
  and the symbol are written by the battle room's script after the battle (`scripts.inc:92-99`, `:139`, `:165`), so the status
  chosen at battle start is the tier the line is printed with.
- `factoryTrainerPresentation.ts`: the four lines, with the source's line breaks and `'` as the B4 glyph `’` (charmap.txt:87-88, as
  the Easy Chat words are carried); `getFrontierBrainPresentation(status)` gives the tier's frozen presentation;
  `getFactoryTrainerPresentation(1022, status?)` (Silver when no status is given: the id alone carries no tier);
  `factoryTrainerPresentationForOpponent` passes the opponent's `frontierBrain.status` and refuses a Head id without a status (or an
  ordinary one with a status), so a tier is never picked by accident. The comment now says where the lines come from.
- `speechBefore` stays empty: `CopyFrontierTrainerText(FRONTIER_BEFORE_TEXT)` would copy the player-lost line for the brain too, but
  the Factory never asks for it (`BattleOpponent` jumps to `BattleNoland` before `palace_getopponentintro`, `scripts.inc:74-76`;
  his speech is the walk-up script's), and `battleRoomQuote` never reads it.
- Nothing else had to change: the resolver already reads `speechWin` / `speechLose` for these two ids
  (`battleResolutionPresentation.ts`), prints one glyph a frame and waits for A without the arrow.

## 2. The bike-riding TRIATHLETEs in the battle room

### What was wrong

Not another frame. `gObjectEventGraphicsInfo_CyclingTriathleteM` / `F` (`object_event_graphics_info.h:1084-1120`) use
`sAnimTable_AcroBike`, but its face and walk entries are the standard ones (`object_event_anims.h:1006-1014` against `:825-833`):
`face_left` after `Movement_OpponentEnter` (`scripts.inc:206-213`) is frame 2 on both, the sheet's west-facing bike. What differs is
the width: these two are the only 32x32 object sheets the battle room draws, and the ROM centres every sprite on its tile
(`event_object_movement.c:1461-1463`: `centerToCornerVecX = -(width >> 1)`, `x += 8`), so the bike stands 8 px left of where a
16-wide trainer stands. `drawNpcFrame` (`src/engine/battleRoomRender.ts`) put every sheet's left at the 16-wide object's left. The
earlier note that "the position is the same" compared crops that hid the 8 px.

### ROM evidence

Matching the sheet's nine frames against the frames (`.integration/evidence/fcr2/final/`): seed 9 Scene ON MALIK (trainer 98,
CYCLING_TRIATHLETE_M), ROM 91,800: frame 2 at (120, 56), all 277 opaque pixels; ours 87,100: frame 2 at (128, 56). Seed 2 Scene OFF
JILL (trainer 99, CYCLING_TRIATHLETE_F), ROM 112,239: frame 2 at (120, 56), 282 of 282; ours 106,557: frame 2 at (128, 56). During
the walk-in the frames match too (frame 0 at x 120 on the ROM, 128 ours). The colours were already exact.

### The change

`drawNpcFrame` draws a sheet at `pos.x + 8 - width / 2` (and returns that left), the ROM's formula; every 16-wide sheet is where it
was. The room after this change, rendered settled with MALIK, equals ROM frame 91,800 over the whole screen (0 differing pixels);
with JILL it equals ROM 112,239 everywhere but the message box, which that ROM frame shows.

Checked: no other battle-room trainer graphic has a non-standard anim table or a width other than 16 (the 34 opponent sheets, the
scientists, the player and Noland: `sAnimTable_Standard`, 16 wide, the three 16x16 ones handled by pic4).

## Tests

- `tests/hdl1HeadEndOfBattleLines.test.ts`: the four lines against `frontier_brain.inc` itself (parsed in the test) and as literals;
  the tier for streaks 20/41 with 0, 1, 2 symbols (silver, gold, streak, streak-long, and 62 with both); the round's opponent
  routing and its refusals; through `createBattleResolutionPresentation`, `STRINGID_TRAINER1WINTEXT` / `TRAINER1LOSETEXT` give the
  lines, 39 / 36 / 19 typed rows (the ROM's 39 frames), `advance: "button"` with no cursor.
- `tests/hdl1BikeTriathleteAnchor.test.ts`: the two cycling sheets are the only wide ones; MALIK and JILL settled: the sprite at
  (120, 56) 32x32, frame 2's every opaque pixel there, and the SHA-256 of x 112-159, y 56-87 equal to the ROM frames' (91,800 and
  112,239); four 16-wide trainers still at x 128.
- `tests/factoryBrainPresentation.test.ts`: the Silver lines replace the empty pin.
- Both new files fail on the old code (checked with the old two source files put back).

Results: `tsc -b` with the typecheck script's heap clean (`npm run typecheck` needs `flock`, missing on this Mac); the 24 test files
importing the changed modules 287/287; 26 more Noland / brain test files 276/276; `npm run test:gate` 360 files, 2,832/2,832;
the soak pins (`tests/randomRoundSoak*.test.ts`, `soakLobbyNewChallenge`, `contain209SoakContained`) 11 files 125/125, no re-pin.

## Catcher before / after

Fresh traces made on this build (`makeTrace.mjs`, the fcr2 commands: seed 9 Scene ON 14 battles; seed 2 Scene OFF to battle 21),
`KEEP=1 JOBS=2 tools/frame-catcher/run.sh`; evidence in `.integration/evidence/fix-head-bike/` (not in git): `traces/`, `catcher/`,
`lab/`, `curated/` (`h2-head-line-after.png`, `f5-bike-triathlete-m-after.png`, `-f-after.png`: ours above the ROM). Before: the fcr2
runs `final/s9-on-ws` and `final3/s2-off-ws21-head`.

| run | engine / ROM frames | menus followed | content / timing stretches | picture differences (over 8 px) | sound differences |
|---|---|---|---|---|---|
| s9-on-ws before | 167,963 / 177,462 | 587/587 | 256 / 329 | 1,212 (644) | 1 |
| s9-on-ws after | 167,963 / 177,462 | 587/587 | 255 / 330 | 1,198 (631) | 1 (the same) |
| s2-off-ws21-head before | 256,718 / 271,896 | 1141/1141 | 469 / 668 | 1,000 (544) | 7 |
| s2-off-ws21-head after | 256,725 / 271,638 | 1141/1141 | 469 / 668 | 977 (525) | 7 (the same) |

- **The Head's line** (battle 21's last stretch, 1136): before, 15 differences (the ROM's 1,050 px of text for 91 frames, ours' empty
  box, and the ROM's blinking arrow from a "rescue" A the driver had to press in the Lobby, 271,429-271,649). After, the line prints
  glyph for glyph on the same frames: ours 255,902-255,940 against ROM 270,814-270,852 with the same box picture on every frame;
  the A plays SE_SELECT on its frame, the BGM fade starts 6 frames later and the screen fade 7 later on both sides (ours A on
  255,949, ROM 270,857: the replayed press lands 9 frames after the last glyph on ours, 5 on the ROM, the driver's offset in a long
  stretch). One difference is left in that stretch: 17 px for 1 frame, the Lobby's "record your last match?" down-arrow phase
  (256,483), the catcher's press-replay artefact (fcr2 had one like it, #401). The rescue A is gone, so the ROM run is 258 frames
  shorter.
- **The bike TRIATHLETEs**: the traces meet five bike riders, not the two fcr2 named: seed 9 ON DAVE (104, battle 7) and MALIK (98,
  battle 8 = round 2's first), seed 2 OFF JILL (99, battle 11), DAVE (battle 16) and DALIA (107, battle 18). Every difference they
  made is gone, in each the room before the battle (the walk-in, about 75 frames, and the wait, about 185) and the room redrawn
  after the battle (`[124, 67, 30, 21]`, about 38 frames): seed 9 ON 19 occurrences in stretches 251, 285, 298, 330 (MALIK's: fcr2
  #23 / #24, 435 px, and #83 / #94, the walk-in, with their residues #262, #438, #465, #1185); seed 2 OFF 37 in stretches 467, 547,
  782, 824, 946, 998 (JILL's: #32 / #34, 440 px, #84, #110 and seven small ones). Ours 87,100 against ROM 91,800 (MALIK): identical in
  rows 0-111 (ours has the quote box up a little earlier, timing); ours 106,557 against ROM 112,239 (JILL): identical over the whole
  screen. Left in those stretches: the round-2 draft screen's two-frame fade, party-icon frames, the swap screen and the hand-off
  before the transition (#225), as before.
- **Nothing else moved**, checked by matching every occurrence (side, stretch, frames, pixels) of the before and after reports. Seed 9
  ON: 19 occurrences gone (above), none new. Seed 2 OFF: 56 gone (the bikes' 37, the Head's line's 15, two end-of-trace frames, two
  re-counted in battle 18's stretch, below), 6 new: the end-of-trace Lobby frames (2, at the trace's new last frames), the Lobby
  arrow phase above (1), and in battle 18's stretch the known hand-off before the transition (#225) now counted apart from the
  full-screen swap-screen difference it was merged with (the bike used to sit between them; battle 4's stretch already showed them
  apart), with the ROM's full-screen difference 67 px smaller (the bike's). The sound differences are the same 1 and 7 as before.

## Left open

- The Head's line when the player wins and both Gold lines were checked on the ROM through oracle labs only (the catcher reaches
  just one Head battle, a Silver loss): text, line breaks, glyph timing and pixels match. A Gold-tier or player-won Head battle in a
  catcher run would need a seed that gets there.
- `battleRoomStateForOpponent` (`battleRoom.ts`) still maps the status to the walk-up speech tier inline; it could use
  `frontierBrainSymbolTier`, left alone to keep this change off the battle room's speech code that other fixes touch.
