# sbx1: the message box keeps its text until the next print's first glyph (2026-11-23)

Branch worker/integration-20261123-001621 (fold-h = master + pso1 + ftp1). Tested tree cbaa01fe6 (commit 8e0cc8199, code in 565019a1f). Presentation pixels only: no kernel event, RNG, damage, turn order or facility state moves. Evidence (not in git): `.integration/evidence/sbx1/`.

## Finding
Handoff open item (wtl1 / sst1 merge note): our box was blank for 2 frames (Scene ON) or 7 frames (Scene OFF) before "{X} is buffeted by the sandstorm!" while the ROM kept "The sandstorm rages." on screen. Reproduced on a fresh Scene ON lab (`etp1-sandstorm-on`, frames 917-918, box rows only; `npm run compare`) and Scene OFF (frames 418-424, 577-579). Same for Hail ("The hail continues" -> "is buffeted by the hail", ON 895-896 / 1038-1040, OFF 416-422 / 564-566).

Cause: not an engine command but the renderer. A message command with `leadFrames` (etp1's `damagingWeatherLoopLeadRows`, the script rows between the last wait and the print) switched the box to the new message with 0 glyphs on its first row, so the box was cleared lead-rows early. The ROM's printstring fills the window and draws the first glyph on the same row, so the old text stays until the first glyph.

## Rule (`createBattleResolutionPresentationRenderView`, battleResolutionPresentationRender.ts)
A message command with no glyph yet (`messageCommandVisibleCharacters` = 0) keeps the previous message and its glyph count; it takes over on its first glyph row. With no previous message the old behaviour holds. Applies to every message command with `leadFrames` (end-turn weather / chain leads, Focus Punch, confusion, two-turn, perish, wish, dragged-out), not only weather.

## Numbers: npm run compare, matched / 1122 frames per lab (dense windows of 256 over the whole lab), before -> after
New traces (`tools/integration/sbx1MakeTrace.py` wraps a battle lab as a compare trace, `sbx1Sweep.py` runs a lab in windows):

| lab | before | after |
|---|---|---|
| etp1-sandstorm-on | 999 | 1004 |
| etp1-sandstorm-off | 986 | 996 |
| etp1-hail-on | 987 | 992 |
| etp1-hail-off | 983 | 993 |
| etp1-sun-on | 824 | 824 |
| etp1-sun-off | 605 | 605 |

Six existing end-turn labs (the compare traces catalog has no sst1 / etp1 / trn178 / rnc1 file; these labs are the nearest end-turn captures): hpf4m-sandstorm-on 345 -> 345 (of 2244), hpf4m-sandstorm-off 1426 -> 1443 (of 2244), wtl1-rain-player-on 573 -> 573 (of 822), wtl1-rain-player-off 556 -> 556, etp1-poison-on 614 -> 614 (of 1122), etp1-poison-off 864 -> 864. None worse.

Box-only differing frames (diffs with nothing above y = 112) before -> after: sandstorm ON 5 -> 0, sandstorm OFF 12 -> 2, hail ON 5 -> 0, hail OFF 12 -> 2, hpf4m-sandstorm-off 450 -> 433.

## Other end-turn prints (checked)
- Rain, sun, poison, burn: the rule changes no pixel in the sun, rain and poison labs (unchanged above): their remaining box differences are the last-command case below, not a lead-row blank. Burn was not run separately (same script family as poison).
- **Open (a different mechanism):** a weather / tick print that is the LAST command of the turn (Sun "The sunlight is strong." Scene OFF 434-450, Rain OFF 429-445, Poison ON / OFF runs of 30 frames each, e.g. OFF 209-238, ON 367-396; Sun ON 905-918) is blanked by the next-command-handoff (`bottom: "blank"`) and then by the post-resolution room until the action menu, 30 frames before the ROM clears it (ROM keeps the text until ~6 frames before "What will X do?"; Sun OFF: ROM text to 463, menu 470, ours blank from 434). Not changed here: the handoff blank is calibrated on ordinary move turns (`blankTailFrames`, msw2 release tails) and a rule for the end-turn prints needs a ROM measurement of when the ROM clears the box there.
- Remaining sandstorm / hail OFF box-only frames: 712, 718 / 736, 742 (one frame each).

## Acceptance
- T2 (tools/audio/rescoreAll.sh over t2n, both scenes, 49 seed-scenes): base 65f8953af vs final: every `*.cmp.json` and `*.engine.json` byte-identical; soundScoreboard TOTAL exact 842 / offset 291 / missing 0 / extra 0 / mass 776 on both arms. Unchanged.
- Census seeds 0..199 (lsd194Census.sh, rst197CensusDelta.py --digest, base 65f8953af vs 8e0cc8199): eventsDigest identical 200/200, 0 changed commands, byte-identical shards 2/2, ON (63530 commands) and OFF (62225). tree/ copies deleted.
- Tests (all green, no pin moved): the 128 files importing the render file (two lanes of 64; the only red: `tests/animation/liveAnchorMoveAdapters` 3 and `liveNext5MoveAdapters` 2 are RED ON THE BASE too (body durations, checked with the base file swapped in); unrelated); tests/sst1*, etp*, trn178*, randomRoundSoak* (9 files), lbrd: 14 files / 170 tests pass. One test edit: `tests/sst1SandstormContinues.test.ts` detects a print's first glyph as the command's own lines with glyphs on screen (the view's message is the previous text during the lead rows); its pins (SE +88, buffeted 264 / 258) are unchanged.
- npm run typecheck pass, npm run test:gate 360 files / 2839 tests pass, npm run build pass.

## Website
Yes, the website must know only as a presentation change (box pictures); no recorded game, press phase, RNG or outcome moves.
