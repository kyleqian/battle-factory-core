# aud249: sound effects of the General_* / Status_* battle animations

Scope: the SEs of `gBattleAnims_StatusConditions` / `gBattleAnims_General` animations that the live presentation already runs (Battle Scene ON). Sound-only:
no gameplay state, RNG, damage, turn order or presentation length changes. Move-body lifetimes (aud242 family), cries, BGM are out of scope.

## Part 1: mapping of the top ROM-only rows (aud248 baseline, 5 aligned seeds 2 / 165 / 499 / 830 / 1028, Scene ON)

| SE id | ROM-only rows | source | status after aud249 |
|---|---|---|---|
| 148 | 114 | `Status_Poison` (`loopsewithpan` 148, wait 13, x6) + Poison / Toxic move bodies | 114 -> 24 (the 24 are move-body rows, aud242 family) |
| 176 | 96 | `Status_Confusion` (`loopsewithpan` 176, wait 13, x6) | 96 -> 0 |
| 196 | 52 | not a presented General_* command (move body; `General_DoomDesireHit` also plays it but the live route does not present it) | unchanged (out of scope) |
| 137 | 44 | ice-crystal move-body rows (aud242g ROM-only list); `Status_Freeze` (137 + 242) has no window in these seeds | unchanged |
| 152 | 24 | `General_HeldItemEffect` (Leftovers / berry / item effect) | unchanged: no presented command (gap A) |
| 127 | 12 | `General_Rain` (weather continues) | 12 -> 0 |
| 102 | 11 | `General_HeldItemEffect` family (item effect) | unchanged (gap A) |
| 123, 133, 186, 130, 194 | 9 / 6 / 6 / 5 / 4 | move bodies / other controller paths | unchanged (aud242 family) |
| 119 | 9 | `Status_Paralysis` | 9 -> 0 |
| 228 | 8 | `General_HeldItemEffect` family | unchanged (gap A) |
| 197 | 8 | `Status_Sleep` | 8 -> 0 |
| 144 | 6 | `Status_Burn` | 6 -> 0 |
| 179 | 2 | not in a General_* table (Leech Seed move path) | unchanged |

Also decoded (table only): `Status_Infatuation` 212 x3, `Status_Curse` / `Status_Nightmare` 121, `Status_Freeze` 137 + 242, weather `General_Sun` 202, `General_Sandstorm` 219, `General_Hail` 242 x10,
`General_CastformChange` 203 / 204, `General_FocusPunchSetUp` 171, `General_LeechSeedDrain` 180 + 142, `General_HeldItemEffect` 152. No ROM window among the 5 seeds or the committed fixtures
covers infatuation / curse / nightmare / sun / sandstorm / hail, so those are emitted from the table and only the pan rule is unit-tested.

## Part 2: what is emitted

`tools/extract/extract-anim-sound-timing.ts` walks the two General tables the same way as the move table (battle_anim.c VM clock) into the `general` array of
`src/data/gen/anim-sound-timing.json` (one variant per animated-battler side; `General_CastformChange` resolves with `TRUE` / `FALSE` and `AnimTask_IsMonInvisible` = 0).
`emitGeneralAnimSounds` (`src/engine/moveAnimSounds.ts`, called from `src/engine/tickSounds.ts`) emits:

- `status-animation` commands (PSN / CONFUSION / BRN / INFATUATION / SLP / PRZ / FRZ / CURSED / NIGHTMARE): clock = command age minus the IsBattleSEPlaying gate
  (`seGateFrames`) minus `STATUS_ANIMATION_SCRIPT_AGE` (7); `statusAnimActive` forces every pan to the animated battler's side (BattleAnimAdjustPanning).
- weather-continues `general-animation` commands (rain / sun / sandstorm / hail): move-body clock (the same 1 + 7 as a move body).
- Launch loops (`loopsewithpan`) of these animations play every gap at wait + 1 (14 for confusion / poison, as in every ROM window), unlike a move body whose first gap is wait.

Scene OFF presents none of these commands (the kernel skips them under HITMARKER_NO_ANIMATIONS), so OFF is unchanged; the OFF T2 rescore is identical to the baseline.

## Evidence

- T2 (Scene ON, 5 aligned seeds, ROM files reused, engine replay + compare rerun): move-animation SE exact / offset / missing / extra `92 / 512 / 429 / 0` -> `98 / 727 / 208 / 0`; no new extra rows.
  Stat-change, cry, controller, bgm rows identical. Scene OFF identical in every family. Per SE id: see the table above (matched rows exist now, offsets are segment-relative and carry accumulated
  presentation drift: medians 148 -10, 176 -4, 197 +3, 144 -10, 119 -10, 127 -16).
- Neutrality (`lsd194Census.sh`, seeds 0..199, both scenes, base `1a657e483` vs `b17c52318`): OFF 200 / 200 seeds identical; ON 200 seeds, 0 errors, only `sound` / `soundDigest` differ (169 seeds), every non-sound
  field (`eventsDigest`, `commands`, `soundAnim`) equal.
- Tier 1: `tests/aud249GeneralAnimSounds.test.ts` (table decode, loop spacing, pan rule, flatter / swagger ROM windows: both confusion plays, ids / pans / 14-frame spacing equal);
  `tests/aud242gMoveAnimSounds.test.ts` dreameater turn 1 now includes the frame-exact Status_Sleep SE197 (delta 0; the former "SE197 not emitted" gap is closed).

## Residuals and gaps

- A. `General_HeldItemEffect` (SE 152 / 228 / 102, 43 ROM-only rows) needs a presented command for the held-item effect; the live route has none (not an SE problem).
- B. `STATUS_ANIMATION_SCRIPT_AGE` = 7 is calibrated on the single frame-exact window (dreameater turn 1, SE197 delta 0). The flatter / swagger windows then show +7 / +8 on the first confusion play
  (their stat-change SE, whose clock is exact, is +5 / +6 there: the move body before is not ROM-exact), so 2 frames of the first-play residual are unexplained.
- C. In all three windows the second play of the same animation is a further ~14 frames late (flatter 21, swagger 22, dreameater 15 vs the first play): a second-play lead, probably the status SE gate
  or the end-turn presentation of the following turn; not diagnosed.
- D. Not emitted although decoded: `FOCUS_PUNCH_SETUP`, `LEECH_SEED_DRAIN`, `CASTFORM_CHANGE` (presented commands exist; their age anchors are not calibrated against a ROM window), `General_TurnTrap` and `General_SnatchMove`
  (extractor leaves an unresolved branch), Substitute fade / appear (no SE).
- E. Poison 148 / 137 rows still ROM-only (24 / 44) are move-body rows, not Status_* (aud242 family).

## psn1: does the ROM play the 6th `Status_Poison` SE 148? (2026-11-16, Scene ON, evidence only, `src/` untouched)

Lab: the existing `tools/battle-lab/aud242e-toxic-player-on.json` (Lv50 Toxic user vs Lv12 Tackle user, seed 1), traced two turns: Toxic (turn 1, poisons) then a second Fight press (turn 2). The poison end-of-turn tick is one `status-animation` PSN command per turn.
The single-turn ROM window is the committed fixture `tools/audio/fixtures/aud242e-toxic-player.json` (same 6 rows); the two-turn recording is `.integration/evidence/psn1/rom-2turn.json`.

ROM SE 148 rows of the `Status_Poison` plays (frame 1-based, pan 63 = the animated battler's side), `loopsewithpan` 148, wait 13, x6:

| play | frames | gaps | rows |
|---|---|---|---|
| turn 1 | 296 310 324 338 352 366 | 14 x5 | **6** |
| turn 2 | 904 918 932 946 960 974 | 14 x5 | **6** |

(Toxic's own move-body rows, 8 + 6 before frame 270, are the aud242 family and not under test.)

Engine rows for the same stage (`aud250AnimAge.ts` on a fixture with the committed `aud242e-toxic-player-on` appStage and the two-turn segments): the PSN command starts at frame 279 / 881 (`minimumFrames` 71) and emits
**5** rows each: 286 300 314 328 342 and 888 902 916 930 944 (command age 7, 21 .. 63; engine Toxic move body is ROM -3: 65 vs 68).

| | first row | rows | ROM - engine, first row | 6th row |
|---|---|---|---|---|
| turn 1 | ROM 296 / engine 286 | 6 / 5 | +10 (move body before it: +3) | ROM 366; engine would be 356 = command age 77, the command's window ends at age 71 |
| turn 2 | ROM 904 / engine 888 | 6 / 5 | +16 | ROM 974; engine would be 958 |

**Verdict:**
- **The ROM plays the 6th SE 148, yes: at first + 70 frames (5 x 14), in both turns.** The engine's 5-of-6 is an emitter gap, not a ROM property.
- Source mechanism (`battle_anim.c` `Cmd_loopsewithpan` / `Task_LoopAndPlaySE`, line 482): the loop is a parallel task (`gAnimSoundTaskCount`), and the script's `end` (and so `gAnimScriptActive`) waits until the task has played its
  6th SE (script frame 70) and destroyed itself. So the ROM cannot finish the animation before the 6th SE: its 71 active rows (`STATUS_ANIMATION_ADDED_ROWS.PSN` 71 = 70 + 1, sta123 receipts) run from script frame 0 to just after
  that SE. The engine puts script frame 0 at command age 7 (`STATUS_ANIMATION_SCRIPT_AGE`, calibrated on the ROM first row) inside a 71-row window that starts at the receipt, so its 6th SE lands at age 77, past the window, and
  `emitGeneralAnimSounds` (which only runs inside the command) never emits it. The 7 rows of lead are therefore not part of the ROM's 71 active rows (an engine window / ROM script start offset), not a sound property.
- **Window rule that fixes it** (sound-only, no presentation-length change): emit the script-frame-70 row of the PSN loop at command age 77, i.e. let the status-animation SE emission run a short tail past `minimumFrames`
  (age <= `STATUS_ANIMATION_SCRIPT_AGE` + 70) instead of stopping at the window end. The alternative, raising `PSN` to 78 rows, would change every PSN presentation length that the sta123 / seg127 receipts measured as exact,
  so it needs its own pixel window and is not recommended. CONFUSION (100 rows, last SE at age 7 + 70 = 77) already fits its window, which is why only PSN loses a row (128 / 128 commands in the t1cls census).
  Any other animation whose last SE falls after its window (grep the table for `ends` vs last SE) needs the same tail.
- Second play offset: here the two plays are one turn apart, ROM - engine is +10 then +16, i.e. the second play is **+6** later relative to the first, not ~14. The ~14 of residual C was measured between two plays inside one
  confusion window; the Toxic plays are separated by a whole turn whose engine drift (e.g. SE 238 at ROM 552 / engine 532 = +20 in between) is not removable without more anchors, so this window neither confirms nor refutes C.
  The first-play offset of +10 vs the move body's +3 (a residual +7 over the preceding ROM-exact stat anchor) matches residual B's direction (flatter / swagger +2, dreameater 0): the lead of 7 is not constant across windows.

Reproduce (the ROM side needs no oracle service; ~12 s + 5 s):
```sh
E=.integration/evidence/psn1; mkdir -p $E; rm -f $E/rom-2turn.json $E/rom-2turn.json.log
python3 - <<'PY'
import json
d=json.load(open('tools/battle-lab/aud242e-toxic-player-on.json'))
d['trace']['segments']=[{"frames":2,"buttons":["A"]},{"frames":18,"buttons":[]},{"frames":2,"buttons":["A"]},{"frames":700,"buttons":[]},{"frames":2,"buttons":["A"]},{"frames":18,"buttons":[]},{"frames":2,"buttons":["A"]},{"frames":800,"buttons":[]}]
json.dump(d,open('.integration/evidence/psn1/psn1-toxic-2turn-on.json','w'))
PY
python3 tools/run-mgba-probe.py $E/rom-2turn.json -- python3 tools/audio/soundEventProbe.py $E/rom-2turn.json lab $E/psn1-toxic-2turn-on.json --frames 1550 --fast --compact
python3 - <<'PY'   # engine side: reuse the committed aud242e-toxic-player-on stage with the two-turn segments
import json
d=json.load(open('.integration/evidence/psn1/rom-2turn.json')); d['trace']['appStage']={"id":"aud242e-toxic-player-on","frame":0}
json.dump(d,open('.integration/evidence/psn1/rom-2turn-fixture.json','w'))
PY
node --experimental-strip-types --no-warnings tools/audio/aud250AnimAge.ts $E/rom-2turn-fixture.json status-animation,move-animation
```
Evidence: `.integration/evidence/psn1/` (`rom-2turn.json`, `engine-rows.txt`). No fixture or test was added (the committed single-turn fixture already holds the ROM rows).

## psn2: the 6th `Status_Poison` SE 148 (2026-11-16, sound-only)

`emitGeneralAnimSounds` now schedules, at the status-animation script's first row (command age `STATUS_ANIMATION_SCRIPT_AGE`), every table row whose command age falls at or after the window end (`scheduleStatusAnimationTail`, the existing `scheduleAfter` queue), so a `loopsewithpan` row past the 71 / 100 / ... presentation window still plays, as the ROM's parallel sound task does (battle_anim.c:482). The window itself is unchanged (frames identical). A scan of all nine `Status_*` scripts (`ops` rows + `STATUS_ANIMATION_SCRIPT_AGE` against `STATUS_ANIMATION_ADDED_ROWS`) shows only `Status_Poison` needs it (last SE age 77 of 71); `Status_Confusion` ends at 80 of 100 and the rest are earlier still. The Toxic window `tools/audio/fixtures/aud242e-toxic-player.json` is pinned in `tests/aud249GeneralAnimSounds.test.ts`: six SE 148 rows, 14 apart, pan 63, engine 286..356 vs ROM 296..366 (the +10 first-row residual of psn1 is unchanged).

## sta2: where the second `Status_*` play's +14 comes from (2026-11-16, evidence only, existing fixtures, `src/` / `tests/` untouched)

**Answer: no op of `Status_Confusion` / `ConfusionEffect` explains it.** The script is a straight line (`loadspritegfx`, `call ConfusionEffect`: one `loopsewithpan SE_M_DIZZY_PUNCH, TARGET, 13, 6`, five `create_confusion_duck_sprite … duration=90`, `return`, `end`; `battle_anim_scripts.s:10230 / 10156`);
there is no `waitforvisualfinish` / `delay` / `loop` the table fails to resolve, and the table row (`loopsewithpan` frame 3, wait 13, times 6) already matches the ROM's six rows (14 apart). The ROM's second play is the same script, same length. The +14 sits **between** the two status-animation commands (the message section), not inside a play.

Anchor: the BGM `duck 476` (volume 256) event is `Cmd_end`'s `m4aMPlayVolumeControl(&gMPlayInfo_BGM, TRACKS_ALL, 256)` (`battle_anim.c:520`, the same call that sets `gAnimScriptActive = FALSE`), so each ROM `duck` marks a script end. `end` waits for the last SE: last loop SE at first + 70, `se_m_dizzy_punch.s` is 24 ticks of W plus the poll, so end = first SE + 96 (Confusion).

| window (fixture) | play | ROM first SE | ROM script end (duck) | ROM SE -> end | engine SE (age 10) | engine window end | engine SE -> end |
|---|---|---|---|---|---|---|---|
| aud242c-flatter-player | 1 | 458 | 554 | 96 | 451 | 541 | 90 |
| aud242c-flatter-player | 2 | 752 | (848, past the 822-frame window) | - | 731 | 821 | 90 |
| aud242f-swagger-player | 1 | 429 | 525 | 96 | 421 | 511 | 90 |
| aud242f-swagger-player | 2 | 723 | 819 | 96 | 701 | 791 | 90 |
| aud242g-dreameater-player (Status_Sleep, SE 197) | 1 | 272 | 365 | 93 | 272 | 359 | 87 |
| aud242g-dreameater-player | 2 | 565 | 658 | 93 | 550 | 637 | 87 |

Window end of the engine = command start + `STATUS_ANIMATION_ADDED_ROWS` (100 / 97); engine commands between the plays (`.integration/evidence/sta2/cmds-*.txt`): flatter / swagger `status-animation` 100 rows, `message` 91 (hold 64), two 1-row `sprite-visibility`, `message` 87, then the second `status-animation` at +280 (dreameater: 97, message 87, `status-icon` / `sprite-visibility` x2 / `status` 1 row each, message 90, second SLP at +278).

Decomposition of the second-play lead (ROM minus engine, second play relative to the first = 14 / 14 / 15):

- ROM play 1 SE -> script end is 96 / 96 / 93, the second play's is 96 / 93 (swagger / dreameater, the only second plays with a visible duck): **both plays last the same**, so the script/loop model is not the cause.
- script end -> next play's first SE: ROM 198 / 198 / 200 (554 -> 752, 525 -> 723, 365 -> 565) vs engine 190 / 190 / 191: **+8 / +8 / +9**; the remaining +6 is play 1 itself (ROM SE -> end 96 vs 90 / 93 vs 87), i.e. the engine's age-7 SE anchor (SE at command age 10) sits 6 frames later in the window than the ROM's. If the 100 / 97 windows are right (they are measured gAnimScriptActive rows, sta123), the ROM first SE is at command age 4 (script row 1 + table frame 3, the plain source reading) and the whole +14 is the message section: ROM end -> second command start (second SE - 4) = 194 / 194 / 196 vs engine 180 / 180 / 181 = **+14 / +14 / +15**.
  The two readings differ only in where the 6 frames go; the sum is the same. Not resolvable from sound events alone.

What lies between the plays in the ROM (`BattleScript_MoveEffectConfusion` `chosenstatus2animation; printstring; waitmessage` -> next battler's `HandleAction_UseMove` -> `BattleScript_MoveUsedIsConfused` `printstring; waitmessage; status2animation`, `battle_scripts_1.s:3932 / 3796`; dreameater analog: the sleep message, the status / sprite commands, the next printstring) is controller-handshake work the engine models as message (text + 64 hold) plus 1-row commands. A +14 spread over ~4 handshakes is the likely size of one or two missing per-instruction controller waits, but **which transition is short is not identified**; the fixtures hold no frame between 528 and 752 (flatter) except SEs and ducks.

Proposed fix (not applied, `src/` untouched): (1) a ROM step-mode window of one confusion turn recording `gBattlescriptCurrInstr` and `gBattleControllerExecFlags` per frame from play 1's `end` (duck) to play 2's first SE, and compare against the engine's command boundaries (`.integration/evidence/sta2/cmds-flatter.txt` style); (2) add the missing frames to the identified message-to-action transition (not to `STATUS_ANIMATION_ADDED_ROWS`, which the SE -> end spacing shows is consistent between plays); (3) only then re-derive `STATUS_ANIMATION_SCRIPT_AGE` (7 -> 1 if the window anchor holds) and the +7 / +8 first-play residuals of the tests; update `tests/aud249GeneralAnimSounds.test.ts` WINDOWS (`first` / `second`). Frames in Scene ON would change (the message section), so it needs the usual neutrality census, unlike the sound-only fixes.

Reproduce (no emulator, no test run; scratch scripts are under the ignored `.integration/evidence/sta2/`):
```
python3 - <<'PY'
import json
for n in ['aud242c-flatter-player','aud242f-swagger-player','aud242g-dreameater-player']:
    d=json.load(open(f'tools/audio/fixtures/{n}.json')); print(n,[(e['frame'],e['kind'],e.get('id')) for e in d['events'] if e['kind'] in ('se','duck') and not e.get('noop') and e['frame']>250])
PY
node --experimental-strip-types --no-warnings .integration/evidence/sta2/cmds.ts aud242c-flatter-player 380 780   # engine command boundaries (createInitialState + APP_STAGES + traceAdvances + tick, then print state.factoryRoundBattleOrchestrator.battleResolutionPresentation command changes)
node --experimental-strip-types --no-warnings .integration/evidence/sta2/rows.ts                                  # engine SE rows (same replay as tests/aud249GeneralAnimSounds.test.ts ourEvents)
```

## sta3: the second Status_* play (action transition into a pre-move print, 3 launch rows)

ROM step-mode windows (Scene ON, `gBattlescriptCurrInstr` + controller state per frame; `tools/audio/sta3RomWindow.py`, committed milestones in `tools/audio/fixtures/sta3-rom-windows.json`, labs `tools/battle-lab/aud242f-swagger-player-on.json` / `aud242g-dreameater-sleep-player-on.json`):

| window | MoveEnd row | pre-move print row | waitmessage done | `status(2)animation` exec row | print -> launch |
|---|---|---|---|---|---|
| swagger (confusion) | 621 | 630 (`BattleScript_MoveUsedIsConfused`) | 719 | 720 | 90 |
| dreameater (sleep) | 460 | 469 (`BattleScript_MoveUsedIsAsleep`) | 561 | 562 | 93 |

**Named transition.** The action's `end` -> `HandleAction_TryFinish` -> `ActionFinished` -> `HandleAction_UseMove` -> `attackcanceler` jumping to `BattleScript_MoveUsedIsConfused` / `IsAsleep` (battle_main.c, battle_script_commands.c Cmd_attackcanceler). It is 12 ROM rows between the MoveEnd and the print against 2 engine rows: the trn176 action-transition rule (`actionTransitionPauseFrames`, `E + 1 + d + n + 6 + u`) returned null unless the next print was STRINGID_USEDMOVE, so no pause was inserted for a pre-move print (P = 11 for swagger). The rule is scene-independent (the same script rows in OFF), so the extension (`ACTION_TRANSITION_NEXT_PRINTS`: PKMNISCONFUSED, PKMNFASTASLEEP) applies to both scenes. Two shape terms were measured on the dreameater window: the next action's sleep-counter `set-battler-status-data` write draws nothing and its 1-frame command is presented after the pause (`statusFramesAfter`), and a status-icon anchor before a pre-move print has a second controller row (`iconSecondRow`, +1).

**3 launch rows.** The pre-move `printstring; waitmessage B_WAIT_TIME_LONG; status(2)animation` reaches its animation 3 rows after the engine's message ends: the waitmessage's completing row, the launch instruction's row, the controller row (engine message end = completion - 1). `PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS = 3` is added to that message's hold (`messageTimingFromSourceProvenance`, 64 -> 67), not to the status-animation command, so the sag130 / sa125 / gaf140 `seGateFrames == IsBattleSEPlaying gate` invariants hold. The move-inflicted `chosenstatus2animation` shape is unchanged. Engine OFF replay of this shape is unmeasured (no OFF app stage for these labs); the ROM OFF run (`swagger-off` probe) has the same print / completion / exec rows.

**Result (second-play offset ROM minus ours, SE frames).** flatter 7 / 7 (was 7 / 21), swagger 8 / 8 (was 8 / 22), dreameater first 0 and second 0 (was 0 / +15). psn2's Poison tail (toxic window, first row +10) and the first plays are unchanged. `tests/sta3PreMoveStatusTiming.test.ts` pins the engine intervals against the ROM milestones (print -> launch equal; previous print -> this print = ROM - 1, the message-start convention).

**SE anchor (`STATUS_ANIMATION_SCRIPT_AGE` 7 vs 1).** The ROM's first SE is at script row X + 3 after the launch row, i.e. command age 2, so the source-true constant is about -1. The 7 compensates an upstream engine-early drift of the move body before the status play (8 rows in dreameater, 16 in swagger); changing it to the true value would worsen every first-play residual by those rows. It stays 7; removing the drift is the move-body presentation lane's work.

**Census (seeds 0..99, both scenes, `rst197CensusDelta.py` / `soundCensusDelta.py`).** eventsDigest and error equal on 100 / 100 in both scenes (outcomes, HP, RNG, decisions). Command sequences differ only by inserted draw-nothing pause `move-animation` commands (185 ON, 92 OFF: the transition into a pre-move print now exists); changed commands move by exactly the 3 launch rows (message holdFrames 64 -> 67). Sound: event sequences identical on 100 / 100; 68 / 100 seeds have frames moved in each scene (cumulative shift after the first pre-move print), 32 identical. `tests/aud252LossBallOpen.test.ts` seed 2230 moves 1 row toward the ROM (a pre-move print follows its held-item effect).
