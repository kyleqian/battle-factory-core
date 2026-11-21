# lbb1: the Lobby's farewell (and every other box that waits for a press) takes B (2026-11-21)

fcm1 finding 8 and open item 2 (`docs/fcm1-catcher-sweep.md`). Kyle asked for both fixes. Branch `fix/lobby-b-press` (from
`trial-fix-20261121`, 6817b6a8c). Presentation / input only: no rule, no RNG rule. A box that a B now closes earlier moves the Lobby's and
the rooms' VBlank RNG cursor the way the ROM's does.

## What was wrong

After a round the Lobby asks "Would you like to record your last BATTLE FACTORY match…?" and then says "We look forward to your next
visit." That box is `msgbox BattleFrontier_BattleFactoryLobby_Text_LookForwardToNextVisit, MSGBOX_DEFAULT`
(`data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:90`). MSGBOX_DEFAULT is `message`, `waitmessage`, `waitbuttonpress`
(`data/scripts/std_msgbox.inc:18-22`), and `waitbuttonpress` runs `WaitForAorBPress` (`src/scrcmd.c:1323-1330`): A or B, read on the same
frame. Ours took A only (`advanceFactoryTerminalRecordPrompt`, `src/engine/factoryTerminalPresentation.ts`: `declineDismissAge` and the
YES path's `recordSavedDismissAge` read `input.pressedA`).

ROM evidence, fcm1 run `s118-on-wc` after battle 14 (frames kept in `.integration/evidence/fcm1/final/s118-on-wc`; contact sheet
`.integration/evidence/fix-lobby-b/s118-farewell.png`):

| | the record question answered (NO) | B | the box |
|---|---|---|---|
| ours | 170,355 | 170,402 (47 frames later; the won route's gate is 41) | still up at 170,410; closed by the next A at 170,425 |
| ROM | 177,584 | 177,632 | gone at 177,634 (the dismiss + 2, `declineReleaseClearDelay`) |

The test player's DOWN presses after it then walked the ROM's player off the counter while ours still stood there, so the ROM never reached
the next challenge. Five fcm1 rounds stopped in the Lobby that way (s44-on-ws, s77-on-ws, s118-on-wc, s185-off-wc, s281-on-ws).

## Every box checked against its script

The ROM rules: `msgbox …, MSGBOX_DEFAULT` takes A or B (`WaitForAorBPress`). A `\p` / `\l` page waits in
`TextPrinterWaitWithDownArrow`, `JOY_NEW(A_BUTTON | B_BUTTON)` with SE_SELECT (`src/text.c:865-882`). `message` + `waitmessage` takes no
press. A `multichoice` / `multichoicedefault` with ignoreBPress FALSE answers B as MULTI_B_PRESSED with one SE_SELECT
(`Task_HandleMultichoiceInput`, `src/script_menu.c:178-184`), and wraps its cursor only above three entries (`script_menu.c:143-146`).
MSGBOX_YESNO answers B as NO and does not wrap (`Menu_ProcessInputNoWrapClearOnChoose`). In every fixed case B is taken at A's gate, on
the same frame and to the same state.

| where | box (ROM source) | ROM | ours before | now |
|---|---|---|---|---|
| Lobby, loss | "Thank you for participating!" and "I will return your POKéMON…" (`\p`, Lobby `scripts.inc:67`, text `:370-375`) | A or B | A | **fixed** |
| Lobby, loss | "I must also save the event results." (`message` + `waitmessage`) | no press | no press | ok |
| Lobby, win | congratulations, the Head's congratulations (`\l`), the award (`\l`) (`:44`, `:49`, `:52`, MSGBOX_DEFAULT) | A or B | A or B | ok |
| Lobby, win | "obtained N Battle Point(s)" (MSGBOX_GETPOINTS `:54`, the fanfare) | no press | no press | ok |
| Lobby, win | "Let me exchange your POKéMON…" (`\p`, `:55`) | A or B | A or B | ok |
| Lobby | "Would you like to record your last … match" (`\l`, `:79`) | A or B | A or B | ok |
| Lobby | its YES / NO (`multichoicedefault 20, 8, MULTI_YESNO, 1, FALSE`, `:81`) | B = cancel, the farewell | same | ok |
| Lobby | "{PLAYER}'s battle was recorded" (`BattleFrontier_BattleTowerLobby/scripts.inc:136`, MSGBOX_DEFAULT) | A or B | A | **fixed** |
| Lobby | "We look forward to your next visit." (`:90`; a forfeit's, with no record question, is the same box) | A or B | A | **fixed** |
| Lobby attendant | welcome, INFO's explanation (`:216`, `:232`), "Please step this way." (`:165`), the EXIT farewell (`:197`) | A or B | A or B | ok |
| Lobby attendant | CHALLENGE / INFO / EXIT, the level (`multichoice`, B not ignored, three entries) | B = EXIT; no wrap | B = EXIT; wrapped | **fixed** (wrap) |
| Lobby attendant | "I need to save the game. Is that okay?" (MSGBOX_YESNO `:145`), the save dialog's two YES / NO (`start_menu.c:1003-1075`) | B = NO; no wrap | B = NO; wrapped | **fixed** (wrap) |
| Lobby attendant | "SAVING…" | no press | auto | ok |
| Lobby attendant | "{PLAYER} saved the game." (`SaveReturnSuccessCallback` / `SaveSuccesTimer`, `start_menu.c:947-962`, `:1123-1134`) | A **held**, only once SE_SAVE has stopped, or 60 frames after it; B nothing | A or B new, from the last character | **open** (below) |
| Lobby | the NPCs and the rules board (MSGBOX_NPC / DEFAULT) | | not modelled (silent NPCs, user decision) | n/a |
| PreBattleRoom, new challenge | the briefing: "I've conducted a little investigation…", the type and style comments, "First, we will hold your POKéMON…" (PreBattleRoom `scripts.inc:38`, `:208` and the comment scripts, MSGBOX_DEFAULT, `\p` pages) | A or B (`\p`: SE_SELECT) | A | **fixed** |
| PreBattleRoom, after the draft | "Right this way, please!" (`:44`) | A or B | A | **fixed** |
| postwin | "Thank you for competing! Let us restore your POKéMON!" (`:57`) | A or B | A | **fixed** |
| postwin, before the Head | the call boxes (`:65`, `:70`, `:74`) | A or B | A or B (sct1) | ok |
| postwin | "The Nth match is next! Are you ready?" (`message` + `waitmessage`) | no press | no press | ok |
| postwin | GO ON / RECORD / REST / RETIRE (`multichoice 19, 4, …, TRUE`) | B ignored; wraps (4) | same | ok |
| postwin | GO ON / REST / RETIRE after a recorded battle (`multichoice 20, 6, …, TRUE`) | B ignored; no wrap (3) | wrapped | **fixed** (wrap) |
| postwin | the RECORD and RETIRE YES / NO (`multichoicedefault 20, 8, MULTI_YESNO, 1, FALSE`, `:111`, `:131`) | B = MULTI_B_PRESSED -> AskReadyForOpponent like NO (`:115`, `:135`), one SE_SELECT, wherever the cursor is | B ignored | **fixed** |
| postwin | "{PLAYER}'s battle was recorded" (RECORD -> YES) | A or B | A | **fixed** |
| postwin | REST's "save and quit?" (MSGBOX_YESNO `:122`) | | REST unselectable (deliberate divergence, 2026-08-05) | n/a |
| postwin | the scouting pages, "I can't tell you anything about the FACTORY HEAD" (MSGBOX_DEFAULT) | A or B | A or B (sct1) | ok |
| postwin | "Before starting the battle, would you like to swap a POKéMON?" (MSGBOX_YESNO) | B = NO | B = NO | ok |
| postwin | "Thank you! Your POKéMON swap is complete." (`:157`) | A or B | not shown (known: fcp1 "Not fixed" item 4) | n/a |
| postwin | "Right this way, please!" (`:44`) | A or B | A or B | ok |
| battle room | the opponent's intro (`msgbox gStringVar4, MSGBOX_DEFAULT`, BattleRoom `scripts.inc:78`) | A or B | A | **fixed** |
| battle room | Noland's boxes, the symbol scene (`:52` and on) | A or B | A or B (fix 50) | ok |

## The changes

- `src/engine/factoryTerminalPresentation.ts`: the loss pages 0 / 1, "battle was recorded" and the farewell take `pressedA || pressedB` at
  their existing gates (`firstPageInputReadyAge` / the last character, `recordSavedInputDelay`, `declineInputDelay`). The sounds are diffs of
  the release ages (`scheduleTerminalStepSounds`), so B's `\p` SE_SELECT follows.
- `src/engine/core.ts`: the heal message, "battle was recorded" (postwin), the first "Right this way", every opponent intro box (both
  battle-room branches) take A or B; the RECORD / RETIRE YES / NO takes B as NO (`acceptPostwinQuestionDismiss`, one SE_SELECT), checked
  after A (A wins a same-frame A + B, as in `Menu_ProcessInputNoWrap`; UP / DOWN still come first in ours, as before). The briefing gets `{ press: A || B }`.
- `src/engine/prebattleEntry.ts` (`PrebattleEntryInput.press`), `src/engine/lobbySounds.ts` (the briefing's `\p` SE on A or B).
- Separate commit: `src/engine/factoryLobbyAttendant.ts` (the attendant's menus clamp the cursor) and `src/engine/postwin.ts`
  (`movePostwinContinuationCursor` clamps with three entries, wraps with four). The sounds already followed the ROM rule.

## The catcher gap (fcm1 open item 2)

After RECORD -> NO the game prints "The Nth match is next!" again and shows the GO ON menu, but draws that window and takes its input on one
frame (`postwinQuestionReprintMenuReadyDelay`; `advancePostwin` keeps the answered question until then). The question's own YES / NO is the
same (`POSTWIN_QUESTION_WINDOW_DELAYS` is both its draw and its input frame). A press on that first frame left no frame with the menu
waiting, so `plan.Plan` had no anchor for it and the ROM's menu was unplanned. In `s89-off-ws` the test player's A came on that frame
(ours 137,134); the ROM's menu opened at 144,776 (`Task_HandleMultichoiceInput`), and the run stopped at 566 of 631 menus. Ours and the
ROM drew it within a frame of each other (`.integration/evidence/fix-lobby-b/s89-reask-rom.png`: the ROM's window from 144,777-778, ours
from 137,134, with the text aligned frame for frame).

`tools/frame-catcher/engineMenus.mjs` now counts both as menus from the frame their text is fully printed: the ROM's `waitmessage` returns
there and the multichoice task follows (taking input after `sProcessInputDelay`, `script_menu.c:129`). The game's own predicates are passed by
`engineRun.mjs`: `postwinQuestionVisibleChars` against `POSTWIN_QUESTION_TEXT_TOTAL` for the question, `postwinQuestionReprintSettled` for
the menu asked again, which opens on GO ON. Without them (an older build) the old rule stays. Checked the same way: B on the question, RETIRE
-> NO, and RECORD -> YES -> "battle was recorded" (the three-entry menu). REST -> NO has no engine side (REST is unselectable in ours).
`tools/frame-catcher/README.md` updated.

## Tests

- `tests/lbb1LobbyBPress.test.ts` (10 tests, all 10 red without the src change): the farewell on the won route at the ROM's gate (41;
  s118's B at +47 is taken), the loss pages and farewell, YES -> "battle was recorded" -> the farewell (reducers); the heal, B on the RECORD
  and RETIRE questions with either cursor (state, one SE_SELECT, back to GO ON), postwin "battle was recorded" (core ticks); the first
  "Right this way" and the opponent's intro; the PreBattleRoom briefing after a real Lobby conversation (every page and message, SE_SELECT
  on `\p` only); a live round (the soak driver's strong-route player wins battle 1, then B on the heal, RECORD -> B, B on the swap offer,
  B on the next opponent's intro, each on the tick A is taken; battle 2 starts). Each B is checked against A on the same tick and one tick
  earlier.
- `tests/lbb1MenuNoWrap.test.ts` (7; 6 red before): the attendant's five menus hold at both ends; GO ON / REST / RETIRE holds, the
  four-entry menu wraps. `tests/postwin.test.ts`'s three-entry traversal pin now stops at RETIRE.
- `tools/test_frame_catcher.py`: `EngineMenusTest.test_the_question_and_the_go_on_menu_asked_again_are_menus_before_their_first_press`
  (NO, B, YES, RETIRE; every press on the first frame the game takes it; anchors checked through `plan.Plan`, and that the old rule had none).
- Re-pinned (separate commit, `tests/randomRoundSoak.test.ts`): full seed 0 22897 -> 22843, full seed 1 58793 -> 58758, vanilla seed 0
  9319 -> 9300 (frames only; same battle / turn / depth / end state; decision notes identical to 6817b6a8c's, for full seed 1 once the
  press-stream party-wander and forced-menu DOWN notes are set aside); the ISSUES #99 pin moves from vanilla seed 1 (first swap offer now at
  50,093) to seed 0 (23,816; scan of seeds 0..11 in the comment).
- `tsc -b` clean. The 50 test files that import the changed modules or drive the terminal, postwin, rooms and Lobby: 664 tests pass.
  `npm run test:gate`: 360 files, 2,832 tests pass. Catcher unit tests: 33 pass.

## Catcher before / after

Both traces remade on this build with their fcm1 makeTrace arguments (`--battles 21 --lobby-tail 120 --max-frames 400000`; seed 118
Scene ON `winning-coverage`, seed 89 Scene OFF `winning-swap`) and run with `KEEP=1 JOBS=2 tools/frame-catcher/run.sh`. Evidence (not in
git): `.integration/evidence/fix-lobby-b/{traces,catcher}/`.

| run | frames ours / ROM | menus followed | ROM stop | content / timing stretches |
|---|---|---|---|---|
| s118-on-wc, fcm1 | 240,671 / 391,073 | 638 / 879 | none: the ROM waited in the Lobby after battle 14 (the farewell closed on B, the player walked off) | 272 / 363 |
| s118-on-wc, lbb1 | 234,868 / 245,077 | **836 / 836** | engine-trace-end | 374 / 458 |
| s89-off-ws, fcm1 | 150,115 / 147,776 | 566 / 631 | stuck-at-unplanned-menu (the GO ON menu after RECORD -> NO) | 203 / 361 |
| s89-off-ws, lbb1 | 150,101 / 158,570 | **632 / 632** | engine-trace-end | 226 / 404 |

- The remade s118 trace plays on through round 3 to battle 21 (the Factory Head, won) and the Lobby after it (fcm1's trace, made on the
  old build, lost battle 19; its ROM run stopped in the Lobby after battle 14). Its Head party came out the engine's on the ROM (312 / 281 / 345, fcm1 open item 1 not seen here). The Lobby
  after battles 7, 14 and 21 is followed.
- In s89 the same situation happens again (RECORD -> NO after battle 13; the test player's A on the first frame of the GO ON menu asked
  again, ours 137,120): the engine's menu is now an anchor from 137,116 (the printed text), the ROM's opens at 144,768 and takes the A
  (gone 144,773), and the run goes on to its end.
- The driver's `rescue-a` gaps (the ROM waiting at a text the engine's presses missed) are at "{X} fainted!" (fcm1 finding 4, another
  fix) and at the round-1 Lobby's record question (`\l`, which takes A or B in both; fcm1's run had the same rescue there, ROM 105,192):
  none at a box this change touched (`.integration/evidence/fix-lobby-b/rescues-s118.png`).
- Differences: not reviewed one by one. The largest ones and every one in a field stretch (the Lobby, the postwin YES / NO) that I looked
  at are fcm1's known items: the draft YES / NO (and its SE_SELECT click, s118's one sound difference), the swap screen's fade-in, the
  battle-start transitions, the party icons, the Lobby wait arrow's blink phase. The content counts grew with the coverage (s118: 832
  stretches against 635).

## Open

- **"{PLAYER} saved the game."** (the Lobby attendant's save dialog) is not a B box: `SaveReturnSuccessCallback` waits for SE_SAVE to stop,
  then `SaveSuccesTimer` closes it on A *held* or 60 frames later; B does nothing (`start_menu.c:947-962`, `:1123-1134`). Ours closes it on
  a new A or B from the last character and never on its own. ROM, fcm1 s118-on-wc (round 1 -> 2): SE_SAVE at 106,101; A held on
  106,122-124 and 106,127-129 not taken; A at 106,145 closed it (106,148). Making ours ignore B without the timeout would leave a B-only
  player waiting where the ROM moves on, so this wants the whole rule, which needs the SE_SAVE length measured; not done here (snd1 listed it
  as found, not fixed).
- Not checked: whether A / B speed up text printing (`canABSpeedUpPrint`; snd1 "found, not fixed").
