# aud241c-fx: step-mode ROM fixtures for the battle-end windows (S11 audio step 5, third slice, evidence only)

No `src/` change, no emitter. Six STEP-mode `soundEventProbe.py` windows (`mode: "step"`, every no-op row kept) are committed as
`tools/audio/fixtures/aud241c-{win,loss,brain}-{off,on}-window.json` and listed in `tests/audioProbeFixtures.test.ts` (schema test only).
Their lab requests are `tools/battle-lab/aud241c-*.json` (copied from the scout's labs; `aud241c-loss-off.json` is
`loss-terminal-explosion-dusclops-off.json` unchanged). Each fixture has `from` (frames before it ran unlogged) and absolute 1-based frames.
Command shape: `python3 tools/run-mgba-probe.py OUT -- python3 tools/audio/soundEventProbe.py OUT lab LAB --profile on|off --from N --frames M`.

| Fixture | Lab | Profile | `from` / frames | Events (first .. last) |
|---|---|---|---|---|
| `aud241c-win-off-window` | `aud241c-win-off` (Rattata Lv12 opp, Seismic Toss) | OFF | 1380 / 580 | 1392 .. 1902 |
| `aud241c-win-on-window` | `aud241c-win-on` | ON | 2170 / 620 | 2189 .. 2702 |
| `aud241c-loss-off-window` | `aud241c-loss-off` (Explosion, Dusclops) | OFF | 2750 / 900 | 2809 .. 3533 |
| `aud241c-loss-on-window` | `aud241c-loss-expl-on` (doubled idle gaps) | ON | 5450 / 1560 | 5495 .. 6933 |
| `aud241c-brain-off-window` | `aud241c-brain-win-off` (factoryBrain, silver) | OFF | 1380 / 600 | 1392 .. 1920 |
| `aud241c-brain-on-window` | `aud241c-brain-win-on` | ON | 2100 / 800 | 2189 .. 2720 |

Each window starts before the last faint cry and ends after the first sound that follows the return (win: heal triple; Brain: symbol
fanfare; loss: the lobby SE_SELECT).

## Frames relative to the last SE_FAINT (F)

`F` = SE_FAINT; `P` = the SE_SELECT that dismisses the trainer's lose text (the third A after the faint in the win and Brain labs, the second in the loss labs). `(noop)` rows are in the
fixtures with `noop: true`.

| Event | win OFF | win ON | Brain OFF | Brain ON | loss OFF | loss ON |
|---|---|---|---|---|---|---|
| faint cry (duck 85) | F-66 | F-66 | F-66 | F-66 | F-66 | F-66 |
| duck restore 256 | F-38 | F-38 | F-38 | F-38 | F-8 | F-8 |
| **SE_FAINT** (F) | 1458 | 2255 | 1458 | 2255 | 2875 | 5561 |
| stop 90 (noop, `HandleLowHpMusicChange`) | - | - | - | - | F, F+16 | F, F+16 |
| SE_SELECT (A on "fainted!") | F+43 | F+46 | F+43 | F+46 | F+54 | F+168 |
| stop 90 (noop, `BattleStopLowHpSound`) | F+65 | F+68 | F+65 | F+68 | - | - |
| **bgm 412 / 354** | F+65 | F+68 | F+65 (354) | F+68 (354) | - | - |
| **SE_BALL_OPEN 15** | - | - | - | - | F+78 | F+192 |
| duck 256 (noop, `DestroyAnimSoundTask`) | - | - | - | - | F+106 | F+220 |
| SE_SELECT (2nd) | F+143 | F+146 | same | same | - | - |
| **P** | F+243 | F+246 | F+243 | F+246 | F+356 | F+770 |
| **fade out speed 5** (412 / 354 / 476) | P+6 | P+6 | P+6 | P+6 | P+6 | P+6 |
| stop 90 (noop, `SpecialStatusesClear`) | P+43 | P+43 | P+43 | P+43 | P+43 | P+43 |
| **bgm 469** | P+53 | P+53 | **P+52** | **P+52** | P+53 | P+53 |
| **SE_EXIT 9** | P+79 | P+79 | **absent** | **absent** | P+79 | P+79 |
| heal stop 469 + fanfare 368 | P+201 | P+201 | - | - | - | - |
| stop 469 + fanfare 466 (symbol) | - | - | P+219 | P+219 | - | - |
| lobby SE_SELECT | - | - | - | - | P+302 | P+602 (doubled gaps) |

The bgm-412/354 row is `PlayBGM` at the same frame as the `BattleStopLowHpSound` stop, SE_SELECT + 22 in every win window.

## ON vs OFF

- From the dismiss SE_SELECT onward every offset (+22 bgm, P+6 fade, P+43 noop, P+52/53 bgm 469, P+79 SE_EXIT, P+201 / P+219 fanfares) is
  identical in ON and OFF, for win, Brain and loss. Scene ON adds nothing audible to the tail and removes nothing.
- The only ON/OFF differences are the lab's own A cadence: SE_FAINT-to-SELECT is 43 (OFF) vs 46 (ON) in the win labs, and the loss ON lab
  uses doubled idle gaps (SELECT F+168 vs F+54, P F+770 vs F+356). The SE_SELECT frames are the lab's A presses; they are not ROM
  timing. The faint cry to SE_FAINT (66) and the cry/duck lengths are the same in both scenes.
- The ON windows show the no-ops (`BattleStopLowHpSound`, `SpecialStatusesClear`, the loss `HandleLowHpMusicChange` stops) that the scout's
  hybrid ON runs could not see; they sit at the same offsets as OFF.

## Scout claims

Held (now also in step mode / ON):
- Win tail: bgm 412 at SELECT+22, fade P+6, bgm 469 P+53, SE_EXIT P+79; the same tail in ON (win-on previously hybrid) and no sound between
  the victory BGM and P except the two A-driven SE_SELECTs.
- The no-op stop 90 at the victory BGM frame and at P+43 exist in ON as well as OFF.
- Loss: no victory BGM and no `BattleStopLowHpSound`; SE_BALL_OPEN at SELECT+24; fade 476 at P+6; bgm 469 P+53; SE_EXIT P+79; the ON loss
  (`aud241c-loss-expl-on`) completes in step mode and matches OFF offsets exactly.
- Brain win (now ON too): bgm 354, fade 354, bgm 469 at P+52, no SE_EXIT, fanfare 466 at P+219.
- The last faint has no ball-tray sound and no replacement cry (none in any window).

Corrections / still open:
- ON Brain (open in the scout) works with `aud241c-brain-win-on` unchanged, and equals OFF after the dismiss.
- The scout's "~1380-1820" window for the win would have cut the heal triple (P+201); the committed windows run past it.
- The ON loss lab's lobby A (6933, P+602 because of the doubled idle gaps) does produce SE_SELECT in step mode; the ON loss fixture covers it.
- Still unexplained, not tested here: the Brain bgm 469 one frame earlier (P+52 vs P+53; fade and the P+43 noop are on the same frames as the
  win, so the difference arises between P+43 and `PlayBGM`), and the scout's +18 (Explosion self-faint) vs +22 victory-BGM gap (the
  scout's step probe `win-explosion-off-step.json`; no fixture here since the aud241c win labs are the attacker-faint path).
- The win labs take no money or pickup sound; none appears in any of these windows.
