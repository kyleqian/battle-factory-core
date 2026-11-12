# Next adapters prep 13: Ice Beam, Water Spout, Hidden Power, Hyper Beam made briefable (S10A, side lane)

Evidence/design only; **new files only** (no tracked file edited, no `src/`, no adapter, no presentation RNG, no `PROGRESS.md`/`ISSUES.md`). Every emulator number is a ROM frame from a **direct, independent mGBA run** (Scene ON lab scenarios, fresh process per run; the shared HTTP oracles were never contacted). Every relied-on probe ran **twice from fresh processes and the two outputs are byte-identical** (24 scenarios, `fixtures/prep13/prep13-receipts.json`, sha1 equal). Production line numbers are at base `ddfd32610`; a sibling lane edits `src/`, re-grep before editing. Drafted fixtures are **unverified until an adapter exists** (`consumedByTest: false`). Method = prep11 s0.2 (activation-state measurement over the accepted staged scenario + an alternate species), extended with a new step prep11 did not have: **each reducer was run with production-derivable inputs and compared with the ROM** (births, positions, matrices, order), so "derivable" below means a reducer replay equal to the ROM, not an argument.

## 0. Results

### 0.1 Verdict table

| Move (weight) | Verdict | Production inputs the adapter must supply | Activation vs accepted window | Rows | Alternate species (own activation) | Route seed |
|---|---|---|---|---|---|---|
| **ICE_BEAM 58 (1.98%)** | **READY-WITH-CHANGE** (no missing input, no RNG) | geometry from `liveBattlerAnchors`; the lent activation order; every other field is a constant/echo (s1.1) | activation == window start (row 0): 75 (player) / 79 (opponent) | 203 (both) | LAPRAS -> GOLEM, both sides: act 74 / 78, signature identical, **reducer == ROM on 48/48 births and 203/203 full 64-entry order rows, 4/4 scenarios** | `0/14 DELCATTY`, `1/14 DUNSPARCE`, `2/35 BLASTOISE` (all first body, order known) |
| **WATER_SPOUT 323 (0.03%)** | **READY-WITH-CHANGE** | party HP (tier), `anchors.picOffsetPoint`, **`anchors.pictureHeight` (NOT the reducer default 40)**, side subpriority, lowest-free slots, order lend (s1.2) | row 0: 79 / 83 | 278 at full HP (both sides); 276 for KINGDRA player-back; 270 / 254 / 230 / 206 / 201 at lower HP | KINGDRA -> GOLEM: act 78 / 82; **reducer == ROM on every birth (age, slot, x, y, matrix) and end age, 16 bodies = both sides x tiers 0..3 x 2 species** | `83/14 WAILMER` (not first body) |
| **HIDDEN_POWER 237 (0.04%)** | **READY-WITH-CHANGE** (one provider: Unown letter-form pic coords) | personality (party), Unown-form coords for the attacker centre, `anchors(target).picOffsetPoint.y` for the 8th scatter, constants (s1.3) | row 0: 77 / 81 | 180 (all 10 scenarios) | UNOWN -> GOLEM + UNOWN new personality + GENGAR controls: act 77-78 / 81-82 | **none found** (Unown is never a generated rental; see s2) |
| **HYPER_BEAM 63 (0.04%)** | **READY-WITH-CHANGE, needs two computed inputs** (words = prep12 plan; orb slots = computed allocator plan) | geometry/rest from anchors, orb `animation/speed/phase` (presentation RNG), orb slots (lifetime-driven first-free), `persistentOrder` = lent-order index (s1.4) | row 0: 79 / 83 | 280 (both) | SNORLAX -> GOLEM (after a Tackle): act 235 / 232, rows 280, allocator identical | `10/28 AERODACTYL` (first body, order known) |

Not reached: nothing assigned. Not done (and why): a **dense framebuffer comparison** of any alternate (needs the adapter), and **independent RGB proof of Water Spout tiers 0..2** (the ROM-side reducer equality below is exact, the pixel proof still needs the adapter).

### 0.2 Common allocator facts (every body of every scenario, accepted + alternates, 24 scenarios, 2 fresh runs)

- At activation: `gOamMatrixAllocBitmap = 0x6`, **no active task**, in-use sprite slots `[0,1,2,6,8,60,61,62,63]` (battler sprites 6 = player, 8 = opponent via `gBattlerSpriteIds` = `[6,8]`), battler subpriority **player 30 / opponent 40** (precedent `liveMoveAnimation.ts:1121`).
- First-loaded sprite sheet = bank 7 (tile 305 for the first template; Water Spout's splat and Hyper Beam's blend sprite use banks 8 / 15); matrix ids first-free over bitmap 0x6 (0, 3, 4, ...); task slots lowest-free; sprite slots first-free from 3. All as prep11 s0.2.
- **Net-zero at end+1: bitmap, tasks and in-use sprites equal the activation state in all 34 bodies** (`netZeroAtEnd1`, incl. Water Spout bodies 2..6 of the tier scenarios).
- Activation frame == accepted `sourceWindow.startFrame` for **all 8 accepted fixtures** (offset 0, `prep13-crosscheck.json`); rows equal the retained corpora (203 / 278 / 180 / 280). Probe-vs-corpus: window rows, in-use set, activation order, ordered spawn list (age, slot, template, bank, tile, matrix), (task slot, function) pairs, battler subpriority and `animationRng == gRng2Value at activation` are all **equal on 8/8** (`prep13Analyze.py`; the corpora come from the same scenarios, so the independence evidence is the alternates below).
- The census D-*/E-TASK/F-AFFINE labels for these four are **stale** (reducers carry the palette programs; slots/matrices/tasks are the constants above). C is stale for Ice Beam / Water Spout / Hidden Power (prep12 s1.9); Hyper Beam keeps C only for its three-words-per-orb stream (prep12 s1.8).

## 1. Per-move field classification

Legend: **PD** production-derived today (file:line), **K** constant under the known-entry allocator (value; equal across the accepted corpora AND the fresh alternates), **L** order-lend input (tracker), **E** echo with no pixel consumer, **M** genuinely missing input.

### 1.1 Ice Beam: `SceneOnIceBeamConfig` (`sceneOnPresentation.ts:3957`), profile `IceBeamAnimationProfile` (`iceBeam.ts:63-76`)
Replay: `iceBeamTimeline` with `iceBeamProfileFor`-style defaults plus anchors, vs the ROM (`prep13IceBeamCheck.ts`): **48/48 sprite births (age, slot, x, y) exact and 203/203 `fullSourceOrder` rows equal, in the 2 accepted + 2 alternate scenarios.**

| Field | Class | Value / provider |
|---|---|---|
| `attacker`, `target`, `fieldProfile` | PD | existing live view construction (species, `liveBattlerAnchors().spriteCenter/battlePositionCenter`, HP, gender) |
| `orientation`, `attackerSide` | PD | `request.attacker` |
| `endAge` | K | 202 (`ICE_BEAM_FIRST_INACTIVE_AGE`), identical in all 4 scenarios |
| `geometry.attackerPictureOffset` | PD | `liveBattlerAnchors(attacker).picOffsetPoint` (`liveMoveAnimation.ts:313-330`): equals the accepted constants `(72,104)` / `(176,58)` and the ROM births for LAPRAS `(72,92)` / `(176,53)` |
| `geometry.targetPictureOffset`, `.targetCenter` | PD | `liveBattlerAnchors(target).picOffsetPoint`: `(176,49)` / `(72,99)` accepted, GOLEM `(176,45)` / `(72,104)` alt, all ROM-exact |
| `geometry.monbgBaseHofs/Vofs` | PD | `512 + data[3]`, `512 + data[4]` of the first `Task_UpdateMonBg` = `544 - (targetSpriteCenter.x + frontIdleRest.x2)`, `544 - targetSpriteCenter.y`; the monbg formula holds 4/4 (`prep13-ice-beam-check.json`, `monbgFormulaHolds`) |
| `targetSpriteSlot` (default 8 / 6) | K | `gBattlerSpriteIds = [6, 8]` measured 4/4: target slot 8 when the attacker is the player, 6 otherwise = the reducer default |
| `soundTaskSlot 0`, `monbgTaskSlot 1`, `shakeTaskSlot 2`, `clearTaskSlot 0` | K | task first-appearance (age, slot, function) `(1,1,UpdateMonBg) (26,0,SoundTask_LoopSE) (38,2,ShakeMon2) (198,0,ClearMonBg)`, identical 4/4 and equal to the reducer defaults |
| `animationRngStart` | E | = `gRng2Value` at activation (689912548 accepted player); `grep animationRng src/animation/sceneOnPresentation.ts src/engine/battleScene.ts` has no renderer consumer; pass the activation value or 0 |
| `gameplayRng`, `immutableGameplayState` | E | no consumer in the compositor (same grep); pass any integer / omit |
| `spriteOrder.initialOrder` | L | the activation order (`[62,60,0,63,1,61,6,8,2,4,3,21,20,5,...]` first body); lent order -> `initialOrder`. With only this one lend the reducer reproduces the whole 203-row ROM order, so no per-frame plan is needed |

Allocator facts: sprites slots/templates as `fixtures/prep13/drafts/prep13-ice-beam-*.json` (Simple-blend sprites bank 15 at ages 7/38 etc.); no matrix inputs in the profile. **Missing input: none.**

### 1.2 Water Spout: `SceneOnWaterSpoutConfig` (`sceneOnPresentation.ts:3903`), `WaterSpoutLiveInputs` (`waterSpout.ts:18-33`)
Replay: `waterSpoutTimeline` with the inputs below vs the ROM (`prep13WaterSpoutCheck.ts`): **every sprite birth (exact age, slot, x, y, matrix) and the first-inactive age equal in all 16 bodies** (accepted x2, KINGDRA alt x2, and the lower-HP tier scenarios `mechanic-water-spout-tiers-*` = 6 bodies per side: tiers 3,3,3,2,1,0).

| Field | Class | Value / provider |
|---|---|---|
| `attackerSide` | PD | `request.attacker` |
| `attackerHp`, `attackerMaxHp` | PD | the attacker's **party** HP at activation: source `GetWaterSpoutPowerForAnim` reads the party struct and `maxhp/4` (tier = first `i` with `hp < (maxhp/4)*(i+1)`), `gAnimMovePower = floor(150*hp/maxHP)` also drives the HorizontalShake length (rows 278/270/254/230/206/201 by HP). `fieldProfile` already carries them |
| `attackerEffectCenter` | PD | `anchors.picOffsetPoint` (x and y exact on every launch/rain/impact sprite: 53/53 player, 49/49 opponent bodies) |
| `attackerSubpriority` | K | 30 player / 40 opponent |
| `launchTaskSlot` | K | 0 (`AnimTask_WaterSpoutLaunch_Step` slot 0 at age 10, all 16 bodies) |
| `launchSpriteSlots` | K | lowest-free ascending over the activation in-use set: `[3,4,5,7,9,10,11,...]` (also for bodies 2..6 of the tier runs: in-use set unchanged) |
| `impactAffineSlots` | K | reducer default = first-free over bitmap 0x6: `0,3,4,5,...` (impact matrices observed `0,3,4,5,6,7,8,9,0,3,10,...`) |
| **`attackerSourceHeight`** | **PD (required, not the default)** | `anchors.pictureHeight` (`liveMoveAnimation.ts:325`, = `64 - 2*yOffset`, the source `var` of `SetBattlerSpriteYOffsetFromYScale`). The reducer default 40 is Nosepass's value on both sides (the accepted fixtures' "Wailmer" carrier is NOSEPASS 320); KINGDRA player-back is 52 and the ROM run is **2 rows shorter (276)** exactly as the reducer gives with 52. KINGDRA opponent-front (56) still equals 278 |
| `animationRng` | E | echo of `gRng2Value` (no consumer) |
| `spriteOrderSeed` | L | the activation order (full 64) |
| **Rain `x` / task-local ISO_RANDOMIZE2 seed (prep12 s1.9)** | K, exact | **a constant per side, no gameplay value, no HP**: `AnimTask_WaterSpoutRain` sets `task->data[7] = data[4] + 49` with `data[4] = 136` (player attacker) / `16` (opponent) -> **185 / 65** (`battle_anim_water.c:1255`); the stream is `x' = ISO_RANDOMIZE2(x) % 98 + data[4]`, ported as `waterSpoutIsoRandomize2` and `waterSpoutRainAttempts`. Reproduced: ROM first three rain x `[185,116,97]` / `[65,-34,35]` and every rain sprite x in all 16 bodies. Production can compute it exactly |

**Missing input: none.** Caveat carried from the accepted evidence: `water-spout-evidence.json` says `status: unsupported` (lower tiers not independently staged at the time); this prep closes the ROM-side half (tiers 0..2 reproduced to the sprite level in both orientations, `mechanic-water-spout-tiers-*`). Pixel proof of tiers 0..2 awaits the adapter. The reducer's own painter order differs from the raw `sSpriteOrder` series on ~6% of rows (the creation rows 55 / 118 / 121 / ..., the display-lag semantics); the pattern is identical in the accepted fixture and every alternate/tier body, so it is not an alternate-specific risk.

### 1.3 Hidden Power: `SceneOnHiddenPowerConfig` (`sceneOnPresentation.ts:2151`), `HiddenPowerProfile` (`hiddenPower.ts:25-38`)
**Only one Factory set knows Hidden Power: `FRONTIER_MON_UNOWN` (index 126, `battle-frontier-mons.json`).** So every production Hidden Power attacker is an Unown; all Unown facts matter and the non-Unown controls below are diagnostic only.
Replay: `hiddenPowerAtAge` with the profile below vs the ROM (`prep13HiddenPowerCheck.ts`, 10 scenarios): 14/14 orb births (slot, x, y) exact, slots == derived, matrices == derived, painter order equal on every age (77-79 ages each; the check accepts either direction of the back-to-front list, a weakness noted).

| Field | Class | Value / provider |
|---|---|---|
| `attackerSubpriority` / `targetSubpriority` | K | 30 / 40 by side (attacker 30 when player) |
| `allocationSlots` (14) | K | lowest-free from the in-use set: orbit `[3,4,5,7,9,10]`, scatter `[11..18]` (10/10 scenarios) |
| `orbitMatrixNums` | K | `[0,3,4,5,6,7]` (first-free over 0x6) |
| `scatterMatrixNums` | K | `[8,9,10,11,12,13,14,15]` |
| `spriteOrderSeed` (14) | L | the activation order filtered to the 14 slots **equals the ROM order at age 63 in 10/10** (the reducer needs only this lend) |
| `attackerPersonality` | PD | the party mon's personality: `BattleCommandPresentation` already carries it (`battleCommandPresentation.ts:86-90`, `:345-346`); `hiddenPowerUnownFormIndex(personality)` = letter, exact |
| orb centre (`attackerCenter` argument) | PD for non-Unown; **M for Unown forms** | the ROM centre is `GetBattlerSpriteCoord(attacker, Y_PIC_OFFSET)` of the **letter-form species**: accepted UNOWN_H player `(72,96)` == base anchors; UNOWN_E opponent `(176,49)` vs base-UNOWN anchors `(176,47)`; new-personality UNOWN_G `(176,46)`, UNOWN_F player `(72,98)` vs base `(72,96)`. `mon-pic-coords.json` already holds `UNOWN_B..Z` (`yOffset` differs per letter); `center.y = base anchors.y + (form yOffset - base yOffset)` is **exact on 4/4** (`prep13UnownForm.ts`). Smallest source: override the attacker `coords.yOffset` in the art view from `monPicCoordsData[side][ "UNOWN_"+letter ]` using `hiddenPowerUnownFormIndex(personality)` (the species-id map has no form ids, `species.h:422` `SPECIES_UNOWN_B = NUM_SPECIES+1`) |
| `uninitializedScatterY` | PD | the 8th scatter is created at the **target's** coordinates and not yet initialised at row 118 (Unown attacker): `= liveBattlerAnchors(target).picOffsetPoint.y`: ONIX 88 (player target) / 42 (opponent target), GOLEM 104 / 45, 6/6 Unown observations exact (accepted x2, seed alt x2, GOLEM x2). The reducer's "uninitialized" frame is **Unown-specific**: GENGAR attackers show the 8th already initialised at row 118 (`AnimOrbitScatter_Step`, y = centre) with the identical lag frame and window, so the reducer would be wrong for a non-Unown attacker (irrelevant for the Factory pool; do not reuse the reducer for another Hidden Power user) |
| `animationRngSeed` | E | the reducer's `animationRng` echo = `gRng2Value` (one tick skipped at row 119, confirmed in 6/6 runs); no renderer consumer |

The four new Unown scenarios (UNOWN->GOLEM, new personality; both sides) have a signature identical to the accepted one. **Missing input: Unown letter-form pic coords (above).** Personality is exact party data.

### 1.4 Hyper Beam: `SceneOnHyperBeamConfig` (`sceneOnPresentation.ts:2913`), `HyperBeamGeometry` / `HyperBeamProfile` (`hyperBeam.ts:7-28`)
Replay (`prep13HyperBeamCheck.ts`, 4 scenarios): geometry and rest offsets from anchors **equal the accepted derivation 4/4**; painter order equals the ROM on **377/377 ages** for the accepted `persistentOrder`, for the activation-order index, and for the row-109 index alike (the tie-break never decides in these bodies).

| Field | Class | Value / provider |
|---|---|---|
| `animationGeometry.attackerPictureCenter` | PD | `anchors(attacker).picOffsetPoint` (== first orb `x -/+ 20`, `y`) |
| `.targetPictureCenter` | PD | `anchors(target).picOffsetPoint` |
| `.attackerRestOffset`, `.targetRestOffset` | PD | `anchors.frontIdleRest` (opponent only; player 0): equal to the battler `x2,y2` at row 0 |
| `orbs[i].animation/speed/phase` | presentation RNG | prep12 s1.8 plan (52/52 reproduced, activation +110..+185 step 3, 6 words per frame); not re-measured here. `speed` is recovered from translation step data exactly as `hyperBeamFramebuffer.ts:56-68` |
| **`orbs[i].slot`** | **computed allocator plan (K rule)** | orb `i` spawns at age `110 + 3*floor(i/2)`; slot = lowest free over the activation in-use set `[0,1,2,6,8,60..63]` and the still-live earlier orbs; an orb is released **`reducer visible rows + 1` frames after birth** (`orbAtAge` liveness + 1 release delay). With that rule the **first-free simulation reproduces all 52 ROM slots in 4/4 scenarios** (`prep13-hyper-beam-check.json`; delay 0, 2, 3 each fail). Lifetimes depend on the speed words and the geometry, so a **static `PLANS` row is not enough** |
| `orbs[i].persistentOrder` | L | `lentOrder.indexOf(slot)` (as Seismic Toss, `liveMoveAnimation.ts:1886`): relative order within a birth pair differs from the accepted numbers in ~40% of groups (10-15/26 agree) but the painter order is identical on 377/377 ages; if exactness of the number is required it is `sSpriteOrder.indexOf(slot)` at row `110+3g` (post-sort), which needs the order-sort model, not the lend |
| `attackerSubpriority`, `targetSubpriority` | K | 30/40 by side |
| `spriteOrderSeed` | unused | declared in `HyperBeamProfile` (`hyperBeam.ts:27`) but read nowhere in the reducer; pass the activation order |

**PLANS shape and the drafted row.** `PLANS` (`liveMoveSpriteAllocator.ts:25`) is `Record<moveId, { identity, sparkles: [spawnAge, lifetime][] }>` consumed by `prepareLiveMoveSpriteAllocator` (one `wall` allocation, then `sparkles` with `allocateFirstLiveSprite`/`destroyLiveSprite` as earlier ones expire). Hyper Beam has no wall; the matching row is `63: { identity: "HYPER_BEAM", sparkles: orbs }` with `orbs[i] = [110 + 3*floor(i/2), visibleRows(i) + 1]`, where `visibleRows(i)` must be computed per activation from the three words and geometry (`hyperBeam.ts` `orbAtAge` liveness). The accepted-scenario numbers (player and opponent) are in `fixtures/prep13/prep13-hyper-beam-plan-draft.json` (`lifetimes`, already +1); the first 52 slots are `[3,4,5,7,9,10,11,12,13,14,4,15,5,7,3,16,...]` (player). Net-zero holds, so the host after the body equals the host before it (all orbs released before cleanup; 2 simple-blend sprites at ages 4 and 224 on slot 3, bank 15).

## 2. Route seeds (ordinary-input, prep11 s4 recipe: generated rentals, party member 0 knows the move, `playerTrainerId 416049562`, one turn, `generatedCommandAnimationReplay`)

| Move | Seed / streak / species that REACH the body | Notes |
|---|---|---|
| ICE_BEAM | **0/14 DELCATTY**, **1/14 DUNSPARCE**, **2/35 BLASTOISE** (first body, order known); 1/35 SLOWKING (not first body) | 5,617 slot-0 candidates in the search window, 39 carrier species |
| WATER_SPOUT | **83/14 WAILMER** (not first body: the opponent acted first, the order must be lent after another body) | only 96 slot-0 candidates, one carrier species; deeper search would be needed for a first-body route |
| HYPER_BEAM | **10/28 AERODACTYL** (first body, order known) | 107 slot-0 candidates, one carrier species |
| HIDDEN_POWER | **none found** | `FRONTIER_MON_UNOWN` never appears among generated rentals (seeds 0..9999, streak 0..42 step 7; `anySlotCounts` has no entry); as an opponent it is reachable only through the opponent set generator (not searched) |

## 3. Drafted alternate-species fixtures (`fixtures/prep13/drafts/`, 14 files, `draft: true`, `consumedByTest: false`)
Each carries: scenario, species/personalities/HP, the alternate's OWN activation, `denseWindow.startFrame = activation + acceptedOffset (0)`, frame count (accepted count alongside), allocator at activation, order shape and order, battler subpriority/sprite ids/XY, sprite kinds (slot/bank/tile/matrix), task slots with ages, net-zero, activation `gRng2Value`/gameplay RNG, route seeds. One pair (both sides) per move: Ice Beam `lapras-golem`, Water Spout `kingdra-golem`, Hidden Power `unown-golem` + `unown-seed305420897` (+ the diagnostic `gengar-golem`, `gengar-onix`), Hyper Beam `snorlax-golem`. Alternate activations: Ice Beam 74/78, Water Spout 78/82, Hidden Power 77-78/81-82, Hyper Beam 235/232 (after a Tackle; accepted 79/83).
Alternate-vs-accepted signature (`prep13-alt-compare.json`): identical (rows, bitmap, tasks, in-use, order shape, spawn list, task list, battler subpriorities, net-zero) for **all 12 non-Hyper-Beam, non-KINGDRA-player alternates**; the three differences are explained, not allocator changes: Hyper Beam (a) order shape `post-tackle` instead of first body (lent order, known shape `[..,2,3,4,21,20,5]`) and (b) the orb animated tile numbers (random orb animation words); Water Spout player-back KINGDRA (276 rows, spawns shifted by 2) = `pictureHeight` 52.

## 4. Work for the integration lane (exact list)
1. **Ice Beam** `case 58`: `iceBeamProfileFor(orientation, {gameplayRng: 0, animationRngStart: 0, geometry: {attackerPictureOffset: aA.picOffsetPoint, targetPictureOffset: tA.picOffsetPoint, targetCenter: tA.picOffsetPoint, monbgBaseHofs: 544 - (tA.spriteCenter.x + tA.frontIdleRest.x2), monbgBaseVofs: 544 - tA.spriteCenter.y}, spriteOrder: {initialOrder: lent order}})`. Gate: order lend known. Add to the net-zero list only after the repo's own net-zero audit (not re-run here beyond the 34 bodies above).
2. **Water Spout** `case 323`: inputs of s1.2 with `attackerSourceHeight: aA.pictureHeight` (mandatory) and party HP.
3. **Hidden Power** `case 237`: s1.3; add the Unown-form coords override (only missing provider). Reducer valid for Unown only.
4. **Hyper Beam** `case 63`: s1.4; needs the prep12 words (presentation RNG) and a computed allocator plan.
5. Renderer pair gate lift for each (as prep11), and the first-body/lend gate.

## 5. Evidence index (all new files)
`tools/integration/`: `prep13AltScenarios.py` (alternates -> `tools/battle-lab/prep13-*.json`, 14 new scenarios), `prep13Probe.py` + `prep13Probes.sh` (prep11Probe + spawn x/y, personality, battler subpriority/ids, `gRng2Value` series), `prep13Analyze.py` (-> `fixtures/prep13/prep13-analysis.json`, `-crosscheck.json`), `prep13Alt.py` (-> `-alt-compare.json`), `prep13IceBeamCheck.ts`, `prep13WaterSpoutCheck.ts`, `prep13HiddenPowerCheck.ts`, `prep13UnownForm.ts`, `prep13HyperBeamCheck.ts`, `prep13HyperOrbs.py` (superseded exploratory orb table), `prep13Routes.ts`, `prep13RouteProbe.ts`, `prep13Draft.py`; fixtures `prep13-receipts.json`, `prep13-{ice-beam,water-spout,hidden-power,hyper-beam}-check.json`, `prep13-unown-form.json`, `prep13-hyper-beam-plan-draft.json`, `prep13-routes.json`, `prep13-route-probe.json`, `drafts/*.json`. No RGB dumps and no mGBA logs are committed.

## 6. Reproduce (workspace root, direct mGBA; nothing contacts the shared oracles)
```sh
python3 tools/integration/prep13AltScenarios.py
sh tools/integration/prep13Probes.sh r1; sh tools/integration/prep13Probes.sh r2     # /tmp/prep13-probes/rN; cmp r1 r2 (segfault at interpreter teardown is harmless, as prep11)
python3 tools/integration/prep13Analyze.py && python3 tools/integration/prep13Alt.py
npx vite-node tools/integration/prep13IceBeamCheck.ts; npx vite-node tools/integration/prep13WaterSpoutCheck.ts
npx vite-node tools/integration/prep13HiddenPowerCheck.ts; npx vite-node tools/integration/prep13UnownForm.ts
npx vite-node tools/integration/prep13HyperBeamCheck.ts      # DELAY env = orb release delay after the last visible row; default 1, the only value that reproduces the slots (0, 2, 3 fail)
node --experimental-strip-types tools/integration/prep13Routes.ts > tools/integration/fixtures/prep13/prep13-routes.json
MAX_CAND=10 MAX_HITS=3 node --experimental-strip-types tools/integration/prep13RouteProbe.ts ICE_BEAM   # then WATER_SPOUT, HYPER_BEAM (concatenate into prep13-route-probe.json)
python3 tools/integration/prep13Draft.py
```

## 7. Papercuts
- The orb release delay (visible rows + 1) was an off-by-one found by sweeping `DELAY` 0..3 (now defaults to 1). ~5 minutes.
- The probe's spawn log cannot see a slot freed and re-created within one sampled frame (no `-` event), so measured orb lifetimes from ROM are unusable for the allocator; the reducer's own visibility window + 1 had to be used. ~10 minutes.
- Lab scenario species ids: the accepted files use national ids for Hoenn species (301 = NINCADA, 320 = NOSEPASS on the ROM, not Delcatty / Wailmer); the accepted evidence's "Wailmer" attacker has Nosepass art, which is why the reducer default `attackerSourceHeight = 40` looked right. ~10 minutes.
- `prep13Analyze.py`'s orientation parse is name-based (`mechanic-<move>-<side>-...`, `prep13-<move>-alt-<side>-...`); a new scenario naming scheme silently mis-sides it.
