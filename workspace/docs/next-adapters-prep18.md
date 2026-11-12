# Next adapters prep 18: Dig / Megahorn / Will-O-Wisp / Fury Cutter / Return / Pursuit (S10A, side lane)

Evidence/design only; **new files only** (no tracked file edited, no `src/`, adapter, presentation-RNG, `PROGRESS.md`/`ISSUES.md` change). Every emulator number is a ROM frame from a **direct, independent mGBA run** (Scene ON lab scenarios; the shared HTTP oracles were never contacted). Every relied-on probe ran **twice from fresh processes**: Random2 attribution probes (32 scenarios: all per-frame fields identical, only `finalStateSha1` differs between fresh processes in that probe variant, as in prep12/14), allocator probes (`prep13Probe.py`, 30 x 2 byte-identical `cmp`), activation-state probes (`prep18Probe.py`, 30 x 2 byte-identical `cmp`). Production line numbers at base `6c6c65acd`; a sibling lane edits `src/`, re-grep before editing.

## 0. Results

### 0.0 Headline

1. **None of the six draws Random2.** Every gRng2 write in every accepted scenario (both sides, every body, 32 scenarios) is the per-frame `RfuMain1+0x10` step; zero non-trivial single-stepped frames, zero writes outside `Random2`. The census "C" label on all six is stale exactly like Ice Beam / Hidden Power / Water Spout (prep12) and Overheat / Silver Wind / Psych Up / Curse / Hail (prep14): the reducers' `animationRng*` fields only echo the per-frame advance. The "plan" is therefore a pure advance with the ROM lag ages (below), which reproduces the corpus `animationRng` on **every row** of every accepted body.
2. **Dig is the one move that can go now** (0.75%): its reducer is source-relative; I ran the **real `digAtAge` reducer against the ROM on 4 scenarios** (accepted player, accepted opponent, fresh alternate player FLYGON/GOLEM, fresh alternate **opponent** FLYGON/GOLEM, i.e. elevation 7) with production-derived geometry and the accepted constants: **sprite births 22/22 + 3/3, battler x2/y2/matrix/visibility 194/194 + 67/67 rows, initial scanline witness equal, 0 mismatches in 4/4** (`prep18DigAlt.ts`). No RNG, no palette snapshot, no new provider measurement is missing; the list of production wiring is §1.1.
3. **The other five are not RNG- or provider-blocked, they are reducer-blocked** (`NEEDS-REDUCER`): `megaHorn.ts`, `willOWisp.ts`, `furyCutter.ts`, `return.ts`, `pursuit.ts` are retained-frame scanouts. Their `*DisplayPlan` decodes `state.buffers.hardwareOam/hardwareMatrices` that the **caller supplies per age** (`megaHorn.ts:78`, `willOWisp.ts:147`, `furyCutter.ts:94`, `return.ts:341-347`, `pursuit.ts:308-312`; the accepted verifiers feed `row.hardwareOam` from the retained corpus each age: `verifyMegaHornReducer.ts:20`, `verifyWillOWispReducer.ts:49,94`, `verifyReturnReducer.ts:173`, `verifyPursuitReducer.ts:127,288`). Nothing in `src/engine` produces a hardware OAM/matrix/palette buffer for them (`grep hardwareOam src/engine`: only `battleScene.ts`), so there is no live adapter input to pass. The measured spawn/task/slot signatures needed to write the OAM producer are in §2 and the receipts.
4. **Two request-plumbing facts**: Return's friendship is already in the request (`friendship`, `battleScriptHitChainOpcode.ts:2303`) and in the Factory it is **255 for every Return user** (`battle_tower.c:1637,1761,1779,3018`: `friendship = MAX_FRIENDSHIP` unless the set has FRUSTRATION; no accepted Factory set has both RETURN and FRUSTRATION, `battle-frontier-mons.json`), so only the **strongest** branch is reachable; Fury Cutter's counter is **not** in the request (only `rolloutCounter`), smallest source below.

### 0.1 Verdict table (player-side accepted scenario first; opponent side re-probed and checked against its own corpus; alternates = fresh species, chosen before probing)

Weights are the census usage share. "Draws" = Random2 draws per body (excluding `RfuMain1`). "Window" = accepted dense window start vs the probe activation frame `A` (all accepted windows: **offset 0**, every body).

| Move (weight) | Random2 draws | ageOffsets | Plan alone reproduces the accepted corpus | Other inputs | Verdict |
|---|---|---|---|---|---|
| **DIG 91 (0.75%)** | **0** (C stale) | none; ROM lag ages: setup 191, 192; unleash 34, 35 (echo only) | `animationRng` per row **195/195 setup + 68/68 unleash**, both sides; activation value == corpus row 0 | all classified §1.1: geometry PD (46/46), slots/tiles/matrices/tasks K (equal across 4 scenarios + both corpora), unleash history = chained from the setup reducer end state (scanline, hide, matrix bitmap), order = lent | **READY (no RNG), exact input list §1.1**; reducer == ROM 4/4 scenarios |
| **MEGAHORN 224 (0.29%)** | **0** | none; lag 137, 138 (+157 in 3 of 4 scenarios, §1.2) | **177/177 player, 176/176 opponent** | whole per-age OAM/matrix/palette buffers (BG_DRILL fade, white flash blend at age 110) | **NEEDS-REDUCER** (OAM + palette-timeline producer); 7 sprites, 7 tasks |
| **WILL_O_WISP 261 (0.29%)** | **0** | none; lag 194, 195 (player) / 193, 194 (opponent) | **214/214, 213/213** | whole per-age OAM/matrix buffers; sprite programs (`orbAt`/`fireAt`) already source-relative | **NEEDS-REDUCER**, smallest of the five (10 sprites, closed-form positions exist) |
| **FURY_CUTTER 210 (0.26%)** | **0** | none; lag 35, 36 in every body | **43/43 x 4 bodies, both sides** | `counter` (missing from the request, §1.4), whole per-age OAM/matrix/palette buffers, `ownedSprites` | **NEEDS-REDUCER** + **NEEDS-COUNTER** (request); 1-2 sprites per body |
| **RETURN 216 (0.25%)** | **0** | none; lag 279, 280 (strongest) | **282/282** strongest, **88/88** weak, **100/100** medium, **125/125** strong, both sides | `friendship` PD; Factory => strongest only; whole per-age OAM/matrix/palette buffers (31 sprites) | **NEEDS-REDUCER** (largest); friendship branch edges ROM-confirmed (60 weak, 61 medium, 200 strong, 255 strongest) |
| **PURSUIT 228 (0.26%)** | **0** | none; lag 61, 62, 83 (normal and switchout) | **103/103**, both sides; switchout opponent **103/103** | branch = `request.turn` parity; whole per-age OAM/matrix/palette buffers (BG_DARK fade); 1 sprite | **NEEDS-REDUCER** (smallest sprite count: 1 hit splat) |

Not reached: nothing in the assigned list. Not done: any dense **framebuffer** comparison of an alternate (needs an adapter); Dig's unleash after an **intervening animation body** (history, §1.1 gap G3); a per-age palette timeline for the four reducers that fade/blend (§1.2-1.6 list the trigger ages only); Return weak/medium/strong alternates (the Factory cannot reach them, §0.0.4).

### 0.2 Batch picks for the integration lane

- **D1 = Dig alone (0.75%), do first.** No RNG, no palette, no new measurement; wiring list §1.1 (duration row, parity body select, hide extension, config builder from the production providers, order lend, setup->unleash scanline chain). Acceptance vectors: the 2 accepted corpora (`tools/compare/evidence/dig-{player,opponent}-dense-state.json.gz`, 2 bodies each) plus the 2 drafted alternates (`fixtures/prep18/drafts/prep18-dig-alt*-body{0,1}.json`).
- **D2 = Will-O-Wisp + Pursuit + Fury Cutter (0.81%), the OAM-producer family, in this order.** Same blocker (§0.0.3), same missing piece: an assembler from the existing source programs to hardware OAM + matrices + BG scroll registers + monbg (Task_UpdateMonBg data constants in §2). Will-O-Wisp first (positions already modelled, 10 sprites), then Pursuit (1 hit splat + battler motion), then Fury Cutter (1-2 sprites, counter parity). Fury Cutter additionally needs `furyCutterCounter` in the request (§1.4). None needs Random2.
- **D3 = Megahorn (0.29%), Return strongest (0.25%)** after D2: Megahorn adds the BG_DRILL fade + flash blend (palette timeline), Return adds 31 sprites and two blend templates; Return needs only the strongest branch for Factory play.
- All six: pass `animationRng: 0` (as `liveMoveAnimation.ts:1614` does for Grudge) or the host activation state; no host-RNG plan row is needed.

## 1. Per-move results

Common allocator facts (measured in all 32 scenarios, 2 fresh runs, equal): `gOamMatrixAllocBitmap = 0x6`, no active task, in-use sprite slots `[0,1,2,6,8,60,61,62,63]`, battler subpriority player 30 / opponent 40, first loaded sheet bank 7 tile 305, second sheet bank 8 tile 313, matrix ids first-free over 0x6, task slots lowest-free, net-zero at end+1 (bitmap/tasks/sprites) in every body of every scenario. The `Task_UpdateMonBg` data `[spriteSlot, x+x2, y+y2, 32-x, 32-y, ...]` equals the battler on that slot at activation (monbg formula) in **all** bodies that create it (Megahorn, Will-O-Wisp, Fury Cutter, Return, Pursuit; Dig's task formula, which is the attacker's pre-dig position with y = 160, is §1.1). Per-move signatures: `prep18-constants.json`, `receipts/<move>.json`.

### 1.1 Dig (`Move_DIG` = `choosetwoturnanim DigSetUp, DigUnleash`, `battle_anim_scripts.s:2652`)

**Random2: none** (callers `{RfuMain1+0x10: 393 / 401 anim frames}`, `nonTrivialDraws 0`). Activation values (player): setup `0xEDE06945` (A=54), unleash `0x615F7C92` (A=561); opponent `0x42D715A3` (54), `0x85A806AB` (613). Plan: pure advance skipping ages 191, 192 (setup) and 34, 35 (unleash); equals the corpus `animationRng` on all 195 + 68 rows, both sides (`plans.json`). Windows: corpus = two concatenated body windows (frame jump 248 -> 561 / 613); each starts at its activation (offset 0), rows 195 and 68. Request: `animTurn` at activation 1 (setup) / 2 (unleash) in the ROM == request `turn` 0 / 1 (`battleScriptHitChainOpcode.ts:2299`), i.e. **`(request.turn & 1)` selects the body exactly as for Fly/Bounce**.

Two-turn hide (measured on the corpora + alternates, `prep18-dig-chain.json`): the attacker `invisible` is set from setup age 10 to 188, visible but off-screen (x2 +200 player / +96 opponent) at ages 189-193, and **`invisible` again at the setup first-inactive row (age 194; matrix 1 player / 2 opponent) and at unleash ages 0-6**; it flickers visible at unleash age 7, hidden again at 8-31 and is visible from age 32 (the dirt-mound / hit-splat part). The reducer reproduces all of it (battler visibility rows 194/194 + 67/67 in 4 scenarios). Between the two bodies the hide must persist: production hides only moves 19/340 (`liveMoveAnimation.ts:757-759`, `(request.turn & 1) === 0`); extending that predicate to `moveId === 91` with the same parity rule gives the between-turns hide, and the unleash input `attackerInitialVisible = false`.

**Field classification of `DigLiveInputs` (`dig.ts:25-114`).** PD = production-derived today, K = constant under the known-entry allocator (equal across accepted player, accepted opponent, fresh alternate player, fresh alternate opponent AND both retained corpora), C = chained from the setup reducer, L = order lend, H = hide state.

| Field | Class | Value / source |
|---|---|---|
| `body`, `attackerSide`, `targetSide`, `attackerSpecies`, `targetSpecies` | PD | request (`turn & 1`, `attacker`, `target`) + field species |
| `attackerCenter`, `targetCenter` | PD | `liveBattlerAnchors().spriteCenter`: ROM battler sprite (x, y) at activation == production **46/46 bodies** across the 18 accepted + 12 alternate scenarios (`prep18-geometry.json`) |
| `attackerInitialOffset`, `targetInitialOffset` | PD | `liveBattlerAnchors().frontIdleRest` (x2, y2): 46/46 |
| `attackerElevationY` | PD | `battlePositionCenter.y - enemyElevation` for an opponent attacker, `80` for a player attacker: measured 80 (player), 40 (VIBRAVA), **33 (FLYGON, elevation 7)**; ROM mound y == elevationY + 32 in all 4 scenarios. The `enemy-mon-elevations.json` table is already read by `battleCommandFieldArt.ts:122` |
| `targetAnimationOrigin` | PD | `{targetCenter.x, targetCenter.y + (opponent attacker ? 8 : 0)}`: ROM hit-splat births (x, y) 3/3 in 4 scenarios (e.g. `80,99` Chansey, `160,65`-side GOLEM alt) |
| `attackerSpriteSlot / targetSpriteSlot` | K | 6 / 8 (battler ids 0 / 1 sprite ids), `attackerSubpriority / targetSubpriority` 30 / 40 swapped by side |
| `attackerInitialMatrixNum / targetInitialMatrixNum` | K | 0 / 0; `attackerCleanupMatrixNum / targetCleanupMatrixNum` 1 / 2 (player attacker) and 2 / 1 (opponent attacker), equal in all 4 scenarios; `attackerInitialMatrix/targetInitialMatrix` identity `[256,0,0,256]` |
| `attackerInitialVisible` | H | setup `true`, **unleash `false`** (hide state above); `targetInitialVisible` `true` |
| `moundSlots` | K | `[3, 4]` (setup births age 7, tiles 310 / 318; unleash births age 11, tiles 321 / 329; bank 8) |
| `plumeSlots` (20, setup only) | K | 5 groups at ages 18, 52, 86, 120, 154, slots `[5, 7, 9, 10]` each (bank 7 tile 305), equal in all 4 scenarios |
| `impactSpriteSlot`, `impactMatrixNum` | K | slot 5 (unleash age 32, tile 305 bank 7, matrix 0); `moundMatrixNum`, `plumeMatrixNum` 0 |
| `digTaskSlot`, `updateMonBgTaskSlot`, `clearMonBgTaskSlot`, `shakeTaskSlot` | K | setup: `AnimTask_DigBounceMovement` slot 0 (age 10), `Task_ClearMonBgStatic` slot 0 (189); unleash: `Task_UpdateMonBg` slot 1 (8), `AnimTask_DigRiseUpFromHole` slot 0 (14), `AnimTask_ShakeMon_Step` slot 0 and `Task_ClearMonBg` slot 2 (32): equal in all 4 scenarios |
| `spriteOrder` | L | setup: first-body order `[62,60,0,63,1,61,6,8,2,4,3,21,20,5,...]`; unleash: the post-setup order `[...,4,3,7,5,10,9,21,20,...]` (equal in all 4 scenarios; this is the tracker's persisted order, `liveSpriteOrderHost.ts`) |
| `mudSand`, `dirtMound`, `impact` allocations | K | mud/sand tile slot 6 bank 7 range `[305,5]`; dirt mound tile slot 7 bank 8 range `[310,16]` (setup) / `[321,16]` (unleash); impact tile slot 6 bank 7 `[305,16]` (reuse of the MUD_SAND / IMPACT sheets, `dig.ts:106-113`) |
| `initialMatrixBitmap` | K | `0x6` at both bodies, net zero at end+1 |
| `setupBgOffset` | PD | `{32 - attackerCenter.x, 32 - attackerCenter.y}`: (-40,-65) player VIBRAVA, (-144,-20) opponent VIBRAVA; reproduced for the alternates (reducer == ROM) |
| `monBg.layer / layerId` | K | player attacker `bg2` / 6, opponent attacker `bg1` / 8 |
| `monBg.snapshot` | PD | `{attackerCenter.x, 160}` in both bodies (ROM `Task_UpdateMonBg` data `[6,72,160,-40,-128,...]`) |
| `monBg.baseScroll` | K | player `(-40,-128)`, opponent `(-144,-128)` |
| `monBg.activeCnt / inactiveCnt` | K / C | setup inactive = first-body constant (`bg2cnt 0x5e00` player, `bg1cnt 0x9c00` opponent), active `0x5e02` / `0x5c02`; unleash inactive = `0x5e02` / `0x5c02` (left by setup) |
| `initialScanline` | K (setup) / **C (unleash)** | setup: first-body constant (`srcBuffer 1, state 0`, bank0 160 nonzero words, bank1 zero; equal in all 4 scenarios + both corpora); unleash: **== `digAtAge(setup, 194).scanline` exactly** (`prep18DigChain.ts`: state/srcBuffer/dmaDest/dmaControl/buffers equal on both sides) AND equal to the ROM banks at activation for the fresh alternates (differs by species: opponent VIBRAVA 152 nonzero words, FLYGON 159: it depends on elevation, which the reducer models) |
| `animationRngSeed` | E | echo (`dig.ts:113`: "Dig makes no RNG calls") |

**Palette: not consumed.** The Dig renderer draws with the species art palettes and the dirt-mound / mud-sand / hit-splat asset palettes (`battleScene.ts:36510-36640`); `DigLiveInputs` has no palette field (D-PAL stale).

**Gaps (wiring, not measurement)**: **G1** `liveMoveAnimationDuration` row for 91 (195 setup / 68 unleash rows) and a config builder in `liveMoveAnimationPresentation` (production providers above; `digInputsFor` in `verifyDigReducer.ts:206` is the corpus-side reference and is what the alternates used with the geometry fields replaced). **G2** hide predicate (`liveMoveAnimation.ts:757-759`: add `moveId === 91`). **G3 history**: the unleash BG-register, matrix-bitmap and scanline inputs are chained from the setup end state (verified), but the scenario has **no animation body between the two turns** (the opponent's Growl missed a hidden target and carries no body); when another body animates in between (e.g. a self-target move) the BG registers / scanline can change (prep16 §0.3 mechanism). Not measured: gate unleash to "nothing animated since setup", else fall back. **G4** lent order (`spriteOrder`) for both bodies.

### 1.2 Megahorn (`Move_MEGAHORN`, `:6109`)

Random2: none (212 single-stepped frames, only `RfuMain1`). Activation `A` 211 (player) / 212 (opponent), values `0x1A968632` / `0x85505C71`; corpus rows 177 / 176, activation == row 0 `animationRng`, plan == corpus 177/177, 176/176. ROM lag ages 137, 138 and **157 in three of four scenarios** (accepted player and both alternates, not the accepted opponent): the echo's lag set varies with species/side; nothing consumes it. First (and only) body in the scenario follows a Tackle: BG registers `bg2cnt 0x5e02` (not first-body S0), order shape post-tackle, hardware scroll 0, no scanline effect; equal across player / alternates (opponent differs, side-keyed).
Spawns (age:slot): `gSlideMonToOffset` 89:3, 100:5; `gMegahornHorn` bank 7 tile 305 matrix 0 at 94:4; `gBasicHitSplat` bank 8 tile 313 matrix 3 at 100:3; `gComplexPaletteBlend` 110:3; `gSlideMonToOriginalPos` 122:4, 127:3. Tasks: `Task_UpdateMonBg` slot 1 age 7 (target on monbg), `Task_FadeToBg` slots 0 (10) and 2 (135), `AnimTask_UpdateSlidingBg` slot 3 (29), `AnimTask_ShakeMon_Step` 0 (48), `AnimTask_ShakeMonInPlace_Step` 0 (110), `Task_ClearMonBg` 0 (135). All equal across the 4 scenarios + both corpora (`spawnsEqual`, `taskPairsEqual`); row count 176 vs 177 is the accepted side-keyed cleanup (`megaHorn.ts:61`).
Verdict: **NEEDS-REDUCER** (OAM + matrix + BG3 drill scroll + palette timeline: BG_DRILL fade at ages 10 / 135, white flash blend at 110); the existing `megaHornAtAge` returns the caller's buffers (`megaHorn.ts:59-68`).

### 1.3 Will-O-Wisp (`Move_WILL_O_WISP`, `:8076`)

Random2: none. `A` 76 (player) / 80, values `0x16194BC9` / `0xDAAD9D3D`; rows 214 / 213; plan == corpus 214/214, 213/213; lag 194, 195 / 193, 194. First body: all registers S0 (`dispcnt 0xbf40, bg2cnt 0x5e00, ...`), scanline S0, equal across player / opponent / both alternates.
Spawns: orbs `gWillOWispOrb` bank 8: tile 537 slot 3 (age 10), tile 553 slot 4 (15), tile 557 slots 5 (20) and 7 (25); fires `gWillOWispFire` bank 7 tile 305 slots 3, 4, 5, 7, 9, 10 at age **163 (player) / 162 (opponent)** (matches `willOWisp.ts:59-61`). Tasks: `Task_UpdateMonBg` slot 1 (7), `Task_WaitAndPlaySE` 0 (10), `SoundTask_AdjustPanningVar_Step` 0 (67), `AnimTask_ShakeMon2_Step` 0 (163 / 162), `Task_ClearMonBg` 0 (192). Opponent differs from player only in the side-keyed fire age / row count; alternates equal their own side's accepted scenario (4/4).
Verdict: **NEEDS-REDUCER**; the cheapest of the five: `orbAt`/`fireAt` already compute (x, y, x2, y2, invisible) per age (`willOWisp.ts:77-112`), only the OAM/matrix assembly (slot/tile/bank above, no affine) and the monbg/shake/pan outputs are missing.

### 1.4 Fury Cutter (`Move_FURY_CUTTER`, `:1420`)

Random2: none, 4 bodies per scenario (A = 78 / 712 / 1346 / 1980 player; 82 / 716 / 1350 / 1984 opponent), each 43 rows, lag 35, 36, plan == corpus 43/43 x 4 x 2 sides. Body 1 is a first body (S0); bodies 2-4 follow Tackle-like predecessors (post-tackle order; `bg1cnt 0x5c02` for the player sequence, equal across player / alternates).
Spawns: slot 3 `gCuttingSlice` bank 7 tile 305 at age 7 in every body; bodies 2-4 add slot 4 `gComplexPaletteBlend` (age 7) with blend repeats 1 (counter 2) and 3 (counters 3+). Tasks `Task_UpdateMonBg` 1 (4), `AnimTask_ShakeMon_Step` 0 (14), `Task_ClearMonBg` 0 (33).
**Counter input is missing**: `FuryCutterLiveInputs.counter` (`furyCutter.ts:14`, type `1|2|3|4`); `BattleMoveAnimationRequest` carries only `rolloutCounter` (`battleMoveAnimation.ts:12`). Smallest source: a 7th MOVE_ANIMATION argument for move 210 = `attackerBattler.furyCutterCounter` read after `furycuttercalc` (it increments before `attackanimation`, `battle_script_commands.c:8591`), exactly like the Rollout counter at `battleScriptHitChainOpcode.ts:2307`; the state field exists (`battleScriptRulesContext.ts:252`).
**Counter 5 (measured, `prep18-fury-cutter-six-hits.json`)**: the counter caps at 5; the fifth consecutive hit is a 43-row body with power 160, **right-hand slice geometry identical to counter 1 and 3** (`x 136, x2 4, data [1,1000,1000,1024,1024,1,0,0]`), blend repeats 3; `FuryCutterStrong` and `FuryCutterStrongest` are the same script, so counter 5 == counter 3 for the reducer (the type `1|2|3|4` and `power: 10|20|40|80` cannot represent it; map to 3). Direction = `counter & 1`.
Verdict: **NEEDS-REDUCER** (+ the counter argument); 1-2 sprites per body.

### 1.5 Return (`Move_RETURN`, `:8924`)

Random2: none. `A` 74 (player) / 78, activation `0xDAAD9D3D` in all variants; rows 282 (strongest) / 88 / 100 / 125 (weak / medium / strong); plan == corpus per row on all 4 variants x 2 sides; lag = last two rows of each body. **Branch edges ROM-confirmed**: friendship 60 -> `ReturnWeak`, 61 -> `ReturnMedium`, 200 -> `ReturnStrong`, 255 -> `ReturnStrongest` (`returnPowerLevelForFriendship`, `return.ts:594-601`, matches `AnimTask_GetReturnPowerLevel`). `friendship` PD: request `friendship` = `attackerBattler.friendship` (`battleScriptHitChainOpcode.ts:2303`); **Factory Return users are 255** (§0.0.4).
Strongest spawns (31): `gSimplePaletteBlend` 11:3, 264:3; `gVerticalDip` slot 3 x9 (24 ... 187); `gBasicHitSplat` bank 7 tile 305 matrix 0 slot 4 x11 (34 ... 187) and matrix 3 at 225, 241; `gMultiuse` trace sprites at 120 (slots 5, 7), 142, 157, ..., 202 (slot 5): **bank 0 tile 369 (player attacker) / bank 1 tile 473 (opponent attacker)**, the one side-keyed difference, equal in the alternates. Tasks: `Task_UpdateMonBg` 1 (4), `AnimTask_ShakeMon_Step` 0 (67), `AnimTask_TraceMonBlended_Step` 0, 3 (120), 2 (142), `AnimTask_ShakeMon_Step` 2 (120), `Task_ClearMonBg` 0 (277). Order/registers S0 (first body), equal across all scenarios.
Verdict: **NEEDS-REDUCER** (largest: 31 sprites, 3 blend families). The model objects (`ReturnImpact`, `ReturnTrace`, dips/lunges) exist in `return.ts` but are never assembled into OAM.

### 1.6 Pursuit (`Move_PURSUIT`, `:1273`)

Random2: none. Normal: `A` 73 (player) / 77, values `0xE5BBCFF8` / `0x473602A1`, rows 103, plan == corpus 103/103 both sides, lag 61, 62, 83. **Switchout** opponent: `A` 360, value `0x561FBE00` (1444920832), rows 103, plan == corpus 103/103, same lag ages (`prep18-pursuit-switchout.json`). Branch: ROM `animTurn` 1 (normal) / 2 (switchout) == `request.turn` 0 / 1.
Spawns: one `gBasicHitSplat` bank 7 tile 305 matrix 0 slot 3 at age 47; tasks `Task_UpdateMonBg` 1 (4), `Task_FadeToBg` 0 (7, BG_DARK), `AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step` 0 (47), `Task_ClearMonBg` 0 (59). First-body registers S0, all constants equal across 4 scenarios.
Verdict: **NEEDS-REDUCER** (smallest sprite set; needs the fade timeline).

## 2. Alternates (chosen before probing, never by matching output) and windows

`prep18AltScenarios.py` / `prep18AltOpponent.py` swap species in the accepted scenarios (player attacker -> alt, opponent target -> GOLEM; and the mirrored opponent-attacker version). Window = `[A_alt, A_alt + accepted rows - 1]` (accepted offset 0).

| Move | Alternate (attacker -> target) | `A_alt` player / opponent attacker | Plan shape vs accepted |
|---|---|---|---|
| Dig | FLYGON -> GOLEM | 54, 555 / 54, 612 | identical (lag 191,192 / 34,35); reducer == ROM 4/4 |
| Megahorn | HERACROSS -> GOLEM | 221 / 223 | identical to its own side except lag 157 present on the opponent alternate (not on the accepted opponent) |
| Will-O-Wisp | BANETTE -> GOLEM | 77 / 81 | identical |
| Fury Cutter | SCYTHER -> GOLEM | 78, 712, 1346, 1980 / 82, 716, 1350, 1984 | identical |
| Return | SNORLAX -> GOLEM | 72 / 76 | identical |
| Pursuit | UMBREON -> GOLEM | 72 / 76 | identical |

Alternate activation-state (BG registers, hardware scroll, software matrices, scanline) and allocator signatures equal their own side's accepted scenario for every move and body **except Dig unleash** (scanline witness differs by species through elevation, reproduced by the reducer, §1.1). Drafts: `fixtures/prep18/drafts/*.json` (`draft: true`, `consumedByTest: false`). Random2 plans: `fixtures/prep18/plans.json` (per scenario/body: activation value, lag ages, `activationEqualsCorpusRow0`, `planEqualsCorpusPerRow`, `draws: []`).

## 3. Reproduce

```sh
# Random2 probes + allocator probes x2 (fresh processes, cmp'd); stage 1 ~2 min, 2 ~30 s, 3 ~30 s on 16 cores
STAGE=1 JOBS=16 sh tools/integration/prep18Run.sh; STAGE=2 JOBS=16 sh tools/integration/prep18Run.sh; STAGE=3 JOBS=8 sh tools/integration/prep18Run.sh
python3 tools/integration/prep18AltOpponent.py          # then the same probes for prep18-*-altopp-* (prep14Probes.sh, prep13Probe.py, prep18Probe.py)
export PYTHONPATH=../../vendor/libmgba-py PY=../../vendor/mgba-venv/bin/python
$PY tools/integration/prep18Probe.py tools/battle-lab/<scenario>.json /tmp/p18c/r1/<scenario>.json   # activation state (BG regs, scroll, matrices, scanline), x2
python3 tools/integration/prep18Analyze.py /tmp/p18a/r1                      # corpus cross-check (per body windows)
python3 tools/integration/prep18Plans.py /tmp/p18 tools/integration/fixtures/prep18/plans.json
python3 tools/integration/prep18Constants.py /tmp/p18a/r1 tools/integration/fixtures/prep18/prep18-constants.json
python3 tools/integration/prep18Activation.py /tmp/p18c/r1
python3 tools/integration/prep18Receipts.py
npx vite-node tools/integration/prep18Geometry.ts; npx vite-node tools/integration/prep18DigChain.ts out.json; npx vite-node tools/integration/prep18DigAlt.ts
python3 tools/integration/prep18FuryCutterSix.py                              # counter-5 scenario
```

Outputs under `tools/integration/fixtures/prep18/`: `plans.json`, `receipts/<move>.json` (compact), `drafts/`, `prep18-{analysis,crosscheck,constants,activation,activation-summary,geometry,dig-chain,dig-alt-check,fury-cutter-six,pursuit-switchout}.json`. No RGB dumps, no mGBA logs.

## 4. Papercuts

- `prep14Probes.sh` / the prep13/prep14 probe loops print `Segmentation fault: 11` for some parallel mGBA processes at exit (outputs are complete and byte-identical across runs); `xargs -n 2` mis-pairs words under zsh when the job list is word-split (use `-L 1` with `"$s $r"` lines and `${=VAR}`), ~10 min.
- `prep13Probe.py` records BG control registers only (no scroll, no software matrices, no scanline): `prep18Probe.py` adds them; folding it into prep13 would save the second probe pass, ~5 min.
- The accepted dense corpora are concatenated body windows (frame jumps); `prep14Analyze.py` compared the whole corpus with body 0 and reported false row/spawn mismatches for Dig / Fury Cutter until split at the frame gaps, ~15 min.
