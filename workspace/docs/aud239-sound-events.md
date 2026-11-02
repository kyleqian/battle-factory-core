# aud239 — SoundEvent type and write-only sink (S11 step 3)

Plumbing only: no emitter exists, so every sink sees zero events. Design: `docs/s11-audio-design.md` sections 3, 5, 6.

## API (`src/audio/soundEvents.ts`, pure, no imports)

- `SoundEvent { frame, kind: "se"|"bgm"|"fanfare"|"cry"|"stop"|"fade"|"duck", id, pan: number|null, mode?, volume?, priority? }`.
  `frame` is 1-based like the oracle probe: an event produced while the k-th advance runs reports k, equal to `FactorySession.frame` after that tick.
- `SoundSink { push(event) }`: write-only.
- Emitters call `emitSound({ kind, id, pan, ... })` (frame defaults to the tick's frame; pass `frame` for a known later one). It is a no-op unless a tick is being collected.
- `collectSoundTick(frame, run)` installs a collector around one engine tick and returns `{ result, events }`; `soundCollecting()` lets an emitter skip building an event.
- `FactorySession.attachSoundSink(sink | null)`: live `tick()` frames collect and push to the sink in emission order. `replayStep` / `resume` (fast-forward) never collect, so a replay is silent and pays nothing. A throwing sink is logged and ignored. Nothing is stored in the session, trace, export, digest or frame hash.
- `animSoundPan(pan, { attackerSide, targetSide, statusAnimActive? })` = `BattleAnimAdjustPanning` (battle_anim.c:1263-1303); `animSoundPan2` = `BattleAnimAdjustPanning2` (:1305-1320); `keepPanInRange` (:1322); `calculatePanIncrement` (:1334). Inputs read by the C: attacker side, target side, `healthBoxesData[attacker].statusAnimActive`. `IsContest()` is never true in the Factory (contest branches not ported); `gAnimMoveTurn` is not read. `s8` wrap is reproduced (`-128 * -1` stays -128, then clamps to -64).

## Tests

`tests/audioAnimSoundPan.test.ts`, `audioSinkNeutral.test.ts` (Scene ON + OFF per-frame sha256, digest, trace, headless replay, attach / detach), `audioSinkPlumbing.test.ts` (stand-in emitter through a mocked `tick`: frame stamping, order, fast-forward silence), `audioHeadlessBoundary.test.ts` (headless rollup graph contains only `src/audio/soundEvents.ts`, < 4 KiB rendered, no audio assets or sound-source JSON).
