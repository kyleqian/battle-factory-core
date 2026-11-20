# snd3: the three sound bugs of the frame catcher sweep (fcs1 findings 4, 5 and 6)

The frame catcher sweep over 26 whole rounds (`docs/fcs1-catcher-sweep.md`) found three sound bugs. All three are fixed here and checked
against the ROM: ROM windows made for this step (soundEventProbe, committed as Tier-1 fixtures) and the catcher re-run on the sweep's
traces. Rules and RNG are unchanged: the battle text of every re-made trace is the same, and the two re-made traces without a Baton Pass
are byte for byte the sweep's (below).

Evidence (not in git): `.integration/evidence/fix-sounds/` (`probe/` and `probe-step/` ROM windows, `catcher/after1`, `catcher/after2`
catcher runs, `traces/` re-made traces, `cmp-*` compare runs of the Baton Pass labs).

## Bug 4: a battle-start Intimidate was silent (both scenes)

**What was wrong.** `BattleScript_IntimidateActivatesEnd3` plays `B_ANIM_STATS_CHANGE`, which `Cmd_playanimation` launches even with
animations off (`battle_script_commands.c:4011-4017`); `StatsChangeAnimation_Step2` plays SE_M_STAT_DECREASE with
`BattleAnimAdjustPanning2(SOUND_PAN_ATTACKER)` (`battle_anim_utility_funcs.c:561-564`). Our battle-start entry scripts (pau4) are drawn from
`battleStartIntro.entry`, not from `battleResolutionPresentation`, and the stat SE emitter only read the latter, so the banner was drawn
with no sound.

**ROM.** Labs `tools/battle-lab/sta6m-intimp-{off,on}.json` (the player's MIGHTYENA intimidates the foe's MAGNETON), probed with
`--log-setup` (the intro runs inside `lab.prepare`): SE 245 at pan +64, absolute frame 1910 (OFF) / 1941 (ON) = app frame 732 / 763 of the
`sta6m-intro-intimp-*` traces (app = ROM - 1178). It is 3 frames before the banner's first frame on the ROM, in every stat change of the
sweep (Step2 runs on the gAnimScriptActive edge + 2 and its LZ loads overrun two VBlanks; the first fade-in step shows 3 frames later).
Our entry's stats-change command starts on the ROM's edge + 1 (729 OFF), so the SE is command age 3.

**Change.** `tickSounds.ts` emits `emitStatsChangeSounds` from the entry phase's synthetic resolution frame
(`factoryBattleStartEntryFrame`) with `ENTRY_STATS_CHANGE_SE_AGE = 3` (`moveAnimSounds.ts`; `emitStatsChangeSounds` gained the age
parameter, the in-battle age 7 is unchanged).

**Result.** Lab: ours 732 OFF (ROM 732), 762 ON (ROM 763; our whole Scene ON intro send-out is 1 frame early there, the player's ball
639 / 640 and cry 652 / 653, pre-existing). Sweep (catcher after-runs, ours mapped to the ROM by the preceding send-out cry): every
battle-start Intimidate lands on the ROM's frame with the ROM's pan, 3 frames before the banner on both sides: seed 10 OFF battle 6 ours
55,732 / ROM 58,136 (pan -64), seed 10 ON battle 6 ours 67,575 / ROM 70,645 (re-made trace), seed 17 OFF ours 67,011 / ROM 69,981,
seed 26 OFF ours 22,078 / ROM 23,095, seed 23 ON ours 1,656 / 47,246 / 88,867 / 113,060 / 159,085 / 179,184 vs ROM 1,711 / 49,800 / 93,028 /
118,329 / 166,316 / 186,980 (pan -64 in battle 1, the foe's Intimidate; +64 after, the player's lead's; those are the six the banner check
locates, and the run's sound table is empty, so its seventh matches too).

## Bug 5: an extra ball sound when Baton Pass's user left (Scene ON)

**What was wrong.** `BattleScript_EffectBatonPass` uses `returntoball BS_ATTACKER` (`battle_scripts_1.s:1706`), which sends
`ReturnMonToBall(..., TRUE)` (`battle_script_commands.c:5346-5353`): the controller destroys the sprite and hides the healthbox at once, with
no `DoSwitchOutAnimation` and no sound (`OpponentHandleReturnMonToBall`, `battle_controller_opponent.c:1200-1215`; the player's twin in
`battle_controller_player.c`). The Baton Pass body has already hidden the user (`AnimBatonPassPokeball`, `battle_anim_effects_3.c:2061-2100`).
Scene OFF and Scene ON Roar / Whirlwind already used this instant removal; Scene ON Baton Pass kept the 32-frame voluntary recall span, which
plays SE_BALL_OPEN at its elapsed 2 (`emitMidBattleSwitchSounds`) and removed the healthbox 27 frames late.

**ROM.** Labs `tools/battle-lab/snd3-batonpass-{opp,player}-on.json` (`tools/integration/snd3Labs.py`): the foe's Baton Pass plays
SE_M_BATON_PASS at 67 and the only SE_BALL_OPEN at 184 (the send-in); the player's (pau5's Diglett / Porygon / Shuckle party, SHIFT to
SHUCKLE) SE_M_BATON_PASS at 63 and the only SE_BALL_OPEN at 550. The sweep (seed 10 ON battle 5, two Baton Passes; seed 0 ON battle 6), counted
from the Baton Pass animation's first frame A: ROM removal A+55 / A+56 / A+56, SWITCHINMON print A+60 / A+61 / A+61, send-in ball
A+106 / A+108 / A+111.

**Change.** `battleResolutionPresentation.ts`: a `returntoball BS_ATTACKER` receipt is the forced removal in Scene ON too (the 4-row hold with
`skipAnimation`, then the recall receipt 5 rows before the SWITCHINMON print, the Scene OFF Baton Pass gap). `skipAnimation` already
silences `emitMidBattleSwitchSounds`. The player's Baton Pass already had no extra sound (its switch-out runs in the party menu's
`presenting-switch-in` phase, which plays no switch-out SE); its timing is unchanged by this step.

**Result.** Ours (sweep after-runs, same A): removal A+54, print A+59, send-in ball A+103 / A+104 / A+107, so 1-2 frames early for the
removal and print and 3-4 for the ball (before: removal A+82, print A+83, ball A+127). The extra SE_BALL_OPEN is gone in all three; the
foe's lab: SE_M_BATON_PASS then one SE_BALL_OPEN on both sides; the player's lab: one SE_BALL_OPEN on both sides (ROM 550, ours 554).

This shortens the Scene ON presentation after a Baton Pass by 24 frames, so the sweep's frame-timed traces of seeds 10 and 0 Scene ON
(made on the old engine) no longer replay after their first Baton Pass. They were made again on this branch with the sweep's own command
(`makeTrace.mjs --seed N --scene on --policy winning-swap --battles 7 --max-frames 170000`, then fcs1's `trim.mjs`): the battle text of both is
identical to the sweep's (`.lines.txt` without frame numbers), the trimmed traces are 291 (seed 10) and 10 (seed 0) frames shorter. The same
command on the base branch reproduces the sweep's seed 10 trace byte for byte, and on this branch the seed 15 ON and seed 10 OFF traces (no
successful Baton Pass) are byte for byte the sweep's.

## Bug 6: no quiet music for Sing / Perish Song / GrassWhistle (Scene ON)

**What was wrong.** `LaunchBattleAnimation` sets the BGM to volume 128 for the moves of `gMovesWithQuietBGM` (`battle_anim.c:248-256`,
`battle_anim_scripts.s:14-15`: MOVE_SING, MOVE_PERISH_SONG, MOVE_GRASS_WHISTLE) and `Cmd_end` sets it back to 256 (`battle_anim.c:520`, logged
"via DestroyAnimSoundTask": `Cmd_end` is static). Ours never changed the volume.

**ROM.** Labs `tools/battle-lab/snd3-{sing,perishsong,grasswhistle}-{player,opp}-on.json` (Lv50 Rattata with the move x4 vs a Lv25 Rattata).
The duck is on the launch row, one row before the script's first command (script row -1 of our sound clock) in all six labs and the sweep:
Sing player duck 57 / SE 64 / restore 302, opp 61 / 68 / 301; Perish Song player 59 / 86 / 317, opp 63 / 90 / 321; GrassWhistle player
65 / 84 / 285, opp 69 / 88 / 289; sweep seed 15 ON battle 5 (ROSELIA -> FURRET) 68,348 / 68,367 / 68,568. The restore row (from the first
command): GrassWhistle 219 in all three (SE-bound: SE_M_GRASSWHISTLE ends 201 rows after its panse at 18), Perish Song 257 on both sides (its
fixed 259-row body - 2), Sing 244 (player) / 239 (opp): the notes fly off the screen (geometry), then `Cmd_end`'s 90-frame IsSEPlaying wait
runs out (`battle_anim.c:493-501`), stops SE_M_SING on SE1 and restores the BGM on the same row = `liveSingBodyRows` (the ROM-measured
geometry-derived Sing body, doll90) - 2.

**Change.** `moveAnimSounds.ts`: `emitMoveAnimSounds` emits the 128 duck on script row -1 for the three moves and schedules the restore
(`scheduleAnimTaskBgmRestore`, plus Sing's `stop` of SE 172 on SE1) from there (`quietBgmRestore`); `liveMoveSourceAge` exposes Sing's
`liveSingBodyRows`. Scene OFF plays no move animation, so nothing ducks there (as on the ROM).

**Result.** All six labs: ours duck, restore and Sing's stop on the ROM's frames exactly. Sweep seed 15 ON: ours duck 65,492 / SE 65,511 /
restore 65,712, the ROM's spacing (-19 / +201).

## Tests

- `tests/snd3SweepSounds.test.ts` (11): bug 4 both scenes (frame and pan vs the ROM, `ENTRY_STATS_CHANGE_SE_AGE` into the entry's
  stats-change command, the ON residual equal to the intro send-out's); bug 5 the foe's (sound order, the forced-removal rows) and the
  player's (one ball sound); bug 6 the six labs (duck / restore / stop rows equal to the ROM's) and `quietBgmRestore`. 9 of the 11 fail with
  the three changes reverted (the player's Baton Pass and `quietBgmRestore` pass either way).
- `tests/battleResolutionPresentation.test.ts`: the "Baton Pass shape" case now uses the real `returntoball BS_ATTACKER` instruction and
  pins the instant removal (it used to pin the 32-frame span).
- Fixtures: `tools/audio/fixtures/snd3-*.json` (soundEventProbe.py stepping mode, `--compact`; the `--fast` logs had the same rows), listed in
  `tests/audioProbeFixtures.test.ts`. The intro fixtures come from a copy of `sta6m-intimp-{off,on}.json` without
  `preCheckpointCaptureAllFrames` (the captures only). App stages `snd3-*` in `tools/compare/appTrace.ts`; Sing and GrassWhistle use kernel
  seeds 2 (player) / 10 (opp) so the 55 % move hits as in the ROM lab.

## Checks

- `tsc -b` with the typecheck script's heap (`npm run typecheck` needs `flock`, which this Mac lacks): 0 errors, at each of the three
  commits.
- `npm run test:gate`: 360 files / 2832 tests passed. The sound, presentation and forced-switch files (`tests/aud*`, `snd*`, `audio*`,
  `pau4*`, `pau5*`, `offs152*`, `forcedSwitch*`, `batonPass*`, `battleResolutionPresentation*`, `cry1*`, ...): 86 files / 2402 passed,
  18 skipped. The soak pins (`tests/randomRoundSoak*.test.ts`, `contain209SoakContained`, `soakLobbyNewChallenge`) with `offs152`, `pau4`,
  `pau5`: 14 files / 140 passed, no re-pin.

## Catcher, before and after

Rows of each run's "Sound differences" table. Before: `fcs1/final/<run>/report.md`. After: this branch, `catcher/after1` (the sweep's
traces) and `catcher/after2` (seeds 10 and 0 Scene ON, re-made, see bug 5).

| run | before | after | rows left (all listed in fcs1 as catcher limits) |
|---|---|---|---|
| seed 10 OFF winning-swap | 3 (Intimidate) | 2 | draft YES/NO SE_SELECT; the Lobby walk's SE_SELECT after the trace |
| seed 10 ON winning-swap | 3 (2 x SE_BALL_OPEN, Intimidate) | 1 | draft YES/NO SE_SELECT |
| seed 17 OFF winning-swap | 1 (Intimidate) | 0 | |
| seed 26 OFF winning | 2 (Intimidate) | 1 | draft YES/NO SE_SELECT |
| seed 23 ON full | 3 (Intimidate x 7) | 0 | |
| seed 15 ON winning-swap | 2 (the GrassWhistle duck) | 1 | the Lobby walk's SE_SELECT |
| seed 0 ON winning-swap | 1 (SE_BALL_OPEN) | 0 | |

Pictures: unchanged on the five runs with the sweep's traces (same ranked list, same counts); seed 10 ON 654 + 604 small -> 618 + 563,
seed 0 ON 279 + 222 -> 280 + 225 (the same items shifted 10 frames). Every run followed every menu (409/409 and 537/537 on the re-made
traces). Seed 15's ROM run ended with exit 138 after writing its complete output (431/431 anchors), which `run-mgba-probe.py` does not
accept, so its compare step was run by hand.

## Found, not fixed

- **In-battle stat-change SE vs its banner**: in every in-battle stat change of the runs checked (seeds 10 OFF / ON, 17 OFF, 23 ON) ours plays
  SE_M_STAT_INCREASE / DECREASE 1 frame after the banner's first frame, the ROM 3 frames before it. aud248 pinned the age 7 against the ROM's
  absolute SE frames, so the banner is probably drawn 4 frames early there (not checked against an absolute anchor).
- **Baton Pass's own SE** is 7 frames late against its animation (ours A+6, ROM A-1) in all five Baton Passes (labs: ours 67 / 71, ROM 63 / 67).
- **The player's Baton Pass after the party menu**: the ROM shows the user's healthbox when the battle screen fades back in and removes it 6
  frames later (`returntoball`), ours has removed it already; the SWITCHINMON print is 3 frames and the send-in 4 frames late. Unchanged by
  this step.
- **Sing's presented length** is `liveMoveAnimationDuration`'s, not the geometry-derived ROM body (`liveSingBodyRows` is used by the Substitute
  swap only): Rattata vs Rattata opp 248 rows vs the ROM's 241, so the next status SE is 5 frames late (player: 3 early).
- Sing's stop of SE_M_SING assumes the SE outlasts `Cmd_end`'s 90-frame wait, as in both labs (238 / 233 frames after it started); for a
  geometry whose notes stay longer on screen this was not measured.
