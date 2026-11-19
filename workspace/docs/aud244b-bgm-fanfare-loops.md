# aud244b: BGM / fanfare / looping-SE recordings with ROM loop points (S11 audio, design step 8, second half)

Result: the aud244a recorder now also records the 4 BGMs (354, 412, 469, 476), the 3 fanfares (368, 459, 466) and the two SEs that never end (SE_LOW_HEALTH `se:90:none`,
SE_M_GUST `se:132:63`). The BGMs and the two SEs carry **ROM-derived loop points** (`loopStartSamples` / `loopEndSamples`) in `src/assets/gen/audio/manifest.json`
(schema `aud244b-audio-manifest/2`). Those are the only song ids in the 147 committed ROM sound logs (`tools/audio/aud244a-asset-list.json` `songs`: 7 rows). MUS_VS_FRONTIER_BRAIN
(471) loops in the ROM but is not in any log, so it is not recorded. **Fanfares do not loop** (`songLoops`: no GOTO in MUS_HEAL / MUS_OBTAIN_B_POINTS / MUS_OBTAIN_SYMBOL; the recorder
sees every player go inactive), they are one-shot like an SE. No `src/*.ts` changed; nothing imports the assets yet (aud245).

Sizes (bytes): before aud244b **6,141,280** (SE 1,591,978 + cry 4,549,302). After **7,450,299** = SE 1,618,342 (+26,364: the two loop SEs) + cry 4,549,302 + song **1,282,655** (4 BGM + 3 fanfares).
Budgets in `tests/aud244aAudioManifest.test.ts`: SE 1.7 MB, cry 4.7 MB, song 1.4 MB, total 7.6 MB.

## 1. Method

1. `tools/audio/soundRecorder.py --kinds bgm,fanfare,seloop --rate 32768 --passes 6` (same silenced baseline snapshot + register-poke call as aud244a). BGM: `PlayBGM`; fanfares:
   `m4aSongNumStart` on the song's own player (`PlayFanfare` would stop the BGM and create the task that resumes it, so the recording would never end); looping SEs: `PlaySE` / `PlaySE*WithPanning`.
   The player's tick counter (`MusicPlayerInfo.clock`, +0xC) and `tempoC` are logged per frame next to the audio, with the per-frame sample counts. A loop is recorded until
   the player clock reaches `loopStartTick + passes * (loopEndTick - loopStartTick)`; a one-shot until every channel is inactive (as in aud244a). Raw WAVs (`<stem>-full.wav`) stay in the ignored `.integration/evidence/aud244b/full32/`.
2. **Sample rate 32768 Hz, not 26758 / 13379.** The GBA mixer output grid is 512 cycles (32768 Hz, 548.625 samples per 280896-cycle frame). Recording on that grid is the only way a loop of an
   integer number of ROM frames is an integer number of samples (e.g. 48 frames = 26334 samples). Other rates resample the ROM mix and add rate-conversion jitter at the seam.
3. **ROM loop points.** `tests/fixtures/data/audio-sound-sources.json` `songLoops` (aud238) gives, per BGM, `loopStartTick` (GOTO target) and `loopEndTick` (the GOTO) in song ticks; the two SEs have no
   patterns, so `tools/audio/songTicks.py` sums their `W` waits from `sound/songs/midi/se_low_health.s` / `se_m_gust.s` (loop 0..36 and 24..72 at 150 BPM). The player advances `BPM / 150` ticks per VBlank,
   so a loop of `T` ticks lasts `T * 150 / BPM` frames (SE_LOW_HEALTH 36, SE_M_GUST 48, MUS_VICTORY_TRAINER 846.99, MUS_VICTORY_GYM_LEADER 2504, MUS_B_FACTORY 3700, MUS_VS_TRAINER 4655).
   Logged `clock` values give the frame where each pass boundary (`loopStartTick + k * period`) falls, and the cumulative per-frame sample counts (minus the trimmed `onsetSamples`) give the sample.
4. **Cut (`tools/audio/loopCut.py`).** Pass 0 is not steady state (intro, first voice start-ups, reverb build-up), so the body comes from a pass `a >= 1`. For every candidate body of `m = 1..4` whole passes and every start pass `a`,
   the end `E` is searched +-1.5 frames around the clock-derived boundary. The score is the max abs difference between the audio **after** `E` (what the ROM plays after the GOTO) and the audio after the start `S`,
   and between the audio **before** `E` and before `S`, over a window of 8192 samples (stereo, both channels). The smallest `m` whose seam is within `max(16, 1.5 x best)` of the best wins.
   File = `rec[0 : S_0]` (ROM-exact intro, up to the GOTO target) + `rec[S_a : E]` (steady-state body). `loopStartSamples = S_0`, `loopEndSamples = S_0 + (E - S_a)` = file length.
   The player plays samples `[0, loopEnd)` once, then repeats `[loopStart, loopEnd)`.
5. `npm run extract:audio` encodes stereo OGG Vorbis (wasm-media-encoders@0.7.0, `vbrQuality -0.1`, pinned serial, byte-identical reruns) and writes the manifest. Vorbis is lossy: decoded files are
   frame-exact (`granule == lengthSamples`) but not sample-identical to the cut WAV (SNR 11-22 dB, flat-spectrum noise is the worst case, as in aud244a).

## 2. Loop table (what the manifest holds)

Tick values are song ticks; `ms` = frames x 16.74; seam diffs are max abs / rms over 8192 stereo samples (forward + backward window, signal rms in the last column). "intro -> loop junction" is the max abs diff of the
last 512 samples of the cut intro against the same span before the source loop start (1 = the spliced loop continues the intro exactly).

| key | song | ticks start..end (BPM) | frames / loop | passes in body | loopStartSamples | loopEndSamples | loop length | seam max / rms | short seam (256 smp) | junction | signal rms | OGG bytes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bgm:354 | MUS_VICTORY_GYM_LEADER | 345..2649 (138) | 2504.0 | 1 | 200,206 | 1,573,963 | 1,373,757 | 1140 / 61.7 | 0 | 1 | 2668 | 240,662 |
| bgm:412 | MUS_VICTORY_TRAINER | 112..880 (136) | 846.99 | 1 | 62,425 | 527,110 | 464,685 | 5755 / 1582.9 | 3067 | 10742 | 2856 | 96,329 |
| bgm:469 | MUS_B_FACTORY | 168..3720 (144) | 3700.0 | 1 | 94,868 | 2,124,781 | 2,029,913 | 6204 / 1325.0 | 1740 | 7762 | 3048 | 403,728 |
| bgm:476 | MUS_VS_TRAINER | 960..7104 (198) | 4655.0 | 1 | 398,219 | 2,952,068 | 2,553,849 | 3808 / 1008.6 | 3378 | 15923 | 3432 | 467,847 |
| se:90:none | SE_LOW_HEALTH | 0..36 (150) | 36.0 | 1 | 0 | 19,743 | 19,743 | 3853 / 580.4 | 494 | n/a (no intro) | 1999 | 6,098 |
| se:132:63 | SE_M_GUST | 24..72 (150) | 48.0 | 3 | 11,492 | 90,494 | 79,002 (3 x 26,334) | **123 / 0.87** | **0** | 11316 | 2516 | 20,266 |

Fanfares (one-shot, `loops: false`, trimmed like SEs, 32768 Hz stereo): fanfare:368 MUS_HEAL 139 frames, 66,716 samples, 16,096 B; fanfare:459 MUS_OBTAIN_B_POINTS 266 frames, 136,367 samples, 26,735 B;
fanfare:466 MUS_OBTAIN_SYMBOL 334 frames, 163,722 samples, 31,258 B.

Forward / backward split of the seam max (raw cut, before Vorbis): bgm:354 1140 / 542, bgm:412 5467 / 5755, bgm:469 6204 / 5775, bgm:476 3378 / 3808, SE_LOW_HEALTH 3853 / 3069, SE_M_GUST 123 / 0.
Chosen end vs the clock-derived boundary (`nominalEndShift`, samples): +1, -3, +1, **+549 (one frame)**, -9, +2.

## 3. How good is the seam, honestly

* **SE_M_GUST is effectively sample-exact**: 48 frames x 548.625 = 26,334 samples exactly, the body is three loop periods (the ROM state recurs after 3 passes), the 8192-sample window after the wrap matches
  the one after the loop start with max abs diff **123, rms 0.87** (backward window 0, first 256 samples 0; the signal rms is 2516, peak 11301). Decoded from the OGG the wrap step is 3320 against a body maximum adjacent-sample step of 4940.
* **bgm:354 is exact at the wrap itself**: short-window diff 0, intro -> loop junction diff 1, 8192-window max 1140 / rms 61.7 (2.3 % of the signal rms), decoded wrap step 3. Its loop is exactly 2504.000 frames, a multiple of 8.
* **bgm:412 / 469 / 476 and SE_LOW_HEALTH are not periodic at the sample level**, so a splice cannot be bit-exact with the ROM: seam max 3808..6204, rms 580..1583 against a signal rms of 2000..3430
  (whole-body pass-vs-pass rms diff is of the same size: bodyRmsDiff 1814 / 1508 / 3430 / 539). Reasons (1 measured; 2 and 3 are the likely causes, not isolated per channel):
  1. mGBA's per-frame sample counts jitter (447 / 448 / 450 / 451 at 26758 Hz, 548 / 549 at 32768) and the output phase is not restored by a state load, so two recordings are not sample-aligned.
     A loop that is not a multiple of 8 frames (bgm:412 846.99, bgm:469 3700 = 462.5 x 8, bgm:476 4655, SE_LOW_HEALTH 36) lands on a different 512-cycle grid phase on every pass.
  2. Likely (the measured symptom, not isolated per channel): PSG / noise channels run their own counters / LFSR, so the waveform phase at the next pass is not tied to the song tick and passes differ by up to one
     edge (max diff ~ the peak) even where the schedule is identical (SE_LOW_HEALTH: max diff 3853 vs peak 4962). The tempo residue (`tempoC`) also needs many passes to close (17 for 412, 23 for 354, more than the 6 recorded).
  3. Voices straddling the GOTO: pass 0 and pass 1 start from different voice states, which is why the body is taken from a later pass (a >= 1).
  The seam search still picks the best candidate across passes and ends within +-1.5 frames, so the click risk is bounded by the table above; decoded `wrapRatio` (wrap step / body p99 step):
  bgm:354 0.002, bgm:469 0.154, SE_LOW_HEALTH 0.018, bgm:412 1.05, bgm:476 1.12, SE_M_GUST 1.49 (noise-like signal, wrap < the body's max step 4940).
* bgm:476's best end is one whole frame (549 samples) after the clock boundary; the clock logging is per frame, so +-1 frame is expected, but for that song the correlation chose the later one.

What aud245 should do: play `[0, loopEnd)` then loop `[loopStart, loopEnd)` (`AudioBufferSourceNode.loopStart/loopEnd = samples / 32768`); for the four non-exact loops use a short (e.g. 5-10 ms) equal-power crossfade
at the wrap or a gain dip, as the seam diffs above are 12-70 % of the body's peak at the worst sample. SE_M_GUST and bgm:354 need none.

## 4. Manifest additions (`aud244b-audio-manifest/2`)

* `sampleRates.song = 32768`; `totals.songBytes`; `excluded` is now `[]` (se:90:none and se:132:63 are in).
* Sound kinds `bgm` (`bgm:<song>`) and `fanfare` (`fanfare:<song>`), 2 channels at 32768 Hz, offset 0, `id` = song id, `name`, `via`, `lengthFrames` (fanfares: frames until inactive; loops: `null`).
* The two looping SEs keep kind `se` with `loops: true` at 32768 Hz (all other SEs stay 26758 Hz).
* Loop fields (all `loops: true` sounds): `loopStartSamples`, `loopEndSamples` (= `lengthSamples`), `loopPasses`, `loopStartTick`, `loopEndTick`, `tempoBpm`, `seam {windowSamples, maxAbsDiff, rmsDiff, shortMaxAbsDiff, shortRmsDiff, junctionMaxAbsDiff, bodyRms, sourcePass, nominalEndShift}`.
* `onsetSamples` = trimmed leading mixer latency at 32768 Hz; file time `t` = ROM time minus `onsetSamples / 32768` s (the 2-frame ROM startup latency is trimmed, as for SEs).

## 5. Validation

* `tools/audio/validateAudioAssets.py` decodes the 9 new files with libvorbisfile: decoded length == `lengthSamples`, no clipping, Pearson / SNR vs the cut WAV (0.95-0.997, 10-22 dB), recomputes the seam metric from the raw multi-pass
  recording (must equal the manifest) and the decoded wrap step; SE_M_GUST must have seam max <= 200 and wrap <= the body's largest step. Skips the raw-dependent checks when the ignored evidence is absent.
* `tests/aud244bAudioLoops.test.ts`: the loop set is exactly 4 BGM + 2 SE, fanfares are one-shot, loopEnd == file length, loop ticks equal the `songLoops` ROM values, loop length = whole passes of `ticks x 150 / BPM` frames
  (+-1 frame), loopStart at the GOTO-target tick (+-2 frames, minus onset), SE_M_GUST seam pinned. `tests/aud244aAudioManifest.test.ts` was adapted (schema /2, song rate / bytes, `excluded` empty, budgets).
  The headless / library graph tests still pin that nothing imports `src/assets/gen/audio`.

## 6. Reproduce

```
cd workspace
export PYTHONPATH=/srv/pokebench/vendor/libmgba-py          # needed in a worktree (oracle/emerald_core.py looks for vendor/ one level too high)
PY=/srv/pokebench/vendor/mgba-venv/bin/python
$PY tools/audio/soundRecorder.py tools/audio/aud244a-asset-list.json .integration/evidence/aud244b/full32 --kinds bgm,fanfare,seloop --rate 32768 --passes 6 --force
python3 tools/audio/loopCut.py .integration/evidence/aud244b/full32 .integration/evidence/aud244b/cut --table .integration/evidence/aud244b/seam-table.json   # ~75 s, pure python
npm run extract:audio -- --raw <dir with the aud244a SE / cry raw WAVs>      # encodes OGG + manifest (add --record to re-record everything)
python3 tools/audio/validateAudioAssets.py --raw <aud244a raw dir>
npx vitest run tests/aud244aAudioManifest.test.ts tests/aud244bAudioLoops.test.ts
```
`extract:audio` records only when a raw dir is missing; in a fresh worktree pass `--raw` to the main checkout's `.integration/evidence/aud244a/raw`, otherwise the recorder re-runs (and `audioAssetList.py` rewrites
`aud244a-asset-list.json` from the logs it can see; revert that file if it changes).

## 7. What aud245 needs

* A WebAudio player that decodes `bgm-*.ogg` / `fanfare-*.ogg` / `se-*.ogg` (all stereo), schedules `loopStart` / `loopEnd` from the manifest (divide by `sampleRate`), and resamples via the AudioContext. Pan for the two loop SEs is baked in
  (`se:132:63` is the +63 pan recording).
* Start/stop semantics are ROM logic already in the sound-event stream (aud237..aud243): fanfare start = BGM stop (PlayFanfare), BGM resume at fanfare end, `StopMusic` / fade events for the loops.
* A seam policy for the four non-exact loops (crossfade at the wrap, section 3). A different option, if the crossfade is judged too audible, is to re-cut with a longer window/passes budget (`loopCut.py --window`, `MAX_PASSES_PER_LOOP`); a seam search
  over more passes only helps if the underlying PSG / tempo phase ever recurs, which was not seen within 6 recorded passes.
* The aud244a cry rate decision (13379 Hz) is unchanged.

## 8. bgm1: MUS_VS_FRONTIER_BRAIN (471) recorded (ISSUES #224)

A Factory Head battle plays `MUS_VS_FRONTIER_BRAIN` (`GetBattleBGM`: `TRAINER_FRONTIER_BRAIN` / the Factory Head's trainer class gives 471, every other Factory trainer 476). The song was missing from the asset list, so a Brain battle was silent
(`stats.missing`). Sound asset only: no gameplay, RNG, kernel event or frame timing change, and no `src/` file changed.

**Audit.** Every bgm / fanfare id the engine can emit in a Factory challenge, driven through the real emitters (`initialMusic.ts`, `battleStartSounds.ts`, `battleEndSounds.ts`, `screenSounds.ts`) against the shipped manifest:

| kind | ids | state |
|---|---|---|
| bgm | 354 (Brain win), 412 (trainer win), 469 (Lobby / room / draft), 476 (trainer battle) | recorded since aud244b |
| bgm | 471 (Brain battle) | **was missing, recorded here** |
| fanfare | 368 MUS_HEAL, 459 MUS_OBTAIN_B_POINTS, 466 MUS_OBTAIN_SYMBOL | recorded since aud244b |

Nothing else was missing. `tests/bgm1EmittedSongsHaveAssets.test.ts` pins it (Tier 1): the emitted set is exactly bgm {354, 412, 469, 471, 476} + fanfare {368, 459, 466}; each has a manifest entry, an Ogg, an AAC twin and a `song-players.json` row;
every exported `BGM_*` / `MUS_*` song constant under `src/engine` has an entry; and the files that may emit `bgm` / `fanfare` events are pinned (a new emitter file fails the test until its ids are added). It failed for 471 before the recording.
Still unmeasured, as before: the Gold / Silver Brain songs (`MUS_VS_FRONTIER_BRAIN` is the Emerald-side id the engine emits) and the Brain loss end row (`docs/aud241c-battle-end-sounds.md`).

**Recording.** `EXTRA_SONGS` in `tools/audio/audioAssetList.py` adds the song to `aud244a-asset-list.json` (no log reaches it), then the same recorder, loop cut, encoder and AAC step as the other songs (section 6):

| | value |
|---|---|
| file | `bgm-471.ogg` 491,169 B (479.6 KiB), `aac/bgm-471.m4a` 769,915 B (751.9 KiB), leadSamples 0 |
| length / intro / loop body | 3,081,046 samples (94.03 s) = 128,895 (3.93 s) + 2,952,151 (90.09 s, 5381 frames); loopEnd = file length |
| tempo / ticks | 190 BPM, 6816 ticks per loop, recorded 32,600 frames over 6 passes |
| seam | max 4827, rms 1250, short-window 3808: not exact, like 412 / 469 / 476, so the player gives it the 7 ms crossfaded overlapping passes |

`song-players.json` already covered 471 (unchanged). Budgets in `aud244aAudioManifest.test.ts` moved (songs 1.4 MB to 1.85 MB, total to 8.4 MB; songs 1,282,655 to 1,773,824 B, Ogg total 8,311,054 B); the loop lists in `aud244bAudioLoops.test.ts` / `aud245AudioPlayer.test.ts` are now five BGMs.

**Reproduce 471 alone** (the recorder is deterministic; `extract:audio` wipes the whole audio dir, so rerun the other two steps after it; `FFMPEG` must be an ffmpeg with the native `aac` encoder, the Playwright one has none):
```
$PY tools/audio/soundRecorder.py tools/audio/aud244a-asset-list.json <dir> --kinds bgm --rate 32768 --passes 6 --force   # then loopCut.py as in section 6
npm run extract:audio -- --raw <aud244a raw dir>
npm run extract:audio-song-players
FFMPEG=<ffmpeg with aac> npm run extract:audio-aac      # ~3 min, run in the foreground
```
Everything except 471 comes back byte-identical.

**Browser check** (`tools/browser/bgmBrainCheck.mjs`, `npm run build` first, `POKEBENCH_BROWSER_DIR` = a dir with Playwright; Ogg and `--format aac`). Headless Chromium cannot be heard, so it reads the audio graph instead: it loads the built `player-*.js` chunk with the shipped files,
pushes the Brain battle's events as the real emitters produce them (`stop 469`, `bgm 471` at frame P, `fade 471 speed 5`, `bgm 469`) in real time, and taps `AudioContext` (source `start` / `stop` args, gain ramps, an analyser on the destination). Passed in Ogg and AAC:
the 471 file is fetched and decodes to 94.03 s, plays from file offset 0 (a late file load starts it at the matching offset, `stats.late`), the destination carries signal; at 90.09 s the second pass starts at loopStart - 7 ms, 7 ms before the loop end (crossfade), and the third pass one loop period later, no silent
analyser window at the wrap; the result fade is one linear ramp to 0 ending 1.305 s after the event (16 x 5 frames = 1.34 s), silent afterwards; with the full forfeit end the 469 song replaces 471 and both 471 sources are stopped by the time 469 starts. This is an audio-graph assertion, not a listening test.
