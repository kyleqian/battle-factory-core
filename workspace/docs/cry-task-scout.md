# cry-task-scout -- plan for the cries inside move-animation tasks (ISSUES #219 family 3)

Read-only scout, 2026-11-14 CAX31 run (Sonnet 5.5 worker, supervisor-committed verbatim; re-check file:line claims before building on them).

**Report: cry-scout, ISSUES #219 family 3 (cries in move-animation tasks). Read-only, nothing edited.**

Everything below is read from source and docs. I recorded no ROM window this session, so the ROM timings are derived, not measured.

**(1) What each task plays.** Cries are `PlayCry_ByMode`, so each also ducks the BGM to 85 (`sound.c:316-327`).
- **Roar** (`battle_anim_scripts.s:4965-4981`):
  - `SoundTask_PlayDoubleCry` is created at script offset 0 and plays `CRY_MODE_ROAR_1` at once (`battle_anim_sound_tasks.c:178-237`).
  - ROAR_1 is the attacker's species, length 10, release 100, pitch 14848 (`sound.c:428-432`). Pan is `BattleAnimAdjustPanning(SOUND_PAN_ATTACKER)` (`battle_anim.c:1263-1303`).
  - Player attacker gives -64. Opponent attacker gives +63 (the -64 is negated, then clamped).
  - The Step (`:239-267`) counts `data[9]` to 2, then plays `ROAR_2` once `!IsCryPlaying()`. ROAR_2 is length 60, release 225, pitch 15616 (`sound.c:433-437`), with the same species and pan.
  - So the second cry lands at about 3 ticks after the task start, or at the end of ROAR_1 if that is later. I expect it is later, since ROAR_1 has a release tail.
  - `SoundTask_WaitForCry` (`:269-281`) is created after `clearmonbg`/`blendoff`, with no event of its own. It only holds `waitforvisualfinish` until the cry ends.
- **Howl** (`:4380-4388`): `SoundTask_PlayCryHighPitch` runs after `delay 12`, then `call RoarEffect` (sprites only, no SE). Arg 3 is `ANIM_ATTACKER`, so it is the attacker's species, pan as above. The task plays `CRY_MODE_HIGH_PITCH` (length 50, release 200, pitch 15800, volume 90, chorus 20) and destroys itself in the same call (`:130-175`). That is one cry, with no wait.
- **Hyper Voice** (`:8507-8526`): two `SoundTask_PlayCryWithEcho` tasks, arg FALSE then TRUE. The second is created after `waitforvisualfinish` plus `delay 8`.
  - Each task's entry only stores species and pan, and `tLastCry` is the arg (`:299-317`).
  - Calls to the Step (`:320-345`): c0 `StopCryAndClearCrySongs`, i.e. a `stop` event with `player:"cry"`; c2 `PlayCry_DuckNoRestore(ECHO_START)`; c5 polls `IsCryPlaying()`.
  - Once the cry has ended, c5 falls through to another stop; the next call plays ECHO_END and destroys the task.
  - ECHO_START is length 25, reversed, release 100, pitch 15600, volume 90, chorus 192. ECHO_END is length 140, release 220, pitch 15555, volume 70, chorus 192.
  - ECHO_END uses DuckNoRestore when `tLastCry` is 0 and ByMode (with restore) when it is 1.
  - `HyperVoiceEffect` ends with a `WaitForCry`, which holds the next `waitforvisualfinish` until ECHO_END finishes. So the second cry's start is a function of the first cry's length.
  - Inferred from the code but not checked against the ROM:
    - The c0..c6 call-to-frame mapping is by analogy with the aud242 loop-task note at `moveAnimSounds.ts:81`: the entry runs in the script step, and the Step first runs in the same iteration's RunTasks.
    - Hyper Voice's task entry does not call the Step itself.

**(2) What the engine already supports.**
- The event shape is ready. `SoundEvent` has `kind:"cry"` with `mode`, `volume`, `priority`, and `stop` with `player:"cry"` (`src/audio/soundEvents.ts:17-27`).
- `startCry` in `src/engine/screenSounds.ts:119-134` already emits the duck, the cry, and the restore after a delay. It takes a `restoreDelay` and is used for send-out and faint cries. It does not support DuckNoRestore.
- Missing, in the player and assets:
  - The manifest has only `cry:<species>:{NORMAL,FAINT,WEAK}` for 376 species (`src/assets/gen/audio/manifest.json`).
  - `src/audio/player.ts:169` maps only modes 0, 5 and 11, and `:648` falls back to NORMAL for any other mode. A ROAR or echo cry would therefore play as a plain cry. That is silently wrong audio, not a crash.
  - `tools/audio/audioAssetList.py:15` limits the modes to `CRY_MODES = [NORMAL, WEAK, FAINT]`.
  - `tools/audio/soundRecorder.py:47` and `:374` already map every mode id and record via `PlayCryInternal`, so recording needs only the mode list extended.
- Missing, in timing data:
  - `src/data/gen/cry-durations.json` and `faintCryFrames` are NORMAL and FAINT only.
  - Needed per species: frames from the call to `!IsCryPlaying` for ROAR_1, ECHO_START and ECHO_END, plus ROAR_2 if the Roar lifetime is to be modelled.
  - The existing fit is `genFaintCryTable.py` (`ceil(1.205*t+0.91)`, 15 ROM windows).

**(3) Plan.** The scoreboard compares event rows only, so the engine events can land before any audio assets.
- **Step 1, events (about 1 step).**
  - Add a cry-task row kind in `src/engine/moveAnimSounds.ts`, next to the loop-task functions at `:60-130`, for `PlayDoubleCry`, `PlayCryHighPitch` and `PlayCryWithEcho`.
  - Use `startCry` with a ROAR_1/ROAR_2/HIGH_PITCH/ECHO_START/ECHO_END mode and a per-species length table.
  - Pan comes from the existing `animSoundPan` helper. The attacker's species is needed in the context.
  - Add DuckNoRestore to `startCry`.
  - The generator is `tools/extract/extract-anim-sound-timing.ts` (output `anim-sound-timing.json`).
  - ROM windows to record (aud242g recipe, `docs/aud242-move-anim-sounds.md:590`; `soundEventProbe.py` already hooks `PlayCryInternal` and `m4aSongNumStop`):
    - Roar, player and opponent attacker, with a short-cry and a long-cry species.
    - Howl, one window.
    - Hyper Voice, one window to cover both echo rounds and the second-round start.
    - Roughly 6 windows, plus 15 or more ROM points per mode to fit the length table.
  - Tests: a new `tests/aud25xCryTasks.test.ts` in the style of `tests/aud242gMoveAnimSounds.test.ts`. Pin the ROM rows (frame, mode, pan, duck and restore) as the fixtures. Re-pin the scoreboard rows: T1 `missing-cry-task` for ROAR, HYPER VOICE and HOWL should go to 0.
- **Step 2, audio assets (optional, since it affects playback only).**
  - Extend `CRY_MODES` and `CRY_MODE_NAMES` with `ROAR_1/2`, `HIGH_PITCH`, `ECHO_START` and `ECHO_END` (GROWL is not at Level 50).
  - Re-record and run `validateAudioAssets.py`. Expect 5 new modes per species across 376 species, so about 1,880 more files.

**(4) Risks.**
- The cry-length model is the main risk. The ROAR_1/ECHO_START length cap changes the fit, so the NORMAL and FAINT tables cannot be reused. The second-cry frame is exact only if the length is exact.
- Hyper Voice's second round and the Roar tail depend on `waitforvisualfinish` holding for `WaitForCry`. `gated` is 0 for all four moves, so there are no SE rows behind it. If any later sprite or SE shifts, the lifetime needs modelling.
- `StopCryAndClearCrySongs` stops also have to match. The `stop` rows are 1177 in the scoreboard.
- The DuckNoRestore duck state must restore on the last ECHO_END, or the BGM stays at 85.
- The unmeasured `doubles` cases (`CRY_MODE_DOUBLES` and the `IsBattlerSpriteVisible` check) are not relevant in singles.
- If Roar is used by a fainted or absent species (`species == NONE`), the task destroys itself and emits nothing. This needs a guard.

The step is not blocked or mis-scoped. It just needs a measured length table before the events can be frame-exact.
