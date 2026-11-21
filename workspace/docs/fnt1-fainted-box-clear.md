# fnt1: the "{X} fainted!" box after its press (2026-11-21)

Finding 4 of the fcm1 catcher sweep (`docs/fcm1-catcher-sweep.md`), noted before as lrc1 "Open" 2 (`docs/lrc1-loss-recall.md`) and in
fcs1's "Fixed since" (the ROM blanks the box after the A in 4 of 8 losses). Branch `fix/fainted-box-clear` from `trial-fix-20261121`
(`6817b6a8c`). Evidence (not in git): `.integration/evidence/fix-fainted-box/` (`scan-before/`, `traces/`, `catcher/`, `census/`).

## In short

The ROM does not always blank the box. A press on a `\p` wait clears the window's buffer, and the clear reaches the screen only when
the same frame also redraws the down arrow, which happens every 9 frames. On every other frame the box keeps "{X} fainted!" with the
arrow frozen until the next print, as ours did. The fcm1 examples (s247, s100) were presses on the first wait frame. That frame is a
redraw frame, and the ROM takes a press there, 2 frames before ours could. Over the fcm1 runs the ROM blanked 231 of 1,502 boxes.
Ours differed in four ways, all fixed: the press was taken 2 frames late; the arrow's first phase lasted 10 frames, not 9; the arrow
froze one phase early when a new phase landed on the press frame; and a press on a redraw frame never blanked the box. Also, on your
Pokemon's faint, ours dropped the frozen arrow during the 21 frames before the party menu. The fix covers every message that ends
on `\p`: "{X} fainted!", "Player defeated ...!", and the last page of a gated string ("dragged out!", "The SUBSTITUTE took damage
...!").

## ROM

### Source

- `data/battle_scripts_1.s:2809-2823`: `BattleScript_FaintAttacker` / `BattleScript_FaintTarget` end on `printstring
  STRINGID_*FAINTED` (no `waitmessage`). `src/battle_message.c:74-75`: both strings end with `\p`; `:371` "Player defeated" too.
- `src/text.c:1102-1105`: `CHAR_PROMPT_CLEAR` -> `RENDER_STATE_CLEAR`, `TextPrinterInitDownArrowCounters` (`downArrowDelay` 0).
  This happens on the frame after the last glyph, and from the next frame the printer waits.
- `src/text.c:1171-1179` (`RENDER_STATE_CLEAR`): `TextPrinterWaitWithDownArrow` (`:865-882`) first draws the arrow
  (`TextPrinterDrawDownArrow`, `:787-835`). When `downArrowDelay` is 0 it blits the arrow, calls `CopyWindowToVram(COPYWIN_GFX)` and
  sets the delay to 8, so the arrow is redrawn on wait frames 0, 9, 18, .... The printer then reads `JOY_NEW(A | B)` and plays
  SE_SELECT. On a press it runs `FillWindowPixelBuffer` on the window's **buffer** and goes back to `HANDLE_CHAR`. The next frame reads
  `EOS` (`:1119-1120`) and returns `RENDER_FINISH`, which copies nothing (`RunTextPrinters`, `:319-345`: only `RENDER_PRINT` copies).
- `CopyWindowToVram` -> `LoadBgTiles` -> `RequestDma3Copy` (`src/window.c:266-284`, `src/bg.c:375`). `ProcessDma3Requests` serves the
  copy in `VBlankIntr` (`src/main.c:358`, `src/dma3_manager.c:42`), from the buffer as it is at that VBlank.

So: on a press made on an arrow-redraw frame, that frame's queued copy carries the cleared buffer and the box is blank from the next
frame. On any other frame nothing copies the window until the next print's `BattlePutTextOnWindow` (`src/battle_message.c:2972`), so
the print and the arrow, as last drawn, stay frozen. Battle text in the Factory prints with `autoScroll` off (`:3002-3005`).

### Measured (frame catcher, the fcm1 ROM runs, 32 rounds, both scenes)

G is the frame on which the box's last glyph shows; P is the press, on the frame where the button is new and SE_SELECT plays. The wait
frame is k = P - G - 1. Tools: `scan-before/` (`faintscan.py` over every "fainted!" box; boxes labelled by replaying each trace on the
engine).

| | ROM | ours before |
|---|---|---|
| first frame a press is taken | G + 1 (120 boxes pressed there, all taken; 93 pressed at G, none taken) | G + 3 (presses at G + 1, G + 2 not taken: 248) |
| arrow shown / redrawn | G + 2, G + 11, G + 20, ... (s247 17,469 / 17,478 / 17,487) | G + 2, G + 12, G + 21, ... |
| after the press, k % 9 == 0 | blank from P + 1 until the next print: 231 of 231 | the print + arrow kept (128 such presses) |
| after the press, otherwise | the print + the arrow as shown on P, frozen: 1,271 of 1,271 | the print + the arrow of P - 1 frozen; your faint: no arrow |

The table covers 1,502 ROM boxes with no exception. By case: the foe's faint while the trainer has more Pokemon, 748 (124 blank); your
faint mid-battle, 377 (60); the foe's last faint (a win), 354 (45); your last faint (a loss), 23 (2). "Player defeated ...!\p" follows
the same rule: from G + 1, blank iff k % 9 == 0. 342 of 354 ROM boxes agree; the 12 others are a scanner artefact (a space glyph taken
for the arrow), and the cases checked by hand (s165 52,866, s100 82,521) agree.

Examples (ROM frames):
- s247-on-ws battle 3, the foe's GLOOM: G 43,141, P 43,142 (k 0); blank 43,143 to 43,267 (the tray slides in), "LADY GILLIAN sent
  out" from 43,268.
- s100-on-wc battle 16, your PRIMEAPE: G 245,087, P 245,088 (k 0); blank 245,089, the party menu's fade from 245,109 (P + 21; ours
  also P + 21).
- s247: k 9 (50,479 / 50,489): phase 0 on P, blank from P + 1. k 1 (61,098 / 61,100): the first arrow shows on P and stays. k 10
  (46,861 / 46,872): phase 1 shows on P and stays. Your faint at k 242 (17,467 / 17,710): arrow frozen until the fade at P + 21.

What follows the press is the same on both sides, except where the next print starts (below, "Open"): the tray and send-out on a foe's
faint (press -> SE_BALL_TRAY_ENTER 25 frames on both sides), the 21 held frames and the fade on yours.

## Change

Presentation and input timing only (`src/engine`):

- `battleResolutionPresentation.ts`: message commands gain `promptClear`, a button piece whose string ends on `\p`. It is read from the
  template's prompt gates (`battleStringPromptGates`). It is set on the faint ids and `STRINGID_PLAYERDEFEATEDTRAINER1`, and on a gated
  string's last page when its `\p` is the string's end (dragged out, Substitute damaged, ...). It is not set on the trainers' speech,
  which waits on PAUSE_UNTIL_PRESS with no arrow, on `\l` scrolls, or on a mid-string `\p` (Trick). `releasedWaitCursor` gains `clear:
  "pending" | "done"`.
- `battleResolutionPresentationRender.ts`:
  - `isBattleResolutionButtonMessageAcceptable` takes a `promptClear` piece from the same row as a gated page (`GATE_ACCEPT_LEAD_ROWS`):
    G + 1.
  - `releasedWaitCursorOnPress` records the frozen age as the phase the release frame shows (wait frame - 1). It sets `clear` when
    `promptClearPressBlanksBox(k)` holds (k % `DOWN_ARROW_REDRAW_PERIOD` (9) == 0).
  - The render view draws the frozen arrow, or from the frame after a redraw-frame release nothing, until the next print
    (`releasedPromptBox`). This now also applies while the forced party menu holds the battle and on the terminal hand-off.
- `factoryRoundBattleOrchestrator.ts`:
  - The presenting -> awaiting hand-off counts its row (`phaseElapsed + 1`; it used to repeat one, making the arrow's first phase 10
    frames).
  - A press on the presenting rows records the released cursor as well.
  - `settleReleasedPromptClear` turns `clear` from "pending" to "done" on the next tick, so the release frame still shows the print.

No kernel event, RNG draw or outcome moves. When presses are taken moves: a faint / "Player defeated" box can now take its press 1 or 2
frames earlier. Everything after the press is keyed to the press, as before.

## Gameplay and RNG

The census of `tools/integration/lsd194Census.sh` ran over seeds 0-199, both scenes, base `6817b6a8c` against `388cd99cd`
(`census/`, compared with `rst197CensusDelta.py`). In it, battle i = seed i with fixed least-used-move decisions. In all 400 battles
the eventsDigest and error are identical (0 errors), and so are the command lists (Scene OFF 60,848 commands, Scene ON 62,355). A
player whose presses depend on timing (the soak's exploring policy, the catcher's test player) plays other games from the first
faint box it now gets past earlier, as a person pressing on a different frame would. The rounds the catcher replays after the fix
are therefore different rounds from the fcm1 ones.

## Tests

- `tests/fnt1FaintedBoxClear.test.ts` (new, 22 tests, all red without the change):
  - the rule (9-frame period; blank iff k % 9 == 0);
  - which commands carry `promptClear`;
  - the accept row;
  - live census battles in both scenes:
    - the foe's faint (seed 10): no press (arrow at G + 2 / 11 / 20); a press on G not taken; k 0 (print on P, blank to the next
      print); k 9; k 1; k 10 / 11; k 18 / 27;
    - your faint before the party menu (seed 0): k 0 blank through the hand-off; k 4 frozen arrow through it;
  - Scene OFF: the foe's last faint (seed 0, k 0 blank until "Player defeated"); your last faint (seed 3, k 9 blank, k 3 frozen);
    "Player defeated" itself (seed 0: not taken on G, taken on G + 1, blank after a k 0 press).
- `tests/btn2ReleaseTail.test.ts`: the frozen age is now the release frame's own phase (`elapsed - typed`, 7 for seed 177's Substitute
  print; was `elapsed - typed - 1` = 6 under the repeated row).
- Re-pins (separate commit):
  - `tests/randomRoundSoak.test.ts`, the green milestone pin (seed 21, strong-route): frames only, 43,334 -> 43,323; same battle 7,
    turn 3, end state, diagnostics and render calls;
  - `tests/randomRoundSoak.test.ts`, M-B (c) "full" seed 0: a new exploring trajectory, 22,897 / battle 1 / depth 0 / turn 30 ->
    39,277 / battle 2 / depth 1 / turn 22, still roundLost; seed 1 unmoved;
  - `tests/lbrd.test.ts` `WIN_THEN_LOSE_SEED` 2 -> 10: seed 2's Scene OFF continued challenge no longer loses within 120,000 frames;
    a scan of 0..20 in the loss role found 10 and 19; the continuation (2) and the retire (13) seeds still pass;
  - with only the accept edge undone, each old pin passes again; the other 62 soak tests and 14 lbrd tests did not move.
- Gates:
  - `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b` clean;
  - the 224 test files that import the three changed modules: 2,181 tests, 4 red before the btn2 / soak updates above, then green;
  - 172 more files that reach them through the session, core or the soak driver: 1 red (lbrd, re-pinned above), then green;
  - `npm run test:gate`: 360 files / 2,832 tests passed;
  - the full suite (`vitest run`, 8 forks): 1,915 files / 16,478 tests passed, 0 failed (44 files / 243 tests skipped, as on the
    base).

## Catcher before / after

The traces were remade on this branch from the fcm1 traces' `maker` arguments:
- s247-on-ws: `--seed 247 --scene on --policy winning-swap`;
- s100-on-wc: `--seed 100 --scene on --policy winning-coverage`;
- s245-off-ws, my Scene OFF choice: `--seed 245 --scene off --policy winning-swap`.

All three used `--battles 21 --lobby-tail 120 --max-frames 400000`. The test player's presses follow the new timing, so these are other
rounds than fcm1's: s247 17 battles / 302,424 frames (was 14 / 224,491); s100 6 / 81,646 (was 17 / 255,521); s245 5 / 53,740 (was
5 / 53,280). The run was `KEEP=1 JOBS=3 tools/frame-catcher/run.sh .integration/evidence/fix-fainted-box/catcher ...`, about 13 minutes.
Every menu was followed (1106 / 1106, 316 / 316, 264 / 264). The sound differences (1, 2, 1) are a music duck at a stretch edge, a
Lobby SE_WALL_HIT and an SE_EFFECTIVE stop; none is a SE_SELECT.

The "fainted!" boxes of the three runs, by `faintscan.py` on both sides (`scan-before/` on fcm1's `final/`, `scan-after/`):

| | before (fcm1, 147 boxes) | after (119 boxes) |
|---|---|---|
| ours: blank after the press | 0 | 19 |
| ours: follows the ROM's rule (blank iff k % 9 == 0) | 131 / 147 (the 16 presses on a redraw frame kept the box) | 119 / 119 |
| ours: a press taken at G + 1 | 0 (from G + 3 only) | 9 |
| ROM: follows the rule | 147 / 147 | 119 / 119 |
| boxes where both sides' presses are on the same kind of frame: same box after the press | 112 / 113 | 88 / 88 |
| all boxes: same box after the press | 127 / 147 | 88 / 119 |

Contact sheets: `after-s247-quilava.png` (s247 battle 6 "Foe QUILAVA fainted!", both sides pressed on wait frame 9: frame for frame
equal, blank from P + 1) and `after-s245-blank.png` (k 0 and k 9 on ours).

**The box differences are not all gone.** They now come from where each side's press lands, not from the box. The catcher replays our
presses at our offsets from the last menu, and our "fainted!" print comes a few frames before the ROM's relative to that menu. Measured
over the 119 boxes: the ROM's last glyph comes 3-6 frames later in most boxes (5 most often). A press on our wait frame k is mostly
on the ROM's k - 1 to k - 5 (k - 1 and k - 3 most often; equal k in 4 of 119). So a press we take on a redraw frame is often not one
on the ROM, and the reverse. Where the two sides' presses fall on the same kind of frame, the box agrees in every box (88 / 88).
The same timing gap now also drops more replayed presses on the ROM: we take the press from G + 1, so a press on our G + 1 is on the ROM's G or earlier. The
driver's 4-second "rescue" A on a "fainted!" box rose from 14 of 147 boxes to 18 of 119. Before, the all-box figure (127 / 147) looked
better only because we never blanked and the ROM blanks one press in nine.

## Open

- **The "fainted!" print comes early.** Relative to the turn's menu our box's last glyph is 3-6 frames before the ROM's in most boxes
  (catcher, above; lrc1 "Open" 5 saw 1 frame on one loss). This gap is what still makes the boxes differ in the catcher: the same
  press lands on different wait frames. The cause is somewhere in the turn before the print (the move, the HP drain, the faint script
  lead); not looked into here.
- **The win tail's first print.** From the press on the foe's last "fainted!" to the first glyph of "Player defeated ...!": ROM 25-28
  frames (154 boxes 25, 136 boxes 26), ours 2 (the two sprite-visibility rows). This is the script rows between the faint print and
  `BattleScript_LocalTrainerBattleWon` (move end, turn end, `HandleFaintedMonActions`, `checkteamslost`), not the box. It moves every
  won battle; lrc1 "Open" 3 left it for the same reason. The ROM's blank / frozen box shows for those 25 frames; ours shows it 1 frame.
- From the press on a foe's faint to "X sent out Y!": ROM 125-130 (126 and 127 most often), ours always 125. From the press on your
  faint to the fade: ROM 18-24 (21 most often), ours 21. Not looked into.
- Old fixed-frame traces (site replays, older catcher traces) that pressed on a faint box's G + 1 or G + 2 now replay differently from
  that box on: the press is taken where it used to be dropped. Fresh traces were made for the catcher check.
- `tools/compare/appTrace.ts`'s terminal-window held-cursor patches (`frozenCursorAge`) were fitted to the old frozen phase and were not
  re-checked (Tier 2, not run here).

## wtl1 (2026-11-21): the win tail, press on the foe's last "fainted!" -> first glyph of "Player defeated" (both scenes; presentation timing only)

Commit `60336f6e7` (src: `battleResolutionPresentation.ts`, `battleEndSounds.ts`). No gameplay or RNG change.

**ROM chain** (labs `aud241c-win-{off,on}`, `hcr3mProbe.py` rows; P = the A taken on the foe's last "fainted!", Q = P + 2 the controller's completion, since the printer ends at P + 1): Q the controller completes and the script returns; P + 5 / P + 6 the two MoveEnd receipts (kernel exec 126 / 127, `BattleScript_MoveEnd`'s setbyte + moveend); then HandleAction_TryFinish / HandleFaintedMonActions (`BattleScript_HandleFaintedMon`'s checkteamslost, `end2`), ActionFinished, HandleEndTurn_BattleWon (victory BGM at P + 22), `BattleScript_FrontierTrainerBattleWon`'s jumpifnotbattletype / jumpifbattletype; the printstring executes at P + 25 and the first glyph is P + 26. Scene ON is the same chain (message at P + 26, W - Q = 23). The box stays frozen / blank through those rows (the `promptClear` rule above; the fnt1 test pins it blank from the press row + 1).

**Rule** (`WIN_TAIL_PRE_RECEIPT_ROWS` 5, `WIN_TAIL_POST_RECEIPT_ROWS` 19, `winTailHoldRows`): for a MoveEnd receipt run whose next event is `STRINGID_PLAYERDEFEATEDTRAINER1`, a draw-nothing pause (the pau1 `move-animation` with no animation, `actionTransition` in Scene ON) of 5 rows before the first receipt and 19 after the last; no constant is fitted: both are the script rows between the controller's completion, the receipts and the printstring above. `victoryBgmAnchor` skips the holds (BGM stays P + 22, `lha1`).

**Labs, ENG - ROM** (first glyph of "Player defeated", Scene OFF / ON): before -24 / -24 (message at P + 2), after 0 / 0 (P + 26; stage frames 327 / 527, P 301 / 501). BGM P + 22 unchanged (0 / 0). Box: blank from P + 2 to the first glyph (fnt1 pin).

**Not explained: ROM 25 vs 26.** The catcher's boxes show 25 (154) and 26 (136) frames; the lab gives 26 in both scenes, so 26 is landed. The 25-frame boxes are not a different script shape (the script rows above are fixed for a normal win); the press phase against the printer's wait-cursor blink (k mod 9, the fnt1 rule) is the candidate, not measured: it needs a lab pressed one frame earlier. A win by an end-of-turn faint (poison / weather kill) takes a different path (no `BattleScript_MoveEnd` receipts after the faint print, which the rule does not touch) and is not measured here.

**T2** (`rescoreAll.sh` over `.integration/evidence/t2n` into `.integration/evidence/wtl1/t2-{base,after}`, `soundScoreboard.py`): Scene ON TOTAL mass 19,949 -> 19,949, exact 2,731 -> 2,731; Scene OFF mass 2,646 -> 2,646, exact 697 -> 697; missing 0 / extra 0 in both (the T2 drives hold no wins, so they cannot move).

**Census 0..199 both scenes** (`lsd194Census.sh`, `LSD194_SHARDS="0 1"`, jobs 6, split 2; 12466b0a3 vs 60336f6e7): `rst197CensusDelta.py --digest` eventsDigest + error identical 200 / 200 in ON and OFF; 76 battles (the won ones) change command type sequence by the two inserted holds, 124 identical. T1 (`soundCensusDelta.py --t1`, ON): exact 54,127, known-offset 35, missing 0 on both arms; the action-transition pause count 3,072 -> 3,224 (+152 = 2 per won battle). The arm-vs-arm sound delta is only SE 5 (the A on "Player defeated" and the next box) +24 in 152 rows.

**Tests.** `npm run typecheck` exit 0; `npm run test:gate` 360 files / 2,835 tests green; `npm run build` exit 0; every `tests/` file importing `battleResolutionPresentation` / `battleEndSounds` plus `tests/aud2*`, `fnt*`, `lrc*`, `lbr*`, `lbw*`, `randomRoundSoak*` (290 files): green except the 2 `tests/animation/liveAnchorMoveAdapters.test.ts` failures (red at base, not mine; the 3 `stc1SceneOffStatChangeSe` failures were not in this set). Pins moved: toward the ROM, `fnt1FaintedBoxClear` won seed 0 "Player defeated" at row 27 = P + 26 (window 20 -> 40 rows), `lha1VictoryBgmLowHpAlarm` rough-skin anchor = the first hold row (BGM delay 19 unchanged). Trajectory-only (no ROM frame): `lbrd` WIN_TWO_SEED 0 -> 13 (scan 1..28, only 13 passes all 15), `randomRoundSoak` seven wins 43,500 / 3,042 -> 43,638 / 3,059, seed 0 "full" 68,529 -> 75,721 (battle 4, depth 3), chain seed 19 -> 0 (seeds 0, 10, 13, 17, 40, 47, 49 chain two round wins), `pic9SwitchLines` seeds 0, 1, 4 -> 6, 9 (the scale sets of seeds 6 + 9 cover all four).

**Website.** Yes, a play change: the earliest accepted A on "Player defeated" is 24 frames later and every later press of that battle (the trainer's lose text, the terminal boxes) shifts with it, so a recorded game replays on its own build only.
