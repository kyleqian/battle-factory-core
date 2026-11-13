# lbr-d2a: ROM evidence for the 7-win won-script tail (Battle Scene OFF)

Evidence only; no `src/` change. Probe: `tools/probe/stage-factory-seventh-win-tail-off.py` (continues
`stage-factory-seventh-win-timeline-off.py`; identical staging and identical pre-menu release schedule, so ticks
are the same terminal ages as `tests/fixtures/data/factory-seventh-win-timeline-off.json`). Fixture:
`tests/fixtures/data/factory-seventh-win-tail-off.json` (shape pinned by `tests/factorySeventhWinTailFixture.test.ts`).
Reproduce: `PYTHONPATH=/srv/pokebench/vendor/libmgba-py python3 tools/run-mgba-probe.py <fresh.json> -- /srv/pokebench/vendor/mgba-venv/bin/python tools/probe/stage-factory-seventh-win-tail-off.py <fresh.json>` (~40 s; an optional 2nd arg is an exploratory input plan).
Both answers were measured. Staged state only (no script/printer/task/window writes); after the menu only buttons are sent.

## ROM ticks (A = tick of the answering A press; NO = default cursor at the first accepted tick)

| event | NO | YES (Up@4424, A@4430) |
| --- | --- | --- |
| record menu draw (`recordMenu` task alive) | 4422 | 4422 |
| answer accepted (`gSpecialVar_Result` set) | 4424 (A) = 1 | 4430 (A) = 0 |
| menu window gone | 4425 = A+1 | 4431 = A+1 |
| record-question text cleared / printer restarts | 4425 printer on, first new glyph 4427 = A+3 | text lingers; printer on 4449 = A+19; first "recorded" glyph 4452 = A+22 |
| last glyph / printer idle (held) | 4461 / 4462 = A+38 | 4500 / 4501 = A+71 |
| earliest accepted dismiss A | 4465 = A+41 (4462, 4463, 4464 rejected) | 4504 = A+74 (4501-4503 rejected) |
| farewell first glyph | 4427 (A+3; the only message) | 4507 = dismiss+3 |
| farewell last glyph / held | 4461 / 4462 | 4541 / 4542 (dismiss+38 held) |
| earliest accepted farewell-dismiss A | 4465 = held+3 | 4545 = held+3 (4544 rejected) |
| script shutdown (`sGlobalScriptContextStatus`=2, `releaseall`) | 4466 = dismiss+1 | 4546 = dismiss+1 |
| box gone (hash `cd880b376315`) | 4467 = dismiss+2 | 4547 = dismiss+2 |
| free control: avatar leaves idle on DOWN held from shutdown | 4467 (pos change 4475) | 4547 (pos change 4555) |

So the tail after the record answer is identical for both answers from the farewell on (same held frame
`def8396773a1`, same box-gone frame `cd880b376315`); YES only inserts the SaveBattle "recorded" message first.
Free control is the shutdown tick (script context off); the first DOWN accepted the next tick.

## App won profile today vs ROM

Won profile: `src/engine/factoryTerminalPresentation.ts:260-` (`FACTORY_ROUND_WON_TERMINAL_PROFILE`, farewell constants
:265-277, input gates used at :849 and :862). Its decline/saved offsets are relative to `declineFarewellReleaseAge`
("edge"); if edge = the A tick (as the menu constants are: `recordMenuDrawDelay 22`/`recordMenuInputDelay 24` from the 4400 A
reproduce 4422/4424 exactly), then:

| constant (won profile, line) | app | ROM (rel. to A / dismiss) | differs |
| --- | --- | --- | --- |
| recordMenuDrawDelay / InputDelay (:262, :264) | 22 / 24 | 22 / 24 | no |
| declineMenuClearDelay (:265) | 1 | 1 | no |
| declineTextClearDelay (:266) | 3 | first new glyph at +3 (box already clear) | app box-clear +3; hash cannot separate clear from glyph 1, so consistent |
| declineTextFirstDelay (:267) | 4 | first glyph +3 | **ROM 1 tick earlier** (assuming edge = A tick) |
| last glyph | edge+38 (comment :29-31) | A+37 (4461) | **1 tick earlier**, same cause |
| declineInputDelay (:268) | 39 | earliest accepted A = +41 (held+3) | **app accepts 2 ticks earlier than ROM** |
| declineReleaseClearDelay (:269) | 2 | box gone dismiss+2 | no |
| recordSavedTextClearDelay (:274) | 21 | printer restart A+19 (not separable by hash from the unchanged question until the first glyph) | unresolved by hash |
| recordSavedTextFirstDelay (:275) | 22 | A+22 | no |
| recordSavedInputDelay (:276) | 70 | earliest accepted dismiss A+74 (held at A+71) | **app accepts 4 ticks earlier** |
| farewell after the recorded dismiss | edge re-armed at dismiss; first glyph +4 | dismiss+3 | **1 tick earlier** |
| recordDisabledFarewellEdgeFromRestore (:277) | 166 (copied from loss) | not measured here (record question present); needs the cant-record branch | unmeasured |
| script shutdown / free control after dismiss | not a profile constant | dismiss+1 / +1 | add if lbr-d models free control tick |

Caveat: the +1 differences (first glyph, last glyph, post-dismiss farewell) are all the same one-tick offset, so they may
be a tick-convention difference between the loss-derived `edge` and this A-tick measure rather than separate errors; the
input-accept gates (+2, +4) are real differences but only matter for an A pressed in the few ticks after the text finishes.
Nothing here moves the known big lbr-d numbers. Confirming the +1 convention needs the lbr-d2b compare trace
(`appStage` + staged `oracleBattleLab` as in `lbra-*`) which this step did not build.

## Not covered

- Attendant conversation / door walk after free control (next lbr-d2 window).
- `recordDisabledFarewellEdgeFromRestore` (record disabled branch): the won script reaches the question here.
- Brain variant text (existing bisect probe).
- Scene ON: Lobby has no scene, so ON equals OFF from the box open on (per `docs/lbr-d-scout.md` section 4).
