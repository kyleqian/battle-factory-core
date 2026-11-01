# S11 Audio — design (step aud236)

Design only. No `src/`, `tests/` or `package.json` change; the one code artefact is the feasibility probe
`tools/audio/soundEventProbe.py` and its three fixtures. Program and acceptance: `docs/finish-plan.md` "Audio (S11)";
library contract: `docs/library-package.md` (audio becomes `FactoryGameOptions.audio`).
What the `issue55-m4a-*` receipts prove: m4a *CPU cost / state* (MPlayMain, `ply_pan`, note callbacks, SoundMain cycles) for
Scene OFF construction timing. They never identify which sound was started. They do show that the compiled m4a RAM
(`gSoundInfo`, `gMPlayInfo_*`) is reachable from python and byte-stable across runs. Sound identity needs the hook below.

## 1. Sound inventory (reference/pokeemerald; counts are grep lines, so a few are prototypes)

All sounds funnel into two ROM functions: `m4aSongNumStart(song)` (every SE / BGM / fanfare, via `PlaySE`, `PlayBGM`,
`PlayFanfare*`, `PlaySE{1,2,12}WithPanning`) and `PlayCryInternal(species,pan,volume,priority,mode)` (every cry). Stops are
`m4aSongNumStop` / `m4aMPlayStop` / `m4aMPlay{FadeOut,FadeIn,VolumeControl}` (BGM duck 85/256 around cries, `sound.c:304-363`).

| Kind | Source sites on Factory paths | Our kernel / presentation today |
| --- | --- | --- |
| **Draft + swap screens**: `SE_SELECT` | `battle_factory_screen.c` 24 x `PlaySE(SE_SELECT)` (1543-1711 draft, 2481-2658 swap, 3572-4135 sub-menus) | missing; no screen emits anything |
| **Summary screen** | `pokemon_summary_screen.c` 12 `SE_SELECT`, 2 `SE_FAILURE`, 2 cries `PlayCry_ByMode(species,0,NORMAL / WEAK)` :3969/:3971 | missing |
| **Party menu** (battle switch, swap) | `party_menu.c` 56 `SE_SELECT`, 8 `SE_FAILURE`; `SE_USE_ITEM` x4, `SE_M_HARDEN`, `SE_GLASS_FLUTE`, level-up fanfare are item paths, off the Factory loop | missing |
| **Menus / yes-no / text** | `menu.c` 32, `menu_helpers.c` 6, `list_menu.c` 1 (all `SE_SELECT`); `text.c` `PlaySE(currChar)` / `PlayBGM(currChar)` are control codes (none found in Factory strings; re-verify in step 4) | missing |
| **Battle menus** | `battle_controller_player.c` ~36 `SE_SELECT` (247-1451: action / move / target / bag / party cursors) | missing |
| **Battle script SE** | `Cmd_effectivenesssound` `battle_script_commands.c:2012-2039` (`SE_SUPER_EFFECTIVE` / `SE_NOT_EFFECTIVE` / `SE_EFFECTIVE`, 5 emit sites, 18 uses in `battle_scripts_1.s`); script `playse` x5 are Battle Arena only (4451-4480, off path) | **emitted** as kernel `play-se` (`battleScriptHitChainOpcode.ts:2364`, songId + battler, no pan, no frame); `B_SCR_OP_PLAYSE` handler exists (`battleScriptSourceCommands.ts:921`) |
| **Faint** | `SE_FAINT` via `PlaySE12WithPanning` `battle_controller_player.c:2422` (pan ATTACKER) / `opponent.c:1421` (pan TARGET); cry `PlayCry_ByMode(species,-25 / 25,FAINT)` `player.c:2914` / `opponent.c:1856`; script `playfaintcry` x6 | cry **emitted** as `play-faint-cry` (`battleScriptEvents.ts:154`, no pan / mode); `SE_FAINT` missing (belongs to our `faint-animation` event) |
| **Send-out cries** | `pokeball.c:665-742` `Task_PlayCryWhenReleasedFromBall` (6 sites: NORMAL / WEAK / DOUBLES variants; singles use ByMode NORMAL / WEAK). Probe: Golbat pan +25, Rhydon pan -25, volume 120, priority 10 | missing as events; cry length already modelled (`src/data/sendInTailOff.ts`, `cry-durations.json`, 376 species) for message timing |
| **Ball / healthbox / tray SE** | `pokeball.c` 12 (`SE_BALL_THROW`, `SE_BALL_OPEN`, `SE_BALL`, `SE_BALL_BOUNCE_*`, `SE_BALL_TRADE`), `battle_interface.c:1666,1870,1872` (`SE_BALL_TRAY_*`), `battle_gfx_sfx_util.c:1100` `SE_LOW_HEALTH` (+ `m4aSongNumStop`) | missing |
| **Battle BGM** | `GetBattleBGM` `pokemon.c:6426` (Factory trainers: class table, Brain `MUS_VS_FRONTIER_BRAIN`, observed `MUS_VS_TRAINER`) started by `PlayMapChosenOrBattleBGM(0)` / `PlayBGM`; victory `battle_main.c:4979-5006` (6 x `PlayBGM(MUS_VICTORY_*)`), `script_commands.c:6494` `PlayFanfareOrBGM(MUS_VICTORY_TRAINER)`; `FadeOutMapMusic` `battle_main.c:5144`, `player.c:3124` | missing |
| **Map BGM / fanfares / scripts** | Lobby, PreBattleRoom, BattleRoom all `MUS_B_FACTORY` (map.json:5); scripts: `SE_SAVE` x3 lobby, x1 pre-battle, `SE_POKENAV_CALL`, `MUS_HEAL` fanfare (PreBattleRoom:58), `MUS_OBTAIN_SYMBOL` x2 (BattleRoom:135,161); free-roam walking / doors: `field_player_avatar.c` 10, `field_control_avatar.c` 4, `field_screen_effect.c` 9, `start_menu.c` 7 | missing |
| **Move animations (script)** | `data/battle_anim_scripts.s`: 873 `playsewithpan`, 97 `loopsewithpan`, 48 `waitplaysewithpan`, 2 `setpan`, 22 `panse*` = 1042 commands, **123 distinct song ids**; VM handlers `battle_anim.c:533,1356,1366,1402,1446,1471,1502,1559,1604`; pan is `BattleAnimAdjustPanning` (`battle_anim.c:1263`) | partial: 29 of 316 `src/animation/*.ts` carry an ad-hoc `soundEvents` list (`{age, song, panTarget}`), nobody consumes it; `eruptionAudio.ts` ports one `loopsewithpan` task exactly |
| **Move animations (C side)** | 59 `PlaySE` / `PlayCry*` lines in `battle_anim_*.c` (effects_3 10, effects_1 5, effects_2 3, utility 2, fire / psychic / ghost / electric / rock 1-2 each); Roar / Growl / Howl cries | missing (`howl.ts`, `roar.ts` exist as visuals) |

Existing consumers to keep intact: kernel `play-se` is already a **timing gate** (`seg127StatusSeGate.ts:101`,
`battleResolutionPresentation.ts:345,1397,1422`). New events must be additive, not a rename of those.

## 2. Oracle hook

**Breakpoints are not reachable.** `/srv/pokebench/vendor/libmgba-py` has `mgba/debugger.py` but the cffi build exposes no
debugger (nothing in `_builder_cdef.h`) and `core.py` never attaches one. The repo's existing probes
(`tools/probe/trace-factory-*.py`, `tools/integration/livePaletteFramebufferProbe.py`) use the working substitute, a
single-step loop that compares the Thumb PC with function entries. `PC == symbol + 2` is the first instruction and r0-r3 still
hold the arguments (verified: `PlaySE+2` and `m4aSongNumStart+2` both show r0 = 5 on a draft SELECT; `+4` is the second instruction).

`tools/audio/soundEventProbe.py` (run: `python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json draft|lab REQ.json [--frames N] [--log-setup]`;
a bare `/srv/.../mgba-venv/bin/python` fails with `No module named mgba`, the wrapper adds the binding path) hooks
`m4aSongNumStart` / `m4aSongNumStop`, `PlayCryInternal` (5th arg = stack `[sp]` = mode), the `PlaySE{12,1,2}WithPanning`
wrappers (pan = r1, joined onto the following `m4aSongNumStart`), `SE12PanpotControl`, `PlayBGM`, `PlayFanfare*`. The caller symbol comes from `lr` (so
`kind` is se / bgm / fanfare / cry / stop, `via` names the wrapper). Event = `{frame, kind, id, name, pan, via}` (+ `mode, volume,
priority` for cries). **Frame is 1-based**: an event in the k-th advance reports k, the first frame whose capture can show it.
Addresses come from the map (`bin/oracle symbols m4aSongNumStart PlayCryInternal ...`: 0x082e0130, 0x080a344c, 0x080a37a4 PlaySE,
0x080a37b4 PlaySE12WithPanning, 0x080a3870 SE12PanpotControl, 0x080a3778 PlayBGM, 0x080a30e4 PlayFanfare). `PlayCry1/2/3` do not exist in this tree.

**Probe results (Scene ON, `tools/audio/fixtures/*.json`):**

Draft screen (canonical anchor, RIGHT x2, A x2, B x2; 116 frames, 10 s):
`f21 se 5 SE_SELECT via PlaySE`, `f43 se 5`, `f85 se 5`: one per input, exactly one frame after the press.

Battle intro (`d4a-megahorn-extra-player-rhydon-golbat.json` setup, `--log-setup`, 4 min; excerpt of 34 events):
```
f988  bgm 476 MUS_VS_TRAINER via PlayBGM
f1336 se 114 SE_BALL_TRAY_ENTER pan 0 (PlaySE12WithPanning)   f1355 se 115 SE_BALL_TRAY_BALL pan 63 (PlaySE1WithPanning) ...
f1595 se 15 SE_BALL_OPEN   f1612 cry SPECIES_GOLBAT pan 25 vol 120 pri 10 mode NORMAL via PlayCry_ByMode
f1814 se 15 SE_BALL_OPEN   f1827 cry SPECIES_RHYDON pan -25 vol 120 pri 10 mode NORMAL     f1912 stop 90 SE_LOW_HEALTH
```
Battle turn window (same fixture's 934-frame trace, 110 s; 2 turns, Golbat Tackle, Rhydon Megahorn):
```
f1 se 5 SELECT  f33 se 5 SELECT  f89 se 139 SE_M_COMET_PUNCH pan -63   f118 se 12 SE_NOT_EFFECTIVE pan -64
f159,f160,f288 stop 90 SE_LOW_HEALTH (HandleLowHpMusicChange)
f305 se 171 SE_M_DRAGON_RAGE pan -64   f395 se 156 SE_M_VICEGRIP pan 63   f474 se 12 SE_NOT_EFFECTIVE pan 63
```
These match the source: `Move_TACKLE` plays `SE_M_COMET_PUNCH` at `SOUND_PAN_TARGET`, `Move_MEGAHORN` plays `SE_M_DRAGON_RAGE` at ATTACKER
then `SE_M_VICEGRIP` at TARGET; `BattleAnimAdjustPanning` flips the sign by side (63 shows as -63 when the target is the player).
The effectiveness SE pan (-64 / 63) is the controller's side rule (`opponent.c:1824-1833`), derivable from the kernel `battler`.

**Speed.** Single stepping: ~220k instr/s, ~6 frames/s (37k instr/frame). Plain `run_frame`: ~2400 frames/s idle
(`save_raw_state` / `load_raw_state` ~0.03 ms). Stepping alone is fine for windows (≤ 1000 frames) and hopeless for full
battles (a 5000-frame battle is ~14 min). Planned hybrid (**unproven, step 1 proves it**): run fast, and after every frame compare a small RAM
signature (`gMPlayInfo_{BGM,SE1,SE2,SE3}` songHeader / status / track count, `gMPlay_PokemonCry`); when it changed, reload the
pre-frame state and single-step just that frame. Same-frame double starts on one player are the risk, so the proof is byte-equal events versus the stepping log on the three fixtures.

## 3. Event plan (kernel + presentation)

Shape, one type for both scenes and both levels (presentation layer, never gameplay):
`SoundEvent = { frame, kind: "se"|"bgm"|"fanfare"|"cry"|"stop"|"fade"|"duck", id, pan: number|null, mode?, volume?, priority? }`
(`id` = song number or species; `frame` = the session frame the ROM would run it on; same 1-based convention as the probe).

- **Where they live:** the kernel keeps its semantic events (`play-se`, `play-fanfare`, `play-faint-cry`, unchanged; they gate timing).
  A new pure module (`src/audio/soundEvents.ts`, types + `animSoundPan` port of `battle_anim.c:1263-1320`) is imported by the emitters; `factorySession.ts` collects
  the per-tick list the way it collects `FactoryEvent`s. The sink is write-only: no engine state, RNG or frame hash reads it.
- **Emitters by family:** (a) screens (draft, swap, summary, party menu, lobby scripts): same branch the C source plays, in the
  screen's existing input handler; (b) battle script / controller: extend the kernel events with the side-derived pan and add `SE_FAINT`, low-HP, ball / tray, BGM start / duck / victory / fade at the presentation seam that already owns those frames
  (`factoryBattleStartPresentation.ts`, `switchInTail.ts`, `opponentFaintPresentationOwner.ts`, `battleResolutionPresentation.ts`);
  (c) send-out / faint cries: the cry start frame is already modelled (`switchInTail.ts` "the cry starts when the emerge affine animation ends"); (d) move animations: generic from the
  decoded anim script (`battle-move-anim-scripts.json` has the ops, each `.ts` timeline owns the age-to-frame map), the 29 ad-hoc `soundEvents` fold into it.
- **Scene OFF** keeps everything except the animation family: `HITMARKER_NO_ANIMATIONS` skips `Cmd_attackanimation`, but menus, effectiveness, faint SE / cry, send-out cries (`SwitchIn_HandleSoundAndEnd` waits on the cry) and BGM still play. Step 1 verifies this on the OFF oracle (the probe's bootstrap is the ON one today).
- **Timing interplay:** presentation-only timing (Scene ON animation length, lag-frame classes) shifts event frames exactly as it shifts pixels; the census compares each scene against its own ROM profile.

## 4. Sound-event parity census

Column: `tools/integration/lsd194Census.ts` writes one JSON line per seed (battle i = seed i, streak `i*11%49`, rentals 0..2, least-used legal move) with the
kernel command list and an events digest. Add a `sound` field `[(frame_rel_battle, kind, id, pan)...]` plus its sha256[:16] and a `soundCensusDelta.py` beside `lsd194CensusDelta.py`; the shard / job runner (`lsd194Census.sh`) is reused unchanged.
That census never touches the ROM, so the ROM side needs a deliberate design:

- **ROM expected list, two tiers.** (T1, all 0..999 seeds, no ROM per seed) a ROM-derived *sound rule table* (`src/data/gen/audio-sound-sources.json`: source
  op or key to `(kind, id, pan rule)`, extracted from `reference/` and pinned to the ROM windows that prove each row once). Census expected = the table applied to each battle's executed commands (move ids, effectiveness, faints, switch-ins, intro / end); "missing / extra" = emitted vs expected. (T2, frame exactness) full ROM replays of K sampled seeds (K ~ 20 spanning every move family, faint, switch, Brain) through the lab with the same inputs, event lists compared for equality in both scenes.
- **Cost on this host.** `lab.prepare` + stepping a battle is ~4 min of setup alone (97M steps measured), so per-seed stepping is out: 1000 battles x ~15 min = ~250 h. With the hybrid (fast frames ~1000-2400/s, ~60 sound frames x 0.17 s re-step) a 5000-frame battle is ~15-25 s: T2 for K=20 x 2 scenes ~ 15 min; a hypothetical full ROM pass of 1000 seeds ~ 5 h serial, ~1.5 h on 4 jobs. T1 costs the same as one animation census arm (minutes per 100-seed shard).
- **Pass rule:** T1: 0 missing / 0 extra over 0..999 in both scenes, per kernel command; T2: events equal `(frame, kind, id, pan[, mode])` for every sampled window; both players' audio-RAM probes (`issue55-m4a-*`) stay byte-pinned (no change to anything they read).
  Open question 1 below: whether the supervisor accepts T1+T2 as "census 0..999" from the finish plan.

## 5. Asset plan

- **Record from mGBA output, once per distinct sound.** The binding exposes `core.get_audio_channels()` (`mgba/audio.py` `StereoBuffer`), so a python recorder can capture the real mixed output. Asset list = the distinct `(kind, id, pan | species, mode)` tuples found in the ROM logs of step 7, so nothing unused is recorded.
- **Cries:** `PlayCryInternal` varies pitch, length, release, chorus by mode (`sound.c:369-455`); record per `(species, mode)` for the modes the Factory uses (NORMAL, WEAK, FAINT), mono, centre, and apply pan at runtime (a cry has no internal pan track). 376 species x 3 modes; `cry-durations.json` sums to 289 s for NORMAL, so ~870 s total, ~3 MB at ~32 kbps.
- **SEs:** record stereo per distinct `(id, pan)` actually used (typically {-64, -63, 0, 63}); pan cannot be applied after the fact because `ply_pan` inside the song and `MPlayPanpotControl` add (clamped). 123 anim ids + ~35 others, ~150 SEs x ~2-3 variants, <2 MB.
- **BGM / fanfares:** only songs seen in the logs (`MUS_B_FACTORY` 469, battle themes by Factory trainer class, `MUS_VS_FRONTIER_BRAIN` 471, victory themes, `MUS_HEAL`, `MUS_OBTAIN_SYMBOL`), one intro + two loop passes recorded, the second kept for a seamless loop. **Loop points from the ROM**: `sound/songs/midi/mus_*.s` carries the track `GOTO` (e.g. `mus_b_factory.s:286`) -> loopStart / loopEnd in seconds, validated against the recording's autocorrelation. ~10-14 songs, est. 8-15 MB.
- **Format:** OGG Vorbis mono / stereo, `.ogg` per sound plus one `manifest.json` (id/pan to file, loopStart/loopEnd, length). Justification: the ROM mix is 13.4 kHz, so low bitrates are transparent; Vorbis is gapless for loops in `decodeAudioData`. Risk: Safari decode support for Ogg (verify in step 9; fallback = AAC/M4A with a priming-trim offset, or raw 8-bit PCM blobs ~11 MB for cries). Keep lossless WAV recordings out of git (regenerable); commit only the encoded set, est. **15-25 MB total**, each file far under the 25 MiB per-file limit.
- **Location / loading:** `src/assets/gen/audio/` (one file per sound), fetched lazily at first use through `new URL(..., import.meta.url)`; `FactoryGameOptions.audio.baseUrl` lets the website serve them from a CDN. `src/headless.ts` and everything on the tick path never import `src/audio/` or the manifest (a test asserts the headless rollup graph has no `audio` chunk, like `tests/engineBuildHash.test.ts`).
- **Provenance:** like the sprites, the audio is Nintendo-derived (user's call recorded in `docs/finish-plan.md:75`); the recorder, manifest and loop-point extractor are dev-time tools only, never loading the ROM at runtime.

## 6. Playback layer

- `src/audio/player.ts` (WebAudio). Created only when `options.audio` is present; `lib.ts` loads it with a dynamic `import()` so the sync lib chunk stays free of it.
  `FactoryGameOptions.audio?: { enabled?: boolean (default false); volume?: number; baseUrl?: string }`; `FactoryGame.setAudio(enabled)` / `getAudio()` is the toggle;
  dev shell: `?audio=1`. The `AudioContext` is resumed on the first user gesture (autoplay policy), so the first press unlocks sound.
- It consumes the session's `SoundEvent`s per tick, maps `frame` to `AudioContext` time with the 59.7275 Hz frame clock plus a small fixed latency, **drops events during `resume` fast-forward**, and models what m4a does around them:
  three SE players (SE1 / SE2 / SE3 priority and preemption), BGM duck to 85/256 while a cry plays, fanfare pauses and then continues BGM, fades, `stop`.
  Pan = m4a's law (ported from `ChnVolSetAsm`) through a `StereoPannerNode` for runtime-panned cries.
- Tools, tests, soaks, census and headless run with no sink attached: silent by construction. Acceptance test: replay one trace twice (no sink / recording sink / mock player) and compare per-frame sha256 and the kernel digest; they must be identical.

## 7. Step list (each one bounded worker step)

1. **aud237 probe hardening.** Add fade / volume / stop-pause hooks (`m4aMPlayFadeOut*`, `m4aMPlayVolumeControl`, `m4aMPlayStop/Continue`), a Scene OFF profile mode, the hybrid fast mode, and a hermetic schema test over `tools/audio/fixtures/`.
   Accept: hybrid events byte-equal stepping events on the 3 fixtures and >= 20x faster; `npx vitest run tests/audioProbeFixtures.test.ts`.
2. **aud238 source table.** `tools/extract` writes `src/data/gen/audio-sound-sources.json` (every call site in section 1, anim script ops with ids / pan args, `GetBattleBGM` classes, map music, loop `GOTO`s). Accept: counts equal section 1's (1042 anim commands, 123 ids), a test pins them.
3. **aud239 event type + sink.** `src/audio/soundEvents.ts`, `animSoundPan`, session collection, no emitter yet. Accept: frame hashes + digest identical with/without sink (`tests/audioSinkNeutral.test.ts`), full suite, build, headless graph free of `audio`.
4. **aud240 screens.** Draft, swap, summary, party menu, lobby script SEs and the lobby BGM / fanfares. Accept: ROM probe windows (draft fixture + one swap + one summary window) equal `(frame, kind, id, pan)`.
5. **aud241 battle controller family.** Effectiveness, `SE_FAINT`, faint / send-out cries (with mode and pan), ball / tray / low-HP, battle BGM start / fade / victory, fanfares. Accept: intro + faint + effectiveness windows equal in both scenes (Scene OFF fixtures added here).
6. **aud242 move-animation SEs.** Generic emitter from decoded scripts through each timeline's age map, `loopsewithpan` / `waitplaysewithpan` tasks (extend `eruptionAudio.ts`'s pattern), the C-side 59 sites by family; one representative per component track, then batch-check siblings like the animation lane does. Accept: per-move ROM windows (Level 50 moves first).
7. **aud243 census column + ROM replays.** `sound` field in the census, `soundCensusDelta.py`, T1 over 0..999 both scenes, T2 for K sampled seeds. Accept: 0 missing / 0 extra, T2 equal. Misses become fix steps.
8. **aud244 recorder + assets.** python recorder over the logged tuple set, loop points from the `.s` files, encoder, manifest. Accept: manifest covers every distinct tuple in the step 7 logs; sizes reported; headless graph still free of audio.
9. **aud245 playback.** `src/audio/player.ts`, `FactoryGameOptions.audio`, `setAudio`, `?audio=1`, `lib-types`, `docs/library-package.md`. Accept: frame-hash identity test, full suite + `npm run build` + `npm run build:lib`, headless size unchanged, browser play with audio audible (and silent by default).
10. **aud246 close.** Soaks unchanged, audio RAM probe receipts unchanged, ROADMAP S11 ticked by the supervisor.

## Open questions

1. Is T1 (rule table over 0..999) + T2 (sampled full ROM replays) acceptable as the finish plan's "census 0..999, 0 missing / 0 extra"? A literal ROM log per seed needs the hybrid and ~5 h.
2. Dev-time recording of sounds that never occur naturally (e.g. a WEAK cry for every species) needs either a register-poke driver (PC and r0 set to `PlayCryInternal`, a dev tool, not oracle evidence) or natural staging per species. Poke driver OK?
3. Audio format and the Safari risk (section 5), and hosting of ~15-25 MB of Nintendo-derived audio (same user decision as the art?).
4. Does the ROM play anything we have not found on the Brain / symbol ceremonies (`MUS_OBTAIN_SYMBOL` path) or in `text.c` control codes? The step 4 / 5 probes answer it; the inventory is grep-derived, not run-derived, for off-battle paths.
5. Whether `FactoryGame.setAudio` should also expose a master volume and per-category mute (SE / BGM / cries).
