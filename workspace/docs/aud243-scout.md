<!-- Read-only worker report (aud243 scout, 2026-11-08, Sonnet 5.5, ~4 min). Saved verbatim by the supervisor; UNVERIFIED: line numbers, the per-event cost estimate and the T2 RNG-alignment plan are the scout's; check before relying on them. -->

# aud243-scout report (read-only: no edits, no commits, worktree clean)

I ran one census seed (seed 3, Scene ON) to measure the baseline. No tests, soaks or full censuses ran.

## 0. Two findings that change the shape of the step

- **The census never calls `tick()`.** `lsd194Census.ts:70-75` drives `advanceFactoryRound*` on a bare orchestrator.
  - Several sound emitters live only in the post-`tickEngineState` block of `tick()`, `src/engine/core.ts:1037-1092`. These are intro, mid-battle switch, hit/effectiveness, `emitMoveAnimSounds`, forfeit end and battle end. They all diff the orchestrator before/after.
  - The input-side menu SEs (`playSelectSe` in `battleCommandPresentation.ts:686,694,738` and `battlePartySelect.ts:649+`) fire inside the advance functions, so they would be collected automatically.
  - A census with `collectSoundTick` around each `step()` would therefore get menu SEs but none of the diff-based sounds.
  - Recommended fix: extract that block into one exported function, for example `emitOrchestratorTickSounds(before, after)`. `tick()` and the census both call it, so there is no drift. This is a behaviour-neutral change to `core.ts`, and `ENGINE_BUILD` may move.
  - The census would also call `beginScreenSoundTick(frame)` first and `runScheduledScreenSounds()` last.
  - `beginScreenSoundTick` resets module state when the frame goes backwards (`screenSounds.ts:90-96`). Seed boundaries therefore reset it, but a worker should confirm this.
- **Three files named in the design have moved or gone.**
  - `src/data/gen/audio-sound-sources.json` no longer exists. It is now `tests/fixtures/data/audio-sound-sources.json` (aud238, moved by cleanup).
  - `tools/integration/lsd194CensusDelta.py` was deleted in cln237 (`4f6fa87e4`). The live delta model is `rst197CensusDelta.py:1-31`. It loads `r[0-9].jsonl` from two arm dirs keyed by seed and compares `eventsDigest` plus the commands.
  - `src/data/gen/anim-sound-timing.json` does exist, and it is the real engine-side table.

## 1. T1 / T2 concretely, and the census column

**T1** is not an independent ROM check. It compares emitted sound events against an expected list built from the census row's executed commands plus rule tables, with no ROM run.
- Only the move-animation part has a usable table: `anim-sound-timing.json`, via `moves[].variants` and `moves[].gated[turn*2+side]`. Using it as the expected list is circular for the resolved ops. What it does give is the unresolved ops per command, which is the known-missing count for T1.
- `moves[].ends` carries the end reason. The extractor reasons are `bg-fade`, `unmodelled-lifetime`, `waitsound`, `unresolved-branch` and `after-unresolved-branch`. They are at `tools/extract/extract-anim-sound-timing.ts:89`.
- The census row cannot support some expected lists. It has no HP values, so low-HP SE and WEAK/NORMAL cry mode are not derivable. It starts at the battle intro, so battle-BGM start (`core.ts:1580,2574`) is outside the window.
- Real parity evidence is T2 only. T1 mostly proves self-consistency and counts gated ops.

**T2** is a full ROM replay of K sampled seeds in each scene, compared as `(frame, kind, id, pan[, mode])`.

**Where the field goes:** in the per-step closure of the `for (seed…)` loop, `lsd194Census.ts:70-118`.
- Wrap the `if/else if` advance at lines 72-74 in `collectSoundTick(frame, …)`.
- Push `…events` into a per-seed `sound` array of `[frame, kind, id, pan, mode?]`.
- Hash it with sha256 and slice to 16 characters in a new hash beside `events`.
- Add the two keys, `sound` and `soundDigest`, to the output object at line 160.
- This changes no existing field. `commands`, `eventsDigest` and `error` are untouched, and `rst197CensusDelta.py` reads only the fields it names.
- Load the emitter modules with the same dynamic `import(...).catch(() => null)` pattern as `playback` at line 42. `lsd194Census.sh:19` copies this one `.ts` into every tree-ish, so base trees without the modules must write null.

**Cost, measured:** seed 3 on Scene ON took 4.9 s wall and produced a 33 KB row with 254 commands and about 12.4k presented frames.
- 1000 seeds is about 80 CPU-minutes per scene, or about 20 minutes on the 4-job pool of `lsd194Census.sh:31`.
- I estimate about 200 sound events per battle at roughly 20 bytes each, or 4-6 KB per row. That is under +20%.
- The per-tick emitter cost is small.
- `lsd194Census.sh` is reusable unchanged because it hardcodes the filename `lsd194Census.ts`. A new `.ts` would need a one-line edit.

**Neutrality gate:** run the old and new census on seeds 0..39 in both scenes and assert that all non-sound fields are byte-identical.

## 2. ROM-side T2: not possible today

There is no tool that replays a census seed on the oracle. What exists:
- `tools/audio/soundEventProbe.py lab REQ.json [--fast] [--log-setup] [--profile on|off]` (`:8-9`, run through `tools/run-mgba-probe.py`). It runs a battle-lab request and logs sound events for the trace window.
- `tools/integration/bso226Stage.py` and `bso226Run.ts`. These are the only precedent mapping an engine seed to a `factoryLegal` request. They give the engine a seed, scan the trainer and set ids it generates, and stage the ROM lab at the engine's trainer, sets and player personalities.
- Existing aud24* parity windows use hand-staged engine states (`midBattleSwitchStage` in `appTrace.ts:1004-1025`) with fixture-embedded traces, replayed in tests through `traceAdvances`. None starts from a census seed.

Gaps, most serious first:
1. **RNG alignment.** The lab writes `seed` into `gRngValue` right after `new_session()` (`battle_lab.py:760`), thousands of frames before battle. The engine's battle RNG starts at `rngValue: seed` at orchestrator creation. The two do not match, so crits, damage rolls and AI picks would diverge.
   - A way to align them: stage the ROM first, read `rngValue` from the frame-0 capture state (`battle_lab.py:999`), then build the engine battle with that RNG. No such stage helper exists past the intro.
2. **No input stream.** The census synthesises buttons from presentation state (`until` / `pulse`, lines 119-158). It does not record them. A recorder is needed that run-length-encodes `buttons` per frame into `{frames, buttons}` segments.
3. **Frame 0 mismatch.** The census starts at the battle intro. The lab's trace frame 0 is the first action menu, and the intro runs inside `lab.prepare`.
   - `--log-setup` would log the intro, but the lab's internal intro-acknowledgement presses are not the census's.
   - T2 should therefore compare from the action menu onward. Intro and tray sounds stay with the aud241a windows.
4. **Replay timing.** Recorded inputs may land differently on the ROM because of the known timing deltas. Replays must be checked for divergence, for example move SE ids against the engine's, and non-replayable seeds re-sampled.
5. **Seed-to-lab mapper.** A new tool must build a `factoryLegal` request from the engine's `opponentGenerations[0]` (trainer id, set ids) and the player rentals, as `bso226Run.ts:73-90` does.

Costs and limits:
- A trace is capped at 45,000 frames (`oracle/server.py:35,75-82`). A census battle is about 12-20k frames, so it fits.
- Hybrid `--fast` is about 15-25 s per battle per scene (`docs/s11-audio-design.md:143`; the aud237 benchmarks at `:101-107` are 12-13x faster than stepping).
- Without `--log-setup`, `prepare` runs at full speed, in seconds.
- Stepping would be about 25 frames/s, which is about 10-13 min per battle.

## 3. Known-divergent families and delta classification

Proposed per-event classes for `soundCensusDelta.py`. Compare per seed on `(kind, id, pan)` in order, after aligning on a per-battle anchor.

| Class | Meaning | Families |
|---|---|---|
| exact | same tuple and same frame delta | most menu, effectiveness and ball SEs |
| known-offset | same tuple, constant per-window delta, tagged by issue | #198 per-move SE offsets: +2 for Ember, Acid, Bite, Headbutt, Ice Punch and Ice Beam; Twineedle +10; Double Slap and Fury Swipes +9; Bind +6; Counter -16; Agility and Swords Dance -4; Swagger -3; Growth -4; Calm Mind -5; Hail and Sunny Day -4.<br>#197: (a) super-effective hold -5, (b) second-attack low-HP SE 1 tick early, (c) faint sounds +16 after a red drain.<br>#196: MAGNETON 1 frame early, BGM-to-tray gap 348-374 |
| missing, aud242 gated | ROM has it, we do not emit | the `gated` count of each executed move-animation variant, with reason from `ends`. This includes `waitsound` (11 ops) and `blend_color_cycle` / `HardwarePaletteFade` |
| missing, declined body | static or approximate bodies are silent | Tackle, Vine Whip, Seismic Toss (`liveMoveAnimationDuration` null, `moveAnimSounds.ts:157`) |
| missing, cry task | not ported | PlayCryHighPitch, PlayDoubleCry, CryWithEcho, WaitForCry (#198) |
| missing, other | | WEAK send-out cry length known only for ONIX (#193 / #196); Baton Pass recall not distinguished; opposing switch-in inside the forced-selector prefix gets no sound (#196); Blizzard, Tri Attack, Bubblebeam and other unmodelled lifetimes (aud242f 10.5); Overheat SE147 rows +3 beyond the offset; Poison Tail later rows +2 |
| extra | we emit, ROM does not | `pan` events with no active SE (ROM's `SE12PanpotControl` after the SE ends is a probe `noop`, #198); anything move-animation on Scene OFF |

Also drop probe `noop` rows on both sides. `--fast` already drops them.

Scene OFF is a different timeline (design `:88-92`). Each scene compares against its own ROM profile, never an offset ON log.

## 4. Proposed split and risks

**Step A, aud243a: census column and T1 delta (about 100 min)**
- Extract the post-tick emitter block from `core.ts` into an exported function. Add the `sound` and `soundDigest` fields to `lsd194Census.ts`.
- Write `tools/integration/soundCensusDelta.py` with two modes: `base final` as in `rst197CensusDelta.py`, and `--t1 <arm>`, which uses `anim-sound-timing.json` `gated` and `ends`. The output is the class table above.
- Accept with these commands:
  - `npx vitest run tests/audioSinkNeutral.test.ts tests/aud24*`, then `npm run typecheck`.
  - `LSD194_SHARDS="0" sh tools/integration/lsd194Census.sh /tmp/c243 HEAD:on HEAD:off` (shard 0 only, both scenes).
  - A non-sound-field byte-equality check against `HEAD~` (pre-change) census arms on seeds 0..39.
  - `python3 tools/integration/soundCensusDelta.py --t1 /tmp/c243/on-<sha>`. The first readable summary must show 0 unclassified and 0 extra on Scene OFF move-animation.
- Then run all ten shards in both scenes as a gate run, with no new code.

**Step B, aud243b: T2 replay tooling (about 120 min)**
- Add an input recorder to the census (`--inputs`).
- Write `tools/integration/soundCensusRomReplay.py` to do the following:
  - Stage the lab for a seed (trainer and sets from the engine, personalities and `rngValue` read back from the frame-0 capture).
  - Build the engine stage at the action menu with the ROM's RNG.
  - Record the engine's inputs and replay them through `soundEventProbe.py lab … --fast --profile on|off`.
  - Diff with the delta classes.
- Accept: 3 seeds in each scene produce a class table. Each is either exact or all-named known-offset, or is explicitly marked non-replayable with the first divergent event. Existing `tests/audioProbeFixtures.test.ts` stays green.
- If RNG alignment fails, stop and report. Do not improvise.

The K≥20 sample runs and the 0..999 ROM pass are run-only gates after Step B. Misses become fix steps.

**Risks**
1. RNG alignment (gap 1) is the make-or-break item. Without it T2 only works on battles with no RNG-dependent divergence, which is not representative.
2. Replay desync from input timing. Mitigate with re-sampling and divergence detection.
3. Extracting the block from `core.ts` touches a hot file. Verify with the neutrality check and `ENGINE_BUILD` unchanged outputs.
4. T1 is partly circular. State this in the receipt so it is not read as ROM parity.
5. Module-level scheduler state (`screenSounds.ts:81-84`, #193) is shared across seeds in one process. This is safe only because the frame-goes-backwards reset covers it; check that the cry-duck `ducking` and `lowHpPlaying` also reset.
6. The first census will be dominated by gated and declined move bodies. This is expected and is why the classes matter.
