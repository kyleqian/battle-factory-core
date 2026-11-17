# aud243a: sound census column and T1 delta (S11 step 7, first half)

Scope: `docs/s11-audio-design.md` section 4 / step 7. The census now records every sound event of every battle, and `soundCensusDelta.py` classifies the move-animation SEs.
**T1 is self-consistency, NOT ROM parity.** The "expected" rows are the aud242 table (`src/data/gen/anim-sound-timing.json`) the emitter itself reads, walked
independently of the age clock; `exact` means "the emitter fired what the table says at the frame the table says". ROM-vs-engine offsets (#196 / #197 / #198) are invisible to T1 and belong to T2 (aud243b, ROM replay).
Nothing here changes an emitted sound id or frame.

## What changed

1. `src/engine/tickSounds.ts` `emitTickSounds(state, next)`: the post-`tickEngineState` sound block of `tick()` (intro, forced-party send-out, mid-battle switch, hit / effectiveness, `emitMoveAnimSounds`, forfeit end, battle end), moved verbatim, same order.
   It reads only `battleScene` (canonical route: `resolutionOwner.forcedPartySelect`) and `factoryRoundBattleOrchestrator` of the before / after state (`TickSoundState`). `tick()` keeps `beginScreenSoundTick` before and `runScheduledScreenSounds` after it.
   **ENGINE_BUILD moved:** `eb-7b7399877f107136` (parent `0430eb85b`) -> `eb-808efc83d08831db` (the headless graph gained a module).
2. `tools/integration/lsd194Census.ts` adds three fields per seed; no existing field changes (proof below):
   - `sound`: `[[frame, kind, id, pan(, mode)]...]`, `frame` = 1-based census step (= `FactorySession.frame` after that tick), `mode` only for cries. Per step: `collectSoundTick(frame, () => { beginScreenSoundTick(frame); advance; emitTickSounds({battleScene: null, factoryRoundBattleOrchestrator: before}, {.. after}); runScheduledScreenSounds(); })`.
     The census has no `EngineState`, so the before / after shape is the minimal `{ battleScene: null, factoryRoundBattleOrchestrator }` (the census never uses the canonical `battleScene` route). Menu SEs fire inside the advance functions and are collected too.
     The battle starts at the intro: the battle-BGM start (`core.ts` `emitBattleStartBgm`, outside `tick()`'s block) is not in the window.
   - `soundDigest`: sha256[:16] of `sound`.
   - `soundAnim`: one row per move-animation command that presented: `[command index into commands, moveId, turn, attacker, target, first presenting frame, last presenting frame, frame of body age 0 (null: no live body), 1 if HITMARKER_NO_ANIMATIONS, 1 if the Scene ON action-transition pause]`.
   - A tree without `tickSounds.ts` / the sound modules (the script copies this one file into every tree-ish) writes all three as `null`.
   - Scheduler state (`screenSounds.ts` queue / `ducking` / `lowHpPlaying`) is module-level but resets when the frame goes backwards, i.e. at every seed start (frame 1); no explicit reset needed. Checked: seeds 0..4 in one process equal seeds 1 and 4 run alone (full row equal, sound included).
3. `tools/integration/soundCensusExpected.ts`: the table's resolved rows (`moveAnimOpRows` per op, request attacker / target sides) for a list of `(move, turn, attacker, target)`; used by T1.
4. `tools/integration/soundCensusDelta.py`: `BASE FINAL` arm-vs-arm (digest / sequence / frame-delta histograms) and `--t1 ARM [--json out]`.

## Commands

```sh
export LSD194_CENSUS_JOBS=4 LSD194_SPLIT=4
sh tools/integration/lsd194Census.sh <fresh-root> HEAD:on HEAD:off          # 0..999, ~15 min for both scenes; arms <root>/{on,off}-<sha>/r0..r9.jsonl
LSD194_SHARDS=0 LSD194_SHARD_SEEDS=40 sh tools/integration/lsd194Census.sh <root> HEAD:on HEAD:off <parent>:on <parent>:off   # neutrality, seeds 0..39
python3 tools/integration/rst197CensusDelta.py <base-arm> <final-arm>       # commands / events / error unchanged
python3 tools/integration/soundCensusDelta.py BASE FINAL                    # sound column diff (a base without the column reports noSoundColumn)
python3 tools/integration/soundCensusDelta.py --t1 <arm> [--json out.json]  # T1 class table
```

## Neutrality proof (final src tree `6b314e07`, commit `28394735e`, parent `0430eb85b`)

- Seeds 0..39, both scenes, `HEAD` vs `0430eb85b` (the base arm runs the same new `lsd194Census.ts` and writes `sound: null`): after dropping `sound` / `soundDigest` / `soundAnim`, 40 / 40 rows byte-identical (JSON re-serialised) on ON and on OFF.
- Seeds 0..999, both scenes, vs the obr251 baseline arms `on|off-50285b9d9`: `rst197CensusDelta.py` reports 1000 battles, 322634 (ON) / 317269 (OFF) commands, 1000 identical, `bad 0` (digest, error and every command field equal). 3 seeds per scene end with an `error`, identically in the baseline.
- 326594 (ON) / 90141 (OFF) sound events over 1000 seeds.

## First T1 table (seeds 0..999, `soundCensusDelta.py --t1`)

Units: exact / known-offset / missing-other / extra / missing-declined / missing-cry-task are SE or pan **rows**; missing-gated is table **ops** (an op can be a loop of rows) taken from `gated[turn * 2 + side]` of each executed live command.

| class | Scene ON | Scene OFF | meaning |
|---|---|---|---|
| exact | 236527 | 0 | emitted `(frame, kind, id, pan)` == table row at body-age-0 frame + 8 + op frame + row offset |
| known-offset | 0 | 0 | same tuple, other frame (the emitter's own clock slipped against the table); none, so T1 shows no clock slip |
| missing-gated | 14353 | 0 | ops the table cannot resolve (`ends`: `end` 13796, `unresolved-branch` 557) |
| missing-declined | 0 | 0 | a command with a body request but no live body (Tackle / Vine Whip / Seismic Toss class): none occur in these battles (all 27155 requested bodies are live) |
| missing-cry-task | 240 | 0 | not-ported `SoundTask_Play*Cry*` / `WaitForCry` sites reachable from the played move's script (ROAR 208, HYPER VOICE 24, HOWL 8); an upper bound, branches are not evaluated |
| missing-other | 400 | 0 | resolved rows that fell after the command's last presenting frame (SIGNAL BEAM 350, MUD SHOT 50: a `panse` task outlives the body) |
| extra | 0 | 0 | an SE / pan in a command window that is no table row |
| unclassified | 0 | 0 | |

Commands: ON 40091 move-animation commands = 27155 live + 12936 Scene ON action-transition pauses (no body by design); OFF 41729, all HITMARKER_NO_ANIMATIONS, 0 move-animation SEs, **extra 0**.
Controller-family SEs (ids 5, 9, 12-16, 32, 55, 79, 90, 114-116) in a command window are another emitter's and are not counted; no table op uses those ids.
Top gated moves (ops): SLUDGE BOMB 1692, BUBBLE BEAM 966, STRUGGLE 931, BLIZZARD 902, THUNDERBOLT 656, PSYCHIC 612, TRI ATTACK 603, DREAM EATER 594.
The table's `ends` only distinguishes `end` / `unresolved-branch`; the per-op reasons (`bg-fade`, `unmodelled-lifetime`, `waitsound`, ...) are printed by the extractor, not shipped.

Reading it: the emitter is self-consistent with its table on 236527 rows (no clock slip, nothing extra), and the first T1 gap list is 14353 gated ops + 240 cry-task sites + 400 pan-task rows after the body end. The table-vs-ROM question is T2.

## Not covered (T2 / follow-ups)

- ROM-side comparison, the #196 / #197 / #198 offsets, low-HP / WEAK-cry mode (the census row has no HP), battle-BGM start.
- Stale-text caution (fixed): the Scene ON action-transition pause precedes the "used" print, so it is never attributed to a move.
- Not-ported kinds we can only count by static reachability (cry tasks) and not by executed path.

## T1 classifier (t1cls)

The 11,093 `unclassified` rows of every recent T1 run (seeds 0..99 Scene ON) were never an emitter gap: they are SEs / pans the other emitters (`emitStatsChangeSounds`, `emitGeneralAnimSounds`) fire
inside **non-move commands**, which the classifier did not attribute. `lsd194Census.ts` now also writes `soundCmd` (per seed: one row per presenting command of any type: `[command index, type,
battler, first frame, last frame, animation name, animated]`; no existing field changes), and `soundCensusDelta.py --t1` attributes every SE / pan outside a move-animation window to the command
window that contains it (a cure berry's `status` command is the lead of the `HELD_ITEM_EFFECT` command after it). Per command it compares the emitted rows with the table's general / status variant
(`soundCensusExpected.ts --nonmove`, same self-consistency rule as the move table: the walk is the table's, not the emitter's clock) and prints a second, per-family table. Controller ids and the move table are untouched.

| | before (`on-4e31b7675`) | after (`on-bd46a5fbf`, same `src/`) |
|---|---|---|
| exact / missing-gated / extra (move family) | 24,175 / 570 / 0 | **24,175 / 570 / 0** (missing-declined 1, missing-other 51, known-offset 0 unchanged) |
| unclassified | 11,093 | **0** (residual by id / source: none) |

Per family (non-move, emitted rows = exact; `lead` = frames from the command's first presenting frame to the table's script frame 0, a constant per family):
STATUS PSN 640 (lead 7), CONFUSION 1,278 (7), INFATUATION 210 (7), SLP 188 (7), PRZ 129 (7; 13 x2 / 18 x1 with an SE gate), BRN 24 (7), FRZ 20, CURSED 3; weather SUN 5,248 pan + SE (9), HAIL 520 (9), RAIN 81, SANDSTORM 62;
HELD_ITEM_EFFECT 2,030 (15 / 9 / -22 for restart / continuation / cure berry, hie2b / hie3); LEECH_SEED_DRAIN 290 (7); FOCUS_PUNCH_SETUP 10 (5); stats-change 360 (7; 24 / 15 with an SE gate). All 11,093 rows match a table row
of their command (non-move exact 11,093, known-offset 0, extra 0). The 5,207 `pan` rows are the Sun `panse_adjustnone` pan task (128 rows per Sun command), not an unknown emitter.

**Finding (not hidden, not fixed here: `src/` is out of scope):** non-move **missing 128**, all `Status_Poison`: the table's loop (`loopsewithpan` 148, 6 times, wait 13) has its 6th SE at script frame 70 = frame 77 of the
command, but the `status-animation` PSN command presents only 71 rows (`STATUS_ANIMATION_ADDED_ROWS`), so the engine plays 5 of 6 in each of the 128 commands (CONFUSION plays 6 of 6 in its 100-row command). Whether the ROM plays the 6th is a T2 question
(ROM window of a Poison status); same shape as the move-family `missing-other` (51, Signal Beam / Mud Shot pan tasks after the command end). Two LEECH_SEED_DRAIN commands are not `animated` and emit nothing, by design.

Reproduce (a fresh arm is 1 minute at 4 jobs; an arm from before `bd46a5fbf` has no `soundCmd` and the tool says so):
```sh
LSD194_SHARDS=0 LSD194_SPLIT=4 LSD194_CENSUS_JOBS=4 sh tools/integration/lsd194Census.sh <fresh-root> HEAD:on   # seeds 0..99 ON -> <root>/on-<sha>
python3 tools/integration/soundCensusDelta.py --t1 <root>/on-<sha> --json t1.json                              # move table + "non-move families" table
```
Evidence: `.integration/evidence/t1cls/` (arm + `t1-after.json`). No test exists for the tool; the table above is the acceptance reading.

## t1dt: the T1 rules for Double Team's stat SE and the Poison tail (2026-11-17, tooling only, `src/` untouched)

Since aud252 / psn2 the engine plays two rows the aud242 table does not hold, so T1 read `extra` 109 and `unclassified` 128 on seeds 0..99 Scene ON with nothing wrong in the engine. `soundCensusExpected.ts` now carries both rules, `soundCensusDelta.py --t1` scores them (rows carry a flag in element 5):
- **Double Team stat SE** (aud252): move 104 gets one optional row, SE 239, script row `DOUBLE_TEAM_STAT_SE_SCRIPT_ROW` (165), pan `animSoundPan2(-64, attacker / target sides)`. Optional = the engine plays it only when the segment presents the evasion rise (`emitDoubleTeamStatsChangeSound`), so a matched row is `exact` and an absent one is not `missing-other`. The constants `MOVE_DOUBLE_TEAM` / `DOUBLE_TEAM_STAT_SE_SCRIPT_ROW` / `SE_M_STAT_INCREASE` are module-private in `src/engine/battleHitSounds.ts` and `src/` is out of scope, so the tool reads them from that file's source text (a rename throws), not a copy.
- **Status tail** (psn2): a `status-animation` table row with `script row + STATUS_ANIMATION_SCRIPT_AGE >= STATUS_ANIMATION_ADDED_ROWS[animation]` (both imported) is flagged tail. The classifier claims the SE it finds past the command window (the message / HP window) at the command's own frame offset (the votes of its in-window rows) + the row's script row, before counting the residual, so the 6th SE 148 matches instead of being `missing` + `unclassified`.

T1 seeds 0..99 Scene ON, base `4e4c51880` (arm `on-4e4c51880`, same arm before and after):

| | before | after |
|---|---|---|
| exact (move table) | 25,948 | **26,057** (+109 = the Double Team rows) |
| missing-gated / missing-declined / missing-other / known-offset / missing-cry-task | 41 / 1 / 51 / 0 / 0 | **41 / 1 / 51 / 0 / 0** |
| extra | 109 | **0** |
| unclassified | 128 | **0** |
| non-move exact / missing | 11,093 / 128 | **11,221 / 0** (+128 = the PSN tail rows; PSN 768 of 768) |

No Double Team stat SE was absent (0 optional rows absent), so the optional flag is not hiding a gap on these seeds. Nothing else moved; the engine and the census arm are unchanged.
