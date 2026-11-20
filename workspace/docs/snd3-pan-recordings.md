# snd3: pan recordings for the move-animation SEs (Blizzard / Gust sweeps and seven centred SEs)

Source: lds1m lead 4 (ISSUES #226). `SE_M_BLIZZARD` (153) and `SE_M_GUST` (132) sweep the pan -64 -> 63 at +2 per frame
(battle_anim.c `Cmd_panse` / `Task_PanFromInitialToTarget`). The manifest had no `se:153` at all and `se:132` only at +63, and
`LOOP_EXCEPTIONS` in `tests/snd1EmittedSesHaveAssets.test.ts` hid the gap. Sound stays write-only; no gameplay, timing or gain changed.

## 1. Census

Every (kind, id, pan) the engine can emit for move animations (`src/data/gen/anim-sound-timing.json` through `animSoundPan`, both
attacker sides, plus the `panse` sweeps' start / end pans) was compared with the manifest. 34 tuples had no exact asset:

| group | tuples | result |
|---|---|---|
| no usable recording (nearest pan 60+ units away or none) | 10 | **recorded** (section 2) |
| a recording 1-2 pan units away | 24 | left on the nearest-pan fallback; m4a pan law is y = 2 * pan, so 2 units is about 3% gain |

`tests/snd1EmittedSesHaveAssets.test.ts` now requires every emission to have a recording within `NEAREST_PAN_TOLERANCE = 2` and
`LOOP_EXCEPTIONS` is gone (it had no entry with a written reason).

## 2. New files (serve with the rest of the audio)

Ogg files are in `src/assets/gen/audio/`, the AAC twins in `src/assets/gen/audio/aac/` (same stem, `.m4a`); both are listed in
`src/assets/gen/audio/manifest.json` (`sounds`, `files`, `alt.files`). Vite emits them hashed under `dist/assets/` and `dist-lib/audio/`
like every other audio file (`vite.config.ts` `assetsInlineLimit` keeps them out of the inline limit), so the website needs no other change.

| manifest key | file (.ogg / aac/.m4a) | Ogg bytes | m4a bytes | notes |
|---|---|---|---|---|
| se:153:-64 | se-153-panm64 | 21386 | 20857 | SE_M_BLIZZARD, loop 11485..90487 @32768 Hz |
| se:153:63 | se-153-panp63 | 21544 | 21104 | SE_M_BLIZZARD, loop 11487..90489 |
| se:132:-64 | se-132-panm64 | 20123 | 21162 | SE_M_GUST, loop 11490..90492 |
| se:118:0 | se-118-panp00 | 8030 | 5305 | SE_M_THUNDERBOLT |
| se:135:0 | se-135-panp00 | 6642 | 4227 | SE_M_DOUBLE_TEAM |
| se:145:0 | se-145-panp00 | 9978 | 7722 | SE_M_FLAME_WHEEL2 |
| se:194:0 | se-194-panp00 | 6422 | 3780 | SE_M_SWAGGER2 |
| se:202:0 | se-202-panp00 | 15149 | 18846 | SE_M_PETAL_DANCE |
| se:228:0 | se-228-panp00 | 10614 | 11643 | SE_M_MORNING_SUN |
| se:229:0 | se-229-panp00 | 6703 | 4053 | SE_M_FLATTER |
| total | 10 | 126591 | 118699 | |

Ogg 126,591 B + m4a 118,699 B = 245,290 B together (about 239.5 KB). Manifest `totals.seBytes` 3,659,009 (was 3,532,418),
`alt.totals.seBytes` 2,904,773. `dist-lib/audio` after this step: 23,216 KB over 1,618 files (the 10 recordings account for +239.5 KB,
20 files; no other audio changed). The aud244a budget test (`BUDGET.se`) was raised to 3,700,000 for them.

Encoding is the committed pipeline: Vorbis q -0.1, pinned serial, SE 26758 Hz, loops 32768 Hz; AAC native 56 kbps at 32000 Hz with a
measured `leadSamples` (cross-correlation vs the Ogg). Loop points come from `tools/audio/loopCut.py`; all three loops are exact
(`seam.shortMaxAbsDiff` 0, 153 `maxAbsDiff` 1, so `exactLoop` plays them natively; AAC loops are crossfaded as for every AAC loop).

## 3. How `player.ts` renders a panned sweep

- `sfxSound` looks up the exact `se:id:pan` key, else the nearest-pan variant. A sweep's start SE now finds its own pan.
- The engine emits one `kind: "pan"` event per ROM step (`moveAnimSounds.ts` `panRows`). `panEvent` / `splicePan` retarget the playing
  SE1 / SE2 voice with m4a's pan law (`m4aPanGains`, y = 2 * pan, linear): one `setValueAtTime` gain change per step.
  An opponent attacker sweeps 63 -> -63 because `animSoundPan` mirrors the pan (the final value is 63 / -63, not 64).
- The preempting SE (Blizzard 153 by 154 after about 42 frames, Gust 132 by 133) cuts the voice as on the ROM.
- Approximated: the re-pan works on the mid signal (L+R)/2 of the start-pan recording, so the song's own stereo movement
  (`ply_pan` inside the SE) is lost once the pan moves; the first step equal to the recording's own pan is skipped. The recorded
  loop at the start pan is what plays throughout, not a recording per pan.
- `tests/snd3PanSweeps.test.ts` pins the engine sweep, the file fetched, `missing == 0`, the final gains equal `m4aPanGains(last)` and one
  gain change per step, for 153 and 132, both attacker sides.

## 4. Reproduce

```
python3 tools/audio/audioAssetList.py        # merges snd1-extra-se.json + snd3-extra-se.json into tools/audio/aud244a-asset-list.json
PY=/srv/pokebench/vendor/mgba-venv/bin/python
$PY tools/audio/soundRecorder.py tools/audio/aud244a-asset-list.json RAW  --kinds se     --rate 26758 --only se:194:0,se:118:0,...
$PY tools/audio/soundRecorder.py tools/audio/aud244a-asset-list.json FULL --kinds seloop --rate 32768 --passes 6 --only se:153:-64,se:153:63,se:132:-64
python3 tools/audio/loopCut.py FULL CUT --only se:153:-64,se:153:63,se:132:-64
FFMPEG=/path/to/ffmpeg node --experimental-strip-types tools/extract/add-audio-recordings.ts --keys <keys> --raw RAW [--loops CUT] [--check]
```

`add-audio-recordings.ts` adds only the named keys (Ogg, AAC with measured lead, manifest entries, totals) and refuses to overwrite an
existing file, so the existing 800 files are untouched. Method check: re-recorded `se:132:63` decodes within 17 LSB (rms 0.9) of the
committed file; `se:137:63` and `se:90:none` differ from their committed entries only in metadata / seam statistics.

## 5. lds1m lead 7: "recordings are 1.2-1.45x quieter than the game"

Result: **the recordings are not quieter.** Level in the game and in the recorder is the same; the ratio comes from comparing different windows. No
gain was changed. Probe: `tools/audio/snd3LevelProbe.py` (read-only; one SE_SELECT, a real RIGHT press on the rental screen of the canonical
Factory state, SE_SELECT is on SE2: song_table.inc).

| check | result |
|---|---|
| `gSoundInfo` at boot and in the probe | masterVolume 12, reverb 50, maxChans 5: the same in the game and in the recorder's snapshot |
| SE2 `MusicPlayerInfo` (0x30 bytes) and track 0 (0x50 bytes), first frame after the call, press vs register-poke | byte-identical |
| silenced state (the recorder's own), per-sample RMS of the trimmed sound, press vs poke | 1514.1 vs 1525.5 (0.993); manifest `se:5:none` 1521.08 |
| BGM playing, muted with `m4aMPlayVolumeControl` (what lds1m used), press minus the run without the press vs the solo press | RMS ratio **1.0017**; per-frame RMS 2059 1815 3053 1803 1606 2947 ... vs solo 2074 1815 3058 1764 1606 2947 ... (the first 3 mixer frames agree within 1%) |
| the recorder's poke vs the press (same silenced state) | same level; the poke is one mixer frame short in the first frames (2183 3264 ... vs 2074 1815 3058 ...) and the in-game tail is about 0.3 frame longer: whole-sound energy is +4% in amplitude (8922 vs 8165 samples). This is timing (when in the frame the call lands), not gain |

Why 1.2-1.45 appears: SE_SELECT is 14 frames of non-stationary sound (loud first 8 frames, a decaying tail). In-game RMS over the first k frames from the
call divided by the manifest RMS of the whole trimmed recording (1521.08, 8319 samples) is 1.42 (k = 8), 1.35 (10), 1.27 (12), **1.19 (14 = `lengthFrames`)**,
1.11 (16), 1.05 (18), 0.995 (20). So a short in-game window against a whole-file RMS gives the quoted ratios (SE_SELECT 1.22 is k = 13). Which window
lds1m's / snd1's measurement used is not recorded, so this is the cause that reproduces the numbers, not a proof of the original script. Not measured:
the ball-tray BALL / EXIT in battle (no battle state in the probe; snd1 already found a register-poked BALL in battle equals its recording).

Unrelated, but it would look the same in a full-mix comparison: with the BGM at full volume the same press changes the BGM itself (`maxChans` is 5, the
SE takes DirectSound voices from the BGM): press minus no-press RMS 1734 against the SE alone 1055. A recording of the SE alone cannot contain that.

Reproduce: `PYTHONPATH=/srv/pokebench/vendor/libmgba-py /srv/pokebench/vendor/mgba-venv/bin/python tools/audio/snd3LevelProbe.py OUT.json` (about 4 minutes).
