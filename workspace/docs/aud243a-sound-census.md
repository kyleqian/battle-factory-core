# aud243a: sound census column and T1 delta (S11 step 7, first half)

Scope: `docs/s11-audio-design.md` section 4 / step 7. The census now records every sound event of every battle, and `soundCensusDelta.py` classifies the move-animation SEs.
**T1 is self-consistency, NOT ROM parity.** The "expected" rows are the aud242 table (`src/data/gen/anim-sound-timing.json`) the emitter itself reads, walked
independently of the age clock; `exact` means "the emitter fired what the table says at the frame the table says". ROM-vs-engine offsets (#196 / #197 / #198) are invisible to T1 and belong to T2 (aud243b, ROM replay).
Nothing here changes an emitted sound id or frame.

## What changed

1. `src/engine/tickSounds.ts` `emitTickSounds(state, next)`: the post-`tickEngineState` sound block of `tick()` (intro, forced-party send-out, mid-battle switch, hit / effectiveness, `emitMoveAnimSounds`, forfeit end, battle end), moved verbatim, same order.
   It reads only `battleScene` (canonical route: `resolutionOwner.forcedPartySelect`) and `factoryRoundBattleOrchestrator` of the before / after state (`TickSoundState`). `tick()` keeps `beginScreenSoundTick` before and `runScheduledScreenSounds` after it.
   **ENGINE_BUILD moved:** `eb-7b7399877f107136` (parent `0b793e387`) -> `eb-808efc83d08831db` (the headless graph gained a module).
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

## Neutrality proof (final src tree `6b314e07`, commit `858ea0343`, parent `0b793e387`)

- Seeds 0..39, both scenes, `HEAD` vs `0b793e387` (the base arm runs the same new `lsd194Census.ts` and writes `sound: null`): after dropping `sound` / `soundDigest` / `soundAnim`, 40 / 40 rows byte-identical (JSON re-serialised) on ON and on OFF.
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
