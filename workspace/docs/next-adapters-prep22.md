# Next adapters prep 22: Fire Punch body-only + Random2 / input re-probe of Signal Beam, Lovely Kiss, Sheer Cold, Spikes, Octazooka, Skill Swap, Shock Wave (S10A, side lane)

Evidence/design only; **new files only** (no tracked file edited, no `src/`, adapter, `PROGRESS.md`/`ISSUES.md` change; no temporary `src/` patch was needed, see §A.4). Every emulator number is a ROM frame from a **direct, independent mGBA run** (Scene ON lab scenarios `tools/battle-lab/prep22-*.json` and the staged Fire Punch route `tools/probe/stage-fire-punch-portable-on.py`; the shared HTTP oracles were never contacted). Every relied-on probe ran **twice from fresh processes** and is identical: state probes `28 scenarios x 2` full-JSON equal (`r1 == r2`), Random2 attribution probes `42 x 2` equal in every field except `finalStateSha1` (as in prep12/14/18), Fire Punch lab probes `6 x 2` equal, Fire Punch RGB dumps `2 x 2` byte-identical (`diff -rq`). Production line numbers at base `e0c3af79c`.

## 0. Results

### 0.1 Headline

1. **Fire Punch (7, 0.67%) is READY-WITH-CHANGE as a BODY-ONLY adapter.** The burn flames are **not** part of the move body in the ROM: `Move_FIRE_PUNCH` is a 101-frame body that spawns the same 26 sprite events (spirals slots 3,4,5,7 at +13, impact spread slots 3,4,5,7,9..13 at +44) in every outcome (burn / no burn / target faints, both orientations: spawn signature equal across outcomes per side), contains **no** burn-flame template (`0x8595504`), and the burn is a separate `Status_Burn` body (38 frames, 3 `BurnFlame` sprites at +3/+9/+15, freed +26/+32/+38) that starts **152-155 frames after the body ends** (HP bar, "burned" text between). The accepted reducer/renderer reproduces the ROM body **101/101 rows, 0 px, both orientations, with the accepted, a neutral (no burn, no HP commit, no secondary roll) and a burn profile** (the unpatched `sceneOnFirePunchView` already yields no flames inside the body ages, so no suppression patch is needed). It needs **no burn / faint input**. Remaining work is a live adapter case + a `liveField` branch in the staged-only renderer (§A.5). The burn flames then appear **only if a Status_Burn adapter exists**: today `status-animation` events are not drawn at all in production (§A.6), so a Fire Punch burn shows no flames until that separate body is built (its sprite stream is measured, §A.3).
2. **Random2 labels (census "C") re-probed: 6 of 7 draw none.** Signal Beam, Sheer Cold, Spikes, Octazooka, Skill Swap, Shock Wave: every gRng2 write inside every body is the per-frame `RfuMain1+0x10` step, zero non-trivial frames, zero writes outside `Random2` (14 accepted + 14 alternate scenarios): the census C label is stale for all six. **Lovely Kiss draws 4 Random2 words in ONE frame**, `AnimPinkHeart+0x6c` (`battle_anim_effects_2.c:3577`, `data[3] = Random2() % 180` when each heart switches to `AnimPinkHeart_Step`), at **age +120** (frame A+120, 5 steps = the per-frame step + 4 draws), both sides, all 4 scenarios. The plan (`activation gRng2` + per-frame advance + `{ageOffset 120, count 4}`) reproduces the accepted `animationRng` on **every row** (153/153 player, 153/153 opponent) and the activation value equals corpus row 0 for all 14 bodies (`fixtures/prep22/plans.json`).
3. **Per-frame inputs: the accepted reducers need far less than the census labels list.** Measured, not read: (a) the assets-only palette composite `composeLivePalettes` equals the ROM palette banks BG 2/3/4 + OBJ 0/1 (unfaded and faded) at the activation of **28/28 scenarios** (196/196 checks); (b) sprite slots are the **lowest free** over lifetimes in **every frame of every body** of 28 scenarios; (c) task slots are equal across the 4 scenarios of each move except Shock Wave (K; Signal Beam `0 shake, 1 pan, 2 sinTimer, 3 targetShake` measured) and follow lowest-free except one same-frame free+create event per body (not separately measured); (d) `Task_UpdateMonBg` data == `[slot, x+x2, y+y2, 32-(x+x2), 32-(y+y2)]` of the target sprite (4/4 Sheer Cold, all monbg tasks); (e) the reducers themselves, fed only production-derivable inputs, equal the ROM **per-age effect-sprite state** (slot set, x, y, x2, y2, invisible) on **every row**: Spikes 112/112 x4, Octazooka 78/78 x4, Lovely Kiss 151/151 x4 (hearts included), Signal Beam 143/143 + 144/144 x2, Sheer Cold 189/189 + 190/190 x2 (accepted P/O + a fresh alternate species pair each, `fixtures/prep22/reducer-births.json`, `signal-beam-check.json`, `sheer-cold-check.json`).
4. **Skill Swap and Shock Wave are not reducer-light**: `SkillSwapLiveInputs` / `ShockWaveLiveInputs` carry whole software/hardware OAM + matrix buffers, three VRAM snapshots / BG registers, shared task data and audio state; `grep softwareOam|hardwareOam|initialVram|currentVram src/engine` finds only `battleScene.ts` (no producer). Verdict NEEDS-PROVIDER (graphics host: OAM + VRAM + BG registers). Shock Wave additionally spawns a geometry-dependent number of lightning segments (49 / 72 / 56 / 71 births in the four scenarios).
5. **Papercuts that cost time**: `tools/run-mgba-probe.py` refuses to overwrite an existing output and `prep14Probes.sh` / my first `prep22Probes.sh` discard stderr, so a re-run into a populated directory silently keeps stale files (found when an alternate scenario kept an old seed's result); `prep22Probes.sh` now clears its outputs first. `finalStateSha1` still differs between fresh processes.

### 0.2 Verdict table

Weights are the census usage share (`remaining-adapters-census.json`). "Draws" = Random2 draws per body (excluding `RfuMain1`). All 7 accepted windows start at the ROM activation (A = first anim-active frame; row 0 = A).

| Move (weight) | Random2 draws | Body (rows A..first inactive) | Missing per-frame inputs (after measurement) | Verdict | Precedent to copy |
|---|---|---|---|---|---|
| **FIRE_PUNCH 7 (0.67%)** | **0** (6 probes, burn status body also 0) | **101** rows, both sides, all outcomes; reducer age at A = **27** both sides (player epoch A-27 = 2313; opponent epoch 1940) | none; `resolutionProfile` is a neutral constant, no E-OUT | **READY-WITH-CHANGE** (live case + renderer `liveField`), flames need a separate Status_Burn adapter | Ice Punch (`liveMoveAnimation.ts:733,1808`, `battleScene.ts:49122`) |
| **SPIKES 191 (0.11%)** | **0** | 113 (player + opponent), spawns 3 at +7/+19/+31 | profile only: slots (lowest-free), sprite sub = target sub - 2, attr2 `0x7931` (bank 7, prio 2, tile 305), palette snapshots (composite + asset bank 7), activation rng (echo) | **READY** (per-age sprites 112/112 x4) | Hidden Power / Ice Beam style profile builder |
| **OCTAZOOKA 190 (0.07%)** | **0** | 79 | profile only: ball slot + 4 smoke slots (lowest-free, `[3]`, `[3,4,5,7]`), sub = target sub - 2, attr2 ball `0x8931` / smoke `0x7a19`, palette snapshots (composite + banks 8 / 7) | **READY** (per-age 78/78 x4) | same |
| **LOVELY_KISS 142 (0.15%)** | **4 words, one frame, age +120** | 152 | profile as above (devil slot 3 then hearts `[3,4,5,7]`, sub = target sub, attr2 devil `0x8935` / heart `0x7931`), palette snapshots (composite + banks 8 / 7); the 4 words | **READY-WITH-PRESENTATION-RNG** (plan row `142: [{ageOffset: 120, count: 4}]`) | Double Kick / Thrash (`liveMovePresentationRng.ts:26`) |
| **SIGNAL_BEAM 324 (0.18%)** | **0** | 144 (opp attacker) / 145 (player attacker); 47 births (23 red/green orb pairs + 1 palette-blend helper) | task slots (K), resources (K), `spriteOrder` + painter list (lent), matrix bitmap/slots (K), registers WIN0 (history rule §B.4), target palette (composite) | **READY-WITH-CHANGE** (live inputs builder; first-body gate on `spriteOrder`) | Water Spout (`liveMoveAnimation.ts:433,2577`) |
| **SHEER_COLD 329 (0.15%)** | **0** | 190 (opp) / 191 (player); 1 cube sprite | task slots (K), resource (K), `spriteOrder` + painter list (lent), monbg (derived), BG cnt (K) | **READY-WITH-CHANGE** (as Signal Beam; also needs the BG fade `Task_FadeToBg` background, see §B.5) | Water Spout |
| **SKILL_SWAP 285 (0.18%)** | **0** | 194 / 195; 17 births | whole software + hardware OAM and matrices, 3 VRAM snapshots, registers, shared task data, audio, ability outcome | **NEEDS-PROVIDER** (graphics host) | none yet (Dig/Megahorn family blocker) |
| **SHOCK_WAVE 351 (0.15%)** | **0** | 262-266 (geometry dependent); 49-72 births | OAM words, VRAM snapshots, BG register block, allocator live-sprite list | **NEEDS-PROVIDER** (graphics host) | none yet |

Not reached: per-age reducer checks for Skill Swap / Shock Wave (blocked by the missing providers), later-body (non-first-body) checks for Signal Beam / Sheer Cold, any pixel comparison of an alternate species (needs the adapter), the palette timeline beyond age 24 for the three Profile moves.

### 0.3 Suggested batches

- **P1 = Spikes + Octazooka + Lovely Kiss (0.33%)**, one shared "Profile" builder (slots, sprite subpriority, attr2, palette snapshots = `composeLivePalettes` + the move's asset palette in the measured bank) plus the Lovely Kiss plan row. All three reducers equal the ROM per-age sprite state on 4 scenarios each from production-derivable inputs; only a pixel comparison needs the adapter.
- **P2 = Fire Punch body-only (0.67%)**, the largest single item: live case + duration 101 + age offset 27 + a `liveField` renderer branch (§A.5). Independent of P1.
- **P3 = Signal Beam + Sheer Cold (0.33%)**, a LiveInputs builder in the Water Spout style (geometry from `liveBattlerAnchors`, lowest-free slot simulation, K constants, lent `spriteOrder`), first-body-gated.
- **P4 = Status_Burn adapter** (any `status-animation` burn, 38 frames, 3 flames; needed for Fire Punch burns to look right, and for end-turn burn damage): sprite stream measured (§A.3), reducer functions `firePunchBurnFlames` / `firePunchResidualBurnFlames` already exist.
- **Not yet**: Skill Swap, Shock Wave (graphics-host provider).

## A. Fire Punch

### A.1 ROM windows (scenarios `prep22-fire-punch-*`, activation `A` = first anim-active frame; `fixtures/prep22/fire-punch.json`)

| Scenario | Outcome | Fire Punch body (A .. first inactive) | Status_Burn body | burn set (`status1` 0x10) |
|---|---|---|---|---|
| player attacker, seed 1 | no burn | 219..320 (101) | none | none |
| player attacker, seed 11 | **burn** | 235..336 (101) | 491..529 (38) = body end + 155 | frame 490 = body end + 154 |
| player attacker, target level 3 | **faint** | 77..178 (101) | none | none |
| opponent attacker, seed 1 | no burn | 218..319 (101) | none | none |
| opponent attacker, seed 2 | **burn** | 219..320 (101) | 473..511 (38) = body end + 153 | frame 472 = body end + 152 |
| opponent attacker, target level 3 | **faint** | 81..182 (101) | none | none |

(A second `Status_Burn` body, end-of-turn damage, follows 236 (player attacker) / 228 (opponent attacker) frames after the first and has the identical sprite stream.) Script labels per frame (`scriptSeries`): `Move_FIRE_PUNCH` for exactly the 101 body rows; `Status_Burn` / `BurnFlame` / `Status_Burn` only inside the status body. Staged route (Onix back vs Grovyle front, the accepted fixtures' pair, `stage-fire-punch-portable-on.py`): player body 2340..2441, opponent body 1967..2068, the same 101 frames.

### A.2 Body identical across outcomes

Spawn signature (relative frame, slot, birth/free, template) of the 26 sprite events is equal across burn / no-burn / faint per side (`spawnSignatureEqualAcrossOutcomesPerSide {player: true, opponent: true}`): spirals `0x8595368` at +13 (slots 3,4,5,7), freed +43; impact `0x8595e98`, `0x8597358`, 7x `0x8595380` at +44 (slots 3,4,5,7,9..13), freed 53/54/85. No `0x8595504` (BurnFlame) inside any body. At activation the allocator is the known entry (`bitmap 0x6`, no task, in-use `[0,1,2,6,8,60..63]`) and net zero at end+1. Random2: `RfuMain1+0x10` only, 0 non-trivial frames, in all 6 scenarios including the burn status bodies (`fire-punch-random2.json`).

### A.3 Status_Burn body (the separate flames; both sides, both occurrences)

38 frames from its own activation `S`: `BurnFlame` template `0x8595504` births at **S+3 / S+9 / S+15** (slots 3 / 4 / 5), freed **S+26 / S+32 / S+38**, positioned at the target (72,88) / (176,42) before offsets (sprite x,y = target battle position). `status1` flips 0 -> 0x10 on the frame **before** S. Reducer functions that already model it: `firePunchBurnFlames` / `firePunchResidualBurnFlames` (`src/animation/firePunch.ts`, ages `FIRE_PUNCH_BURN_FLAME_FIRST_AGE 247`, `FIRE_PUNCH_RESIDUAL_FLAME_FIRST_AGE 489` on the staged timeline).

### A.4 Body-only through the existing reducer/renderer (measured)

`tools/integration/prep22FirePunchBody.ts` renders `renderSceneOnMovePresentation` via `render(state)` against the ROM RGB dump over the body rows (reducer age 27 .. 127 = window frames A-27 .. A+100 + 30 rows after), three resolution profiles:

| Orientation (A, epoch) | accepted profile | neutral profile (never-reached HP/roll/commit ages, no burn) | burn profile (`secondaryRollSucceeded: true`) |
|---|---|---|---|
| player (2340, 2313) | **101/101 rows, 0 px** (and 0 px in the 30 following rows) | **101/101, 0 px** | **101/101, 0 px** (0 px following rows too) |
| opponent (1967, epoch 1940, `animationAgeOffset 0`) | n/a (the fixture's profile is for its own window 2081..2357) | **101/101, 0 px** | **101/101, 0 px** |

So: the burn profile does not change a single body pixel, the body needs no HP/burn/faint input, and `sceneOnFirePunchView` (`sceneOnPresentation.ts:12586-12625`) yields `burnFlames = []` for every body row: `firePunchBurnFlames` is gated on `resolution.secondaryRollSucceeded` (`:12612`, first age 247 on `state.age`, not `animationAge`) and the residual flames start at `state.age` 489. **No src suppression patch was needed, hence none is kept.** The opponent body is now ROM-proven exact (prep10 had only "no accepted evidence"; its `animationAgeOffset 123` and the "19 off" remark are explained: the fixture window starts after the body; the live adapter's offset is **27 for both orientations**).

### A.5 Adapter inputs and recipe (file:line at base `e0c3af79c`)

| Item | Value / source |
|---|---|
| duration | `liveMoveAnimationDuration` (`liveMoveAnimation.ts:453`, table near `:733`): add `case 7: return 101` (rows A..first inactive; hit wobble / HP drain / text rows after it are queue commands) |
| config | `{ move: "FIRE_PUNCH", attacker, target, resolutionProfile: <neutral>, animationAgeOffset: 27, moveTextStartAge: 0 }` in the config switch (`liveMoveAnimation.ts:1803` region, Ice Punch is the template). `attacker.geometry` / `target.geometry` from `liveBattlerAnchors` (`animationCenter = picOffsetPoint`, `battlePositionCenter`), as the Ice Punch case. Neutral profile: `startHp = endHp`, `hpCommitAge / hpDrainFirstAge / hitWobbleFirstAge / hitBlinkFirstAge / secondaryRollAge / currentMoveResetAge` = never (measured exact above); its HP fields feed only `composePlayerHealthbox`, which a `liveField` render skips. |
| age | live age + 27 (reducer age at activation, both sides): row 0 = ROM A |
| renderer | `battleScene.ts:54020-54031` throws `unsupported staged FIRE_PUNCH pair` unless the pair is ONIX/GROVYLE and draws the staged battler art (`onixBackSprite`, `grovyleFrontSprite`, `:54033-54070`) and the burn flames (`drawFirePunchParticleList(fb, view.burnFlames)` `:54075`): add the `liveField` branch the Ice Punch renderer has (`battleScene.ts:49122-49170`: `liveSceneOnBattlerArt`, `sceneOnBattlerFrontIdleRest` for the opponent, skip the healthbox/text block), keep `view.particles`, the impact blend (`firePunchTargetBlendCoeff`) and the target shake; drop `burnFlames` in the live branch |
| E-OUT | none (the census E-OUT label does not apply to the body) |
| not claimed | alternate-species pixels (renderer is staged-only today); order ties among the 4 simultaneous equal-subpriority sprites on a later body |

### A.6 Do the flames come back in an ordinary route?

Not today. `status-animation` is a battle-script event kind (`battleScriptEvents.ts:247`, `battleScriptMachine.ts:742`) that `factoryRoundBattleOrchestrator.ts:2283-2300` only treats as **unknown graphics**: it invalidates the palette host (`invalidateLiveMovePaletteHost`) and draws nothing; `src/animation/statusAnimation.ts` models only paralysis and nothing in `src/engine` imports it. A body-only Fire Punch therefore plays the move exactly and the burn simply has no flames until a Status_Burn adapter exists (P4). Because the burn flames are ROM-separated by 152-155 frames of HP/text commands, no window arithmetic couples the two.

## B. The seven moves

Scenarios: accepted player + opponent (`mechanic-*`, listed in `fixtures/prep22/accepted-scenarios.txt`) and one fresh alternate species pair per side (`prep22-<move>-alt-<side>-<attacker>-<target>.json`, chosen before probing: VENOMOTH, HYPNO, CLOYSTER, FORRETRESS, KINGLER, ALAKAZAM, MANECTRIC vs GOLEM, Shock Wave target WAILMER because GOLEM is immune, Sheer Cold opponent alternate at seed 2 because the OHKO missed at the accepted seed). Per-move machine receipts: `fixtures/prep22/moves/<move>.json`.

### B.1 Random2 (probe `prep14Probes.sh` = `random2RouteProbe.py --lab --step-anim`, x2)

| Move | callers inside anim frames (whole run) | draws in body | plan replay == corpus `animationRng` | activation == corpus row 0 |
|---|---|---|---|---|
| Signal Beam | `RfuMain1+0x10` 184 / 183 | **0** | 146/146 (P) 145/145 (O) | yes |
| Lovely Kiss | `RfuMain1+0x10` 344 + `AnimPinkHeart+0x6c` **4** | **4, one frame, age +120** | **153/153 both sides** (plan: advance + `{120, 4}`) | yes |
| Sheer Cold | `RfuMain1+0x10` 188 | **0** (lag ages 152,153 / 152,153,172 are echo only) | 192/192, 191/191 | yes |
| Spikes | `RfuMain1+0x10` 150 | **0** (lag 111,112) | 114/114 both | yes |
| Octazooka | `RfuMain1+0x10` 118 | **0** | 80/80 both | yes |
| Skill Swap | `RfuMain1+0x10` 309 | **0** (lag 176 player only) | 196/196, 195/195 | yes |
| Shock Wave | `RfuMain1+0x10` 347 / 554 | **0** (lag 264,265 / 260,261) | 267/267, 263/263 | yes |

All 14 accepted + 14 alternate bodies have `rng2WritesOutsideRandom2 = []`. Lovely Kiss source: `Random2() % 180` into `data[3]` (`battle_anim_effects_2.c:3577`) for each of the four hearts (`battle_anim_scripts.s:7815-7818`), executed in the same frame because the four hearts reach `data[3] > 70` on the same row. Words -> `lovelyKissAtAge` heart phases via `advanceRngValue` (`lovelyKiss.ts:278`); with the activation value pinned to the ROM's, the reducer equals the ROM sprite positions on **every row of all 4 Lovely Kiss scenarios** (hearts' x2/y2 depend on the words), so the plan replay is proved in situ on alternates, not only on the corpus.

### B.2 Allocator / slots (all 28 scenarios, `lowest-free.json`)

Activation state identical in every scenario: `gOamMatrixAllocBitmap 0x6`, no task, in-use sprites `[0,1,2,6,8,60,61,62,63]`, net zero at end+1 (28/28). Every frame's births occupy exactly the lowest free slots (free-first and birth-first orders both pass; 0 bad frames in 28 scenarios). Per-move births: Signal Beam 47 (the 23 red/green pairs are produced by a lowest-free simulation with orbs freed 30 rows after birth, == ROM in 4/4, helper slot 17 == simulated), Lovely Kiss 5 (devil slot 3 at +7, hearts `[3,4,5,7]` at +97), Spikes 3 (`[3,4,5]` at +7/+19/+31, bank 7 tile 305), Octazooka 5 (ball `[3]` at +7, smokes `[3,4,5,7]` at +29/+33/+37/+41), Sheer Cold 1, Skill Swap 17, Shock Wave 49-72 (geometry dependent).

Task slots (equal across the 4 scenarios of each move; slot -> function): Sheer Cold `Task_FadeToBg 0` (age 1), `AnimTask_FrozenIceCube_Step1 0` (after the fade task freed), `Task_UpdateMonBg 1`, `Task_WaitAndPlaySE 2`, `Task_ClearMonBg 0`; Spikes `Task_UpdateMonBg 1` (age 4), `Task_WaitAndPlaySE 0,2,3`, `Task_ClearMonBg 0` (age 109); Octazooka and Lovely Kiss none; Signal Beam `0 shake, 1 pan, 2 sinTimer, 3 targetShake` (accepted constants; the 4 scenarios are equal). The lowest-free explanation holds for all but one same-frame free+create event per body (Sheer Cold, Spikes, Shock Wave); not separately resolved, so task slots are classed K, not derivable.

### B.3 Palettes (D-PAL)

- **Activation snapshot:** `composeLivePalettes(player, opponent)` (`liveMovePaletteComposite.ts:19`) == ROM BG banks 2/3/4 and OBJ banks 0/1, unfaded and faded, at the activation of **28/28 scenarios** (`palette-check.json`, 196/196). The reducers read no other bank.
- **After-load snapshots** (Spikes / Octazooka / Lovely Kiss profiles): the first loaded sheet (Spikes spike, Octazooka graySmoke, Lovely Kiss pinkHeart) is in OBJ bank 7 from age 1 on (the load is the first script command at age 0) and the second (Octazooka blackBall, Lovely Kiss devil) changes exactly OBJ bank 8 at age 4; every effect sprite's bank at its birth age holds exactly the asset palette (`src/animation/assets/{spikes,octazooka,lovely-kiss}.json`), unfaded and faded, 12/12 scenarios (`palette-load.json`). So the profile snapshot = composite with that one bank replaced by the asset palette. Spikes' monbg palette bank (`unfadedAfterMonbg`): no OBJ bank changed in ages 1..24 (the monbg target palette copy equals content already present); not separately resolved for the later-than-24 timeline.
- WIN0 / BG registers at activation: `win0h 240, win0v 161` in the first body of a battle, **`0, 0` after an earlier animation body** (Octazooka accepted second body, Spikes alternate); Signal Beam consumes these two (`SignalBeamLiveInputs.registers`). BG register events and `Task_UpdateMonBg` data are species-geometry functions of the target position (below).

### B.4 Field classification of the accepted-reducer inputs

PD = production-derivable today (verified by the per-age check), K = constant under the known-entry allocator (equal across all scenarios of the move), L = order lend, H = history rule.

| Input (reducer) | Class | Measurement |
|---|---|---|
| attacker/target `picOffsetPoint` (= `animationCenter` / `*PictureOrigin`), `spriteCenter`, `frontIdleRest`, `battlePositionCenter` | PD | `liveBattlerAnchors` drives Spikes/Octazooka/Lovely Kiss/Signal Beam/Sheer Cold to exact per-age sprite state, including fresh alternates |
| Sheer Cold `targetAnimationCenter`, `targetBattlePositionCenter`, `monbg.layer`, `monbg.scroll` | PD | cube birth = `picOffsetPoint - (32, 36)`; monbg data = `(x+x2, y+y2, 32-.., 32-..)` of the target, layer bg2 for a player target / bg1 for an opponent target: 4/4 |
| sprite slots (Spikes, Octazooka, Lovely Kiss profiles; Signal Beam `orbPairs`, `paletteBlendSpriteSlot`; Sheer Cold `cubeSpriteSlot`) | PD | lowest-free over the known-entry set, every frame of 28 scenarios |
| sprite subpriority, `attr2` | PD/K | Spikes/Octazooka sprite sub = target battler sub - 2 (30 / 40), Lovely Kiss = target sub (profile field is the battler value, the reducer subtracts 1); attr2 = `bank << 12 \| 2 << 10 \| tile` with the first-sheet constants (bank 7 tile 305; second sheet bank 8): equal in all scenarios |
| task slots (Sheer Cold, Signal Beam, Spikes) | K | equal across the 4 scenarios per move |
| `resources` (tile slot / palette bank / tile range) | K | first loaded sheet bank 7 tile 305, second bank 8 tile 313 (prep18 constants) |
| `matrixBitmap` | K | 0x6, net zero |
| `spriteOrder`, `painterSprites` (Signal Beam, Sheer Cold) | L | the lent `sSpriteOrder` (the activation order differs between the accepted and the alternate scenario for Spikes and Octazooka, whose alternate body is a different body of its battle), first-body gate stays |
| palette snapshots | PD | §B.3 (composite + asset bank) |
| `animationRngAtAge0` / `animationRngSeed` | echo | `0` or the host activation value; only Lovely Kiss consumes it (hearts) |
| WIN0 registers (Signal Beam) | H | first body (240,161); a later body measured (0,0) only after a Tackle body (2 scenarios), Signal Beam later-body not measured |
| Skill Swap / Shock Wave whole OAM, matrices, VRAM, BG register block, shared task data | missing | no production producer (§0.1.4) |

### B.5 Per-move recipes

- **Spikes / Octazooka / Lovely Kiss (P1).** Config builders `SceneOnSpikesConfig` (`sceneOnPresentation.ts:2971`), Octazooka, Lovely Kiss with `animationProfile` = {slots, `targetSubpriority`, `oam.*Attr2`, palette snapshots, `animationRngAtAge0`}; reducers `spikesAtAge` (`spikes.ts:353`), `octazookaAtAge` (`octazooka.ts:288`), `lovelyKissAtAge` (`lovelyKiss.ts:278`); renderers (already art-by-species, no staged species gate except a leftover SPINDA/ONIX staged branch guarded by `liveField` at `battleScene.ts:38025`) at `battleScene.ts:37890` / `23199` / `35276`. Spikes passes `battlePositionCenter` as the target and `animationCenter` as the monbg target (`sceneOnPresentation.ts:9453-9461`). Lovely Kiss: add `142: [{ageOffset: 120, count: 4}]` to `LIVE_MOVE_RANDOM2_PLANS` (`liveMovePresentationRng.ts:26`) and read the four words in the config (`animationRngAtAge0` = host activation). Spikes' hazard side condition stays battle-owned.
- **Signal Beam / Sheer Cold (P3).** `SignalBeamLiveInputs` (`signalBeam.ts:46`) / `SheerColdLiveInputs` (`sheerCold.ts:36`) builders in the `waterSpoutLiveInputs` style (`liveMoveAnimation.ts:433`): geometry PD, slots by lowest-free simulation, K constants (measured tables in `moves/*.json`), `spriteOrder` + painter list from the lent order (first-body gate like Water Spout `case 323`, `liveMoveAnimation.ts:2570-2580`). Sheer Cold also draws the ice BG fade (`Task_FadeToBg`) and the monbg; `sheerColdAtAge` produces the `background` model, but whether the renderer's BG compositing is exact for an alternate species is not measured (no adapter, no pixels).
- **Skill Swap / Shock Wave.** Blocked until a provider supplies OAM + VRAM + BG registers (see the Dig/Megahorn-family notes in `docs/next-adapters-prep18.md` §0.0.3); nothing measured here removes the blocker.

## C. Reproduction (workspace root; fresh output directories, see papercut)

```
sh tools/integration/prep22Run.sh                  # everything below (~4 min), scenarios regenerated by prep22Scenarios.py / prep22AltScenarios.py
# Fire Punch: prep22Probes.sh (lab x2) -> prep22FirePunchReceipt.py ; RGB dumps x2 -> prep22FirePunchBody.ts player|opponent
# 7 moves: prep14Probes.sh (Random2 x2) + prep22Probes.sh (state x2) -> prep22Analyze.py, prep22PaletteCheck.ts, prep22PaletteLoad.py,
#          prep22LowestFree.py, prep22Plans.py, prep22ReducerBirths.ts, prep22SignalBeamCheck.ts, prep22SheerColdCheck.ts
```
Receipts (`tools/integration/fixtures/prep22/`): `fire-punch.json`, `fire-punch-body-only.jsonl`, `fire-punch-random2.json`, `moves/<move>.json`, `plans.json`, `palette-check.json`, `palette-load.json`, `lowest-free.json`, `reducer-births.json`, `signal-beam-check.json`, `sheer-cold-check.json`, `accepted-scenarios.txt`. No RGB dumps and no mGBA logs are committed.
