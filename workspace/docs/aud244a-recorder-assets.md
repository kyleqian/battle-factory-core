# aud244a: sound recorder + first committed asset set (S11 audio, design step 8, first slice)

Result: a dev-time python recorder captures the **real mixed mGBA output** of one ROM sound at a time; `npm run extract:audio` encodes the captures to
OGG Vorbis and writes `src/assets/gen/audio/{*.ogg,manifest.json}`. The set covers every Factory species' cry in NORMAL / WEAK / FAINT (376 x 3 = 1,128)
and 181 of the 183 distinct SE `(id, pan)` tuples seen in the ROM sound logs (the other two loop forever, see section 6). BGM / fanfares are aud244b.
Total **6.14 MB** (SEs 1.59 MB in 181 files, cries 4.55 MB in 376 files). No `src/*.ts` changed; nothing imports the assets yet (aud245).

## 1. Method (`tools/audio/soundRecorder.py`)

Run with `/srv/pokebench/vendor/mgba-venv/bin/python` (mGBA imported like `oracle/emerald_core.py`, canonical Factory bootstrap state). Dev tool only, never parity evidence.

1. `prepare()`: 3 frames, then `m4aMPlayAllStop` (silences the BGM), then frames until every player / PCM channel / PSG channel is inactive and the output is digital
   silence for 20 frames. That state is snapshotted once (`save_raw_state`).
2. Per sound: `load_raw_state`, `audio.clear()`, `set_rate(R)`, **24 warm-up frames** (the blip output keeps a x0.42 / frame decaying residual of the previous recording
   after every state load; after 24 frames it is exactly 0, asserted), then a **register-poke call** of the ROM's own entry point: CPU woken from its
   VBlankIntrWait halt, IRQs masked, `r0..r3` / stack (`PlayCryInternal`'s 5th argument `mode` is on the stack) / `lr` = a ROM sentinel set, the function steps to its return,
   the register file and prefetch are restored. SEs: `PlaySE(id)` or `PlaySE12/1/2WithPanning(id, pan)`; cries: `PlayCryInternal(species, pan 0, volume 120, priority 10, mode)`.
3. Frames are advanced one at a time; each frame's `core.get_audio_channels()` output is drained (`StereoBuffer.read_into` into an owned buffer: the binding's
   `read()` returns a slice that does not keep its buffer alive, reading it is use-after-free garbage on alternate frames).
4. `lengthFrames` = frames from the call to the first frame where every sound channel is inactive (cries: DirectSound / PSG channels only, because the cry music
   player's track stays "on" for a fixed ~142 frames; the game's own `IsPokemonCryPlaying` is the track-0 channel; SEs: channels and SE players). Recording stops once
   inactive and the output has been silent for 12 frames (the mixer DMA ring keeps playing ~12 frames after the channels stop), hard cap 1500 frames (`capped`).
5. Leading and trailing near-silence (`|s| <= 2`) is trimmed; the trimmed leading silence is kept as `onsetSamples` (the ROM's own 1-2 frame mixer latency: SE 451 / 463
   samples at 26758 Hz, cries ~920 at 13379 Hz). Cries are written mono as `(L + R) / 2` after a centre-pan check (`maxLeftRightDiff` <= 5.1% of the peak over all 1,128; pan is applied at
   runtime); SEs stay stereo per `(id, pan)`.
6. Output `OUT/<stem>.wav` + `<stem>.json` (key, via, `viasInLogs`, rate, `lengthFrames`, `lengthSamples`, `onsetSamples`, peak, rms, clipped, sha256 ...). Recordings are
   **deterministic**: two runs give identical sha256 (checked on 4 sounds: se:5, se:139:-63, cry:19:NORMAL, cry:95:WEAK).

`PlaySE` / `PlaySE1WithPanning` / `PlaySE2WithPanning` / `PlaySE12WithPanning` of one `(id, pan)` render the same audio (different player only), so one wrapper (the first in the log) is recorded.
The full run is ~83 s for 1,311 sounds (single process; shard with `--shard I/N`, at most 4 processes on the 16 GiB host).

## 2. Tuple sources (`tools/audio/audioAssetList.py` -> `tools/audio/aud244a-asset-list.json`)

151 ROM sound logs with an `events` list: the 147 fixtures under `tools/audio/fixtures/` plus 4 aud243 census/validation logs (`.integration/validation/sv-20261108/aud243b`,
`sv-20261109/aud243d/evidence`; `.integration/evidence/*/rom*` and `chain/` globs are also scanned). Distinct: **183 SE `(id, pan)` tuples over 92 ids**, 46 distinct cry `(species, mode)` tuples
(NORMAL / FAINT / WEAK, all Factory species), 7 song ids (4 BGM: 354, 412, 469, 476; 3 fanfares: 368, 459, 466). The cry set is then widened to every species of
`src/data/gen/battle-frontier-mons.json` (376) x {NORMAL, WEAK, FAINT} = 1,128 (all logged cries were already inside the Factory set). Manifest keys: `se:<id>:<pan|none>`, `cry:<species>:<MODE>`.

## 3. Encoder and sample rates

`wasm-media-encoders@0.7.0` (npm devDependency, WASM libvorbis; no system packages, works the same on the user's Mac). `tools/extract/extract-audio.ts` pins the Ogg stream serial
and recomputes the page CRCs because libvorbis picks a random serial: **reruns are byte-identical** (checked: full `src/assets/gen/audio` tree identical across two runs).

| set | recorded / encoded at | why |
|---|---|---|
| cries | **13379 Hz** mono (the ROM mix rate) | DirectSound only; a 26758 Hz capture correlates 0.987-0.998 with the 13379 Hz one upsampled, so nothing above 6.7 kHz is lost, and the file is half the size (cries at 26758 Hz would be ~9.6 MB unpacked) |
| SEs | **26758 Hz** stereo | PSG voices have content above the 13379 Hz Nyquist (SE_SELECT: 15% residual energy when captured at 13379 Hz); Vorbis spends almost nothing on the empty band |

`vbrQuality -0.1` (the lowest documented Vorbis setting; ~41 kbps for cries because the 8-bit sample quantization noise is flat-spectrum, ~65 kbps at 26758 Hz). The setting hardly moves
the size (q 0.5 = +5%, ~+0.7 dB SNR), so aud245 can raise it with `--quality` if the sound is too rough. Cries are packed **per species into one file** (NORMAL, WEAK, FAINT, 1024 zero samples between them; a
sound is samples `[offsetSamples, offsetSamples + lengthSamples)` of its file): the ~3 KB Vorbis header per file made 1,128 files cost 6.3 MB, packed 4.55 MB.

## 4. Sizes

| category | files | sounds | bytes | audio |
|---|---|---|---|---|
| SEs | 181 | 181 | 1,591,978 | 145 s stereo @ 26758 Hz |
| cries | 376 | 1,128 | 4,549,302 | 1,216 s mono @ 13379 Hz |
| total | 557 + manifest.json | 1,309 | 6,141,280 | |

The design estimate was cries ~3 MB / SEs < 2 MB; SEs fit, **cries are ~1.5 MB over** (the noise floor above; a further cut would need a lower sample rate or a lowpass, a quality decision for aud245).
Pinned budget in the test: SE 1.7 MB, cries 4.7 MB, total 6.4 MB.

## 5. Validation (`tools/audio/validateAudioAssets.py`, evidence `.integration/evidence/aud244a/validation.json`)

Method: decode the committed OGG with libvorbisfile (ctypes), take the manifest slice, compare with the raw capture at lag 0 (Pearson correlation, SNR); RMS / peak / clipping of the decoded audio;
length check vs the ROM log (cries: cry event -> the BGM-duck restore `IsCryPlaying` event in the aud237..aud243 logs, +-2 frames expected from the duck task's polling) or vs the recorder's
channel-activity duration (SEs: audible end within `[lengthFrames - 4, lengthFrames + 8]`).

| key | frames (rec / ROM log) | decoded corr | SNR dB | rms | peak | clipped |
|---|---|---|---|---|---|---|
| se:5:none (SE_SELECT) | 14 / activity ok (audible end 19.6) | 0.9967 | 21.3 | 1471 | 5678 | 0 |
| se:16:63 (SE_FAINT) | 53 / activity ok (51.3) | 0.9545 | 10.4 | 1272 | 12562 | 0 |
| se:139:-63 | 26 / activity ok (25.0) | 0.9875 | 16.0 | 1623 | 13622 | 0 |
| cry:19:FAINT | 27 / **28** | 0.9845 | 14.9 | 1573 | 7980 | 0 |
| cry:95:WEAK | 78 / **72, 79** | 0.9855 | 15.3 | 2348 | 8912 | 0 |
| cry:19:NORMAL | 23 / **24** | 0.9812 | 14.1 | 1501 | 7733 | 0 |

Whole set vs the logs: 128 (cry, mode) event pairs over the committed fixtures, **120 within 2 frames**; the 8 outside are cries cut short or restarted in the log
(cry:95:NORMAL 41 / 23 vs 70, cry:153:NORMAL 3 vs 25, cry:240:NORMAL 29 vs 41, cry:93:NORMAL 61 vs 67, cry:95:WEAK 72 vs 78 next to a 79 that matches). No decoded spot file clips (max manifest peak over all 1,309 sounds is 18,892 of 32,767, recorded peaks, no `clipped` samples).
Low SNR (10-21 dB) is the low-bitrate cost on noise-like content; correlation stays > 0.95.

## 6. Coverage and exceptions

Every Factory species x {NORMAL, WEAK, FAINT} is in the manifest; 181 of 183 logged SE tuples are. Exceptions (`manifest.excluded`):
- `se:90:none` SE_LOW_HEALTH and `se:132:63` SE_M_GUST: never go inactive within the 1500-frame recorder cap (loops until stopped). They need a loop treatment (one period + `loopStart` / `loopEnd` derived from the ROM track), like the songs: aud244b.
- BGM (354, 412, 469, 476) and fanfares (368, 459, 466): not recorded here (aud244b). SE `via` variants (4 tuples are logged through two wrappers) are one recording each.
- Pan changes after the start (`m4aMPlayPanpotControl`) and `StopCry` cut-offs are runtime behaviours of the player, not recorded variants; the logs only give the start pan.

## 7. What aud244b / aud245 need

- **aud244b**: BGM / fanfares recorded with the same recorder (extend `--kinds` with `bgm` / `fanfare`: start through `m4aSongNumStart` / `PlayBGM` / `PlayFanfare` into the silenced baseline), seamless
  loops with `loopStart` / `loopEnd` taken from the ROM `GOTO` target in `reference/pokeemerald/sound/songs/midi/*.s` (tick offsets already extracted in `tests/fixtures/data/audio-sound-sources.json`
  `songLoops`), cut at a sample-exact loop point of the recording (a capture of >= 2 loop passes), plus the two looping SEs above.
- **aud245** (WebAudio player): `manifest.sounds[key]` -> fetch `file` (cache the decoded cry file per species) -> play the slice `[offsetSamples, +lengthSamples)` at the ROM-log frame (the file already starts at the first audible sample;
  `onsetSamples / sampleRate` is the ROM's own latency if it should be added back, ~1-2 frames); cry pan and the cry BGM duck are applied at runtime (cries are stored centre / mono);
  SE pan variants are separate stereo files (`se:<id>:<pan>`); `lengthFrames` is the ROM channel-activity length (cry end for `IsCryPlaying` / the duck restore). Keep `src/assets/gen/audio` out of the
  headless / library graphs (`tests/aud244aAudioManifest.test.ts` pins that).

## 8. Reproduce

```
npm run extract:audio                       # raw WAVs present -> encode only; absent -> record first (MGBA_PYTHON, default the vendor venv), then encode
node --experimental-strip-types tools/extract/extract-audio.ts --record   # force a fresh recording (~3 min) and re-encode
/srv/pokebench/vendor/mgba-venv/bin/python tools/audio/soundRecorder.py tools/audio/aud244a-asset-list.json .integration/evidence/aud244a/raw --kinds cry --rate 13379 --only cry:19:NORMAL
python3 tools/audio/validateAudioAssets.py   # decode + compare spot keys
```
Raw WAVs live in `.integration/evidence/aud244a/raw` (ignored, 88 MB at 26758 Hz; not in git).
