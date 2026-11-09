# aud243d: ROM-side semantic input driver for the census replay (S11 step 7, T2)

Result: **the closed-loop driver works.** It drives the ROM by menu state with the engine's *decision list* (move slot / forced-switch party index),
reaches the battle end, and freezes the executed inputs as an ordinary open-loop trace. Seeds 224 ON/OFF, 552 ON, 177 ON and ten more scene runs match
every engine state (HP of both sides, `gRngValue`, `gLastMoves`) in order through every turn and the forced switch to battle end. Three seeds diverge,
all classified **ENGINE GAMEPLAY LEAD** (not driver bugs); none fixed here (no `src/` change, per the brief).

Evidence (ignored dir): `.integration/evidence/aud243d/chain/<seed>-<scene>.{req,setup-probe,setup,engine,drive,frozen,tl,cmp}.json`.

## 1. Pieces

| file | what |
|---|---|
| `tools/integration/soundCensusRomReplay.ts` | `replay` output gains `decisions` = `[{kind: move\|switch, slot \| partyIndex, menuOpenFrame, commitFrame}]` (frame0-relative); `--events=1` adds `turnEvents` (per-turn kernel events + pre-turn battler state) for diagnosis |
| `tools/audio/romDecisionDriver.py` | `RomDriver` (no emulator needed): state classifier + per-frame button chooser + watchdog + anchors; `resolve_funcs` (ELF/map) |
| `tools/audio/soundEventProbe.py` | `lab --drive DECISIONS.json [--drive-out FROZEN.json]`: `drive_lab` runs the closed loop at full speed with no hooks |
| `tools/audio/romDriveSeed.sh` | the whole chain for one seed/scene, one JSON summary line |
| `tools/test_rom_decision_driver.py` | emulator-free tests (driver states, helpers, `drive_lab` on a fake oracle) |

State detection reads `gBattlerControllerFuncs[0]` (Thumb bit stripped) and compares it with ELF addresses (`nm` on `reference/pokeemerald/pokeemerald.elf`):
`HandleInputChooseAction` (cursor must reach FIGHT = 0, then A), `HandleInputChooseMove` (2x2 cursor `gMoveSelectionCursor` to the slot, then A),
`WaitForMonSelection` + live task `Task_HandleChooseMonInput` (task funcs also carry the Thumb bit) with `gPartyMenu.slotId` (+9) closed loop
(DOWN/UP to the party index, then A). `HandleInputChooseAction` exists twice in the ELF (player controller, Pokedude); the player's copy is the one inside
`src/battle_controller_player.o`'s `.text` range of the linker map. Every other state (messages, party sub-menu, forced-switch prompts) gets an A pulse
(A for one frame, then released, 17-frame period). A menu with no matching decision raises `DriverError` (unplanned menu: the ROM asked for something the engine did not
decide, which is itself a divergence report). Stops: `gBattleOutcome != 0`, `--frames N`, `DRIVE_FRAME_CAP` 80000, or the no-progress watchdog
(600 frames with an unchanged signature, then a state dump). Executed frames are RLE'd to `trace.segments`; frozen `romStateTimeline` == drive timeline on every run.

## 2. Recipe (from the workspace root)

```
tools/audio/romDriveSeed.sh SEED on|off .integration/evidence/aud243d/chain
```

One-liner per seed (all the same chain): `224 on`, `224 off`, `552 on`, `177 on`, `1..5 on|off`, `6 on`, `7 on`, `8 on`. It runs `request` -> ROM setup probe -> engine `replay` -> `lab --drive`
-> `romStateTimeline.py` on the frozen trace -> `compare`. `matched` counts engine states found in order in the ROM timeline; `engineStates` excludes the initial state.

## 3. Results

Outcome: 1 = won, 2 = lost. Frames = ROM frames driven. "Matched" = engine states matched in order / engine states.

| seed | scene | decisions consumed | frames | outcome | matched | first divergence |
|---|---|---|---|---|---|---|
| 224 | ON | all | - | lost | 9/9 | none |
| 224 | OFF | 9/9 | 5487 | lost | 9/9 | none |
| 552 | ON | 7/7 | 4417 | lost | 7/7 | none |
| 177 | ON | 8/8 | 5175 | lost | 8/8 | none (through turn 2 and beyond) |
| 1 | ON / OFF | 8/8 | 10301 / 7513 | won | 13/13 | none |
| 3 | ON / OFF | 17/17 | 14285 / 9491 | lost | 17/17 | none |
| 4 | ON / OFF | 12/12 | 8318 / 5972 | lost | 12/12 | none |
| 5 | ON / OFF | 20/20 | 12348 / 8778 | lost | 20/20 | none |
| 7 | ON | 18/18 | 17808 | won | 18/18 | none |
| 6 | ON | 16/16 | 11876 | lost | 14/16 | engine frame 9590 (ROM ~10289): ROM hit 108 vs engine 72 (Blaze x1.5 missing); ENGINE LEAD A |
| 8 | ON | 9/9 | 6750 | won | 6/9 | engine frame 4176 (ROM ~4509): ENGINE LEAD A |
| 2 | ON | 13/31 | 12717 | none (driver stopped: "action menu without a move decision") | 0/31 | engine frame 9 (ROM ~346), turn 1: ENGINE LEAD B |

(224 ON had no row in the batch chain directory; its 9/9 match is `cmp224-on.json`, driven from the same decisions.)

## 4. Divergences (ENGINE GAMEPLAY LEADS; no `src/` change made)

**A. Pinch abilities are not applied (seeds 6 and 8, ON).** ROM `gBattleMovePower` 210 and damage 108 vs the engine's 72 for the same move: the attacker's
Blaze-type pinch ability (power x1.5 when hp <= maxHP/3, `pokemon.c:3219-3226`) is not honored by the engine. The engine maps ability ids to names through
`ABILITY_NAME_BY_ID` (`src/engine/battleScriptHitChainOpcode.ts:155`, only ids 8, 14, 55, 62) and uses it for accuracy (~1239) and damage calc (~1558/1572);
`src/engine/damageCalc.ts:214-225,397-405` (`PINCH_BOOST_OWNER_BY_TYPE`) compares `attacker.ability` to a string name, so any unmapped ability id silently gets no boost.
Check: adding ids 37/47/57/58/63/65/66/67/68/74 to the map in an ignored scratch copy made seed 8 match 9/9 and seed 6 match 16/16 (scratch copy deleted; tree untouched).

**B. AI CHECK_BAD_MOVE Baton Pass always scores -10 (seed 2, ON).** ROM `AI_CBM_BatonPass` (`data/battle_ai_scripts.s:485-488`) is
`count_usable_party_mons AI_USER; if_equal 0, Score_Minus10`, with the count from `Cmd_count_usable_party_mons` (`battle_ai_script_commands.c:1292-1334`: alive, non-empty, non-egg party
slots other than the active one). The engine's `runCbmBatonPass` (`src/engine/factoryAiCheckBadMove.ts:3098-3101`, call at :2322) uses `input.attacker.usablePartyMons ?? 0`,
and nothing in `src` populates `usablePartyMons` on the live AI view (`src/engine/factoryAiDecisionPolicy.ts:610-616` documents "the live driver does not yet model either side's party";
`factoryAiLiveDriver.ts:562` passes the view unchanged). So with three healthy bench mons the engine scores Baton Pass 90 (ROM: all four moves 100), its best-score tie pool is 3 moves
instead of 4, and with the same RNG it picks slot 2 (Double Team) where the ROM picks slot 1 (Faint Attack). The same default also affects `AI_CBM_Explosion` (:2300) and Memento (:2563).
Proposed fix: have the live AI view compute `usablePartyMons` per side (count of party slots != active with hp > 0 and species not none/egg).

## 5. Sound segment diff (scout §3; first report, not classified)

`tools/audio/soundSegmentDiff.py ENGINE.json DRIVE.json ROM_EVENTS.json --kinds se,cry --ignore-ids 5 [--out F]` splits both sides at the decision anchors
(menu k = `[menuOpen_k, commit_k)`, resolution k = `[commit_k, menuOpen_k+1)`) and compares each segment as an ordered `(kind, id, pan)` list. ROM events come from `lab` on the frozen
trace (`--profile on|off`, hooks on, ~3-4 min per seed). Menu SE_SELECT (id 5) is input-driven (the engine emits none for navigation, the ROM one per press and one at each commit), so it is
excluded and the menu segments then match on all three runs. Kinds are limited to `se`/`cry`; pan/duck/stop rows are not compared.

| run | decisions | first differing segment | first difference (engine vs ROM) | resolution segments same / total |
|---|---|---|---|---|
| 552 ON | 7 | res3 | engine ends after 3 rows; ROM adds SE_M_TAKE_DOWN (152, pan 63) at index 3 | 4/7 (res3, res4, res6 differ) |
| 224 OFF | 9 | res0 | engine has no SE_M_STAT_DECREASE (245, pan -64) at index 1 | 5/9 (res0, res4, res6, res8 differ) |
| 224 ON | 9 | res0 | engine SE_NOT_EFFECTIVE (12) where the ROM plays SE_M_TOXIC (148) at index 13 (ROM 36 rows vs engine 16) | 2/9 (res0-res4, res6, res8 differ) |

Pattern: with animations ON the ROM plays whole move-animation SE streams (Toxic, Explosion, Mega Kick2, Take Down) that the engine's census does not emit, and both profiles show stat-stage SEs
(SE_M_STAT_INCREASE/DECREASE 239/245) on the ROM that the engine lacks; the last resolution segment of 224 ON/OFF has an extra engine SE id 15 row the ROM does not play.
These are sound-parity leads for the next audio step (move-animation SE census, stat-change SE), not driver issues: the HP/RNG state matches on the same runs (§3).
Evidence: `.integration/evidence/aud243d/segdiff{552,224off,224on}.json` and `snd{552,224off,224on}.json` (ROM events).

## 6. Limits

- Seed 2 aborts at the first mismatching AI decision because the ROM then asks for decisions the engine never made; the driver reports this (stop reason `action menu without a move decision`), it does not invent input.
- The watchdog signature includes live task function tuples, so a looping task cycle (e.g. a message loop that keeps changing tasks) is only stopped by the 80000-frame cap.
- The message-wait A pulse has a 17-frame period (16 phases + release frame), not the engine's 16; harmless, since the frozen trace is what is replayed.
- Only singles census (Factory level 50) menu states are covered; items, Run and multi-battle menus raise `DriverError`.
- The trace is frozen from one closed-loop run: sound-diff and hook runs reuse it open-loop and are deterministic, but a changed ROM/profile needs a fresh drive.
