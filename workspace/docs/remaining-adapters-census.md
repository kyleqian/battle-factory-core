# Remaining adapters census (S10A, side lane)

Evidence/triage only; new files only. Every accepted Factory move is counted exactly once (live, in-flight, or remaining); the counts, the per-move table, the provider ranking and the batch picks are all regenerated:

```
node tools/integration/remainingAdaptersCensus.mjs --write --doc   # fixtures/remaining-adapters-census.json + this file
node tools/integration/censusActivationSummary.mjs                    # fixtures/census-activation/summary.json (needs the probe receipts)
tools/integration/censusActivation.sh; tools/integration/censusStagedActivation.sh   # direct-mGBA probes (optional, regenerates the receipts)
```

Inputs: `docs/animation-integration-live-status.json` (234 live, 11 faithful random), `docs/animation-integration-readiness.json` + `-merged-readiness.json` (276 accepted, host classes), `tools/integration/fixtures/h-buffer-triage.json` (per-field classes/cites of the 78 H_BUFFER moves; stale config line numbers are re-resolved by symbol), `sprite-order-body-plans-ext.json`, the Level-50 set pools for the usage weight (the model of `tools/integration/spriteOrderPlanCoverageRank.py`: ranges 0..6, 4 moves per set, both sides; `weight` below is the share of all Factory move uses). The script asserts `live (scoped exact) + faithful-random + in-flight + remaining = 276` (faithful-random = the disjoint D3 bucket `faithfulRandomAdapters`, docs/presentation-rng.md) and that every cited `file:line` exists and is non-empty. In-flight = batches the supervisor has running (none; the lists in the script are empty). Helping Hand is the 277th Factory move and is not accepted (not counted).

## 1. Summary

| Bucket | Moves | Weight |
|---|---:|---:|
| accepted Factory moves | 276 | 100% |
| live adapters (scoped exact) | 234 | 92.19% |
| faithful-random adapters (ASTONISH, DOUBLE_KICK, FLAIL, HYPER_BEAM, LOVELY_KISS, MUD_SLAP, RAIN_DANCE, SAND_ATTACK, THRASH, WATER_PULSE, WISH) | 11 | 3.76% |
| in flight (0 order-consumer + 0 prep6) | 0 | 0.00% |
| **remaining (this census)** | **31** | **3.56%** |
| check | 234+11+0+31=276 | |

Remaining moves by group:

| Group | Moves | Weight | Meaning |
|---|---:|---:|---|
| SMALL-INPUT | 1 | 0.22% | one named production input / reducer parameter |
| PROVIDER-x | 4 | 0.96% | blocked on exactly one named provider |
| MULTI | 25 | 2.26% | several providers |
| OUT | 1 | 0.11% | needs something outside S10A scope |

Remaining by readiness host class (a move can carry several): H_BASIC 2, H_BUFFER 25, H_DERIVED 3, H_RANDOM 1, H_VARIANT 4. Moves whose order input is satisfied only for the battle's first body: 22. Moves that still need a per-move sprite-slot plan row: 24.

PROVIDER-x breakdown: X-SWITCH (1: BATON_PASS); D-SCAN (1: MEMENTO); C (1: METEOR_MASH); X-SUBST (1: SUBSTITUTE).

## 2. What production derives today

| Input | Production source | Effect on the remaining moves |
|---|---|---|
| battler anchors / geometry (pic point, sprite centre, battle position, coords yOffset, idle rest) | `src/engine/liveMoveAnimation.ts:159-224` (`liveBattlerAnchors`, `liveBattlerCoordAttrs`) | A: derivable for every remaining move; resolves Pain Split yOffset, Rock Tomb/Fire Blast pic points, Fake Tears picture bounds |
| party personality, displayed HP / status | `src/engine/liveMoveAnimation.ts:931-936`, displayed field (`src/engine/battleResolutionPresentation.ts:3140-3155`) | A: Hidden Power personality, Water Spout HP, Self-Destruct HP 0 (prep6 measured) |
| known-entry sprite allocator + wall plans + net-zero history | `src/engine/liveSpriteAllocator.ts:89-123`, `src/engine/liveMoveSpriteAllocator.ts:28,57,75` | A-SLOT: first-free slots at spawn ages; per-move PLANS table is data work (plan row + net-zero + tie audit); 76 remaining moves carry slot fields |
| free-slot `sSpriteOrder` provider | `src/engine/spriteOrderProvider.ts:235,256` (`spriteOrderForSlots`, occupied prefix), `src/engine/liveMoveSpriteAllocator.ts:127-139` | B: supplied ONLY to the battle's first move body after a known entry; null (scene-off fallback) otherwise. Cross-body plan tracking (`applySpriteOrderUnitPlan`, `spriteOrderProvider.ts:346`) exists but is not wired |
| palette history for audited plans | `src/engine/liveMoveAnimationPalette.ts:8-11,91`, `src/data/gen/live-animation-palette-resources.json` (58 plans) | D-PAL: returns only the Shadow Punch scratch; unfaded/faded/hardware snapshots are not supplied for any remaining move |
| MOVE_ANIMATION request | `src/engine/battleScriptHitChainOpcode.ts:2276-2289`, `src/engine/battleMoveAnimation.ts:2` | carries move, turn (animTurn), STATIC move-table power, damage, friendship, multihit; NOT: dynamic gBattleMovePower, DisableStruct counters, secondary-effect outcome |
| affine matrix ids / task slots / Random2 / OBJ tile+bank allocator / BG-BLDCNT-monbg / OAM-VRAM-scanline buffers / audio | none (no `matrixBitmap`, `CreateTask`, `Random2`, `gScanlineEffect` state anywhere in `src/engine`) | the remaining blockers of the H_BUFFER moves |

## 3. Stale verdicts corrected

| Older verdict | Correction (cite) |
|---|---|
| Sleep Talk `BLOCKED: called-move flow` (prep2 row 8) | Metronome is live and plays the called move as a separate request (`src/engine/liveMoveAnimation.ts:417,1043`); `SceneOnSleepTalkConfig` has no profile (`src/animation/sceneOnPresentation.ts` interface). Only the renderer's hard-coded HUD block remains: READY-NOW. |
| Aerial Ace / Quick Attack / Feather Dance / Ice Punch / Fake Tears `H_OUTCOME` (readiness) | `controllerProfile`/`controllerPresentation` feed only HUD/text fields of the views (`sceneOnAerialAceView`, `sceneOnQuickAttackView`, `sceneOnFeatherDanceView`, `sceneOnIcePunchView`, `sceneOnFakeTearsView`); the body functions do not read them: READY-NOW with a body-only recipe. Fire Punch is the exception (`burnFlames` read `resolution.secondaryRollSucceeded` / `faint`). |
| Sand Attack `NEEDS-ORDER+RNG2+OUTCOME` (h-buffer-triage) / `READY-WITH-PROVIDER` (order-consumer-prep) | the accuracy banner is body; `controllerProfile` is HUD only. Remaining blockers are Random2 dirt seeds (`mudSlap.ts`/`sandAttack.ts` 30 seeds, visual-randomness-prep s2) + first-body order. The order-consumer prep verdict for Mud Slap and Sand Attack covered the order input only. |
| Magnitude `BLOCKED (not an accepted adapter)` (order-consumer-prep) | `ANIMATION_COVERAGE.json` records MOVE_MAGNITUDE `exact` (764/764 zero-residual, four bodies); `magnitude-dense-evidence.json` still says `unsupported-evidence` (older). Remaining: dynamic power on the request (branch `movePower > 99`, `magnitude.ts:88`) + first-body order; activation == window start for all four bodies (census-activation). |
| Dragon Dance / Fire Blast / Double Team `READY-NOW` (h-buffer-triage) | prep6 measured an order dependence the field-name triage missed: Dragon Dance 1 bit/1 frame, Fire Blast full 64-pool permutation (`FIRE_BLAST_ORDER_SEED`), Double Team `frontClone` 1 bit. The first-body provider now supplies it, so they are READY-NOW with first-body-only exactness. |
| `NEEDS-ORDER` for every order consumer (h-buffer-triage, 57 moves) | first-body order is now production (`spriteOrderForSlots`, `prepareLiveMoveSpriteOrder`); `B` is no longer a blocker for the first body. It remains a fidelity limit for later bodies (68.2% weighted EXACT per-(move, side) plan coverage, `docs/sprite-order-plan-coverage.md`). |
| Absorb / Mega Drain / Giga Drain / Dream Eater `NEEDS-...+OUTCOME` | the configs carry no HP field (h-buffer-triage s2.10); the HP bar is the ordinary queue's. Only the palette-controller allocator profile (D-PAL) is missing. |
| Razor Wind / Sky Attack / Curse `H_VARIANT` | the charge/strike selector is `request.turn` (`choosetwoturnanim`), already on the request like live Solar Beam; not a provider. Dig / Dive / Fly / Bounce additionally need the hidden-battler state between turns. |
| Rock Blast `E-OUT` | one body per hit; `request.multihit`/`turn` exist and per-hit adapters are live (Double Slap, Comet Punch, Triple Kick). Only the task slots remain. |
| Reversal `blocked on a reducer change` / Flail `power` | both read the DYNAMIC power (`gDynamicBasePower`), but the request emits the static table power (`battleScriptHitChainOpcode.ts:2285`): a named small input, not `request.power` as noted in the progress ledger. Reversal's reducer toggle fix is banked in `reversal-shake-evidence.json`. |
| Fury Cutter / Ice Ball / Rollout / Spit Up counters | come from the DisableStruct snapshot the ROM passes in the animation command (`battle_script_commands.c:1787`), not `animTurn`; the request does not carry it, though the rules state does (`battleScriptRulesContext.ts:251-252,325-326,738`). Only Swallow's stockpile uses `animTurn` (prep6). |
| Fire Punch accepted window `UNRESOLVED` | RESOLVED in `docs/next-adapters-prep10.md` (direct mGBA, same staged route): the player window 2313..2537 starts 27 frames BEFORE the activation 2340 (reducer age at activation 27; spiral spawn = activation+13 = age 40/41); the opponent window 2081..2357 starts 13 frames AFTER the body end (2068), so it never covers the body; the burn flames are a separate ordinary status body (2224..2262), not part of the 101-frame Fire Punch body. |

## 4. Per-move table (103 moves)

Columns: `needs` = provider codes after removing what production supplies (`B(first body)` = also consumes sSpriteOrder, supplied by production for the first body only; legend in section 5). Blockers cite the consumed field (`a/` = `src/animation/`, `e/` = `src/engine/`, `rom/` = `reference/pokeemerald/`). Full text per blocker is in the JSON.

### SMALL-INPUT (1)

| Move (id) | Host class | Weight | needs | Blockers (consumed field @ cite) | Notes / measured |
|---|---|---:|---|---|---|
| ENDEAVOR (283) | H_BUFFER | 0.22% | E-OUT | E-OUT: animationProfile:staleMovePower (HP before/after + stale gAnimMovePower (value left by the previous animation)) @ a/sceneOnPresentation.ts:1699 |  Activation/window start: endeavor-player 2339/2345, endeavor-opponent none produced. |

### PROVIDER-x (4)

| Move (id) | Host class | Weight | needs | Blockers (consumed field @ cite) | Notes / measured |
|---|---|---:|---|---|---|
| BATON_PASS (226) | H_BASIC | 0.48% | X-SWITCH | X-SWITCH: attackanimation; openpartyscreen; switchoutabilities; returntoball; switchinanim after the body @ rom/data/battle_scripts_1.s:1700-1714, a/sceneOnPresentation.ts:2458 | body ends in a Pokeball sprite hand-off with no live switch owner (docs/next-adapters-prep2.md row 2) |
| SUBSTITUTE (164) | H_BASIC | 0.22% | X-SUBST | X-SUBST: body ends with the battler shown as the doll (AnimTask_MonToSubstitute); field art view has no behind-substitute state @ rom/data/battle_scripts_1.s:1085-1103, e/battleCommandFieldArt.ts:1, a/sceneOnPresentation.ts:3712 | persistent doll sprite after the body |
| METEOR_MASH (309) | H_DERIVED | 0.22% | C | C: twinkles: 48 Random2-resolved variants (optional field; geometry.twinkles) @ a/meteorMash.ts:46, a/meteorMash.ts:195 | everything else is anchors + faint-attack-style profile |
| MEMENTO (262) | H_DERIVED | 0.04% | D-SCAN | D-SCAN: reducer.initialScanlineSourceBuffer / initialScanlineBuffers[2][320] captured from RAM (HDMA scanline state) @ a/memento.ts:31-32, a/memento.ts:269 | self-KO displayed HP 0 is the same input proven for Self-Destruct (prep6); the scanline buffer has no production owner |

### OUT (1)

| Move (id) | Host class | Weight | needs | Blockers (consumed field @ cite) | Notes / measured |
|---|---|---:|---|---|---|
| EXTREME_SPEED (245) | H_DERIVED | 0.11% | X-AGE | X-AGE: evidence covers ages 48..350 only (window starts mid-body: activation 78, window 87, ageOffset 48, row 39); ages 0..47 never accepted; 1 rental species (Arcanine) @ a/sceneOnPresentation.ts:1499, a/extremeSpeed.ts:1 | OUT: needs animation-lane dense evidence for the first 48 source ages (docs/next-adapters-prep2.md row 20) |

### MULTI (25)

| Move (id) | Host class | Weight | needs | Blockers (consumed field @ cite) | Notes / measured |
|---|---|---:|---|---|---|
| DIVE (291) | H_BUFFER+H_VARIANT | 0.19% | C+X-TWOTURN+B(first body) | B: animationProfile:ball (DiveAllocation dive.… @ a/dive.ts:35; C: animationProfile:droplets (DiveDropletProfi… @ a/dive.ts:37; F-AFFINE: animationProfile:ball (DiveAllocation dive.… @ a/dive.ts:35; X-TWOTURN: semi-invulnerable two-turn state (hidden ba… @ e/battleScriptHitChainOpcode.ts:2276-2289, rom/data/battle_anim_scripts.s:9225 | request.turn selects setup/attack (choosetwoturnanim, battle_anim_scripts.s:9225); setup body is order-consumer READY-W… |
| LUSTER_PURGE (295) | H_RANDOM | 0.00% | C+D-BG | C: visualRandom: 12 Random2 words (6 hitsplats… @ a/lusterPurge.ts:29, rom/src/battle_anim_normal.c:1062-1063; D-BG: monbgCenter / monbgPosition (monbg state) @ a/sceneOnPresentation.ts:3587 | also attackerBattlerId, sprite slots, circleCenter (A/A-SLOT) |
| SHEER_COLD (329) | H_BUFFER | 0.15% | C+D-TILE+D-BG+B(first body) | B: animationInputs:spriteOrder (sSpriteOrder /… @ a/sheerCold.ts:59; C: animationInputs:animationRng (presentation… @ a/sheerCold.ts:71; F-AFFINE: animationInputs:attackerSprite (battler spr… @ a/sheerCold.ts:45; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/sheerCold.ts:48; D-TILE: animationInputs:resources (OBJ tile/palette… @ a/sheerCold.ts:56; D-BG: animationInputs:monbg (BG regs / monbg / BL… @ a/sheerCold.ts:62 |  |
| BONEMERANG (155) | H_BUFFER | 0.04% | C+D-TILE+D-BG+B(first body) | B: animationInputs:spriteOrder (sSpriteOrder /… @ a/bonemerang.ts:69; C: animationInputs:animationRngSeed (presentat… @ a/bonemerang.ts:88; F-AFFINE: animationInputs:attackerSprite (battler spr… @ a/bonemerang.ts:51; E-TASK: animationInputs:allocations.shakeTaskSlot (… @ a/bonemerang.ts:58; D-TILE: animationInputs:resources (OBJ tile/palette… @ a/bonemerang.ts:64; D-BG: animationInputs:monbg (BG regs / monbg / BL… @ a/bonemerang.ts:72 |  |
| SAND_TOMB (328) | H_BUFFER | 0.04% | C+D-PAL+D-TILE+B(first body) | B: animationProfile:spriteOrder (sSpriteOrder… @ a/sandTomb.ts:51; C: animationProfile:startingAnimationRng (pres… @ a/sandTomb.ts:61; E-TASK: animationProfile:shakeTaskSlot (CreateTask… @ a/sandTomb.ts:59; D-PAL: animationProfile:mudSand.paletteNum (palett… @ a/sandTomb.ts:56; D-TILE: animationProfile:mudSand (OBJ tile/palette… @ a/sandTomb.ts:53 |  |
| MACH_PUNCH (183) | H_BUFFER | 0.14% | C+D-PAL+D-TILE+D-BG+B(first body) | B: animationInputs:spriteOrder (sSpriteOrder /… @ a/machPunch.ts:75; C: animationInputs:animationRngSeed (presentat… @ a/machPunch.ts:83; F-AFFINE: animationInputs:attackerSprite (battler spr… @ a/machPunch.ts:47; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/machPunch.ts:49; D-PAL: animationInputs:tracePalette (palette host… @ a/machPunch.ts:68; D-TILE: animationInputs:resources (OBJ tile/palette… @ a/machPunch.ts:63; D-BG: animationInputs:registers (BG regs / monbg… @ a/machPunch.ts:77 |  |
| SNORE (173) | H_BUFFER | 0.07% | C+D-PAL+D-TILE+D-BG+B(first body) | B: animationInputs:allocator (one-line inline… @ a/snore.ts:47; C: animationInputs:animationRngSeed (presentat… @ a/snore.ts:53; F-AFFINE: animationInputs:attackerSprite (battler spr… @ a/snore.ts:38; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/snore.ts:40; D-PAL: animationInputs:palettes (palette host / re… @ a/snore.ts:48; D-TILE: animationInputs:resource (OBJ tile/palette… @ a/snore.ts:46; D-BG: animationInputs:background (BG regs / monbg… @ a/snore.ts:49 |  |
| SMOG (123) | H_BUFFER | 0.04% | C+D-PAL+D-TILE+D-BG+B(first body) | B: animationInputs:spriteOrder (sSpriteOrder /… @ a/smog.ts:75; C: animationInputs:animationRngSeed (presentat… @ a/smog.ts:94; F-AFFINE: animationInputs:attackerSprite (battler spr… @ a/smog.ts:60; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/smog.ts:64; D-PAL: animationInputs:targetPaletteBank (palette… @ a/smog.ts:92; D-TILE: animationInputs:resources (OBJ tile/palette… @ a/smog.ts:72; D-BG: animationInputs:targetBgPriority (BG regs /… @ a/smog.ts:59 |  |
| HYPER_VOICE (304) | H_BUFFER | 0.04% | C+D-PAL+D-TILE+D-BG+B(first body) | B: animationInputs:spriteOrder (sSpriteOrder /… @ a/hyperVoice.ts:62; C: animationInputs:animationRngSeed (presentat… @ a/hyperVoice.ts:78; F-AFFINE: animationInputs:attackerSprite (battler spr… @ a/hyperVoice.ts:46; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/hyperVoice.ts:48; D-PAL: animationInputs:paletteBlendSubpriority (pa… @ a/hyperVoice.ts:58; D-TILE: animationInputs:resource (OBJ tile/palette… @ a/hyperVoice.ts:60; D-BG: animationInputs:palettes.backgroundBanks (B… @ a/hyperVoice.ts:69 |  |
| ERUPTION (284) | H_BUFFER | 0.03% | C+D-PAL+D-TILE+F-AUDIO+B(first body) | B: animationProfile:launch (Eruption{Launch,Fa… @ a/eruption.ts:64; C: animationProfile:launch (Eruption{Launch,Fa… @ a/eruption.ts:64; E-TASK: animationProfile:launch (Eruption{Launch,Fa… @ a/eruption.ts:64; D-PAL: animationProfile:palette (EruptionPalettePr… @ a/eruption.ts:67; D-TILE: animationProfile:launch (Eruption{Launch,Fa… @ a/eruption.ts:64; F-AUDIO: animationProfile:audio (EruptionAudioProfil… @ a/eruption.ts:68 |  |
| OUTRAGE (200) | H_BUFFER | 0.00% | D-TILE+D-PAL+D-BG+C+B(first body) | E-TASK: taskSlots (Readonly<{) @ a/outrage.ts:51; D-TILE: resources (Readonly<{ readonly smallEmber:… @ a/outrage.ts:58; B: allocator.spriteOrder (readonly number[];) @ a/outrage.ts:62; D-PAL: palettes (Readonly<{) @ a/outrage.ts:70; D-BG: registers (Readonly<Record<string, number>>… @ a/outrage.ts:75; C: animationRngSeed (number;) @ a/outrage.ts:76 | accepted as a LiveInputs config (docs/animation-integration-merged-readiness.json); not in the older triage docs |
| MEGAHORN (224) | H_BUFFER | 0.29% | D-OAM+D-PAL+D-BG+D-TILE+C+B(first body) | E-TASK: liveTasks (readonly Readonly<{slot:number;c… @ a/megaHorn.ts:14; D-OAM: buffers (Readonly<{softwareOam:readonly unk… @ a/megaHorn.ts:15; D-PAL: palette (Readonly<{unfaded:readonly number[… @ a/megaHorn.ts:17; D-BG: registers (Readonly<Record<string,number>>;) @ a/megaHorn.ts:18; D-TILE: resources (Readonly<{hornTileBase:number;im… @ a/megaHorn.ts:20; B: spriteOrder (readonly number[]; readonly au… @ a/megaHorn.ts:22; C: animationRng (number; readonly gameplayRng:… @ a/megaHorn.ts:24 | accepted as a LiveInputs config (docs/animation-integration-merged-readiness.json); not in the older triage docs |
| SHOCK_WAVE (351) | H_BUFFER | 0.15% | C+D-PAL+D-TILE+D-BG+D-VRAM+B(first body) | B: animationInputs:allocator.spriteOrder (sSpr… @ a/shockWave.ts:77; C: animationInputs:animationRngSeed (presentat… @ a/shockWave.ts:119; F-AFFINE: animationInputs:attackerSprite (battler spr… @ a/shockWave.ts:54; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/shockWave.ts:56; D-PAL: animationInputs:oam.paletteBlend (palette h… @ a/shockWave.ts:89; D-TILE: animationInputs:resources (OBJ tile/palette… @ a/shockWave.ts:67; D-BG: animationInputs:background (BG regs / monbg… @ a/shockWave.ts:96; D-VRAM: animationInputs:background.initialVram (BG… @ a/shockWave.ts:112 |  |
| NIGHTMARE (171) | H_BUFFER | 0.07% | C+D-PAL+D-TILE+D-BG+F-AUDIO+B(first body) | B: animationInputs:painterOrder (sSpriteOrder… @ a/nightmare.ts:90; C: animationInputs:animationRngSeed (presentat… @ a/nightmare.ts:113; F-AFFINE: animationInputs:attackerSprite (battler spr… @ a/nightmare.ts:84; E-TASK: animationInputs:tasks (CreateTask slot / li… @ a/nightmare.ts:87; D-PAL: animationInputs:palettes (palette host / re… @ a/nightmare.ts:96; D-TILE: animationInputs:resources (OBJ tile/palette… @ a/nightmare.ts:92; D-BG: animationInputs:monBg (BG regs / monbg / BL… @ a/nightmare.ts:88; F-AUDIO: animationInputs:audio (sound task state) @ a/nightmare.ts:112 |  |
| REVENGE (279) | H_BUFFER | 0.07% | D-OAM+D-PAL+D-BG+D-TILE+C+B(first body) | E-TASK: liveTasks (readonly Readonly<{slot:number;c… @ a/revenge.ts:19; D-OAM: buffers (Readonly<{softwareOam:readonly unk… @ a/revenge.ts:20; D-PAL: palette (Readonly<{unfaded:readonly number[… @ a/revenge.ts:22; D-BG: registers (Readonly<Record<string,number>>;) @ a/revenge.ts:23; D-TILE: resources (Readonly<{scratchTileBase:number… @ a/revenge.ts:26; B: spriteOrder (readonly number[]; readonly au… @ a/revenge.ts:28; C: animationRng (number; readonly gameplayRng:… @ a/revenge.ts:30 | accepted as a LiveInputs config (docs/animation-integration-merged-readiness.json); not in the older triage docs |
| SKY_ATTACK (143) | H_BUFFER+H_VARIANT | 0.04% | C+D-PAL+D-TILE+D-BG+D-VRAM+B(first body) | B: animationInputs:allocator.activeOrderKeys (… @ a/skyAttack.ts:52; C: animationInputs:animationRngSeed (presentat… @ a/skyAttack.ts:60; F-AFFINE: animationInputs:attackerSprite (battler spr… @ a/skyAttack.ts:40; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/skyAttack.ts:42; D-PAL: animationInputs:palettes (palette host / re… @ a/skyAttack.ts:54; D-TILE: animationInputs:resources (OBJ tile/palette… @ a/skyAttack.ts:49; D-BG: animationInputs:background (BG regs / monbg… @ a/skyAttack.ts:55; D-VRAM: animationInputs:background.vram (BG VRAM sn… @ a/skyAttack.ts:58 | visible charge turn selected by request.turn like live Solar Beam |
| SUPERPOWER (276) | H_BUFFER | 0.04% | D-OAM+D-PAL+D-BG+D-TILE+C+B(first body) | E-TASK: liveTasks (readonly Readonly<{slot:number;c… @ a/superpower.ts:19; D-OAM: buffers (Readonly<{softwareOam:readonly unk… @ a/superpower.ts:20; D-PAL: palette (Readonly<{unfaded:readonly number[… @ a/superpower.ts:22; D-BG: registers (Readonly<Record<string,number>>;) @ a/superpower.ts:23; D-TILE: resources (Readonly<{orbTileBase:number;met… @ a/superpower.ts:25; B: spriteOrder (readonly number[]; readonly au… @ a/superpower.ts:28; C: animationRng (number; readonly gameplayRng:… @ a/superpower.ts:30 | accepted as a LiveInputs config (docs/animation-integration-merged-readiness.json); not in the older triage docs |
| RETURN (216) | H_BUFFER | 0.25% | C+D-PAL+D-TILE+D-BG+D-OAM+F-AUDIO+B(first body) | B: animationInputs:spriteOrder (sSpriteOrder /… @ a/return.ts:88; C: animationInputs:animationRng (presentation… @ a/return.ts:129; F-AFFINE: animationInputs:attackerArt (battler sprite… @ a/return.ts:81; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/return.ts:83; D-PAL: animationInputs:palette (palette host / res… @ a/return.ts:96; D-TILE: animationInputs:impactAllocations (per-spri… @ a/return.ts:85; D-BG: animationInputs:registers (BG regs / monbg… @ a/return.ts:101; D-OAM: animationInputs:buffers (OAM/affine buffers) @ a/return.ts:90; F-AUDIO: animationInputs:audio (sound task state) @ a/return.ts:118 |  |
| ICE_BALL (301) | H_BUFFER+H_VARIANT | 0.11% | D-OAM+D-PAL+D-BG+D-TILE+C+X-DISABLE | D-OAM: buffers (Readonly<{ softwareOam: readonly u… @ a/iceBall.ts:22; D-PAL: palette (Readonly<{ unfaded: readonly numbe… @ a/iceBall.ts:24; D-BG: registers (Readonly<Record<string, number>>… @ a/iceBall.ts:26; D-TILE: resources (Readonly<{ chunkTileBase: number… @ a/iceBall.ts:27; E-TASK: tasks (readonly Readonly<{ slot: number; ca… @ a/iceBall.ts:29; C: initialPresentationRng (number; readonly ga… @ a/iceBall.ts:32; X-DISABLE: counter 0..4 = rolloutTimerStartValue - rol… @ rom/src/battle_anim_ice.c:1613, a/iceBall.ts:9 | accepted as a LiveInputs config (docs/animation-integration-merged-readiness.json); not in the older triage docs |
| FLATTER (260) | H_BUFFER | 0.08% | C+D-PAL+D-TILE+D-BG+D-OAM+F-AUDIO+B(first body) | B: animationInputs:spriteOrder (sSpriteOrder /… @ a/flatter.ts:87; C: animationInputs:animationRng (presentation… @ a/flatter.ts:120; F-AFFINE: animationInputs:attackerArt (battler sprite… @ a/flatter.ts:79; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/flatter.ts:86; D-PAL: animationInputs:palette (palette host / res… @ a/flatter.ts:94; D-TILE: animationInputs:spotlight (38 confetti + sp… @ a/flatter.ts:81; D-BG: animationInputs:registers (BG regs / monbg… @ a/flatter.ts:99; D-OAM: animationInputs:buffers (OAM/affine buffers) @ a/flatter.ts:88; F-AUDIO: animationInputs:audio (sound task state) @ a/flatter.ts:109 |  |
| RAPID_SPIN (229) | H_BUFFER | 0.03% | C+D-PAL+D-TILE+D-BG+D-SCAN+E-OUT+B(first body) | B: animationInputs:spriteOrder (sSpriteOrder /… @ a/rapidSpin.ts:33; C: animationInputs:animationRng (presentation… @ a/rapidSpin.ts:40; F-AFFINE: animationInputs:impactMatrixSlot (affine ma… @ a/rapidSpin.ts:27; E-TASK: animationInputs:elevationTaskSlot (CreateTa… @ a/rapidSpin.ts:28; D-PAL: animationInputs:paletteBanks (palette host… @ a/rapidSpin.ts:34; D-TILE: animationInputs:tileSlots (OBJ tile/palette… @ a/rapidSpin.ts:35; D-BG: animationInputs:monbg (BG regs / monbg / BL… @ a/rapidSpin.ts:41; D-SCAN: animationInputs:initialScanlineSrcBuffer (g… @ a/rapidSpin.ts:42; E-OUT: animationInputs:moveDamage (controller/outc… @ a/rapidSpin.ts:38 |  |
| SPIT_UP (255) | H_BUFFER+H_VARIANT | 0.03% | D-OAM+D-PAL+D-BG+D-TILE+C+X-DISABLE | E-TASK: liveTasks (readonly Readonly<{ slot: number… @ a/spitUp.ts:21; D-OAM: buffers (Readonly<{ softwareOam: readonly u… @ a/spitUp.ts:22; D-PAL: palette (Readonly<{ unfaded: readonly numbe… @ a/spitUp.ts:24; D-BG: registers (Readonly<Record<string, number>>… @ a/spitUp.ts:25; D-TILE: resources (Readonly<{ redOrbTileBase: numbe… @ a/spitUp.ts:26; C: animationRng (number; readonly gameplayRng:… @ a/spitUp.ts:30; X-DISABLE: stockpiles 1/2/3 branch = DisableStruct.sto… @ rom/src/battle_script_commands.c:1787, a/spitUp.ts:14 | accepted as a LiveInputs config (docs/animation-integration-merged-readiness.json); not in the older triage docs |
| PSYWAVE (149) | H_BUFFER | 0.07% | C+D-PAL+D-TILE+D-BG+D-OAM+D-VRAM+F-AUDIO+B(first body) | B: animationInputs:spriteOrder (sSpriteOrder /… @ a/psywave.ts:75; C: animationInputs:animationRng (presentation… @ a/psywave.ts:121; F-AFFINE: animationInputs:attackerArt (battler sprite… @ a/psywave.ts:68; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/psywave.ts:70; D-PAL: animationInputs:palette (palette host / res… @ a/psywave.ts:83; D-TILE: animationInputs:resources (OBJ tile/palette… @ a/psywave.ts:96; D-BG: animationInputs:registers (BG regs / monbg… @ a/psywave.ts:90; D-OAM: animationInputs:ringAllocations (ring slots… @ a/psywave.ts:72; D-VRAM: animationInputs:background.currentVram (BG… @ a/psywave.ts:92; F-AUDIO: animationInputs:audio (sound task state) @ a/psywave.ts:110 |  |
| SKILL_SWAP (285) | H_BUFFER | 0.18% | C+D-PAL+D-TILE+D-BG+D-OAM+D-VRAM+E-OUT+F-AUDIO+B(first body) | B: animationInputs:spriteOrder (sSpriteOrder /… @ a/skillSwap.ts:81; C: animationInputs:animationRng (presentation… @ a/skillSwap.ts:120; F-AFFINE: animationInputs:attackerSprite (battler spr… @ a/skillSwap.ts:73; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/skillSwap.ts:75; D-PAL: animationInputs:palette (palette host / res… @ a/skillSwap.ts:87; D-TILE: animationInputs:resources (OBJ tile/palette… @ a/skillSwap.ts:98; D-BG: animationInputs:registers (BG regs / monbg… @ a/skillSwap.ts:92; D-OAM: animationInputs:orbAllocations (orb slots +… @ a/skillSwap.ts:77; D-VRAM: animationInputs:background.currentVram (BG… @ a/skillSwap.ts:94; E-OUT: animationInputs:abilityOutcome (abilities a… @ a/skillSwap.ts:124; F-AUDIO: animationInputs:audio (sound task state) @ a/skillSwap.ts:115 |  |
| EXTRASENSORY (326) | H_BUFFER | 0.11% | C+D-PAL+D-TILE+D-BG+D-OAM+D-VRAM+D-SCAN+F-AUDIO+B(first body) | B: animationInputs:spriteOrder (sSpriteOrder /… @ a/extrasensory.ts:47; C: animationInputs:animationRng (presentation… @ a/extrasensory.ts:75; F-AFFINE: animationInputs:attackerArt (battler sprite… @ a/extrasensory.ts:23; E-TASK: animationInputs:taskSlots (CreateTask slot… @ a/extrasensory.ts:25; D-PAL: animationInputs:palette (palette host / res… @ a/extrasensory.ts:54; D-TILE: animationInputs:allocator (OBJ tile/palette… @ a/extrasensory.ts:72; D-BG: animationInputs:registers (BG regs / monbg… @ a/extrasensory.ts:59; D-OAM: animationInputs:clone (clone {slot,matrixNu… @ a/extrasensory.ts:37; D-VRAM: animationInputs:background.currentVram (BG… @ a/extrasensory.ts:61; D-SCAN: animationInputs:scanline (gScanlineEffect b… @ a/extrasensory.ts:66; F-AUDIO: animationInputs:audio (sound task state) @ a/extrasensory.ts:73 |  |

## 5. Provider ranking

Codes: `B` sSpriteOrder: SATISFIED by the lend (src/engine/liveSpriteOrderHost.ts + spriteOrderProvider.ts) incl. the cross-body tracker while the history is modelled; falls back after an unmodelled graphics command; `C` Random2 surrogate (presentation-only gRng2Value stream); `F-AFFINE` affine matrix allocator (AllocOamMatrix ids / matrixBitmap); `E-TASK` task-slot allocator (CreateTask slots / live task table); `D-PAL` palette snapshot provider (unfaded/faded/hardware per move plan); `D-TILE` OBJ tile / palette-bank resource allocator; `D-BG` BG regs / BLDCNT / monbg state; `D-OAM` software/hardware OAM + affine buffer host; `D-VRAM` BG VRAM snapshots; `D-SCAN` gScanlineEffect buffers; `F-AUDIO` sound task / pan / current-song state; `E-OUT` outcome selector from resolution not on the request; `X-DISABLE` DisableStruct counter snapshot on the MOVE_ANIMATION request (fury/rollout/stockpile counters); `X-SWITCH` switch / forced-switch flow owner (post-body field, return-to-ball, slide-off); `X-SUBST` persistent Substitute doll sprite state; `X-POWER` dynamic gBattleMovePower / gDynamicBasePower on the MOVE_ANIMATION request (production emits the static move-table power); `X-AGE` accepted evidence lacks the early source ages (age basis); `X-REDUCER` accepted reducer hard-codes values production can derive; reducer parameterization needed; `X-SCHED` scheduler/callback-advance state; `X-TWOTURN` semi-invulnerable two-turn state (hidden battler between turns).

Ranked by remaining moves that become fully unlocked when that provider alone is added (all other inputs already available) and by their usage weight; `touching` = every remaining move that needs it (the provider's reach once the others exist). Bundles: A6 graphics host (OAM+VRAM+scanline+BG+palette+tile+audio) = D-OAM+D-VRAM+D-SCAN+D-BG+D-PAL+D-TILE+F-AUDIO.

| Provider | Alone unlocks | Weight | Touching | Touching weight | Cost / claim | Unlocked moves |
|---|---:|---:|---:|---:|---|---|
| X-SWITCH | +1 | 0.48% | 1 | 0.48% | new flow owner (switch / forced-switch presentation; shares the pending 'actual switches' graphics ownership). separate S10x program: forced replacement and summaries are explicitly pending in docs/animation-integration-live-status.json | BATON_PASS |
| X-SUBST | +1 | 0.22% | 1 | 0.22% | persistent Substitute doll sprite state | SUBSTITUTE |
| E-OUT | +1 | 0.22% | 3 | 0.43% | per-move plumbing from resolution (secondary-effect / HP / stale-power values). exact outcome data; no RNG ownership | ENDEAVOR |
| C | +1 | 0.22% | 26 | 2.48% | new provider (presentation-only LCG ISO_RANDOMIZE1 stream, docs/visual-randomness-prep.md s4). NON-EXACT per play: gRng2Value also advances once per rendered frame plus every earlier animation's draws (not reconstructible from battle state); exact only with a pinned seed. Claim-boundary question: ROM-faithful in distribution and draw order, not bit-exact | METEOR_MASH |
| X-AGE | +1 | 0.11% | 1 | 0.11% | accepted evidence lacks the early source ages (age basis) | EXTREME_SPEED |
| D-SCAN | +1 | 0.04% | 3 | 0.18% | gScanlineEffect buffers | MEMENTO |
| A6 graphics host (OAM+VRAM+scanline+BG+palette+tile+audio) | +1 | 0.04% | 25 | 2.11% | new large host (docs/animation-integration-readiness.md A6). only as exact as the persisted graphics history; per-move retained oracle rows are verifier-only today | MEMENTO |
| D-PAL | +0 | 0.00% | 21 | 1.89% | extend existing (src/engine/liveMoveAnimationPalette.ts:8-11,91 returns only the Shadow Punch scratch; plans in src/data/gen/live-animation-palette-resources.json cover 58 moves). exact for audited plan rows from a known entry; actual status animations/switches invalidate | - |
| D-TILE | +0 | 0.00% | 23 | 2.08% | OBJ tile / palette-bank resource allocator | - |
| D-BG | +0 | 0.00% | 22 | 2.00% | BG regs / BLDCNT / monbg state | - |
| D-OAM | +0 | 0.00% | 10 | 1.24% | software/hardware OAM + affine buffer host | - |
| D-VRAM | +0 | 0.00% | 5 | 0.55% | BG VRAM snapshots | - |
| F-AUDIO | +0 | 0.00% | 7 | 0.80% | sound task / pan / current-song state | - |
| X-DISABLE | +0 | 0.00% | 2 | 0.15% | add a DisableStruct counter snapshot to the MOVE_ANIMATION request (rules context already holds the counters). exact (presentation-only copy of rules state) | - |
| X-TWOTURN | +0 | 0.00% | 1 | 0.19% | hidden-battler state across the two turns in the field art view. exact once the semi-invulnerable state is rendered | - |

Greedy build order (each step = the provider/bundle with the most newly unlocked remaining moves given the earlier steps):

| Step | Provider | New moves | New weight | Cumulative remaining unlocked | Newly unlocked |
|---:|---|---:|---:|---:|---|
| 1 | X-SWITCH | +1 | 0.48% | 1 | BATON_PASS |
| 2 | X-SUBST | +1 | 0.22% | 2 | SUBSTITUTE |
| 3 | E-OUT | +1 | 0.22% | 3 | ENDEAVOR |
| 4 | C | +1 | 0.22% | 4 | METEOR_MASH |
| 5 | A6 graphics host (OAM+VRAM+scanline+BG+palette+tile+audio) | +23 | 1.97% | 27 | BONEMERANG, ERUPTION, EXTRASENSORY, FLATTER, HYPER_VOICE, LUSTER_PURGE, MACH_PUNCH, MEGAHORN, MEMENTO, NIGHTMARE, OUTRAGE, PSYWAVE, RAPID_SPIN, RETURN, REVENGE, SAND_TOMB, SHEER_COLD, SHOCK_WAVE, SKILL_SWAP, SKY_ATTACK, SMOG, SNORE, SUPERPOWER |
| 6 | X-DISABLE | +2 | 0.15% | 29 | ICE_BALL, SPIT_UP |
| 7 | X-TWOTURN | +1 | 0.19% | 30 | DIVE |
| 8 | X-AGE | +1 | 0.11% | 31 | EXTREME_SPEED |
| 9 | D-PAL | +0 | 0.00% | 31 | - |
| 10 | D-TILE | +0 | 0.00% | 31 | - |
| 11 | D-BG | +0 | 0.00% | 31 | - |
| 12 | D-OAM | +0 | 0.00% | 31 | - |
| 13 | D-VRAM | +0 | 0.00% | 31 | - |
| 14 | D-SCAN | +0 | 0.00% | 31 | - |

Notes:
- **Random2 is the keystone but non-exact.** It touches the most remaining moves and, after the allocator-v2 and A6 steps, unlocks 1 more; production cannot reconstruct `gRng2Value` (it advances every rendered frame and with every earlier animation's draws, `docs/visual-randomness-prep.md` s4). A presentation LCG is ROM-faithful in distribution and draw order only; the claim boundary (a non-exact presentation class beside the exact one) must be decided before building it. It cannot make a move exact on its own.
- **Cross-body order tracking** is not a blocker for any remaining move's first body; it upgrades the exactness of the 62 first-body-only moves for later bodies (weighted per-(move,side) plan coverage 68.2%, `docs/sprite-order-plan-coverage.md`: the heaviest NEEDS-KEYS bodies are Ice Beam, Thunderbolt and Attract).
- **E-OUT** lumps four different small inputs (Endeavor HP/stale power, Fire Punch burn/faint, Leech Seed body, Pursuit/Skill Swap/Rapid Spin outcomes); only Endeavor and Fire Punch are single-input moves.
- **A6 graphics host** has no single-provider unlocks beyond 6 moves; the other D-* codes unlock nothing alone.

## 6. Derived batches (no hard-coded lists)

### P2: SMALL-INPUT (derived): one named input / reducer parameter each (docs/next-adapters-prep10.md measures them)

1 moves, 0.22% of Factory move uses.

| Order | Move | Group | needs | Weight | Measured prep / still needed |
|---:|---|---|---|---:|---|
| 1 | ENDEAVOR | SMALL-INPUT | E-OUT | 0.22% | activation measured (2 receipts); E-OUT: animationProfile:staleMovePower (HP before/after + stale gAnimMovePower (value left by the previous animation)) |

### P3: first provider build (derived from the greedy order): X-SWITCH

1 moves, 0.48% of Factory move uses.

| Order | Move | Group | needs | Weight | Measured prep / still needed |
|---:|---|---|---|---:|---|
| 1 | BATON_PASS | PROVIDER-X-SWITCH | X-SWITCH | 0.48% | no activation receipt; X-SWITCH: attackanimation; openpartyscreen; switchoutabilities; returntoball; switchinanim after the body |

Batches are derived each run: P1 = READY-NOW, P2 = SMALL-INPUT (measured in `docs/next-adapters-prep10.md`), P3 = the first greedy provider.

## 6b. Stale codes corrected (this regeneration)

- B (sSpriteOrder): was 'first body only'; production now lends the order and tracks it across bodies (liveSpriteOrderHost.ts / spriteOrderProvider.ts, merged cross-body tracker + post-KO rung 1), so B no longer blocks anything; recipe work only (falls back after an unmodelled graphics command)
- F-AFFINE / E-TASK: were provider blockers; docs/allocator-plan-v2-evidence.md measured gOamMatrixAllocBitmap 0x6 + no tasks at all 481 known-entry bodies, so the accepted constants gated on the lent order suffice for first bodies (invalidated after a faint/switch)
- D-PAL: prep9 (docs/next-adapters-prep9.md) showed Absorb/Mega Drain/Giga Drain/Dream Eater/Sunny Day consume only age-derived blend schedules, no snapshot; those five are not in the remaining set. D-PAL on the remaining moves is NOT re-measured here and stays a blocker
- C (Random2): gRng2Value is not trackable across real play (docs/random2-trackability.md) but D3 (2026-10-06) approved a deterministic presentation-only surrogate; C now means "needs the presentation RNG + the move's draw plan" (docs/next-adapters-prep12-random2.md). Hidden Power / Ice Beam / Water Spout draw no Random2 at all (their animationRng is an echo): C is stale there
- Fire Punch accepted-window phase: not a mismatch (prep10: opponent window starts after the body; player reducer age at activation 27); Flail/Reversal X-POWER cite corrected (the power divide is AnimTask_ShakeTargetBasedOnMovePowerOrDmg, not FlailMovement)
- Batches N1-N3 (hard-coded) all landed except the one-input moves; batch picks are now derived from the groups each run
- SMALL-INPUT now means every needed code is a small input (X-REDUCER, X-POWER, E-OUT, X-DISABLE, X-SCHED), several allowed

## 7. Activation probes run for this census

Direct independent mGBA runs (Scene ON, one fresh run per scenario, `tools/integration/issue142ActivationProbe.py` and the `censusStageActivation.py` copy of the `prep6StageActivation.py` staging boundary with Rock Slide / Endeavor / Ice Punch / Fire Punch PP entries); receipts in `tools/integration/fixtures/census-activation/` (`summary.json` joins them with the accepted windows). Probe processes segfault at interpreter teardown after writing their JSON (harmless, as in earlier prep runs). Not measured: Double Team opponent attacker, Endeavor opponent attacker (the staged AI chose Rock Slide), Rock Slide player-attacker accepted evidence (none exists).

| Move | Probe | Activation | Accepted window | activation - window start | window end - script end | Reducer age at activation | Script frames |
|---|---|---:|---|---:|---:|---:|---:|
| ENDEAVOR | endeavor-player (staged) | 2339 | 2345..2485 | -6 | 79 | -8 | 67 |
| ENDEAVOR | endeavor-opponent (staged) | - | - | - | - | - | - |

Reading: for Aerial Ace / Quick Attack / Feather Dance the accepted dense window starts 31-37 frames BEFORE the script activation and runs 148-198 frames past it (the whole controller timeline), so a live window that starts at the activation frame needs the reducer age at activation (38-44) as its age basis, and ends at the script end; Ice Punch, Sleep Talk, Magnitude, Reversal and the opponent Rock Slide have window start == activation (row 0).

## 8. Caveats

- Needs are static: a `needs` code means the accepted config type consumes that input (cited field), not that pixels were re-rendered; READY-NOW means the config is complete from production providers, not that the adapter is exact after arbitrary history (net-zero audit, tie audit and the ordinary-route replay still apply, `docs/h-buffer-triage.md` s2.8).
- First-body order: the provider returns null after any unmodelled graphics command, so each `+B` move falls back to the bounded scene-off path outside the battle's first body (as Grudge does).
- Weights follow the Level-50 rental model; Open-only Outrage is counted by its set weight like any other move.
- This session's classification of the nine newest accepted moves (Will-O-Wisp, Megahorn, Superpower, Revenge, Spit Up, Fury Cutter, Ice Ball, Curse, Outrage) is read from their typed `LiveInputs` records, not from an older triage; all are all-or-nothing A6 shapes.
