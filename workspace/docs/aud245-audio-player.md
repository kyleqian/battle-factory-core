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

Known limitations: after a `resume` fast-forward there is no BGM event, so music is silent until the next music event (audio is not in the
trace); linear (not equal-power) crossfade; cry `volume` is ignored (the recording includes it); the literal m4a pan law reaches gain ~2
at a hard pan; the `pan` event is ignored; turning audio on warms up all ~180 SE files (a few MB) at once.

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
