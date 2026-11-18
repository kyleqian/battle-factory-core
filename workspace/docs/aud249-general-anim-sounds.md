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

ROM step-mode windows (Scene ON, `gBattlescriptCurrInstr` + controller state per frame; `tools/audio/sta3RomWindow.py`, committed milestones in `tests/fixtures/sta3-rom-windows.json`, labs `tools/battle-lab/aud242f-swagger-player-on.json` / `aud242g-dreameater-sleep-player-on.json`):

| window | MoveEnd row | pre-move print row | waitmessage done | `status(2)animation` exec row | print -> launch |
|---|---|---|---|---|---|
| swagger (confusion) | 621 | 630 (`BattleScript_MoveUsedIsConfused`) | 719 | 720 | 90 |
| dreameater (sleep) | 460 | 469 (`BattleScript_MoveUsedIsAsleep`) | 561 | 562 | 93 |

**Named transition.** The action's `end` -> `HandleAction_TryFinish` -> `ActionFinished` -> `HandleAction_UseMove` -> `attackcanceler` jumping to `BattleScript_MoveUsedIsConfused` / `IsAsleep` (battle_main.c, battle_script_commands.c Cmd_attackcanceler). It is 12 ROM rows between the MoveEnd and the print against 2 engine rows: the trn176 action-transition rule (`actionTransitionPauseFrames`, `E + 1 + d + n + 6 + u`) returned null unless the next print was STRINGID_USEDMOVE, so no pause was inserted for a pre-move print (P = 11 for swagger). The rule is scene-independent (the same script rows in OFF), so the extension (`ACTION_TRANSITION_NEXT_PRINTS`: PKMNISCONFUSED, PKMNFASTASLEEP) applies to both scenes. Two shape terms were measured on the dreameater window: the next action's sleep-counter `set-battler-status-data` write draws nothing and its 1-frame command is presented after the pause (`statusFramesAfter`), and a status-icon anchor before a pre-move print has a second controller row (`iconSecondRow`, +1).

**3 launch rows.** The pre-move `printstring; waitmessage B_WAIT_TIME_LONG; status(2)animation` reaches its animation 3 rows after the engine's message ends: the waitmessage's completing row, the launch instruction's row, the controller row (engine message end = completion - 1). `PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS = 3` is added to that message's hold (`messageTimingFromSourceProvenance`, 64 -> 67), not to the status-animation command, so the sag130 / sa125 / gaf140 `seGateFrames == IsBattleSEPlaying gate` invariants hold. The move-inflicted `chosenstatus2animation` shape is unchanged. Engine OFF replay of this shape is unmeasured (no OFF app stage for these labs); the ROM OFF run (`swagger-off` probe) has the same print / completion / exec rows.

**Result (second-play offset ROM minus ours, SE frames).** flatter 7 / 7 (was 7 / 21), swagger 8 / 8 (was 8 / 22), dreameater first 0 and second 0 (was 0 / +15). psn2's Poison tail (toxic window, first row +10) and the first plays are unchanged. `tests/sta3PreMoveStatusTiming.test.ts` pins the engine intervals against the ROM milestones (print -> launch equal; previous print -> this print = ROM - 1, the message-start convention).

**SE anchor (`STATUS_ANIMATION_SCRIPT_AGE` 7 vs 1).** The ROM's first SE is at script row X + 3 after the launch row, i.e. command age 2, so the source-true constant is about -1. The 7 compensates an upstream engine-early drift of the move body before the status play (8 rows in dreameater, 16 in swagger); changing it to the true value would worsen every first-play residual by those rows. It stays 7; removing the drift is the move-body presentation lane's work.

**Census (seeds 0..99, both scenes, `rst197CensusDelta.py` / `soundCensusDelta.py`).** eventsDigest and error equal on 100 / 100 in both scenes (outcomes, HP, RNG, decisions). Command sequences differ only by inserted draw-nothing pause `move-animation` commands (185 ON, 92 OFF: the transition into a pre-move print now exists); changed commands move by exactly the 3 launch rows (message holdFrames 64 -> 67). Sound: event sequences identical on 100 / 100; 68 / 100 seeds have frames moved in each scene (cumulative shift after the first pre-move print), 32 identical. `tests/aud252LossBallOpen.test.ts` seed 2230 moves 1 row toward the ROM (a pre-move print follows its held-item effect).

## sta4: what the first Status_* play's +7 / +8 is made of (2026-11-18, measurement only, `src/` / `tests/` untouched)

Scene ON ROM per-frame RAM (`tools/integration/hpd2Probe.py`, `gBattlescriptCurrInstr` / `gBattleControllerExecFlags` / `gAnimScriptActive`, the sta3 labs) against the app's per-command rows (`tools/integration/hpd4Cmds.ts` on a trace with the lab's `appStage`), same method as hpd7 (`docs/hpd1-hp-hold.md`): `R` = the used print's release (last controller-exec fall before the body), `L` = script instructions between `R` and the `attackanimation` execution (`ex = A - 3`), `A` = `gAnimScriptActive` rise, `len` = active rows, launch = the status animation's `A`. Probe frames and app frames are the same domain (frame 0 = after `BattleLab.prepare`; the SE fixtures use it too).
Evidence (ignored): `.integration/evidence/sta4/` (`ram/` ROM timelines, `app/` command rows, `traces/`, `an.py` the per-frame script-row listing, `hpd4`'s `an.py` copied as `hpdan.py`).

**Naming correction.** The `aud242g-dreameater-sleep-player-on` window is three turns: turn 1 is **Spore** (id 147, `BattleScript_EffectSleep`, then `Status_Sleep`), turn 2 the foe's pre-move "is fast asleep" (the sta3 second play), turn 3 **Dream Eater** (id 138). So the "dreameater first play 0" of sta3 is Spore's body; Dream Eater's own body has no status play and falls past the 822-frame sound window. All four bodies are measured (Toxic, the psn1 / psn2 window, is added as an independent check: it is a move-inflicted status as well).

### ROM rows (probe frames)

| body | script entered | used print exec (`attackstring`) | R | `ppreduce` .. `attackanimation` exec | A | len | window end | next exec (`H`) | R -> H | status launch (A) | first SE |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Flatter (260), turn 1 | 27 | 31 (4 script rows: canceler, `jumpifstatus2`, `accuracycheck`, `attackstring`) | 52 | 53 `ppreduce`, 54 `jumpifconfusedandstatmaxed`, 55 `attackanimation` (**L = 2**) | 57 | 218 | 275 | 282 (`playanimation` Atk/SpA up, 7 rows after the window: `waitanimation`, `setstatchanger`, `statbuffchange`, `jumpifbyte`, `setgraphicalstatchangevalues`) | 230 | 455 (stat anim 282 + 75 -> print 359 -> release 386 -> `waitmessage` done 450 -> 4 script rows -> `chosenstatus2animation` 455) | 458 |
| Swagger (207), turn 1 | 27 | 31 | 52 | same 3 rows (**L = 2**) | 57 | 168 | 225 | 232 | 180 | 426 (stat anim 232 + 89 -> print 323 -> release 357 -> done 421 -> 426) | 429 |
| Spore (147), turn 1 | 27 | 29 (2 script rows) | 48 | 49 .. 55 seven rows (**L = 7**) | 58 | 206 | 264 | 269 (the status launch itself: 5 rows after the window) | 221 | 269 | 272 |
| Toxic (92), turn 1 | 27 | - | 48 | **L = 10** | 61 | 230 | 291 | 296 (status launch) | 248 | 296 | 296 |
| Dream Eater (138), turn 3 | 729 | 734 (5 script rows: canceler, `jumpifstatus2`, `jumpifstatus`, `accuracycheck`, `attackstring`) | 759 | 760 .. 764 `ppreduce`, `critcalc`, `damagecalc`, `typecalc`, `adjustnormaldamage`, 765 `attackanimation` (**L = 5**) | 767 | 265 | 1032 | 1036 (`hitanimation`) | 277 | - (no status play) | - |

First SE = launch + 3 for the Confusion (flatter, swagger, both plays), Sleep (Spore, both plays) windows and + 0 for Toxic's `Status_Poison` (first SE row at table frame 0), i.e. **the ROM's SE is the launch row plus the table row's own frame, nothing else** (second plays: 752 = 749 + 3, 723 = 720 + 3, 565 = 562 + 3).

### App rows (app command starts) against the ROM

| body | app: used message / move-animation `S` / `pre+idle+live+post` | next commands | ROM - app: print / R vs `S` | ROM - app at the next command (stats-change start, or the status-animation start) | status-animation start (app) vs ROM launch | ROM - app (SE, age 7) |
|---|---|---|---|---|---|---|
| Flatter | 30 / 50 / `3+0+219+0` (222 = len + 1 + 3) | `stat` 272 (2 rows), `stats-change` 274, message 351, `status-animation` 441 (100 rows) | +1 / +2 | **+8** (274 vs 282) | 441 vs 455 = **+14** | +7 |
| Swagger | 30 / 50 / `3+7+161+0` (171; idle + live = len, **not** len + 1) | `stat` 221, `stats-change` 223, message 314, `status-animation` 411 | +1 / +2 | **+9** (223 vs 232) | 411 vs 426 = **+15** | +8 |
| Spore | 30 / 48 / `3+0+207+2` (212 = len + 1 + 5) | `status` 260 (2 rows), `status-animation` 262 | -1 / 0 | **+7** (262 vs 269) | 262 vs 269 = **+7** | 0 |
| Toxic | 30 / 48 / `3+7+219+0` (idle + live = len - 4) | `status` 277, `status-animation` 279 | - / 0 | **+17** (279 vs 296) | **+17** | +10 (psn2) |
| Dream Eater | 732 / 756 / `3+0+266+0` (269 = len + 1 + 3) | `hit-animation` 1025 | +2 / +3 | +11 (1025 vs 1036) | - | - |

The app's stats-change / message sections are ROM-exact internally (stat animation 77 = 77 flatter, 91 = 91 swagger; message start to next command 8 / 9 equal to the stats-change offset), so the offsets above are carried unchanged from the body to the message. **The first-play residual is `launch offset - 7` in all four windows** (flatter 14 - 7, swagger 15 - 7, Spore 7 - 7, Toxic 17 - 7): the 7 of `STATUS_ANIMATION_SCRIPT_AGE` is exactly a Spore-sized hole in the body, nothing more.

### The decomposition of the launch offset

| window | pre-print rows (`S` - `R` offset) | body: script lead L + tail T (relative, net of the 2-row `stat` / `status` command) | message -> launch (`chosenstatus2animation` path) | sum = launch offset |
|---|---|---|---|---|
| Flatter | 2 | 6 = 2 + 4 | 6 | **14** |
| Swagger | 2 | 7 = 2 + 5 | 6 | **15** |
| Spore | 0 | 7 = 7 + 0 | none (the status follows the body) | **7** |
| Toxic | 0 | 17 = 10 + 7 (5 of the 7 = the live window shortfall: idle 7 + live 219 = len - 4, a shape-B body) | none | **17** |

- **Pre-print rows.** The app anchors the used print at one frame (message 30 for every turn-1 lab) and `S` = `R` only for a script with 2 rows before `attackstring` (Spore, Toxic). The ROM print starts at script entry + (rows through `attackstring`): flatter / swagger 4 (`accuracycheck`, `jumpifstatus2` extra), Dream Eater 5 (`jumpifstatus2`, `jumpifstatus`, `accuracycheck` extra); `S - R` = -2 / -2 / -3, equal to (rows - 2) in all three. The same family as the hpd script lead, but **before** the print. (The print's own length is 1 row short in every lab, the message-start convention of sta3, and is the same in Spore: those 0 / -1 offsets are not part of this.)
- **Body.** L is the instruction count between the used print and `attackanimation` (Flatter / Swagger `ppreduce` + `jumpifconfusedandstatmaxed`), T puts the next command (`stats-change` / `status-animation`) on the ROM row. This is the plain hpd7 row (table in `docs/hpd1-hp-hold.md`).
- **Message -> launch.** ROM `printfromtable` exec to `chosenstatus2animation` is 96 (flatter) / 103 (swagger), the app's message-to-status is 90 / 97: **+6**. After `waitmessage`'s completion row (450 / 421) the script runs `jumpifability`, `jumpifsideaffecting`, `setmoveeffect`, `seteffectprimary` (4 rows) before the launch row; the sta3 pre-move path (`printstring; waitmessage; status2animation`) has none, which is why its 3 launch rows (`PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS`) do not cover this shape. The move-inflicted `chosenstatus2animation` after a *stat* print is exactly the shape sta3 left unchanged.
- Launch-to-launch spans (flatter 455 -> 749 = 441 -> 735 = 294, swagger 426 -> 720 = 411 -> 705 = 294) are equal, so a landing moves the second play with the first: the second-play residuals follow the first (Spore's 0 / 0, flatter's 7 / 7).
- Small separate row: ROM status launch -> the next print is 101 (confusion, both) / 98 (sleep) / 72 (poison) against `STATUS_ANIMATION_ADDED_ROWS` 100 / 97 / 71, one row each in the four windows; it is compensated downstream (the launch-to-launch spans above are equal), so it does not move any SE. Not proposed.

### What `STATUS_ANIMATION_SCRIPT_AGE` becomes

The engine's first SE is `status-animation start + AGE + table row frame` and the ROM's is `launch + table row frame` (above), so with the command start on the ROM launch row the constant is **0** (the sta3 "about -1 / 2" source reading did not count the status launch as the `gAnimScriptActive` rise row; the measured anchor is the rise row itself).

| step (cumulative, SE residual ROM - app at age 0) | Flatter | Swagger | Spore (play 1 / 2) | Toxic |
|---|---|---|---|---|
| now (age 7) | 7 | 8 | 0 / 0 | 10 |
| 1. bodies get lead + tail (Flatter +6, Swagger +7, Spore +7, Toxic +17 rows before the status), **age 7 -> 0** | 8 | 8 | 0 / 0 | **0** |
| 2. + 6 message -> launch rows (move-inflicted `chosenstatus2animation`) | 2 | 2 | - | - |
| 3. + the 2 pre-print rows (flatter / swagger: `accuracycheck`, `jumpifstatus2`) | **0** | **0** | - | - |

Step 1 alone moves no window away from the ROM (flatter 7 -> 8, everything else equal or closer) and takes Spore and Toxic to exact; steps 2 and 3 take flatter / swagger to exact. The second plays follow (flatter / swagger second == first, Spore second 0).

### Proposed change (not landed)

1. Add the four bodies to the audited-lead set (`BODY_LEAD_AUDITED_MOVE_IDS` / `HPD4_BODY_TAIL_ROWS` style, `battleResolutionPresentation.ts` / `battleResolutionPresentationRender.ts`): Flatter lead 2 + tail 4, Swagger 2 + 5, Spore 7 + 0, Toxic 10 + 7 (Toxic and Swagger want their live windows checked first: Toxic idle + live = len - 4, Swagger idle + live = len, the shape-A bodies have len + 1). Dream Eater (138) is a plain shape-A row: 5 + 3 (pre 3 + post 0, `live` 266 = len + 1), not part of the status offset, hit 11 rows after the ROM's in the lab (8 body + 3 pre-print).
2. In the same landing `STATUS_ANIMATION_SCRIPT_AGE` 7 -> 0 (`moveAnimSounds.ts:429`; the `age === STATUS_ANIMATION_SCRIPT_AGE` tail scheduling at line 498 and `scheduleStatusAnimationTail` re-based accordingly), and the Toxic window pin in `tests/aud249GeneralAnimSounds.test.ts` (`[286, 300, ...]` -> ROM `[296, 310, ...]`) and the `WINDOWS` residuals (flatter 7 / 7 -> 8 / 8, swagger 8 / 8 -> 8 / 8) move with it. Every other `Status_*` pin with its own measured residual (end-of-turn burn / poison ticks, paralysis, infatuation) needs its window re-measured: **only the Confusion (both plays), Sleep (both plays) and move-inflicted Poison launches are measured here; a status play with no body in front of it (a tick) would move 7 frames earlier at age 0 without a measurement.**
3. Then +6 hold rows on the stat-print -> `chosenstatus2animation` message (the sta3 `PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS` analog, kept off the status command so the `seGateFrames` invariants hold), then the pre-print rows (script rows before `attackstring` beyond 2; `accuracycheck`, `jumpifstatus2`, `jumpifstatus`), the print-side family of the lead; those two are Scene ON frame changes, so the usual neutrality census applies, as for sta3.

Reproduce (no `npm test`; scratch scripts in the ignored `.integration/evidence/sta4/`):
```
ln -s /srv/pokebench/vendor/pokeemerald reference/pokeemerald   # worktree only
export PYTHONPATH=/srv/pokebench/vendor/libmgba-py
for p in "flatter aud242b-flatter-player-on 900" "swagger aud242f-swagger-player-on 900" "dream2 aud242g-dreameater-sleep-player-on 1250" "toxic aud242e-toxic-player-on 500"; do set -- $p
  python3 tools/run-mgba-probe.py E/ram/$1.json -- /srv/pokebench/vendor/mgba-venv/bin/python tools/integration/hpd2Probe.py tools/battle-lab/$2.json on E/ram/$1.json $3; done
# trace per lab: {appRoute: generated-orchestrator, oracleProfile: battle-scene-on, appStage: {id: <lab>, frame: 0}, segments: <the lab's trace.segments>}
node --experimental-strip-types --no-warnings tools/integration/hpd4Cmds.ts E/traces/<lab>.json 1250     # app rows
python3 E/hpdan.py ...   # hpd7b's an.py: R / ex / A / len / H per gAnimScriptActive window
```
