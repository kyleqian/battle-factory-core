# lbw9: the Lobby attendant's save wait, menu clamp and menu timing (Battle Scene OFF)

Website note: this changes the Lobby's frame count, so it changes the RNG for everything after the save. **A game recorded on an older build replays on that
build only**; a trace that goes through the Lobby attendant's save dialog (every new challenge started from the Lobby) does not replay on this build.

## Rules (ROM source, no route constants)

1. **Save wait** (`start_menu.c` `SaveDoSaveCallback` -> `SaveSuccessCallback` -> `SaveReturnSuccessCallback`, `SaveSuccesTimer`). After "<player> saved the game." the
   ROM plays SE_SAVE, waits for `IsSEPlaying` to go false, and only then counts a 60-frame timer. A *held* A (`JOY_HELD`) ends the message as soon as the SE has ended
   (and plays SE_SELECT); with nothing held it ends when the 60 frames are over (no sound). A new press during the SE does nothing. We waited for a new A / B instead.
   Measured on the first-glyph age of the message: SE starts at 15, is idle at 15 + 50 = 65, the timer decides at age 124 (65 + 60 - 1). `ATTENDANT_TIMING.saveSeAge` 15,
   `saveSeIdleDelay` 50, `saveSuccessTimer` 60; `attendantSavedMessageEnds(age, aHeld)`. The core passes `aHeld` (A down this frame) next to `a` (A pressed this frame).
   The saved screen takes no input of its own any more (`attendantAcceptsInput` is false there).
2. **Menu wrap** (`script_menu.c:143-146` `InitMultichoiceCheckWrap`, `menu.c` `Menu_ProcessInputNoWrap`). A multichoice wraps only if it has more than 3 items;
   the cursor sound plays only if the cursor moved; the menu takes A, then B, then UP, then DOWN. Every Lobby menu has 2 or 3 items (CHALLENGE / INFO / EXIT,
   LV. 50 / OPEN LEVEL / EXIT, YES / NO), so none wraps: Up on the first and Down on the last entry do nothing and are silent. `attendantMenuWraps(count)`
   is the rule; the wrap branch is kept for a 4+ item menu (none exists in the Lobby).
3. **Menu input delay** (`sProcessInputDelay` 2). Traced before any change (`lbw9-wrap3-*`): the first input the ROM accepts after a menu first draws is on the same frame as ours.
   The ROM's delay of 2 is already inside `menuDelayAfterText` (the menu appears after the text's delay), so `ATTENDANT_TIMING.menuInputDelay` is 0 and nothing changed.
   Tier-1 pins the first accepted tick.
4. **Found while tracing: the CHALLENGE cursor moves one frame after the press**, like LEVEL and YES / NO. `docs/lbrb-attendant-conversation.md` said "CHALLENGE moves on the
   press frame"; no existing trace captured the press frame in that menu. The new dense trace `lbw9-wrap3-ask-off` refutes it (4 frames at the 4 presses), so the late
   cursor (`pendingCursor`) now applies to every menu. This is a drawing-only change (the choice taken by A is unchanged).

Other routes: the save dialog (SAVING..., saved) exists only in the Lobby attendant's script (`BattleFrontier_BattleFactoryLobby`); retire, record and the 7-win route
use different scripts / screens, and the loss, forfeit and 7-win returns reach the same attendant conversation (lbra / lbrb / lbrd traces below), so there is nothing else to change.
`make play:random` / the soak players press A on every conversation tick, so a held or tapped A at the saved message ends it as the ROM's would; no player needed a change.

## Compare traces (ROM vs app, frames matched)

New dense traces (every frame captured around the event; built from `lbrd-won-attendant-off` / `lbrb-saveno-off` / `lbrb-savedlgno-off` prefixes):

| trace | what | before | after |
|---|---|---|---|
| `lbw9-save-none-off` | no A through the saved message | 134 / 269 | 269 / 269 |
| `lbw9-save-held-off` | A held through the SE and after | 75 / 269 | 269 / 269 |
| `lbw9-save-se-tap-off` | an A tap during the SE | 162 / 269 | 269 / 269 |
| `lbw9-save-timer-tap-off` | an A tap during the 60-frame timer | 269 / 269 | 269 / 269 |
| `lbw9-wrap3-ask-off` | CHALLENGE / INFO / EXIT, Up / Down at both ends | 79 / 267 | 267 / 267 |
| `lbw9-wrap3-level-off` | LV. 50 / OPEN LEVEL / EXIT, Up / Down at both ends | 75 / 267 | 267 / 267 |
| `lbw9-wrap2-saveq-off` | YES / NO (save question), Up / Down at both ends | 76 / 203 | 203 / 203 |
| `lbw9-wrap2-savedlg-off` | YES / NO (save dialog), Up / Down at both ends | 76 / 203 | 203 / 203 |

The 38 existing Lobby traces (lbra-*, lbrb-*, lbrc-*, lbrd-*, lbre-*, lbw*-*; list in `.integration/evidence/lbw9/before.txt`, not committed) are all at their counts, none moved
(`lbrd-won-attendant-off` 1416 / 1416, `lbra-forfeit-on` 805 / 1050 as before).
`lbw9-save-timer-tap-off` already matched before: the old code ended on the tap's frame, which coincided with the timer's end.

## Tests and re-pins

* `tests/lbw9LobbySave.test.ts` (17 tests, 13 fail without the src change): the 15 / 50 / 60 constants, no A ends at age 124, held A at 65, A tap during the SE ignored, tap after it
  skips, SE_SELECT only on the held skip, the wrap rule, clamp at both ends of all three menus, the late cursor, A before direction, the first accepted tick.
* Re-pinned (every Lobby new-challenge is dealt from a later cursor): `tests/lbrd.test.ts` `WIN_TWO_SEED` / `RETIRE_SEED` / `WIN_THEN_LOSE_SEED` 23 -> 0 (scan of 0..31 with the
  seed in all three roles on full-file scratch copies: 0 and 10 pass all 15 cases); `tests/randomRoundSoak.test.ts` "(b) a winning seed chains" seed 0 -> 13 (scan of seeds 0..49,
  `--policy winning --max-rounds 3 --render-every 0 --seeds 0:50 --parallel 3`: 13, 19, 23, 40 carry 14).
* `docs/lbrb-attendant-conversation.md` and `docs/snd1-playtest-sounds.md` lose the statements this note replaces.
