# Noland's battle-room scenes, frame by frame (2026-11-19)

Kyle: "the timing, let's get that correct" and "The symbol scene ... let's just implement it". The round replay checked only WHICH of Noland's
lines play (`frontier-record.md`). This checks how they look and when, on the real ROM, frame by frame: every frame's picture, the frames a
press is taken on (A and B), the sounds, and the RNG draws of every frame.

## The tools

- `tools/audio/romNolandScene.py` (the ROM): the lab stages the walk-up to Noland (`factoryBrain` + `walkup`; the checkpoint is the open
  GO ON / RECORD / REST / RETIRE menu before the Factory Head) and the tool adds the save's record the lab does not stage: the symbols
  (`--symbols`) and the heard-speech bits (`--heard S,G`). From the checkpoint the ROM plays the scene to the battle's first action menu.
  Each frame is recorded: the picture hash (sha256 of the RGB888 framebuffer, the oracle's), `gRngValue` and the draws since the frame
  before, the sounds (m4a calls, `soundEventProbe.py`'s stepping hooks, effective calls only), and, from a fork of the state before the
  frame, whether a one-frame A or B press would advance the game (`adv`) or change the picture within K frames (`gate`). The drive presses
  on the first frame a press advances the game (`--press-delay N`: N frames later; `--press-button B`; `--yesno-b`: B on the swap prompt).
  `--win` ends the battle as a win at the first action menu and records what follows (the symbol scene, the Lobby).
- `tools/integration/nolandSceneEngine.ts` (the engine): stages the engine at the same menu (the round's six wins resolved, the same record,
  the ROM's RNG cursor), ticks it with the ROM's presses (a press the engine does not take on the ROM's frame is retried on the next frame it
  takes one, and reported), and compares. The transition the ROM drew is given to the engine (the engine draws the Head's transition from
  its own gameplay stream, see "Not covered"), and the pause before it is the ROM's (it is the time the ROM takes to build Noland's team).
  `--fixture` keeps a recording as a test fixture.
- The test: `tests/parityMacNolandRoomScenes.test.ts` with `tests/fixtures/noland-room/` (10 recordings, 151 KB). Up to each recording's
  compared frame every frame's picture, every gate and every sound must equal the ROM's; the RNG draws of every frame must too, except at the
  battle's start.

## What was wrong for a player, and the fixes (each cites the source; each fails the fixture test when undone)

1. **Noland's speech ran on the wrong clock.** The engine's speech was fitted in August to the lab's fixed presses, which the game had not
   taken yet (a press sent before a box is ready is ignored), so the fit moved the delay to after the press. Played with real presses the
   first speech fell behind the game box by box and the boxes went out of step. The speech is now the game's field message box
   (`battleRoom.ts`, the speech section; `text.c` RenderText, `TextPrinterWaitWithDownArrow`, `TextPrinterDrawDownArrow`, `ScrollWindow`):
   - one character a frame (the save's FAST text speed); a newline costs nothing;
   - `\p` / `\l`: the press is taken from the frame after the line's last character; the arrow shows from the frame after that and moves
     every 9 frames; the press plays SE_SELECT; `\p` clears the box and prints the next page; `\l` scrolls the window up 4 pixels a frame
     for four frames and prints the new line under the old one (the engine used to type both lines again: 32 frames slower on page 1);
   - after a `\p` press the cleared box shows on the next frame only when the arrow was redrawn on the press frame (the clear itself is not
     copied to the screen; the arrow's redraw or the next character copies it);
   - the end of a message (MSGBOX_DEFAULT's waitbuttonpress) takes a press from three frames after the last character; the next msgbox shows
     its empty box three frames after the press; the last one closes two frames after it.
2. **The room appeared a frame early** (the Head's map load sets up his object, one frame more than an ordinary room):
   `BRAIN_WARP_FADE_TO_ROOM_ELAPSED`.
3. **"Hey, hey! Get a move on!" took A three frames early and then closed four frames late**: the press is taken three frames after the last
   character and the walk starts at once (`BRAIN_MSGBOX_ACCEPT_ELAPSED`; scripts.inc:51-57).
4. **B did nothing.** The game takes B wherever it takes A in these boxes (WaitForAorBPress, TextPrinterWaitWithDownArrow), and B on the
   "swap before the Head?" YES/NO is NO with one SE_SELECT (Menu_ProcessInputNoWrapClearOnChoose, Task_HandleYesNoInput). Now: the room's
   boxes, the pre-battle room's MSGBOX_DEFAULT boxes and the swap YES/NO (the same script commands on the ordinary route, so it has them
   too), and the battle intro's "would like to battle!" prompt.
5. **The battle intro's prompt took a press two frames late** (the engine waited for the arrow to show; the game takes the press on the
   printer's first wait frame): `BATTLE_INTRO_PROMPT_ACCEPT_LEAD` (shared by every trainer's intro).
6. **"I can't tell you anything about the Head..." took A one frame early**: `POSTWIN_BRAIN_CANT_TELL_INPUT_READY_DELAY` (+2).
7. **Missing sounds**: SE_SELECT on every `\p` / `\l` of Noland's speech; SE_EXIT on the warp into the battle room (DoWarp,
   field_screen_effect.c:490; every route).
8. **GO ON before the Head drew four RNG values too many** (the ordinary trainer's intro text, which the Head's route does not have:
   pre-battle room scripts.inc:349-376): `postwinRngSteps(..., frontierBrain)`.
9. **The battle start**: DoNolandBattle builds Noland's team, draws the transition and starts the BGM and the transition 32 frames after the
   last box in the recording the constant comes from (`BRAIN_BATTLE_TRANSITION_START_ELAPSED`, was 28/26, keyed to the old close); the
   battle BGM now starts on the game's frame, two frames before the transition shows; the transition's own clock is each family's
   (`brainBattleTransitionTe`); CIRCLES_MEET_IN_SEQ's centre-logo blend and fade wait for its last circle, eight frames after plain MEET's
   (battle_transition_frontier.c:420-426, :537-555); the battle intro takes over twenty frames after the fade starts
   (`brainBattleIntroHandoffTe`).

## The ROM recordings (counts of what was run)

| Fixture | Record | Presses | Compared through | Result |
|---|---|---|---|---|
| silver-first | 0 symbols, nothing heard (challenge 2) | first frame taken | the battle intro's prompt (1,463 frames) | equal |
| silver-first-slow | same | 13 frames late | 1,622 (transition 3, SQUARES_SCROLL: the draw frame is the one before the BGM's) | equal |
| silver-first-b | same | B on every box, B on the YES/NO | 1,457 (transition 11, SYMMETRIC_SPIRAL_IN_SEQ) | equal |
| silver-first-scene-on | same, Scene ON | first frame | 1,463 | equal |
| silver-heard | 0 symbols, silver heard | first frame | 943 | equal |
| return-21 | 2 symbols (STREAK, battle 21) | first frame | 943 | equal |
| gold-first | 1 symbol, silver heard (challenge 5) | first frame | 1,105 (transition 10) | equal |
| gold-heard | 1 symbol, both heard | first frame | 882 (transition 6, ASYMMETRIC_SPIRAL) | equal |
| return-42 | 2 symbols (STREAK_LONG, battle 42) | first frame | 882 (transition 6) | equal |
| gold-heard-scene-on | 1 symbol, both heard, Scene ON | first frame | 882 | equal |

Battle 63 runs the same script path as 42 (STREAK_LONG, scripts.inc:117): the lab cannot stage challenge 8's walk-up, so it was not recorded.
The room does not differ between Scene ON and OFF (two recordings each way agree frame for frame with the same engine).

## The symbol scene (Job 2)

After a first win over Noland (silver with no symbol, gold with one: `FactoryBrainRoundOutcomeResult.symbolGranted`) the game's battle
room shows Noland's line, the player's step, the fanfare with the symbol's text and his closing lines before the warp to the Lobby
(DefeatedNolandSilver, scripts.inc:128-141; DefeatedNolandGold, :154-167). The engine went from the battle straight to the Lobby.

The return to the field after the battle is the ordinary one (the return span, `postwin.ts`: the battle exit on its age 43, the room's
fade-in from 57) up to the frame its script would warp (age 79: SE_EXIT, DoWarp). With a new symbol the script shows the scene there
instead; the engine now does the same (`battleRoom.ts`, the symbol scene section; `core.ts`, the terminal branch): the scene starts on the
span's age 79 and the span, and with it the Lobby's clock, holds on that age until the scene's own warp. Measured on the real ROM:

- Noland's line opens like the room's first message (an empty box two frames later, one character a frame) and takes its end press three
  frames after the last character (A or B). Gold's has two pages (`\p`, SE_SELECT).
- Silver: `closemessage`, so the box shows on the press frame and the next; gold: `waitmessage` and no close, its last page stays up
  through the step (the press frame and the three after it, then the step).
- The step (Movement_PlayerApproachNoland, walk_right of the fake player; the camera stays): one pixel a frame for 16 frames, the first
  eight on the object's first side walk frame (sAnim_GoEast: frame 7, mirrored), then a frame's hold.
- `playfanfare MUS_OBTAIN_SYMBOL` and the symbol's text start on the next frame: the room BGM stops, the fanfare plays 318 frames, the BGM
  continues. The text prints like a new msgbox and waits for no press (`waitmessage`, `waitfanfare`).
- Noland's closing lines start their printer two frames after the fanfare's end (three pages, two `\p` with SE_SELECT).
- The last press: the warp to the Lobby on the next frame (SE_EXIT), the box still up under the fade-out (no `closemessage`).

Fixed on the way, each measured on the same recordings:

10. **The room after Noland's battle was drawn as an ordinary trainer's room** (the return span's room frames, every win over Noland, symbol
    or not): now his room as the walk-up left it.
11. **No SE_EXIT on the warp after a win over Noland** (the engine left it out for every brain win): now on the warp.
12. **The won Lobby's clock started at the battle's end instead of the Lobby's map load** (every seventh win and every win over Noland on
    the website): the congratulation box showed already typed when the Lobby appeared and took A about 100 frames early. The terminal's
    clock now starts at the load (`FACTORY_ROUND_WON_TERMINAL_PROFILE`'s age 0).
13. **The Lobby's award text took its presses early** (the `\l` 1 frame, the end 3 frames: `awardScrollInputDelay` 70,
    `awardDefaultInputDelay` 44), **the exchange page's `\p` drew its arrow on the press frame and showed the cleared box a frame late**
    (the same rule as Noland's speech), **after a win over Noland the record question came a frame early** (it follows the save; 169
    frames from the party restore on the ROM, the ordinary seventh win keeps lbr-f's measured 168: `BRAIN_WIN_RECORD_PROMPT_EXTRA_FRAMES`).
14. **The Lobby's save after a new symbol is longer**: from the exchange press to the record question 216 frames with no new symbol (two
    runs), 347 after the silver symbol (three runs), 341-347 after the gold one (three runs): `SYMBOL_SAVE_EXTRA_FRAMES` 131. The cause
    inside the save was not traced.

The library's contract is unchanged: the round-end event still comes at the battle's end (before the scene), the save's record already has
the symbol then (`frontierRecord`, `ReplayResult.frontier`), and a reload in the middle of the scene replays to the same frame and goes on
with the same pictures and sounds (lib.ts collects the replayed frames' sounds, so the fanfare's continue still comes). Scene ON and OFF
share the room; the recordings are Scene OFF.

| Fixture | Run | Compared | Result |
|---|---|---|---|
| symbol-silver | first win over silver Noland | from the battle's return to the field through the scene, the warp and the Lobby's load (598 frames) | equal |
| symbol-gold | first win over gold Noland | the scene, the warp, the Lobby to the save's SE (1,500 frames) | equal |
| win-no-symbol | a win with both symbols (battle 21) | the warp on age 79, the Lobby to the record question (1,022 frames) | equal |

Test: `tests/parityMacNolandSymbolScene.test.ts` (and the reload in the middle of the scene). Each of the fixes above fails it when undone.
Under vitest the engine prints its own player name (the harness name is off there), so the Lobby's "<player> obtained N Battle Point(s)."
frames are the only ones the test lets differ; the tool's own run (`nolandSceneEngine.ts --win`) is exact there too.

Re-pins from the Lobby's clock (both are moves of a scripted player's path, not of a rule): `tests/lbrd.test.ts`'s seeds (the next challenge's
deal moved; a scan found 2 for every case) and `tests/randomRoundSoak.test.ts`'s seven-win pin (frames 41,240 -> 41,332).

## Not covered (gaps)

- **The Lobby after the silver symbol scene ran a frame later in the game** (all three silver runs; no gold or plain run): its map load took
  a frame more, most likely the CPU time of a load step against the music's position; not modelled. The silver fixture stops at the load.
- **The Lobby's save after a new symbol** varies: gold 341-347 frames (the engine uses 347 for both tiers).
- **The Lobby's record question and what follows** (its YES/NO with B, the later boxes): the engine takes B there only on some boxes and a
  press 1-3 frames late; the challenge's end, shared by every route, was not part of this work.
- **The battle's end before the return** (the defeat text, the victory music, the fade): the recordings end Noland's battle by setting the
  outcome, so the battle itself is not compared; the scene is compared from the battle's return to the field. The map BGM's return on the
  span's age 53 is scheduled by the battle's end and is therefore not in the staged comparison.
- **Battle 84** (both symbols, the fifth return battle): not run. The lab stages challenges 0..7 only and reaching 84 needs four rounds played
  back to back; the engine uses the same rule as 63 (STREAK_LONG).

- **The room recordings that drew a transition are compared through it and into the battle intro** (docs/trn225-frontier-transitions.md):
  to the frame Noland's team first shows differently (the engine rolls his team from its own stream: the party balls, the send-outs). Only
  LOGO_WIGGLE (id 29) is still not drawn (shown as CIRCLES_MEET); no recording drew it.
- **The pause before the transition is fixed at 32 frames; the game's varies with Noland's team** (CreateMon builds each Pokemon's moveset,
  about ten frames each: 26, 27, 32 and 37 frames in these recordings).
- **Noland's team and the transition come from the engine's gameplay RNG, not the room's per-frame cursor.** The game builds his team when
  the battle starts, from the live cursor (with the VBlank draws of the build interleaved), then draws the transition. The engine draws
  both from its gameplay stream (fix 45 rolls the team at the swap's resolution); his team and the transition are random either way, but
  for the same presses not the game's. The per-frame draws therefore differ on the team build's frames and at the battle's start.
- **The battle intro after the prompt**: the status bars' slide-out is a frame off at times, and the send-outs show the engine's own team.
  Not part of the room; not fixed.
- **The pre-battle room before the GO ON menu** (the heal, the call scene) is not in these recordings (the lab's checkpoint is the menu).
- **The ordinary trainer's room** (its box takes A only on the engine; the game takes B there too) was not recorded.
- **Open Level** is not covered.
