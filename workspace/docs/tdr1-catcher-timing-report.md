# tdr1: the frame catcher measures timing drift against the ROM (2026-11-21)

Kyle's question after the 11-21 Thunder Punch finding (hit1, `docs/hit1-move-hit-timing.md`): the catcher marked such stretches "timing
only" and nobody measured how far off they were, so drift piled up unseen. The catcher now measures it on every run, and the three
largest real game gaps it found are fixed: tri1 (battle transitions, `docs/tri1-transition-intro-handoff.md`), wtl1 (the win tail,
`docs/wtl1-win-tail-timing.md`) and sst1 (the end-turn sandstorm, `docs/sst1-sandstorm-continues.md`). Branch
`claude/elastic-northcutt-5cbc37` from master `f09378446`. Evidence (not in git): `.integration/evidence/tdr1/` (`traces*/`, `base/`, `tri1/`,
`after/`, `watch-t2off/`).

## In short

- Every catcher run now says how far its sounds drift from the ROM's, and which gaps lose the most frames.
- Baseline on 6 fresh traces (28 battles): 79.3% of sound-to-sound gaps within 1 frame, 9.9% off by 6 frames or more.
- After the three fixes (25 battles, the traces made again): 81.2% within 1 frame, 8.0% off by 6 or more; the frames off per 7 battles
  in the game's part went from 1,419 to 1,045. The three fixed gaps are gone from the list.

## The timing report (`tools/frame-catcher/timing.py`)

compare.py runs it on every run. It writes "Sound timing" near the top of each report.md (`soundTiming` in findings.json), adds the
headline to the console line, and summary.md ranks the gaps over all runs.

- **Pairing.** Per stretch (menu to menu), the k-th time a sound plays on our side is paired with its k-th time on the ROM: SEs, cries and
  music starts (BGM, fanfares). Pans, volume ducks, stops, fades and SE_SELECT (the sound of a press) are left out. Sounds are taken as
  compare.py prepares them (one per frame, a press's SE on the frame the menu opened counted for the menu before).
- **Gaps.** A sound's drift is ROM minus ours, in frames from the stretch start. Its gap is the change in drift from the paired sound
  before it (the stretch start for the first), so one late sound counts once, not again for every sound after it. Gaps are keyed
  "previous sound -> sound", or "menu <kind> -> sound" for a stretch's first. On the 11-21 run the port gives the prototype's numbers
  (`_playtest-20261121/sndoff.py jumps()`): 891 gaps, 82.5% within 1 frame, 7.7% off by 6+.
- **Driver or game.** The ROM driver replays our presses at our offsets from the last menu (`plan.py`), and a text box that waits for a
  press (`\p`, text.c:865-900) plays SE_SELECT when it takes one. So a press between two sounds splits their gap:
  - after the press the drift is the game's: both sides answer a press they took;
  - up to the press it is the **driver's** when the ROM took the same press of ours: its box was ready by then on both sides, and the
    drift there is only where the replayed press landed. The driver now logs which press of ours each ROM press replays
    (`pressReplays` in rom/timeline.json: the engine frame, "steer" or "rescue");
  - it is the **game's** ("via another press") when the ROM took a later press of ours (its box was not ready yet) or an earlier one
    (ours was not). Then the size is only known to the presses' spacing (the test player presses every 10-20 frames).
  A run made before tdr1 has no press log; its presses count as the driver's ("unknown").
- **What it cannot see.** Presses that make no sound: a field script's `waitbuttonpress` (the trainer's speech in the battle room, the
  attendant) and walking. Gaps across them count as the game's. Held A does not move battle prints: at the oracle save's FAST text speed
  `AddTextPrinter` decrements the speed to 0 (text.c:281-301), so `canABSpeedUpPrint` has nothing to skip.
- **The numbers.** The share of gaps within 1 frame and off by 6 or more, for the whole gap and for the game's part alone; the frames off
  (gaps off by 2 or more) and per 7 battles; the press identities; the game gaps ranked by frames off; the driver gaps.
- `python3 tools/frame-catcher/timing.py RUNDIR` prints the report of a finished run, also one made before tdr1.

The game's part can be off where the whole gap is not: when the ROM took the same press, the press resynchronises the two sides and hides
a game difference before it (the driver's part) or shows one after it.

## Baseline (`base/`)

Six traces made with makeTrace on this build before any fix: seeds 3, 44, 100 Scene ON `winning-coverage` (7 battles wanted), seeds 5 and
2 Scene OFF `winning-swap`, seed 8 Scene OFF `full`. `KEEP=1 JOBS=6 run.sh`, about 4 minutes. Every menu followed in every run.

| | gaps | within 1 frame | off by 6+ | game: within 1 / off 6+ | game frames off per 7 battles | driver frames per 7 battles |
|---|---|---|---|---|---|---|
| base, 28 battles | 3,245 | 79.3% | 9.9% | 76.8% / 9.5% | 1,419 | 192 |
| after tri1, 30 battles | 3,748 | 81.1% | 8.7% | 78.5% / 8.5% | 1,351 | 198 |
| after tri1 + wtl1 + sst1, 25 battles | 2,813 | 81.2% | 8.0% | 78.5% / 7.5% | 1,045 | 196 |

The ROM took the same press of ours for 596 of 688 text box presses (87%), another one for 92; no steers or rescues on text boxes.

The largest game gaps of the baseline, with what they turned out to be:

| previous sound -> sound | off / seen | frames | ROM - ours | what it is |
|---|---|---|---|---|
| MUS_VICTORY_TRAINER -> MUS_B_FACTORY | 22 / 22 | 836 | +21 .. +59 | **game, fixed (wtl1)**: "Player defeated" printed 24 frames early, the trainer slide 17. All "via another press": the ROM's boxes were not ready when ours were. |
| MUS_VS_TRAINER -> SE_BALL_TRAY_ENTER | 27 / 28 | 439 | -31 .. +15 | **game, fixed (tri1)**: every transition handed over to the battle intro at one of two fixed frames. No press in between. |
| SE_EFFECTIVE -> SE_M_STAT_INCREASE | 13 / 13 | 276 | +2 .. +47 | game, open: SPEED BOOST at the end of the turn (YANMA in t44on). |
| SE_FAINT -> SE_BALL_TRAY_ENTER | 36 / 49 | 199 | +2 .. +6 | mixed, open: after the same faint-box press the ROM's tray is 0-4 frames later (the opponent controller's choose-Pokemon command takes 1-4 frames on the ROM: the AI's work, CPU lag); before the press the "fainted!" print is 3-6 frames early (fnt1 open), seen through the press spacing. |
| SE_BALL_TRAY_EXIT -> SE_BALL_OPEN | 24 / 28 | 179 | -14 .. +9 | open, both signs: the foe's send-out after the same AI choice; not looked into. |
| SE_M_SANDSTORM -> SE_EFFECTIVE | 12 / 12 | 154 | +11 .. +18 | **game, fixed (sst1)**: the sandstorm's sound 8 frames late, the "buffeted" print 2 or 8 early. No press in between. |
| menu battle.partySub -> SE_BALL_OPEN | 25 / 43 | 154 | +3 / +7 | game, open: after the same press (SHIFT), the recall's ball sound 0, 3 or 7 frames later on the ROM. |
| SE_EXIT -> MUS_HEAL / -> MUS_VS_TRAINER | 46 / 49 | 264 | medians -3 .. +12 | not split: they cross the room's speech and the attendant's text, whose presses make no sound. |
| punch moves (every gap to or from SE_M_COMET_PUNCH / SE_M_DIZZY_PUNCH) | 87 / 94 | 525 | medians -8 .. +13 | game, open: hit1's open items (Dizzy Punch's window 6 short; the lead-body sound clock: the fight menu -> SE_M_COMET_PUNCH is -2 in 36 of 37). |

The 11-21 run's four items, checked: the victory music (wtl1) and the battle intro's MUS_VS_TRAINER gap (tri1) were game bugs and are
fixed; SE_FAINT -> SE_BALL_TRAY_ENTER is the ROM's AI CPU time plus the early "fainted!" print; the punch moves and the send-out are
hit1's and this list's open items.

## After (`after/`)

The same six seeds and policies, the traces made again on the fixed build (the old ones' presses no longer meet the menus; the test player's
presses follow the new timing, so these are other rounds: 25 battles). Every menu followed.

| gap | before | after |
|---|---|---|
| MUS_VICTORY_TRAINER -> MUS_B_FACTORY | 22 of 22 off, 836 frames | 6 of 19 off, 75 frames; every win where both sides took the same presses on 0 or 1 |
| MUS_VS_TRAINER -> SE_BALL_TRAY_ENTER | 27 of 28 off, 439 frames | 0 of 25 off |
| SE_M_SANDSTORM -> SE_EFFECTIVE | 12 of 12 off, 154 frames | 4 of 7 off, 14 frames (the hit sound 1-2 frames after the buffeted print, sst1 "Open") |

The three wins still off read -18 to -22 "via another press": the ROM's victory music comes 21 frames after the faint press more often
than our 22 (wtl1 "Open"), so its "Player defeated" box is ready a frame sooner, takes a replayed press ours misses by one frame, and ours
waits for the test player's next press. The rest of the list is the same gaps as before at sizes of the same order (the rounds played
differ); SE_EXIT -> MUS_HEAL, which follows the win tail, fell from 135 frames to 28.

## Re-pins (the three fixes together)

The soak's test player presses on its own clock, so any timing change re-rolls its rounds (as fnt1 and chg1 did):
- `tests/randomRoundSoak.test.ts`: the green milestone (seed 21) frames 43,500 -> 43,633 and render calls 3,043 -> 3,063, the same battle 7 /
  turn 3 / end state; M-B (c) "full" seed 0 a new trajectory (67,984 / battle 3 -> 143,541 / battle 6, still a loss), seed 1 60,582 / turn 19 ->
  57,584 / turn 15 (same battle 3); "vanilla" frames only (9,300 -> 9,336, 9,350 -> 9,315); the ISSUES #89 Baton Pass pin 4 -> 2
  (`tools/soak/batonPassSearch.ts --seeds 0:40`: candidates 2, 5, 8, 10, 24, 27, 28, 33, 36, 39).
- `tests/lbrd.test.ts`: seed 0 lost the continuation and the challenge-2 loss; a scan of 0..20 in all three roles found none passing every
  case, so the continuation uses 13 and the retire and the loss 2 (15 / 15).
- `tests/fnt1FaintedBoxClear.test.ts`: the won box stays blank until "Player defeated" at P + 26 (the test looked 20 frames ahead).
- `tests/wth236WeatherContinues.test.ts`, `aud241a`, `snd1RoomSounds`, `factoryBattleStartIntro`: in sst1's and tri1's docs.

## Tests

- `tests/tdr1CatcherTimingReport.test.ts` (3): a hand-made run (`tests/fixtures/tdr1-timing-fixture.json`, the answers worked in the
  test's header): pairing, the skipped first stretch, pans / ducks / stops / SE_SELECT left out, a double-logged SE counted once, a cry of
  species 5 not taken for SE_SELECT, the same press (driver), another press (game), a steer left out, a rescue (driver), the ranked lists;
  the same run without a press log (every press the driver's).
- `tools/test_frame_catcher.py` (36 OK): the driver logs each press it starts with the engine press it replays.
- The fixes' tests are in their docs.

## Open

- The open gaps in the table above: SPEED BOOST, the foe's send-out after a faint (AI CPU time), the SHIFT recall, the punch moves.
- Silent presses (`waitbuttonpress`, walking) are not split. The driver could log the field script's press waits as it logs text boxes.
- "Via another press" sizes are bounded only by the presses' spacing. A box's ready frame (its last glyph) could be read from the pictures,
  as fnt1's `faintscan.py` does for the faint boxes, to measure them exactly.
