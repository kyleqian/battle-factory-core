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

## sbx2: the "Open" note is contradicted; the last-print gap is a missing Scene OFF pause, not a box-clear rule (2026-11-23)

Branch worker/side-20261123-160939, base fold-20261123b (c0ed13a53). Measure-only: **nothing landed in `src`** (the step said to land nothing if the ROM evidence contradicts the note). Evidence (not in git): `.integration/evidence/sbx2/` (sweeps of etp1-{sun,rain5,poison,leftovers}-{on,off}; `tools/integration/sbx2BoxRuns.mjs` is the box scan, over `sbx1Sweep.py` output, message-box rows y >= 122 only; the sbx1 scan used y >= 112 and so counted the player's healthbox / HP bar).

### What the ROM does (dense lab captures, both scenes)
The box clear is already right. After the turn's last print the ROM draws **6 blank box frames and then the action menu**; ours draws the same 6 blank frames and then the menu. There is no extra blank "post-resolution room" in ours. What differs is *when the whole tail starts*:

| lab | ROM text to / blank / menu | ours text to / blank / menu | ours vs ROM |
|---|---|---|---|
| etp1-sun-off | 463 / 464-469 / 470 | 433 / 434-439 / 440 | 30 early |
| etp1-rain5-off (5 turns: 429, 1546, 2668, 3790, ...) | 459 / 460-465 / 466 | 428 / 429-434 / 435 | 31 early on every rain turn |
| etp1-sun-on | 904 / 905-910 / 911 | 912 / 913-918 / 919 | 8 late |
| etp1-rain5-on (894, 1855, 2977, 4099, 5093) | 893 / 894-899 / 900 | 896 / 897-902 / 903 | 3 late on every rain turn |
| etp1-poison-off | 456 / 457-462 / 463 | 454 / 455-460 / 461 | 2 early |
| etp1-poison-on | 988 / 989-994 / 995 | 984 / 985-990 / 991 | 4 early |
| etp1-leftovers-on / -off | identical | identical | 0 |

The poison "30-frame runs" in the sbx1 note are not box clears: ROM and ours draw the same sequence of glyph hashes, ours 2 frames earlier (OFF 209-238; ON 367-396), the known etp1 "turn-1 first tick -2" residual, and the sbx1 metric also counted HP-bar pixels at y 112-121. The poison tail is the same 2 / 4-frame early shift all the way to the menu. Leftovers: no box difference at all.

### ROM mechanism (Rain / Sun, Scene OFF: 30 / 31 frames)
`BattleScript_RainContinuesOrEnds` / `BattleScript_SunlightContinues` end with `playanimation BS_ATTACKER, B_ANIM_RAIN_CONTINUES / B_ANIM_SUN_CONTINUES`. `Cmd_playanimation` (battle_script_commands.c:4005-4050), unlike `Cmd_playanimation_var`, handles `HITMARKER_NO_ANIMATIONS` by `BattleScriptPush(+7); goto BattleScript_Pausex20` = `pause B_WAIT_TIME_SHORT` (0x20 = 32 rows) + `return`. Scene OFF therefore holds the box text for ~32 rows after the print's `waitmessage` before `end2`, and the turn's menu follows 6 blank frames later. Rain's extra `jumpifbyte` row gives 31 vs Sun's 30. `playanimation_var` (Sandstorm / Hail: `+= 10` with no pause) really plays nothing in OFF, which is why those labs already match. The wth236 comment above `WEATHER_CONTINUES_LAUNCH_LEAD_ROWS` ("Cmd_playanimation(_var) tests HITMARKER_NO_ANIMATIONS before its weather branch, so Scene OFF plays nothing and presents no command") is right for the `_var` form only; for Rain and Sun the OFF script still spends the Pausex20 rows.

### Why nothing landed
The 30 / 31 frames are not a box rule: holding the text 30 frames longer in the box while the menu is drawn at the same early frame would be contradictory (ours draws the menu at 440 where the ROM still shows text). Closing it moves the **end of the turn** (the action menu and the input-ready row) +30 / +31 frames on every Scene OFF Sun / Rain turn, which changes the press phases of recorded OFF games and the trajectory pins (randomRoundSoak etc.): a play change outside this step's "presentation pixels only, no input-ready change" limit.

### Follow-up (not done), sized
1. Scene OFF, Rain / Sun continues: present a `Pausex20` hold command (~32 rows, text kept; ROM +30 Sun, +31 Rain from our current end) after the print's wait, before the turn-end command. Where the weather print is not the last command (a poison / Leech Seed tick follows) every later row of that turn moves too, so verify with the etp1-rain5 / sun labs both ways.
2. Scene ON: Sun continues is 8 rows too long, Rain continues 3 too long (`WEATHER_CONTINUES_BODY_ROWS.SUN_CONTINUES` 158 was "not yet pinned by a weather-window receipt"; `RAIN_CONTINUES_COMMAND_FRAMES` = 2 + GENERAL_RAIN_SCRIPT_ROWS). The blank box before the menu is already 6 frames in both.
3. Poison / burn tick, the 2 (OFF) / 4 (ON) frame lead, is the etp1 residual.

Baseline numbers (before; npm run compare, matched / 1122 per lab): etp1-sun-off 605, etp1-sun-on 824 (unchanged: no src change). Website: no (measurement only).
