# cry1: cries inside move-animation tasks (ISSUES #219 family 3, Scene ON)

Sound-only (no gameplay, RNG, text, command list, presentation length or frame hash change). `moveAnimSounds.ts emitCryTaskRows` plays the cry tasks of `battle_anim_sound_tasks.c`:
Roar = `SoundTask_PlayDoubleCry` (ROAR_1, ROAR_2), Howl = `SoundTask_PlayCryHighPitch` (HIGH_PITCH), Hyper Voice = `SoundTask_PlayCryWithEcho` x2 (ECHO_START / ECHO_END), with the attacker's species, pan -64 (player) / 63
(opponent), BGM duck 85 and the restore (256). Scene OFF emits nothing (HITMARKER_NO_ANIMATIONS). The ROM logs `noop` duck / stop rows (BGM already at 85, nothing to stop); the engine emits only the effective rows.

## Anchor (script frames; engine frame = animation command start + 11 + script frame)

| move | rows (script frame) |
|---|---|
| Roar | ROAR_1 + duck 85 at 6 (after loadspritegfx + monbg); ROAR_2 at 17 (+11, always); restore at 17 + D_R2 |
| Howl | HIGH_PITCH + duck at 34 (3 + `delay 12` + RoarEffect's `delay 15` + 2 per the extractor rules); restore at 34 + D_HP |
| Hyper Voice | ES + duck at 5 (task created at 3; its c0 stop at 3 is a ROM no-op); stop at 5 + D_ES; EE at 6 + D_ES; round-2 c0 stop at 58 (ES1 + 53, species independent); ES2 at 60; stop at 60 + D_ES; EE2 at 61 + D_ES; restore at min(61 + D_ES + D_EE, 103) |

Hyper Voice's final restore is the earlier of EE2 + D_EE (IsCryPlaying false, short species) and the animation's `DestroyAnimSoundTask` (ES1 + 98; long species). It falls after the engine's presented animation
(the stateless script row stops at 95), so the restore is scheduled from the first cry (`scheduleAnimTaskBgmRestore`), as the send-in / faint restores are.

## Measured (step-mode probe, `tools/audio/fixtures/cry1-*-on.json`, `tools/battle-lab/cry1-*.json`; engine = ROM + lab drift)

| lab | species | ROM first cry | drift (engine - ROM) | first cry vs command start |
|---|---|---|---|---|
| cry1-roar-pidgey-player-on | 16 | 392 | +13 | +17 |
| cry1-roar-jynx-player-on | 124 | 390 | +13 | +17 |
| cry1-roar-pidgey-opp-on (pan 63) | 16 | 408 | +1 | +17 |
| cry1-howl-jynx-player-on | 124 | 87 | +4 | +45 |
| cry1-hypervoice-pidgey-player-on | 16 | 69 | 0 | +16 |
| cry1-hypervoice-jynx-player-on | 124 | 67 | 0 | +16 |

Every effective row of each window (id, pan, mode, duck 85, the stops, the duck 256) equals the engine's at one delta (`tests/cry1CryTasks.test.ts`). Hyper Voice has zero drift (the anchor); the Roar / Howl labs carry their earlier-battle
drift, so their script-frame offsets (6 / 34) rest on the extractor rules + the Hyper Voice anchor, not on a drift-free window (the Howl +4 follows a 2-frame `stat` command, whose SE 239 is itself +2 late). Fillers: the labs' other side uses Seismic Toss
(a modelled animation; Splash is unmodelled and left a ~95-frame engine / ROM gap).

## Length model

Cry length in frames t = size * 16777216 / ((freq // 1024) * 280896) of the species' cry sample (`tools/audio/genCryNativeFrames.py` -> `src/data/cryNativeFrames.ts`). Per mode: **D = min(cap, ceil(K t) + 1)**, D = frames from the
PlayCry call to the stop (ES) / the IsCryPlaying restore (EE, R2, HP); fitted K per mode (`src/engine/cryTaskLengths.ts`):

| mode | K | cap | ROM species (zero residual) | feasible K interval (all points) |
|---|---|---|---|---|
| ES (ECHO_START -> stop) | 0.94996 | 26 | 41 | 0.9488 .. 0.9511 |
| EE (ECHO_END -> restore) | 0.970325 | 141 | 41 | 0.97023 .. 0.97042 |
| R2 (ROAR_2 -> restore) | 0.944111 | 61 | 32 | 0.9433 .. 0.9449 |
| HP (HIGH_PITCH -> restore) | 0.919943 | 51 | 35 | 0.9196 .. 0.9203 |

Data: `tests/fixtures/cry1-lengths.json` (one ROM window per species, `.integration/evidence/cry1/`; species 287 excluded, its lab produced no cry). Validation history: three held-out rounds with the model's earlier constants (19/26, ~21/29, 26/31 exact,
every miss +-1) led to the integer offset + one K per mode; a **fourth, pre-registered round** (interval-centre K, species chosen closest to a step edge, 8 Hyper Voice / 8 Roar / 8 Howl) was exact on **32 / 32** rows (ES 8, but 7 capped; EE 8, R2 8, HP 8). The model is a fit, not a ROM table: a species
whose K t lies within ~0.01 of an integer can still be off by one. Species outside the Factory table (`cryNativeFrames.ts`) get the first cry only.

## Rescore

- **T1** (`soundCensusDelta.py --t1`, census 0..999 Scene ON, HEAD `6bcc6705a`): `missing-cry-task` **371 -> 0** (ROAR 336, HYPER VOICE 27, HOWL 8; a site counts emitted when its command window holds a cry-task cry); the other classes are unchanged by this step (cry rows are not `se` / `pan`).
- **T2** (aud248RunSeed.sh, Scene ON seeds 2 / 1028; seeds 165 / 499 / 830 use none): only seed 2 plays these moves, two Roars (ROM ROAR_1 / ROAR_2 at 9540 / 9551 and 10717 / 10728, restore 43 after ROAR_2). Engine 9596 / 9607 and 10828 / 10839, restore +43 after ROAR_2: ROM-only cry rows 4 -> 0, extra 0; the pair of
  each Roar is at the lab's segment delta (+56, +111), ROAR_2 - ROAR_1 = 11 and the restore delay identical to the ROM's.

## Neutrality

- `compare:differential --harness-from-head` vs `029d0943b`: cry1-roar-jynx-player-on, cry1-hypervoice-jynx-player-on, cry1-howl-jynx-player-on 1823 / 1823 captures each byte-identical (traces built from the fixtures' `trace`; not committed).
- `lsd194Census.sh` seeds 0..99 Scene ON, `029d0943b` vs the change: 0 errors; `sound` / `soundDigest` differ on 9 seeds (12 Roars: 24 cries, 24 duck rows); `eventsDigest`, `commands`, `soundAnim` identical on all 100.

## Residuals

- (Closed by cry2, below: the cry-task modes play their own recordings.)
- Roar / Howl script-frame offsets are unverified apart from the lab drift (above); the Howl +4 is unexplained.
- The engine's Hyper Voice animation is ~8 script rows shorter than the ROM's (DestroyAnimSoundTask restore lands in the next command); the restore is scheduled, not row-gated.
- A species outside the measured intervals can be +-1 on D; a Roar behind a Substitute / in Scene OFF, and cries when the user is a species-0 mon, are not measured (species 0 plays nothing).

## cry2: assets + player

Playback only (`src/engine` untouched: frame hashes, `ENGINE_BUILD` and the headless graph unchanged).

- **Which sounds.** `tools/audio/audioAssetList.py` derives (species, mode) from `src/data/gen/battle-frontier-mons.json` (all 882 sets): MOVE_ROAR -> ROAR_1 + ROAR_2 (37 species, 41 sets; 35 within Level 50's 0..849),
  MOVE_HOWL -> HIGH_PITCH (Loudred), MOVE_HYPER_VOICE -> ECHO_START + ECHO_END (Exploud), plus all five modes for the 7 species that can run another move as themselves (Metronome: Abra, Chansey, Clefable, Cleffa; Assist: Sentret;
  Mimic: Jigglypuff, Abra; Mirror Move: Spearow). **112 sounds on 46 species** (ROAR_1 44, ROAR_2 44, HIGH_PITCH 8, ECHO_START 8, ECHO_END 8), not 376 x 5 = 1,880. A species outside the set playing a task mode (a lab, a future Copycat) falls back to NORMAL.
- **Recording.** The existing recorder, ROM `PlayCryInternal(species, pan 0, volume 120, priority 10, mode)`: every mode's pitch, length, release, chorus and reverse (ECHO_START) are in the recording. Natural lengths 11..91 frames,
  none capped, none clipped. Left/right difference is up to 6.5% of the peak (cry:173:ECHO_END; ROAR 2%, ECHO modes 4-6%: the chorus voice), above the base cries' 5.1%; like them it is stored as the (L + R) / 2 mono mix and panned at runtime, so only the chorus's stereo spread is lost. Encoded like the base cries (Ogg 13379 Hz mono, AAC 16 kbps twin at 16000 Hz), packed per species into a **second file** `cry-NNN-task.ogg` / `aac/cry-NNN-task.m4a`:
  the 566 existing files are byte-identical and an ordinary cry never fetches the task modes. `validateAudioAssets.py` (default keys now include ROAR_2 / HIGH_PITCH / ECHO_END): decoded correlation 0.97-0.99, SNR 11-16 dB, no clipping (as the base cries).
- **Bytes.** cry Ogg 4,549,302 -> 4,918,888 (+369,586), AAC 4,237,939 -> 4,553,498 (+315,559); total manifest 7,450,299 -> 7,819,885 (Ogg), 7,376,225 -> 7,691,784 (AAC). Files 566 -> 612, sounds 1,318 -> 1,430. Budgets in `tests/aud244aAudioManifest.test.ts` re-pinned (cry 5.0 MB, total 8.0 MB).
- **Player.** `CRY_MODE_NAMES` (`src/audio/player.ts`) maps 3 / 4 / 6 / 7 / 8 as well as 0 / 5 / 11; `startCry` plays the mode's own sample and falls back to the species' NORMAL cry only when that asset is missing (`stats.cryFallbacks`; `missing` only when neither exists).
  No WebAudio re-synthesis. The BGM duck / restore, pan, volume and `stop` (the Hyper Voice stops cut a reversed ECHO_START at its ROM frame) are the unchanged event paths.
- **Tests.** `tests/cry2CryTaskPlayer.test.ts` (mode ids == the engine's `CRY_MODE_*`; all 112 recorded cries resolve to their own offset / length / file, never NORMAL's; the base modes unchanged; a trimmed manifest falls back and counts it; AAC twins present),
  `tests/aud244aAudioManifest.test.ts` (the 112 are exactly the data-derived set; separate `-task` files).
- **Browser** (`tools/browser/audioCheck.mjs`, Chromium, built bundle, `?audio=1`, 7,200 frames = 122 s real time): 0 console errors, 22 files fetched / decoded, 0 missing, 0 cry fallbacks; all 92 `cry-NNN-task` files (46 Ogg + 46 AAC) decode in the real browser and cover their slices (new check in the tool).
  The seed-3 winning run plays only NORMAL / FAINT cries, so **no task cry sounded live in the browser**: that path is proven by the fake-context test plus the decode check, not by ear. The tool's per-kind event check was stale since aud247 (the seeded music's 2 restore replays count in `events`); it now subtracts `stats.restored`.
- **Not done / residual.** The cry-task lengths used by the engine (`cryTaskLengths.ts`) are cry1's fit, not these recordings' lengths (the recorder's channel-activity length of ECHO_START / ROAR cries differs from the fitted stop-to-restore delay; they measure different ROM events).
  Re-running `audioAssetList.py` now also lists 36 newer SE tuples from logs added since aud244a (not recorded; the committed list kept its SE / song rows).

## cry3: source-derived NORMAL / WEAK cry lengths for every Factory species (S11 audio, sound-only)

`src/engine/screenSounds.ts` `startCry` gave a BGM restore (and, since aud253, the switch-in `HandleLowHpMusicChange` / SE_LOW_HEALTH at it) only to the five WEAK species someone had measured (`WEAK_CRY_FRAMES`: Onix + 9 / 83 / 130 / 198); every other
WEAK send-out stayed ducked with no restore. cry1's per-mode fit was not a ROM table; cry3 shows it is the **exact** consequence of `PlayCryInternal`'s pitch argument, so one derivation covers every mode.

**Derivation** (`tools/audio/genCryModeFrames.py` -> `src/data/cryModeFrames.ts`, `npm run extract:cry-mode-frames`; reference/ source only, byte-identical on two runs):
- `PlayCryInternal` (src/sound.c, the switch is parsed, not copied): every mode is one note of the species' sample with a pitch and a note length (default 140): NORMAL 15360, **WEAK 15000** (length 140, release 0), FAINT 14440, ECHO_START 15600 / 25, ECHO_END 15555, ROAR_2 15616 / 60, HIGH_PITCH 15800 / 50.
- `SetPokemonCryPitch` (src/m4a.c): `b = pitch + 0x80`, key `(b >> 8) & 0x7F`, tune `((b >> 1) & 0x7F) - 64`; `TrkVolPitSet`: `x = tune * 4`, keyM `x >> 8`, pitM `x & 0xFF` (WEAK: key 59, tune -52 -> key 58, fine 48; NORMAL: key 60, fine 0).
- `MidiKeyToFreq(wav, key + keyM, pitM)` with the exact gScaleTable / gFreqTable integer arithmetic gives the channel frequency in whole Hz (key 60 / fine 0 = `freq >> 10`, so NORMAL is the offs152 formula); the mixer advances `divFreq / 2^23` sample per output sample
  (`divFreq = (16777216 / pcmFreq + 1) >> 1`, `pcmFreq = (597275 * 224 + 5000) / 10000`, SOUND_MODE_FREQ_13379). Length in frames = `min(note length, ceil(size * 2^23 / (F * divFreq * 224)))`; the BGM restore (`IsCryPlaying` false, `Task_DuckBGMForPokemonCry`) is one frame later.
- WEAK is the NORMAL cry 1.1104x longer (2^(1.8125/12) in a real-valued model; the integer tables decide the last frame). Only Jynx (124) WEAK exceeds the note length (149 -> 140; ROM 141 = 140 + 1), the same cap cry1 fitted (`cap = length + 1`).

**Proof.** `tools/audio/cryLengthProbe.py` (register-poke `PlayCry_ByMode(species, 0, mode)` on the oracle's canonical snapshot, `soundRecorder.py`'s Recorder; counts frames to `IsPokemonCryPlaying` false and to the BGM-duck task's restore) was first calibrated on the five known WEAK species
(restore 62 / 25 / 79 / 65 / 54 = the aud251 chain windows and Onix), then run on **all 376 Factory species in NORMAL, WEAK and FAINT** (1,128 ROM measurements, ~40 s; `tests/fixtures/cry3-lengths.json`, raw `.integration/evidence/cry3/`). Derived length + 1 equals the ROM on **1,128 / 1,128**
(NORMAL 376 = `SEND_IN_TAIL_OFF_CRY_FRAMES` exactly, max 134; WEAK 376, max 140; FAINT 376). The same derivation reproduces **all 149** cry1 step-mode species-modes (ES 41, EE 41, R2 32, HP 35) and cry1's fitted `cryTaskLength` model (`tests/cry3CryModeFrames.test.ts`). The probe is a dev
register-poke, not a controller replay; its one convention (restore = table length + 1) is the engine's own and is pinned by the five aud251 windows.

**Engine.** `screenSounds.ts` `startCry`: WEAK -> `CRY_WEAK_FRAMES`, otherwise `CRY_NORMAL_FRAMES` (equal to the old `SEND_IN_TAIL_OFF_CRY_FRAMES` lookup, so NORMAL rows cannot move); `WEAK_CRY_FRAMES` deleted. Nothing else in `src/` changes; `cryTaskLengths.ts` (cry1's fit) and `faintCryFrames.ts` are untouched (replaced in cry4).

**Neutrality.** `lsd194Census.sh` seeds 0..99, `513f567dc` vs the change, Scene ON and OFF: 0 errors; `rst197CensusDelta.py`: commands identical 100 / 100 (31,285 ON / 30,601 OFF); `soundCensusDelta.py`: 93 / 100 seeds identical in each scene, the 7 that move (2, 11, 15, 47, 52, 95, 99) differ only by
**added** `duck 476` BGM-restore rows (8 per scene: seed 95 has two; 0 removed, 0 moved, no other kind). No SE_LOW_HEALTH 90 appears in 0..99 (no switch-in of a red-bar WEAK mon among those seeds). `compare:differential --base 513f567dc` summary-info-onix (summary WEAK cry), turn5-switchin,
turn13-switchin: 605 / 605 captures byte-identical.

**Residuals.** (1) `faintCryFrames.ts` (aud241b's linear fit `ceil(1.205 t + 0.91)`) is wrong on 24 of 376 species (`tests/cry3CryModeFrames.test.ts` pins both); `CRY_FAINT_FRAMES` is exact on all 376 measured. Switching `playFaintCry` to it would move existing faint-restore rows, so it was left for its own step.
(2) cry1's `cryTaskLengths.ts` can be replaced by the generated ES / EE / ROAR_2 / HIGH_PITCH tables (same values on every measured species; no behaviour change, not done here). (3) WEAK_DOUBLES (mode 12, the double-battle release) is not generated (Factory singles only). (4) `tests/aud252LossBallOpen.test.ts` (seeds 1914 / 2230) fails identically on the base `513f567dc`, before this step.

## cry4: the faint restore and the cry-task lengths read the generated tables (S11 audio, sound-only)

Both cry3 follow-ups, done; `src/data/cryModeFrames.ts` is now the only cry-length source.

**(1) `playFaintCry`** (`screenSounds.ts`) restores the BGM at `CRY_FAINT_FRAMES[species] + 1` (the frame after the last sample frame, the same convention as `startCry`'s NORMAL / WEAK). `src/data/faintCryFrames.ts` (aud241b's `ceil(1.205 t + 0.91)` fit) and its generator `genFaintCryTable.py` are deleted.
The fit differed on **24 / 376** species (old -> new restore frames): 31 (59 -> 58), 39 (19 -> 20), 47 (105 -> 104), 65 (109 -> 108), 103 (110 -> 109), 114 (53 -> 52), 122 (66 -> 65), 124 Jynx (162 -> 141, over the 140-tick note length), 144 (82 -> 81), 146 (82 -> 81), 157 (131 -> 130), 158 (64 -> 63), 210 (82 -> 81), 217 (103 -> 102), 234 (78 -> 77), 242 (58 -> 57), 307 (45 -> 44), 313 (98 -> 97), 314 (144 -> 141), 329 (135 -> 134), 331 (80 -> 79), 343 (125 -> 124), 369 (113 -> 112), 397 (87 -> 86); the other 352 are unchanged.
**ROM proof:** a fresh `tools/audio/cryLengthProbe.py --modes 5` run on **all 24** (register-poke `PlayCry_ByMode(species, 0, FAINT)`, restore frame = `Task_DuckBGMForPokemonCry` gone; raw `.integration/evidence/cry4/rows-faint.json`, committed as `tests/fixtures/cry4-lengths.json`): the generated table + 1 is exact on **24 / 24**, the old fit on 0 / 24.
None of the 24 is among aud241b's 15 ROM faint fixtures (`faint-cry-length-*.json` + `faint-opponent-window`; species 10, 16, 19, 40, 41, 63, 95, 113, 129, 143, 149, 202, 330, 350, 376), so no aud241b pin moves; `tests/aud241bBattleSounds.test.ts` now reads `CRY_FAINT_FRAMES + 1` and stays green on all 15.
`tests/cry4FaintCryRestore.test.ts` pins `playFaintCry`'s duck (frame 1) and restore (1 + ROM) row for each of the 24.

**(2) `cryTaskLengths.ts` is deleted** (with `cryNativeFrames.ts` / `genCryNativeFrames.py`, its only input); `moveAnimSounds.ts` reads `CRY_{ECHO_START,ECHO_END,ROAR_2,HIGH_PITCH}_FRAMES + 1`. Compared over **all 376 species x 4 modes = 1,504 values**: identical on **1,503**. The one difference: **ROAR_2, species 390** (fit 33, derived 32). cry1 never measured 390; the probe gives ROM 32
(`ROAR_2` row of `tests/fixtures/cry4-lengths.json`), so the generated table is right and the fit was the near-step-edge miss cry1 had warned of. This moves Roar's restore (`17 + 32` instead of `17 + 33` script frames) for a species-390 user in Scene ON; no census seed used it. The 149 cry1 step-mode species-modes and the Jynx caps stay pinned (`cry1CryTasks.test.ts`, `cry3CryModeFrames.test.ts`).

**Neutrality** (`lsd194Census.sh` seeds 0..99, base `456ecb3cc` vs the change, both scenes; evidence `.integration/evidence/cry4/census`): `rst197CensusDelta.py` commands identical **100 / 100** in each scene (31,285 ON / 30,601 OFF). `soundCensusDelta.py`: only `duck 476` (BGM restore) rows move, **46 rows in 33 seeds ON / 32 seeds OFF** (frame deltas -1 x 33, -21 x 5 (Jynx), -3 (314) once), every one the restore of a FAINT cry of one of the 24 species (31, 47, 65, 103, 114, 122, 124, 157, 210, 217, 234, 242, 307, 314, 329, 343, 397 occur);
every non-duck sound row is identical as a multiset (6 seeds only reorder rows around a moved restore). One extra duck row appears (ON seed 71, frame 1642): Alakazam's (65) faint restore, 109 -> 108 frames, now lands on the frame the opponent's next faint cry starts (1642) and runs before it; at the old 1643 it was already superseded by that cry's serial and never emitted. The restore-then-duck order at one frame is the engine's existing sequencing (not ROM-checked on that seed). `compare:differential --base 456ecb3cc` turn5-faint, obr251-opponent-faint-off, turn13-dragonbreath-faint: 557 / 557 captures byte-identical.

**Residuals.** WEAK_DOUBLES (mode 12) is still not generated (Factory singles only).
