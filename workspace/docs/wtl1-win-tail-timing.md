# wtl1: the win tail waits for the victory music and for the trainer's slide (2026-11-21)

The largest gap of the frame catcher's timing report (tdr1, `docs/tdr1-catcher-timing-report.md`): after each win, MUS_VICTORY_TRAINER ->
MUS_B_FACTORY came 21-59 frames later on the ROM (22 of 22 wins, 836 frames). Left open before by fnt1 ("The win tail's first print",
`docs/fnt1-fainted-box-clear.md`) and lrc1 ("Open" 3, `docs/lrc1-loss-recall.md`). Branch `claude/elastic-northcutt-5cbc37`. Evidence (not in
git): `.integration/evidence/tdr1/` (`base/`, `after/`; `watch-t2off/`: a ROM run with `CATCHER_WATCH=1`).

## In short

Two waits were missing at the end of every won battle:
- "Player defeated ...!" printed 2 frames after the press on the last "fainted!" box. On the ROM the game first finishes the turn and
  starts the victory music, and the text follows 4 frames after the music: 25-26 frames after the press. Ours now prints at 26.
- After the press on "Player defeated ...!", our trainer started to slide in on the press frame. On the ROM the slide is dispatched 4
  frames later and its sprite is off screen for another 10, and the lose text prints 3 frames after the slide ends: 55 frames after the
  press. Ours took 38; now 55.

The timing report's split showed where the frames were: both waits sit in front of a text box the test player presses through, so the
whole gap read as "the ROM took a later press" (its box was not ready when ours was), not as the driver's timing.

## ROM

### Source

- `src/battle_main.c:4960-4982` (`HandleEndTurn_BattleWon`): `PlayBGM(MUS_VICTORY_TRAINER)` and `gBattlescriptCurrInstr =
  BattleScript_FrontierTrainerBattleWon`. It runs when the turn has ended: after the faint box's press the script still runs moveend, the
  exp script (`BattleScript_GiveExp`) and the fainted-mon checks (`BattleScript_HandleFaintedMon`, `BattleScript_FaintedMonSendOutNew`,
  `checkteamslost`).
- `data/battle_scripts_1.s:3027-3048` (`BattleScript_FrontierTrainerBattleWon`): `printstring STRINGID_PLAYERDEFEATEDTRAINER1` (ends on
  `\p`), `trainerslidein BS_ATTACKER`, `waitstate`, `printstring STRINGID_TRAINER1LOSETEXT`.
- `src/battle_controller_opponent.c:1325-1393` (`OpponentHandleTrainerSlide`): the sprite at x 208, x2 96, -2 a callback
  (`SpriteCB_TrainerSlideIn`, `battle_gfx_sfx_util.c:396-409`): 48 callbacks; `CompleteOnBankSpriteCallbackDummy2` completes when it stops.

### Measured

`CATCHER_WATCH=1` now also logs `gBattleMainFunc` and `gBattleControllerExecFlags` (`tools/frame-catcher/romRun.py`). Seed 2 Scene OFF,
both wins logged the same, frames from the press P on the last "fainted!" box:

| | ROM |
|---|---|
| P + 3 .. 8 | `BattleScript_MoveEnd` |
| P + 9 .. 15 | `BattleScript_GiveExp` |
| P + 16 .. 20 / 21 | `BattleScript_HandleFaintedMon`, `BattleScript_FaintedMonSendOutNew` |
| P + 21 / 22 | `HandleEndTurn_BattleWon`: MUS_VICTORY_TRAINER |
| P + 24 / 25 | `printstring STRINGID_PLAYERDEFEATEDTRAINER1` dispatched; first glyph 1 frame later |

and from the press P2 on "Player defeated ...!": `trainerslidein` P2 + 3, dispatched (exec flags 2) P2 + 4, the slide ends P2 + 52
(48 callbacks), `printstring STRINGID_TRAINER1LOSETEXT` dispatched P2 + 54, its first glyph P2 + 55.

Over the 22 ROM wins of the 6 baseline traces (`wintail.py` over the frame stores): the press -> the victory BGM 20 (1), 21 (13), 22 (8);
the BGM -> "Player defeated"'s first glyph 4 in 22 of 22; P2 -> the lose text's first glyph 55 in 22 of 22. Ours: BGM 22, the glyph 2
after P, the lose text 38 after P2. The picture of the slide is the same on both sides from its first visible pixel on; ours started it
16 frames earlier.

## Change

Presentation timing only (`src/engine/battleResolutionPresentation.ts`, `battleResolutionPresentationRender.ts`):

- `withWinPrintHold`: the last moveend receipt (a one-row sprite-visibility command) before the win print holds `holdFrames` rows, so the
  print's first glyph lands `WIN_PRINT_AFTER_BGM_ROWS` (4) after the victory BGM. The BGM's own delay is lha1's (`VICTORY_BGM_AFTER_*`,
  `battleEndSounds.ts`: 22 after a button box, 19 after an automatic message, 14 after another controller command; restated as
  `WIN_BGM_AFTER_ANCHOR_ROWS`, pinned equal by the test). During the hold the released "fainted!" box stays as fnt1 draws it, frozen or
  blank, as on the ROM.
- `WIN_TAIL_TRAINER_SLIDE_TIMING`: the win tail's `trainerslidein` (source label `BattleScript_FrontierTrainerBattleWon_LoseTexts`) gets
  a 14-row lead (`WIN_TAIL_TRAINER_SLIDE_LEAD_FRAMES`: the dispatch at P2 + 4 and the 10 off-screen callbacks before the slide model's
  el 0, as the loss tail's `LOSS_RECALL_TRAINER_SLIDE_GAP_FRAMES`) and the loss tail's 3-row print gap. `BattleTrainerSlideTiming`
  gains `leadFrames`; the slide's age counts from it.

No kernel event, RNG draw or outcome moves. Everything after the lose text's press (the fade, MUS_B_FACTORY, SE_EXIT) is keyed to that
press as before, so it moves with it.

## Catcher, before / after

| | before (`base/`, 22 wins) | after (`after/`) |
|---|---|---|
| MUS_VICTORY_TRAINER -> MUS_B_FACTORY, the ranked list | 1st, 836 frames, +21 .. +59 | see `docs/tdr1-catcher-timing-report.md` |
| "Player defeated" first glyph after the faint press | 2 (ROM 24-26) | 26 |
| the lose text after the press on it | 38 (ROM 55) | 55 |

## Tests

`tests/wtl1WinTailTiming.test.ts` (4): the constants (lha1's delays, 14 + 38 + 3 = 55); census seed 0 Scene OFF and seed 10 Scene ON
(a faint press off a redraw frame): "Player defeated" at P + 26 with the frozen "fainted!" box until then, the lose text at P2 + 55, the
slide off screen through the lead, at x2 74 on its first move and settled at P2 + 52; seed 0 with the press on a redraw frame (k 0): the
box blank through the wait. fnt1's tests pass unchanged.

## Open

- The ROM's victory BGM comes 21 frames after the press more often than 22 (13 vs 8 of 22; lha1 has 22), so ours is a frame late in about
  half of the wins, and "Player defeated" with it. The 21 / 22 comes from the fainted-mon checks (P + 20 or 21), not looked into.
- Two-opponent and Frontier Brain win tails (`BattleScript_FrontierTrainerBattleWon_TwoDefeated`, the Head's MUS_VICTORY_GYM_LEADER)
  use the same hold; only the ordinary win is measured.
