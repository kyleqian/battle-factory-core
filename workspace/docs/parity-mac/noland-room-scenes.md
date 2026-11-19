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
- The test: `tests/parityMacNolandRoomScenes.test.ts` with `tests/fixtures/noland-room/` (10 recordings, 118 KB). Up to each recording's
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
| silver-first-slow | same | 13 frames late | 1,239 (transition 11, not drawn) | equal |
| silver-first-b | same | B on every box, B on the YES/NO | 1,089 (transition 11) | equal |
| silver-first-scene-on | same, Scene ON | first frame | 1,463 | equal |
| silver-heard | 0 symbols, silver heard | first frame | 943 | equal |
| return-21 | 2 symbols (STREAK, battle 21) | first frame | 943 | equal |
| gold-first | 1 symbol, silver heard (challenge 5) | first frame | 1,105 (transition 10) | equal |
| gold-heard | 1 symbol, both heard | first frame | 546 (transition 6, not drawn) | equal |
| return-42 | 2 symbols (STREAK_LONG, battle 42) | first frame | 546 (transition 6) | equal |
| gold-heard-scene-on | 1 symbol, both heard, Scene ON | first frame | 546 | equal |

Battle 63 runs the same script path as 42 (STREAK_LONG, scripts.inc:117): the lab cannot stage challenge 8's walk-up, so it was not recorded.
The room does not differ between Scene ON and OFF (two recordings each way agree frame for frame with the same engine).

## Not covered (gaps)

- **Seven of the twelve Frontier transitions are not drawn by the engine** (LOGO_WIGGLE, SQUARES, SQUARES_SCROLL, CIRCLES_ASYMMETRIC_SPIRAL,
  CIRCLES_SYMMETRIC_SPIRAL, CIRCLES_CROSS_IN_SEQ, CIRCLES_SYMMETRIC_SPIRAL_IN_SEQ): it shows CIRCLES_MEET instead. Every trainer, not only
  Noland. 3 of the 10 recordings drew one (6 and 11); they are compared up to it.
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
