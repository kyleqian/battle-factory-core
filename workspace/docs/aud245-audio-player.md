# aud245: the WebAudio player (S11 audio, design step 9)

Plays the recorded assets (`src/assets/gen/audio`, aud244a/b) from the session's write-only `SoundEvent`s
(`src/audio/soundEvents.ts`). Muted by default; no effect on game frames; the player is a lazily-loaded chunk.

## What was touched

New: `src/audio/player.ts`, `src/audio/playerAssets.ts`, `src/assets/gen/audio/song-players.json` (+ its extractor
`tools/extract/extract-audio-song-players.ts`), `src/assets/gen/audio/aac/*.m4a` (566) and the manifest `alt` section (+
`tools/extract/extract-audio-aac.ts`), `tools/browser/audioCheck.mjs`, this doc, `tests/aud245*.test.ts`.
Edited: `src/factoryContract.ts`, `lib-types/index.d.ts`, `src/lib.ts` (wiring only), `src/main.ts` (`?audio=1`), `vite.config.ts` /
`vite.lib.config.ts` (audio chunk, no inlining, real asset files in the lib build), `package.json` (two scripts),
`tests/aud244aAudioManifest.test.ts` and `tests/audioHeadlessBoundary.test.ts` (graph pins), `docs/library-package.md`.
**`src/engine/` is untouched.** PROGRESS / ISSUES / ROADMAP / the handoff are untouched (side lane).

## API (additive; for the website)

```ts
mountFactoryGame({ canvas, battleScene, audio: { enabled?: boolean; volume?: number /* 0..1 */; baseUrl?: string } })
game.setAudio(true | false)          // a mute button; call from a click so the context may start
game.getAudio()                      // { enabled, volume, state: "off" | "loading" | "suspended" | "running" | "closed" | "unsupported" }
```

Without `audio`, nothing is fetched, no `AudioContext` is created and the player chunk is never requested. With `audio` given but
`enabled: false`, the logical voice model runs (so enabling mid-session picks up the playing music) but no context is created and no file
is fetched. The context is resumed on the first `pointerdown` / `keydown` / `touchend` / `click`. Dev shell: `?audio=1`
(`window.__POKEBENCH_AUDIO__()` returns the counters). Details for hosts: `docs/library-package.md` "Sound".

## The model (reference/pokeemerald)

- **Four music players** (`src/gba/... music_player_table.inc`): BGM, SE1, SE2, SE3. `song-players.json` maps every recorded song id to
  `[player, priority]` from `song_table.inc` (the player) and the midi's `*_pri` (the priority). Fanfares run on SE2.
- **Priority / preemption.** `MPlayStart` (m4a.c `m4aSongNumStart`, :107-150) starts a song if the player is not priority-checked
  (`MusicPlayerInfo.unk_B`, m4a_internal.h:334: BGM and SE3), or is idle / paused, or `curPriority <= newPriority`; otherwise it is
  refused and counted in `stats.blocked`. A start cuts the song already on that player (`stats.preempted`).
- **Cries** (sound.c `PlayCry_*`): two cry voices; a third replaces the oldest. Mode 0 -> NORMAL, 5 -> FAINT, 11 -> WEAK recordings.
  Cries are packed per species in one file; the player slices by `offsetSamples` / `lengthSamples` and starts `onsetSamples` late (the ROM's
  own start latency).
- **Duck.** `m4aMPlayVolumeControl(&gMPlayInfo_BGM, TRACKS_ALL, 85)` (sound.c:304, :324, :341, :355): BGM gain = 85/256 under cries, 256
  restored by the `duck` event. When the emitter omits the restore (WEAK cry of unknown length) the player restores after the cry ends.
- **Fanfare** (sound.c `PlayFanfare`, :213): BGM paused (`m4aMPlayStop`), fanfare on SE2, then `m4aMPlayContinue`
  (m4a.c:186). **Fade** (`m4aMPlayFadeOut` / `FadeIn`, m4a.c:202-230): 16 steps of `speed` frames, linear gain. `stop` stops by player,
  pauses BGM, or stops one song id.
- **Pan** (m4a_1.s `ChnVolSetAsm`, :1508): linear, relative to the centred mono recording: `y = 2*pan`, `gL = (127-y)/127`,
  `gR = (y+128)/128`. Cries use it live. SEs with a pan were recorded per pan value (`se:<id>:<pan>`), so those are separate files and
  take no extra gain. The `pan` event kind is not emitted today and is ignored.
- **Loops.** `loopStart` / `loopEnd` from the manifest. Exact loops (bgm:354, se:132:63; `seam.shortMaxAbsDiff` 0) use the native
  `loop` / `loopStart` / `loopEnd`. The four non-exact wraps (bgm:412, 469, 476, se:90) are scheduled as overlapping passes with a
  7 ms linear crossfade (`loopStart < 7 ms` -> overlap approach, period `L - X`; se:90 has `loopStart` 0), 90 s lookahead, <= 48 passes,
  topped up every 250 ms. A test pins the crossfade at 5-10 ms for all four.
- **Clock.** Frame -> AudioContext time: `t = anchorWall + (frame - anchorFrame) / 59.7275 + latency (30 ms)`, converted by the
  context offset; it re-anchors when late, when more than 0.25 s ahead, and on `reset`.

## Formats and the Safari fallback

Ogg Vorbis is the primary set. `manifest.alt` lists an AAC-LC `.m4a` twin of every file under `aac/` (sha256, bytes, measured
`leadSamples`). The runtime uses AAC when `canPlayType('audio/ogg; codecs="vorbis"')` is empty, or after an Ogg decode failure (sticky).
AAC has no 26758 / 13379 Hz rates, so SE and songs are 32000 Hz, cries 16000 Hz; offsets are addressed in seconds so the manifest stays
valid. The encoder's delay is not reliably removed by the edit list, so each file's lead was measured (ffmpeg decode, cross-correlation
against the Ogg) and the player starts the buffer that many samples in.

Size: Ogg 7,450,299 B, AAC 7,376,225 B (SE 56 kbps = 1,238,605 B vs 1,618,342; cries 16 kbps = 4,237,939 vs 4,549,302; songs 64 kbps =
1,899,681 vs 1,282,655). Shipping both: 14.8 MB in `dist-lib/audio/`.

Encode command (a Mac without ffmpeg can `brew install ffmpeg` and run the extractor):

    FFMPEG=ffmpeg npm run extract:audio-aac
    # per file, what it runs:  ffmpeg -i x.ogg -ac <1|2> -ar <32000|16000> -c:a aac -profile:a aac_low -b:a <56k|16k|64k> -movflags +faststart aac/x.m4a
    # system-encoder alternative:  afconvert -f m4af -d aac -b 32000 -r 16000 in.wav out.m4a   (decode the .ogg to WAV first)

(`afconvert` output has a different encoder delay, so re-measure `leadSamples` if you swap encoders: the extractor does it.)

## Verified, and not

Verified in headless Chromium (below): the Ogg set decodes and plays, and the AAC set decodes and plays (forced by hiding Ogg from
`canPlayType`). **Not verified: Safari / CoreAudio** (no Safari on the box). The lead values are ffmpeg's measurement, which Chromium
matches; CoreAudio may trim the encoder delay itself and then the `leadSamples` bias would be an over-shift of < 0.4 k samples
(< 13 ms at 32 kHz) on SEs. The panned SE lead measurement is inconsistent between two otherwise identical variants (0 vs 306); cause unknown.

Known limitations: linear (not equal-power) crossfade; the literal m4a pan law reaches gain ~2 at a hard pan. (The resume/late-start
silence, the ignored cry `volume` and `pan` event, and the warm-up of all SE files were fixed in aud245b, below.)

## Browser check (`node tools/browser/audioCheck.mjs --frames 3600 --also-aac`, after `npm run build`)

A node-side `FactorySession` (Scene OFF, seed 3, RandomPlayer "winning") produces 3600 frames of buttons; the built page replays them
through `__POKEBENCH__.advance` at real time (6 frames / 100.5 ms, rAF stubbed) after a real mouse click. The page wraps `AudioContext`
(counts `createBufferSource` / `start` / `decodeAudioData`) and taps the destination with an AnalyserNode.

| | audio=1 (Ogg) | audio=1 (AAC forced) | no audio option |
| --- | --- | --- | --- |
| AudioContexts | 1 (`running`) | 1 (`running`) | 0 |
| buffer sources created / started | 48 / 48 | 48 / 48 | 0 |
| player events (= node sink) | se 43, bgm 1, cry 4, duck 8, stop 1 | same | n/a |
| voices started | se 43, bgm 1, cry 4 | same | n/a |
| preempted / blocked / missing | 21 / 0 / 0 | 21 / 0 / 0 | n/a |
| files fetched / decoded | 187 (.ogg) / 187 | 187 (.m4a) / 187, 0 decode failures | 0 requests for .ogg / .m4a, no player chunk |
| analyser: windows with signal / peak | 1043 of 1234 / 0.57 | 1045 of 1234 / 0.54 | n/a |
| page errors | 0 | 0 | 0 |

(Chromium prints "The AudioContext was not allowed to start" when the context is constructed before the first gesture; the player resumes it on
the click, `resumes: 3`. The check filters that one warning.)

## Tests

`tests/aud245AudioPlayer.test.ts` (20, fake AudioContext: pan law, mute default, priority table and SE1/2/3 rules, timing, duck + auto-restore,
cries, fanfare, fades, loops incl. the crossfades, AAC fallback, baseUrl, clock), `tests/aud245FrameIdentity.test.ts` (per-frame sha256,
digest, battles, trace identical with the real player attached, Scene OFF and ON), `tests/aud245AudioFallback.test.ts` (the `.m4a` set vs
the manifest, `song-players.json`), `tests/audioHeadlessBoundary.test.ts` (headless graph and the lib build's synchronous graph exclude the
player and the audio files; the player sits in a dynamic chunk), `tests/aud244aAudioManifest.test.ts`.

## aud245b: follow-ups (restore, pan, cry volume, lazy fetch)

Touched: `src/audio/player.ts`, `src/audio/musicTracker.ts` (new), `src/lib.ts`. Not touched: `src/engine`, `src/factorySession.ts`,
`src/audio/soundEvents.ts`, so frame output and `ENGINE_BUILD` are unchanged and the headless bundle is byte-identical (3,208,045 bytes).

**1. Music after a `resume` fast-forward or a late `setAudio(true)`.** `lib.ts` now always attaches a sink; it feeds a `MusicTracker`
(last `bgm` event, last `duck`, and the events after the last `bgm`, tail capped at 1024, oldest SE dropped first; `cry` and `pan`
ignored) and, when present, the player. The resume fast-forward wraps `session.replayStep` in `collectSoundTick`, so its events reach the
tracker but never the player. `AudioPlayer.restore(events, liveFrame)` replays the tracker's events on the logical voice model with
`audible()` forced false (nothing is scheduled, the priority/preempt counters it touched are put back), anchors `liveFrame` at
`now + latency`, then starts the voices that are still sounding **at their exact loop position** (the voice's start frame gives the offset
into the loop, including after several loops and for crossfaded loops), so no restart is heard. Ended SEs and fanfares make no sound;
a fanfare that is still running is resumed at its position with the BGM paused as in the live model; faded/replaced BGM is restored as
the replacement. Called from `loadAudio` (player created after the fast-forward or mounted muted/late) and at the end of resume.
Limitation (closed by aud247, below): the session emits no event for the music playing at frame 0.

**2. `pan` events** (`m4aMPlayPanpotControl`, m4a.c:1314, called from `SE12PanpotControl`, sound.c:600). It sets `track->panX` on SE1 and
SE2 only; `TrkVolPitSet` uses `y = 2*pan + panX`, `volMR = (y+128)*x>>8`, `volML = (127-y)*x>>8`. The player applies `m4aPanGains(pan)`
to the live SE1/SE2 `se` voice through a left/right gain stage spliced after a per-voice `pre` gain (mono mix, so the stage's gL+gR ~ 2
keeps the mid level about unity); later pans use `setValueAtTime`. SE3 and BGM are untouched. A pan equal to the recorded pan with no
earlier live pan is a no-op. Limit: once an SE is re-panned its own recorded stereo (ply_pan) is replaced by the mono mix.

**3. Cry `volume`.** `SetPokemonCryVolume` (m4a.c:1701, `volumeValue = val & 0x7F`) feeds `TrkVolPitSet` (m4a.c:765, `x = vol*volX >> 5`),
so loudness is linear in `vol`. Cries were recorded at volume 120 (`CRY_VOLUME`, soundRecorder.py:49), so
`gain = (volume & 0x7f) / 120` (`cryVolumeGain`; no `volume` means 1). Applied to the cry source, combined with the pan stage if any.

**4. Lazy fetch.** Enabling audio fetches only the prefetch set: BGM 469 (`BGM_DRAFT`, Lobby/draft) and SEs 5, 32, 9, 15 (common UI;
5 files, `stats.prefetched`). Every other file is fetched on first use, once; the decode cache is kept. A first use waits for its fetch,
so it can start late (`late` counts it; the music/SE is not played retroactively beyond the existing late rule). Browser check, 1800 frames
(`audioCheck.mjs --frames 1800`): **186 requests (186 ogg, 186 fetches/decoded) before, 14 after** (14 fetches, 14 decoded, 5 prefetched,
37 sources); `late` 3 -> 9 for the first uses.

Tests: `tests/aud245bAudioFollowups.test.ts` (19: restore positions, after loops, ended events, fanfare, fade/replace, muted then enabled,
events after the live frame ignored; the tracker; pan splice / no-op / SE3 / pan while loading; cry volume; prefetch set, first-use fetch
once, decode cache), `tests/aud245bLibRestore.test.ts` (4: lib mount with `resumeSync` and a fake AudioContext/fetch: resume with audio,
no audio option then `setAudio(true)`, muted then enabled). `tests/aud245AudioPlayer.test.ts` got one `await flush()` between two pushes
(the second SE no longer finds the first loaded). The frame-identity test is unchanged and green.

## aud247: the music already playing at mount

Problem: the session emits no SoundEvent for the BGM already sounding on frame 0, so a fresh mount was silent until the next `bgm` event.
Fix, audio-side only: `src/audio/initialMusic.ts` (`initialMusicEvents(start)`) is a table keyed by the mount `start`; `lib.ts` seeds the
`MusicTracker` with it (`new MusicTracker(initialMusicEvents(options.start))`, `reset()` returns to the seed). The player's existing
`restore` then starts the BGM at its loop position on the first `loadAudio` / `setAudio(true)` / resume end, and any real `bgm` event
replaces the seed. Touched: `src/audio/initialMusic.ts` (new), `src/audio/musicTracker.ts`, `src/lib.ts`. Not touched: `src/engine`,
`src/factorySession.ts`, `soundEvents.ts`: frame output, `ENGINE_BUILD` and the headless bundle are unchanged.

ROM proof (dev-time RAM read, ROADMAP recipe; script and output in `.integration/evidence/aud247/readAnchor.py`, `anchor.json`, `readClock.py`,
`clock.json`). `gMPlayInfo_BGM` at the bootstrap anchor, Scene OFF (`factory-battle-scene-off.json`) and Scene ON (`factory.json`) alike:
`songHeader == gSongTable[469]` (MUS_B_FACTORY), `status` 0x1ff (running), `trackCount` 10, **`clock` 3287**. SE1 holds song 9 and SE2 song 5 but both
are finished (`status` 0x80000000), SE3 is empty: only the BGM is sounding. Advancing the oracle, `clock` was 3344 / 3402 / 3863 / 4439 / 5207 after
60 / 120 / 600 / 1200 / 2000 frames: exactly 0.96 ticks per frame (144 BPM), and it keeps counting through the loop (3720 -> 168).
So the draft BGM started 3287 / 0.96 = **3424 frames before frame 0**; the seed is `{ frame: -3424, kind: "bgm", id: 469 }` and the existing loop
arithmetic (including the loop wrap and the onset offset) gives the file position (57.3 s into the song, before the loop end at 64.8 s).

| mount start | seeded music | position | proof |
| --- | --- | --- | --- |
| default (`"draft"`, also `undefined`) | BGM 469 | 3424 frames in (clock 3287) | RAM read above, both profiles identical |
| `"after-save"` (Lobby, "Please step this way.") | BGM 469 (Lobby map music, `BattleFrontier_BattleFactoryLobby/map.json` `"music": "MUS_B_FACTORY"`) | song start (frame 0) | song id: map.json. Position: not recoverable, the engine skips the attendant dialogue, the save and the door walk, so no ROM state corresponds to this frame (the `factory-pre-report.json` Lobby bootstrap has clock 430 at its own anchor, a different moment); starting at the song start, not at `loopStart` |
| `resume` | the start's seed, then the fast-forward's `bgm` / `stop` / fanfare events | as above plus the elapsed frames | `restore` as in aud245b; a resumed trace with no music event continues the draft BGM at 3424 + frames |

`reset()` of the mount re-seeds the tracker and calls `restore` (it used to silence the player and leave it silent until the next `bgm`).

Tests: `tests/aud247InitialMusic.test.ts` (7: table, tracker seed / replace / reset; library mount with fake AudioContext/fetch: fresh draft mount starts
BGM 469 at frame 0 at the 3424-frame loop position and fetches `bgm-469.ogg`, after-save starts it from the song start, resume of a 200-frame
trace continues it at 3624 frames, `setAudio(true)` at frame 0, reset restarts it; no audio option still fetches nothing). `aud245FrameIdentity`,
`aud245bLibRestore`, `audioHeadlessBoundary`, `factoryLibrary`, `lbrc` stay green.
