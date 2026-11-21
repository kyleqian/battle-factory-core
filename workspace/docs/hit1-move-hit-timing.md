# hit1: the hit after a move's animation waits for the move's sound (2026-11-21)

Kyle's live battle on 2026-11-21 (Thunder Punch): "the timing between the sounds and the hit ... seems too short". Branch
`fix/move-hit-timing` from master `5fbac1476`. Evidence (not in git): `.integration/evidence/hit1/` (`b/` = the catcher on master traces,
`a4/` = the catcher on traces made on the fix, `b2/` + `a4/` for 8 more seeds, `traces*/`, `watch` files, scratch scripts).

## In short

A battle animation script does not end on its last picture. Its `end` command waits until the sound effects it started have finished
(up to 90 frames), and the battle script's hit (the effectiveness sound, the hit blink, the HP drain) waits for the script to end.
Thunder Punch's last sound, SE_M_TRI_ATTACK2, plays 68 frames, so the ROM's script ends 23 frames after its last task is done. Our move
windows ended at the last picture. That was the main cause: the same rule explains, move by move, the "trail" (frames the ROM script
runs past our window) that idle94 measured on the ROM for 17 moves. Thunder Punch also lacked its 10 idle lead rows and its lead /
tail class, which put its pictures 17 frames early. A third, separate fault put the effectiveness sound of a body without a lead too
early whenever an earlier body in the same turn had one (multi-hit hits 2+, a move after the foe's).

## ROM

### Source

- `src/battle_anim.c:476-524` (`Cmd_end`): while `gAnimVisualTaskCount`, `gAnimSoundTaskCount` or a monbg task (`sMonAnimTaskIdArray`)
  is alive it waits; then, while `IsSEPlaying()`, it waits again, `++sSoundAnimFramesToWait <= 90` calls, after which it stops SE1 and
  SE2 (`m4aMPlayStop`); only then `gAnimScriptActive = FALSE` (and the BGM volume goes back to 256).
- `src/sound.c:606-613` (`IsSEPlaying`): TRUE while SE1 or SE2 has a track (`MUSICPLAYER_STATUS_TRACK`) and is not paused.
- `src/m4a.c:620-632` (`MPlayStart`): a new song on a player replaces the one it plays unless that one has the higher header priority;
  the player and priority come from `sound/song_table.inc` and the song's `_pri`.
- `src/battle_controller_player.c:2518-2524` (`PlayerDoMoveAnimation`, the opponent's the same): the controller runs
  `gAnimScriptCallback` and finishes only when `gAnimScriptActive` is FALSE; `data/battle_scripts_1.s:253-258`:
  `attackanimation; waitanimation; effectivenesssound; hitanimation; ...`; `Cmd_waitanimation` (`battle_script_commands.c:1801`) and
  `Cmd_effectivenesssound` (`:2001`) wait for `gBattleControllerExecFlags`.
- `data/battle_anim_scripts.s:4828-4859` (`Move_THUNDER_PUNCH`): SE_M_COMET_PUNCH at script row 51, SE_M_TRI_ATTACK2 at row 66 (both on
  SE1, `song_table.inc`), the visual tasks done by row 111, then `clearmonbg; blendoff; end`.
- The SE lengths (`sound/songs/midi/se_*.s`): the m4a tick loop of aud259's `seExact` (MPlayMain `m4a_1.s:1150-1370`, ply_tempo
  `:920-930`, ply_fine `:750-777`), now following PATT / PEND / REPT and marking GOTO / REPT 0 songs as endless. SE_M_TRI_ATTACK2:
  IsSEPlaying TRUE for 68 rows from its start.

### Measured

The frame catcher gained `CATCHER_WATCH=1` (`tools/frame-catcher/romRun.py`): after every ROM frame it logs `gAnimScriptActive`,
`gAnimVisualTaskCount`, the SE1 / SE2 player status and `gBattlescriptCurrInstr` (`rom/watch.json`).

Thunder Punch, master trace t3 (seed 3), all 33 hits the same, frames from SE_M_COMET_PUNCH:

| | ROM |
|---|---|
| gAnimScriptActive rises | -52 (script row -1) |
| SE_M_TRI_ATTACK2 | +15 |
| last visual task done | +60 |
| SE1 track bits clear | +83 (= 15 + 68) |
| gAnimScriptActive falls | +83 |
| effectivenesssound (SE_NOT_EFFECTIVE / SE_EFFECTIVE / SE_SUPER_EFFECTIVE) | +86 |
| the hit blink | +88 |

Ours on master: the effectiveness SE at +52 (34 early), the hit blink at +46 (42 early; the body's pictures, the same as the ROM's
frame for frame, 17 early, then 9 frames of field instead of the ROM's 34).

Every ROM window of the sweep's master traces whose last SE outlasts its visual tasks falls on the row that SE's song
ends (`rom/watch.json`: the SE track bits and gAnimScriptActive clear on the same row, every time): Thunder Punch 135 rows from the rise,
Twineedle 63 per hit (its tasks are done at 46), Metal Claw 157 (144), Sludge 111, Ember 69, Fire Punch 101, Double Slap 33 (18), ...

idle94 (`docs/next-adapters-idle94.md`) had measured, per move, how far the ROM's first inactive row lies past our window ("trail") and
how many rows the ROM's activation comes before our age 0 ("lead"). The rule gives trail + 1 (+ the lead rows we do not present) for
every move with a positive trail in that table: Thunder Punch 21 + 1, Twineedle 16 + 1, Supersonic 13 + 1 + 7, Ember 2 + 1, Growth 19 + 1,
Razor Leaf 19 + 1, Recover 4 + 1 + 10, Sludge 5 + 1, Hyper Fang 1 + 1, Reversal 0 + 1, Milk Drink 3 + 1 + 13, Dynamic Punch 26 + 1 + 19,
Metal Claw 13 + 1, Synthesis 5 + 1 + 4, Blaze Kick 8 + 1, Poison Tail 3 + 1, Covet 20 + 1 (Dragon Rage 20 + 1 and Toxic 4 + 1 too, whose
ROM-tuned tails already hold it).

## The change

- `tools/extract/extract-se-song-rows.ts` -> `src/data/gen/se-song-rows.json` (269 SE songs: IsSEPlaying rows, player, priority).
- `src/engine/animEndSeWait.ts`: `animScriptSeStopRow` (the rows from the activation to the first row IsSEPlaying reads FALSE after the
  script's SEs: script row r runs on activation + 1 + r, the players replace / keep songs as MPlayStart does) and `cmdEndSeWaitRows`
  (max(0, min(stop, last + 90) - last), last = the body's last row = activation + idle lead + live - 1).
- `src/engine/battleResolutionPresentationRender.ts`:
  - `liveMoveEndSeWaitRows(request, field)`: those rows for a live body, from the variant's sound ops (the anim-sound-timing table).
    0 for a Substitute swap, a General_TurnTrap / General_Rain body, the lead-rule classes whose rows after the body are ROM-tuned tails
    (lead-table, status-tail, lse2, s-lead, gap-print, lead-only), the lse4 window-short bodies, and the bodies whose window already models
    the wait (Sing, Solar Beam, Self-Destruct, Transform).
  - `battleResolutionCommandDuration`: + those rows after the body, before the post rows. A body held by them ends on the ROM's first
    inactive row (trail -1), so it gets iu120's post rows (`liveMoveUniversalRows`).
  - The rows after such a body (the wait, post and tail rows) carry `afterScript` on the move effect, and the scene draws the field as it
    is there (`battleScene.ts` `renderBattleResolutionLiveView`): every script command, cleanup included, has run (Metal Claw: the ROM's
    wait rows are the plain field, our last body row still had the claw effect). On the wait rows the enemy shadow stays hidden
    (`postBodyShadowHidden`: SpriteCB_EnemyShadow hides it while gAnimScriptActive).
  - Thunder Punch: its 10 idle lead rows (`LIVE_MOVE_IDLE_LEAD_ROWS`; idle94 measured them, the catcher's ROM frames show them static, the
    same picture as our age 0) and its pre rows (off `LIVE_MOVE_NO_PRE_ROW_SIDES`).
- `src/engine/battleResolutionPresentation.ts`: Thunder Punch joins the shape-A lead rule (`HIT1_SHAPE_A_MOVE_IDS`). lead1m
  (`docs/lead1m-rule-lead-design.md`) classed it B: counter lead 5 = the ROM's, gap 4, s = +32, "fix the adapter window first". The window
  is now the ROM's (10 + 104 + 22 = len 135 + 1), so it is shape A: lead 5 in front, tail 6 - pre - post = 1. 5 + 3 + 135 + 4 = 147 rows.
- `src/engine/battleHitSounds.ts`: the effectiveness SE of a hit after a move body without a lead no longer subtracts the lead / tail rows
  of the resolution's earlier lead bodies (`moveBodyExtraRows`): those rows are already in this command's start. A hit after a general
  animation (Future Sight's hit, the end-turn weather loop) keeps the old anchor (see "Open").
- `src/engine/animSoundOps.ts`: the pure half of `moveAnimSounds.ts` (the variant table and the op rows), moved without change so the
  presentation can read it without an import cycle through the sound emitters (the cycle broke `turn5ResolutionAdapterEquivalence`'s lazy
  values).

Presentation and sound timing only: no RNG, no battle outcome. Scene OFF draws no move bodies (Transform and Substitute, the two that play
there, are excluded).

## Catcher, before / after

Before: 33 master traces (`b/`: 25 made on master `5fbac1476` with makeTrace / pickTraces, the seeds whose lines show the moves; `b2/`: 8
more seeds, played by a git-archive copy of master's `src`). After: the same seeds and policies played again on the fix (the old traces'
presses no longer meet the menus once the timing changes), `a4/`. Scene ON, CATCHER_WATCH on both. The measure is Kyle's: rows from a move's
first SE to the effectiveness SE, ROM minus ours (`_playtest-20261121/effgap.py`, and a per-move version that finds each move's SE
sequence; scratch `moveeff.py`).

Per move (median ROM - ours, n; the distribution where it is not one value):

| move | before | after | cause |
|---|---|---|---|
| Thunder Punch | 34 (49; 40 / 41 on 4 after a foe's lead body) | **1** (49 / 49) | Cmd_end wait 22 + idle lead 10 + shape A |
| Razor Leaf | 21 (24) | **1** (16) | Cmd_end wait 20 |
| Twineedle (each hit) | 19 (38) | **0** (42) | Cmd_end wait 17 + post 2 |
| Metal Claw | 15 (22) | **1** (24) | Cmd_end wait 14 |
| Spark | 13 (74; 19 / 20 on 6) | **2** (74 / 74) | Cmd_end rule 9 (the ROM's binding end is its visual end, 2 later) + post + the anchor |
| Snore | 10 (7; 3 on 2) | **3** (7 / 7) | the anchor (Snore's own +3 open) |
| Sludge | 7 (14) | **1** (14) | Cmd_end wait 6 |
| Fury Swipes, hits 2-5 / hit 1 | 7 / -9 | **0** / -9 | the anchor / hit 1 open (below) |
| Double Slap, hits 2+ / hit 1 | 9 / -9 | **2** / -9 | the anchor / hit 1 open |
| Dragon Breath | 6 (25; 12 / 13 on 7) | **3** (24 / 24) | Cmd_end 1 + post + the anchor (trail 3 - 1 open) |
| Ember | 4 (38) | **1** (40) | Cmd_end wait 3 |
| Rock Blast | 3 (13; 10 on 3) | **0** (13 / 13) | Cmd_end 1 + the anchor |
| Fire Punch | 2 (7) | **1** (8) | Cmd_end wait 1 |
| Petal Dance | 2 (121; 8 / 9 on 40) | **2** (160 / 160) | the anchor |
| Brick Break | 2 (30; 8 / 9 on 9) | **2** (24 / 24) | the anchor |
| unchanged, other causes | Water Gun 7, Dizzy Punch 6, Acid 6, Mach / Shadow Punch -5, Faint Attack -3, Knock Off -3, Future Sight's hit -8 / -14 | the same | below |

Per sound pattern (`effgap.py`, the measure of the brief): 56 of 71 patterns within 5 frames before, 65 of 70 after. COMET_PUNCH TRI_ATTACK2
34 -> 1, RAZOR_WIND2 HORN_ATTACK 19 -> 0, THUNDERBOLT2 HYPER_BEAM 13 -> 2, SNORE 10 -> 3, DOUBLE_SLAP 9 -> 2, SCRATCH 7 -> 0, BUBBLE3 TOXIC
7 -> 1, REFLECT 6 -> 0, FLAME_WHEEL 6 -> 3, EMBER FLAME_WHEEL 4 -> 1. Of the patterns within 5 before, two read worse: LEER -1 -> -2 (n = 1:
our rows are the same in both runs, the ROM's differ by a frame between the two traces) and HAIL 3 -> -4 with the first form of the anchor
change (the hail damage SE is 4 late on its own; subtracting the turn's lead bodies had put it 3 early in the turns that had one). The
anchor change was then kept to hits after a move body (the committed form) and the three traces with hail, Future Sight's hit and Fury
Swipes were run again (`a5/`): hail and Future Sight's hit are back on their before rows exactly (s340-cf hail -4 x 5, +2 x 2, +5;
s367-cf Future Sight -14 x 3, -8), Fury Swipes hits 2-5 stay at 0. So in the committed form only LEER (above) reads worse, and not
by our rows.

Pictures: Thunder Punch's stretch is now the ROM's picture for picture relative to the used print (`a3/t3`: the print's last glyph -> the
body's first change 27 rows, the field after the body 34 rows, the hit blink, on both sides), and so is Metal Claw's (its 6 rows of the
last claw picture, then 18 of plain field through the wait, then the hit). Relative to the first move SE both stretches sit 2 rows early:
the shape-A bodies' move SEs are 2 rows late on the pre-lead sound clock (below). On the master traces Thunder Punch's body was 17 rows
early and its hit 42.

The catcher's own stretch counts barely move per trace (the traces differ before / after). One after-trace, s99-ws, stalls the ROM driver
in the Lobby after its 7th battle (331 of 345 menus, "rescue" presses until the cap): outside every battle, so not this change's timing
as far as I can tell, but not chased.

## Tests

- `tests/hit1MoveHitTiming.test.ts` (new, 31): the song rows (SE_M_TRI_ATTACK2 68 and the old ROM-checked lengths), the extractor reproduces
  `se-song-rows.json`; `animScriptSeStopRow` = the ROM's window for Thunder Punch 135, Twineedle 63, Metal Claw 157, Sludge 111, Ember 69,
  Fire Punch 101; priority and the 90-row cap; `liveMoveEndSeWaitRows` = idle94's trail + 1 (+ the unpresented lead) for 17 moves and 0
  for the excluded classes; Thunder Punch's 147-row command; ordinary play with the soak's player: seed 3 Thunder Punch (the effectiveness
  SE 85 rows after SE_M_COMET_PUNCH; 25 after-script rows, 22 with the shadow hidden; the hit on the next row), seed 363 Twineedle (56 and
  56, the ROM's), seed 25 Fury Swipes (49, then 40 x 4, the ROM's 40 on hits 2+).
- Re-pinned, each by its own method, because the rows are now the ROM's: the test-side copies in `tests/helpers/iu120Rows.ts`
  (`HIT1_CMD_END_SE_WAIT_ROWS`, the post rows of a held body, Thunder Punch out of the no-pre masks and into the shape-A ids) and
  `tests/helpers/land97LeadAges.ts` (Thunder Punch 10): the adapter route row counts of Fire Punch, Sludge, Metal Claw, Ember, Blaze Kick,
  Synthesis, Milk Drink, Dragon Breath, Octazooka, Reversal, Rock Blast, Spark, Sky Attack's charge, Twineedle, Thunder Punch follow;
  `iu120UniversalRows` / `land97IdleLeadRows` (the mask counts and Thunder Punch's rows); `apx222LastStaticClassesApproximate` (Odor Sleuth
  +68, False Swipe +15, Gust +46, Conversion 2 +8: the script-built bodies end with their SEs too); `aud248StatChangeSounds` Growth 23 ->
  -2 (ROM 148, ours 125 -> 150: Growth's SE_M_TAKE_DOWN wait 20 + its post / script-tail rows; -2 is the other stat bodies' residual).
- Full suite (`npm test`): 1,930 files / 16,686 tests passed (44 files skipped, as on master). `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b`: clean.

## Open

- **Not this cause** (no SE wait on the ROM: the song ends before the visual tasks): Water Gun +7, Acid +6, Crabhammer and the other
  "+6 / +7 tail" bodies: their ROM scripts fall about 4 rows after the last visual task (probably `clearmonbg`'s Task_ClearMonBg, which
  destroys the monbg tasks Cmd_end also waits for, `battle_anim.c:482-488`, `:852-883`; not traced) and their windows end 2 or 3 rows
  before the ROM's visual end (idle94 trails 4 / 5); Dizzy Punch +6 (idle94 lead 13, its window
  6 short); Spark's last 2 rows (its visual end is 2 rows after its SE end); Dragon Breath 3 (idle94 trail 3, the rule takes 1); Snore +3
  and Magnitude +3; Mach Punch / Shadow Punch -5, Faint Attack -3, Knock Off -3.
- **Future Sight's hit** -14 (our effectiveness SE late): General_FutureSightHit is a general-animation command (`FUTURE_SIGHT_HIT_COMMAND_FRAMES`
  172) followed by the hit: our hit blink is 6 rows after the ROM's and the SE, which gets the non-lead 7-row lag after it, 8 more. No SE
  wait there (the ROM's script ends 68 rows after its last SE stops). The end-turn **hail** damage SE is 4 late. Both keep the old anchor,
  which subtracts the turn's lead bodies and so reads 6 / 7 rows earlier in turns that have one.
- **Lead-body sound clock**: a shape-A body's move SEs play on the pre-lead clock calibrated on a 7-row lead, so with lead 5 they sit 2 rows
  late against the body's pictures (Thunder Punch, Metal Claw; the effectiveness SE then reads 85 vs the ROM's 86), and with lead 15
  (Double Slap / Fury Swipes / Comet Punch hit 1) 8 to 9 early, so their first-SE -> effectiveness gap reads -9 while the effectiveness SE
  itself is on the ROM's row after the print. A lead-aware sound shift (lse2BodySoundAgeShift does it for lse2 / s-lead) would fix both;
  it moves many pinned sound rows, so it is left as a separate step.
- **Not ROM-checked**: the rule's rows for the bodies no trace or idle94 row covers: Gust 44 (its endless SE_M_GUST replaced by SE_M_GUST2),
  Odor Sleuth 63, Peck 14, False Swipe 13 (the old fcm1 sweep had it 22 late, n = 1), Conversion 2 3, Octazooka / Outrage / Sky Attack's
  charge / Swallow 1. The rule is the C, but these numbers are unmeasured.
- The lead rows idle94 measured but production does not present (Supersonic 7, Recover 10, Milk Drink 13, Dynamic Punch 19, Synthesis 4,
  Spark 9, Encore) are now inside the Cmd_end rows: the timeline after the body is the ROM's, the body itself still starts that many rows
  early. Presenting them needs their lead rows checked static, as Thunder Punch's were here.
- An elevated opponent's shadow: during the wait rows it is hidden now, but a body whose last rows bring the shadow back
  (`LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS`) still does so before the wait, where the ROM keeps it hidden. Not measured.
- The HP-bar and faint sound anchors (`battleHitSounds.ts` `lag`) still subtract every earlier lead body of the resolution; not measured
  here, not changed.
- The ROM detail that an SE started on the row Cmd_end runs reads as not playing (its status is 0 until the next VBlank tick; seen on
  Status_Poison's last loop) is not modelled; no move body in the rule set ends that way in the sweep.
