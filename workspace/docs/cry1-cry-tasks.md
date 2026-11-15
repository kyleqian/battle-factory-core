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

- The cry modes ROAR_1 / ROAR_2 / HIGH_PITCH / ECHO_START / ECHO_END play the NORMAL sample in the player (scout step 2: audio assets / player modes; out of scope here).
- Roar / Howl script-frame offsets are unverified apart from the lab drift (above); the Howl +4 is unexplained.
- The engine's Hyper Voice animation is ~8 script rows shorter than the ROM's (DestroyAnimSoundTask restore lands in the next command); the restore is scheduled, not row-gated.
- A species outside the measured intervals can be +-1 on D; a Roar behind a Substitute / in Scene OFF, and cries when the user is a species-0 mon, are not measured (species 0 plays nothing).
