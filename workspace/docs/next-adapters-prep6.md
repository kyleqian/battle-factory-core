# Next adapters prep 6: measured verification of eleven H_BUFFER-READY / prep2-SMALL moves (S10A, side lane)

Evidence/design only; **new files only**, no tracked file edited. Same method as `docs/next-adapters-prep5.md` / `docs/h-buffer-s1-prep.md` (copied/adapted scripts, `prep6*`): production-helper pins against the
accepted values, tie/order scans, activation probes, generated-rental routes, drafted fixtures. Not run: `npm test`, build, typecheck, any harness or shared oracle (drafts are unverified until an adapter exists).
All frames are ROM frames from direct, independent mGBA runs (Scene ON; nothing shared was staged). Source = `reference/pokeemerald`; production paths repo-relative (current master line numbers).

| File (all new) | What |
|---|---|
| `tools/integration/prep6Activation.sh` (+ `prep6ActivationTail.py`, `prep6StageActivation.py`) -> `fixtures/prep6-activation/*.json` | fresh `issue142ActivationProbe.py` runs: 22 scenario receipts; Fire-Blast-opponent needs the 1200-frame input tail of `fireBlastProbe.py:82-85` (`tail-mechanic-*`); DOUBLE_TEAM/FAINT_ATTACK have no battle-lab scenario, they are the `stage-fire-punch-portable-on.py` boundary (copy `prep6StageActivation.py`, `stage-*.json`) |
| `prep6Accepted.mjs` | the accepted Scene-ON configs of all eleven moves rebuilt exactly as the accepted tests build them (literals/dense row 0, line-cited) |
| `prep6Pins.mjs` -> `fixtures/prep6-pins.json` | 190 pins: accepted value vs production-derived (`liveBattlerAnchors` + `createBattleCommandFieldArtView(...).coords` via `prep4Production.mjs` `derive()`, equal to `liveBattlerCoordAttrs`), known-entry battler slots, SetBattlerSpriteYOffsetFromYScale, measured Self-Destruct HP, Knock Off age basis; both orientations |
| `prep6Slots.mjs` -> `fixtures/prep6-slots.json`; `prep6Plans.py` -> `fixtures/prep6-plans.json` | sprite-slot audit on the dense ROM rows (6 moves x 2): row-0 occupancy vs `createKnownEntrySpriteAllocatorProvider(...).firstMove`, every spawn vs first-free, plan rows (spawn ages / lifetimes), row-0 `sSpriteOrder` |
| `prep6SpriteDump.py` / `.sh` -> `fixtures/prep6-sprites/*.json`; `prep6DumpAnalysis.mjs` -> `fixtures/prep6-sprites-analysis.json` | the same audit for moves without dense evidence (Self-Destruct, Knock Off, Swallow x6): direct-mGBA per-frame gSprites + `sSpriteOrder` over the accepted window |
| `prep6TieScan.mjs` -> `fixtures/prep6-tie-scan.json` | generic equal-key (subpriority, y) overlap scan on the accepted-config views |
| `prep6OrderSeed.mjs` -> `fixtures/prep6-order-seed.json`; `prep6DdOrder.mjs` -> `fixtures/prep6-dd-order.json` | persistent-`sSpriteOrder` experiment: `src/animation/spriteOrder.ts` replayed over the ROM sprite keys from the ROM seed, the two known seed shapes and 42 arbitrary seeds |
| `prep6PainSplitY.mjs` -> `fixtures/prep6-pain-split-yoffset.json` | Pain Split y2 formula vs reducer constants for the accepted pair and other carriers/targets |
| `prep6Routes.ts` -> `fixtures/prep6-routes.json`; `prep6Replay.ts`, `prep6RouteProbe.ts` -> `fixtures/prep6-route-probe.json`; `prep6RouteScan.ts` -> `fixtures/prep6-route-scan-rock-tomb*.jsonl`; `prep6SwallowProbe.ts` -> `fixtures/prep6-swallow-probe.json` | generated-rental routes; displayed field + request at the MOVE_ANIMATION event on the real route |
| `prep6Draft.mjs` -> `fixtures/prep6-<move>-{player,opponent}.json` (13) + `fixtures/prep6-summary.json` | drafted live fixtures (`schema prep6-adapter-draft/v1`, prep5 shape; READY moves only) + the activation/window/row summary for all eleven |

## 0. Verdicts

Pins: **190 total (188 value pins + 2 "no accepted evidence" rows), 23 differ, 0 unresolved.** Only 5 differing pins are on a *consumed* field and each is explained: Swallow attacker `animationCenter` (accepted = sprite centre,
the renderer draws Pelipper there; the live adapter must pass the affine-centre battler, `affineCenterBattler`, `liveMoveAnimation.ts:~503`) x3, Knock Off age basis (accepted -11 is window-relative; live -6) x2. The other 18 are
unread `animationCenter` / `battlePositionCenter` literals (the accepted RAM sprite-centre convention). Every consumed geometry field (`spriteCorner`, consumed `animationCenter`/`battlePositionCenter`, pic offsets,
`coords.yOffset`, `targetSpriteSlot`, `ringSubpriority`, `targetSubpriority`, Fire Blast pic centres) is exact in both orientations. `row = activation - windowStart + ageOffset`.

| Move (id) | Config fields vs production (measured) | Slots (accepted == first-free at spawn age?) | Order dependence (measured) | act / window / row / duration / tail | Ad-hoc shadow | Verdict |
|---|---|---|---|---|---|---|
| ROCK_TOMB (317) | exact: `targetSpriteSlot` 6/8 = known-entry battler slot; `targetInitialX2`, `effectCenter` = target pic point; unread `animationCenter`s differ | rocks 3,4,5,7 (ages 26/46/66/86) + Red-X 9 (122): **all 5 spawns first-free**, row 0 == known-entry model (both) | seed-**independent** (0/42 seeds; `prep6-order-seed.json`); reducer encodes the settled-rock slot rule (`rockTomb.ts:255-265`) | 217/217..390/**0**/174 ; 229/229..402/0/174 (end = script end) | none | **READY** |
| SAFEGUARD (219) | exact: attacker `battlePositionCenter` (consumed), `ringSubpriority` 28/38 = attacker subpriority - 2; unread `animationCenter`s differ | `ringSlots` [3,4,5] (ages 7/13/19): **first-free** | seed-independent (0/42); 36 equal-key overlapping pairs but the ROM key order is fixed; renderer paints rings by orientation (`battleScene.ts:16018-16020`) | 209/209..279/0/71 (both) | none | **READY** |
| SWEET_SCENT (230) | exact: spriteCorner; attacker `animationCenter` accepted (72,90)/(176,42) != pic point (72,97)/(176,51) but **never read** (`sweetScent.ts:145` `_origin`); `targetSubpriority` 28/38 = attacker subpriority - 2 | accepted 24-entry `PETAL_SLOTS` == ROM spawn order, every spawn first-free; plan row = spawn ages 4,31,35,42,... (`prep6-plans.json`) | seed-independent (0/42); 12 equal-key pairs, none overlapping | 222/222..396/0/175 (both) | none | **READY** (plan row) |
| SELF_DESTRUCT (120) | exact (`attacker.battlePositionCenter`, spriteCorners); **displayed attacker HP at the event = 0 measured** on route 56/14/0 (`prep6-route-probe.json`); same script as Explosion | explosion sprites 3,4,5 first-free; row-0 = model + the first explosion sprite (spawned 2 frames before the window) | seed-independent (0/40 seeds); 16 equal-key pairs, none overlapping | 78/82..194/**-4**/113 ; 82/86..198/-4/113; script ends 204/208 -> **10-frame uncovered tail** | none | **READY** (row -4 not in map; tail) |
| KNOCK_OFF (282) | exact; consumed target `animationCenter` exact; age basis: reducer age 0 = **activation + 6** (both); live offset -6 (accepted -11 is window-relative) | slots 3,4,5,7 first-free; row-0 = model, shape B | known seed shapes A=B (0 frames); arbitrary seeds change 0..4 of 59 frames (20/40 seeds): weak; no reducer order state | 75/70..128/**-6**/59 ; 79/74..132/-6/59 (window ends 4 frames after script end 124/128) | none | **READY** (age basis -6) |
| SWALLOW (256) | exact except attacker `animationCenter` = sprite centre (affine rule, see above); `attackerPictureOffset` = pic, `attackerPictureYOffset` = `coords.yOffset` exact; **stockpile count = `request.turn`, measured 1/2/3** | orbs/stars first-free in all six branches; row-0 = model in 5/6 (the opponent three-stockpile branch has a switched-in Sableye: battlers not at 6/8) | seed-independent (0/40 in all six) though 164-2082 overlapping equal-key orb pairs | player 1247/1247..1409 (163), 2174..2351 (178), 2999..3191 (193); opponent 1140..1300 (161), 2066..2241 (176), 6979..7169 (191); all row **0**, end = script end | **retire** `battleScene.ts:21746-21757` | **READY** (turn is on the request) |
| FAINT_ATTACK (185) | exact: spriteCorners, target `animationCenter` (hitsplat); profile = source-age constants | none to allocate | none (no sprite entries) | 2340/2344..2564/**-4**/221 (window ends on the last active frame; script first inactive 2565) | none | **READY, player-attacker only**: no opponent-attacker evidence |
| PAIN_SPLIT (220) | exact incl. the y2 formula: reducer constants (4/2/2 and 5/3/3, 5/2/2) == `SetBattlerSpriteYOffsetFromYScale` with production `coords.yOffset` for all four (species, side) cases; **differ for any other target** (Onix opponent 6,3,3 vs reducer fallback 2,2) | projectiles 3/4 at ages 4/29/54: first-free | seed-independent (0/42); 0 ties | 445/445..525/0/81 ; 446/446..526/0/81 | **retire** `battleScene.ts:44925-44930` | **NEEDS-INPUT**: `coords.yOffset` per side into `painSplit.ts:76-90` (+ species-typed renderer `:44895-44940`) |
| DRAGON_DANCE (349) | exact: attacker `animationCenter`/`battlePositionCenter.y` (consumed); `pictureSize` literal 64x64 vs 56x64 / 64x56 but only `max(w,h)>>1 = 32` is read: equal | `allocationSlots` [3,4,5,7,9,10] == ROM spawn order, first-free | **1-bit, 1 frame**: orb painter order at window age 20 depends only on the relative `sSpriteOrder` position of slots 3/4 (seed B `...2,4,3...` -> 4,3,5,9,7; seed A -> 3,4,5,9,7); all 142 other frames identical for 42 arbitrary seeds; `allocationOrder` [0..5] encodes seed B | 74/74..215/0/142 ; 78/78..219/0/142 | none | **NEEDS-ORDER (weak)**: seed = rel. order of slots 3,4 (`dragonDance.ts:157,182`) |
| FIRE_BLAST (126) | exact: pic centres, `targetSpriteSlot` = battler slot 6/8, spriteCorners; unread `battlePositionCenter`s (RAM centre literals) differ | 60 ring/cross spawns, **every spawn first-free**; no slot list in the config (reducer allocates 0..63 minus reserved) | **YES**: `fireBlastSpritesInPainterOrderAtAge` replays a persistent order from the hard-coded `FIRE_BLAST_ORDER_SEED` (`fireBlast.ts:28-38,312-337`); 1..35 of 197 frames change for arbitrary seeds; seeds A and B give the same result (0 frames) | 215/215..411/0/197 ; 1147/1147..1343/0/197 (opponent scenario needs a tail probe) | none | **NEEDS-ORDER** (full 64-pool permutation) |
| DOUBLE_TEAM (104) | spriteCorners exact; profile = stock-controller age constants (`sceneOnPresentation.ts:13502-13510`) | clones slot 3/4 (first-free) | **YES, 1 bit**: `frontClone: "a"` = "slot 3 in front of slot 4" is the persistent-order tie winner (`:13497-13501`) = seed shape A **(measured: `sSpriteOrder` has 3 before 4 at ticks 2330-2336, `stage-double-team-player.json` `spriteOrderAtTick`)**; shape B would give `"b"` | 2336/2337..2566/**-1**/230; window runs past the body (2494) through the stat-change anim (2498..2573): 7-frame uncovered tail | none | **NEEDS-ORDER (1 bit)**; **opponent-attacker evidence missing** (staged probe: AI used Rock Slide) |

**Ready now (7, 13 drafts): ROCK_TOMB, SAFEGUARD, SWEET_SCENT, SELF_DESTRUCT, KNOCK_OFF, SWALLOW, FAINT_ATTACK (player-attacker only). NEEDS-INPUT (1): PAIN_SPLIT. NEEDS-ORDER (3): DRAGON_DANCE (weak: 1 bit,
1 frame), FIRE_BLAST, DOUBLE_TEAM (1 bit + opponent evidence).** The `NEEDS-ORDER` rows mean the accepted reducer already encodes a history-dependent tie (`docs/sprite-order-provider-design.md`); whether flipping it changes final
pixels was *not* rendered (the experiment is at the OAM-order level on ROM sprite keys). All eleven were measured; the only gap is the DOUBLE_TEAM/FAINT_ATTACK opponent orientation (no accepted evidence, staging probe did not produce the move).

## 1. Accepted sources (current master line numbers)

All eleven branches in `src/engine/battleScene.ts` have **no `liveField` yet**, a species-pair gate that throws, hard-coded art and a hard-coded `drawSendOutHealthbox` block (recipe step 3, `docs/next-adapters-prep2.md` s0).

| Move | Config type / reducer view (`src/animation/sceneOnPresentation.ts`) | Renderer branch | Species gate (throw) | HUD block | Accepted fixture |
|---|---|---|---|---|---|
| SELF_DESTRUCT | `:3609` / `:10808` | `battleScene.ts:39635` | `:39657` | `:39723` | `self-destruct-{player-sudowoodo-opponent-shuckle,opponent-sudowoodo-player-shuckle}.json` |
| DOUBLE_TEAM | `:1646` / `:12793` | `:49446` | `:49455` | `:49510` | `double-team-onix-grovyle.json` (player only), `doubleTeamPortable.ts:88` |
| FAINT_ATTACK | `:1610` / `:12706` | `:49719` | `:49729` | `:49793` | `faint-attack-onix-grovyle.json` (player only) |
| ROCK_TOMB | `:2522` / `:8649` | `:19376` | `:19399` | `:19479` | `rock-tomb-dense-evidence.json`, `rockTombPortable.ts:55-83` |
| PAIN_SPLIT | `:1881` / `:7190` | `:44895` | `:44907` | `:44979` | `pain-split-evidence.json`, `painSplitFramebuffer.ts:20-60` |
| DRAGON_DANCE | `:3501` / `:10568` | `:37125` | `:37130-37139` | `:37185` | `dragon-dance-evidence.json`, `dragonDanceActualCore.ts:18-40` |
| SAFEGUARD | `:2124` / `:7780` | `:15965` | `:15982-15983` | `:16062` | `safeguard-evidence.json`, `safeguardFramebuffer.ts:62-104` |
| SWEET_SCENT | `:3397` / `:10248` | `:16712` | `:16730-16733` | `:16796` | `sweet-scent-evidence.json`, `sweetScentFramebuffer.ts:31-90` |
| FIRE_BLAST | `:2059` / `:7656` | `:47636` | `:47651` | `:47722` | `fire-blast-evidence.json`, `fireBlastFramebuffer.ts:25-60` |
| SWALLOW | `:3052` / `:9631` | `:21695` | `:21720` | `:21819` | `swallow-evidence-matrix.json` + 6 `swallow-*-checkpoint.json`, `swallowPortable.ts:101-131` |
| KNOCK_OFF | `:4252` / `:6900` | `:30112` | `:30128` | `:30219` | `knock-off-{player-shuppet-opponent-onix,opponent-onix-player-plusle}.json` (attacker chrome PLUSLE, RAM SHUPPET) |

## 2. Per-move measurements

### 2.1 Config fields (answers 1) - `prep6-pins.json`
* Geometry rule (all moves, both orientations): `spriteCorner = liveBattlerAnchors.spriteCenter - 32`; `battlePositionCenter` = (72,80)/(176,40); `animationCenter` = pic point `picOffsetPoint`. `createBattleCommandFieldArtView(...).coords`
  (== `liveBattlerCoordAttrs`) gives width/height/yOffset. Dense-row configs (Rock Tomb, Safeguard, Fire Blast) store the RAM sprite centre in `animationCenter` (unread, x4).
* **Self-Destruct**: only `attacker.battlePositionCenter` (+ side) is consumed by the reducer, spriteCorners by the renderer; all exact. Displayed attacker HP: `BattleScript_EffectExplosion` serves both moves
  and runs `setatkhptozero` *before* `attackanimation` (`battle_scripts_1.s:374-386`); on a real generated route (seed 56, streak 14, slot 0 Sudowoodo set 298) the displayed field at the MOVE_ANIMATION event is
  `player hp 0 / maxHP 166` (`prep6-route-probe.json`), request keys `moveId, attacker, target, turn, power, damage, friendship, multihit`. So the same displayed-field path as Explosion holds; the opponent-attacker route was not run.
* **Rock Tomb**: `targetSpriteSlot` accepted 8 (player attacker) / 6 (opponent attacker) == `liveSpriteSlotForOwner(firstMove, {battler, targetSide})`; `targetInitialX2` = dense row-0 target `x2` == production
  `frontIdleRest.x2`; `effectCenter` = target pic point (player target `y+8`). All `pin` rows exact.
* **Pain Split**: the reducer reads both battlers' `animationCenter` (pic point, exact) and species-keyed constants `4 / 5` (phase 0) and `2` / `3` (phases 1,2; Gengar opponent 3). With `SetBattlerSpriteYOffsetFromYScale`
  (`battle_anim_mons.c:1873-1882`, d = 0x140/0x11B from `battle_anim_effects_3.c:2992-3003`) evaluated with production `coords.yOffset` the four accepted cases give exactly [4,2,2] [5,3,3] [4,2,2] [5,2,2]; for other targets
  (`prep6-pain-split-yoffset.json`: Onix 6,3,3; Absol 6,3,3; Delcatty/Shuckle 5,2,2/4,2,2 by side) the constants are wrong, so the reducer must take `coords.yOffset` (or the phase y2) per side. **No other config field is missing.**
* **Dragon Dance**: reducer reads attacker `animationCenter`, `battlePositionCenter.y`, `animationProfile` (`pictureSize` only through `max(w,h)>>1`, `allocationSlots`, `allocationOrder`). All exact (radius 32 both).
* **Safeguard**: reads attacker `battlePositionCenter` and `animationProfile.{ringSlots, ringSubpriority}`: `ringSubpriority` = 28/38 = attacker subpriority - 2 (pins); `ringSlots` s2.2.
* **Sweet Scent**: `spriteSlots` + `targetSubpriority` (28/38 = attacker subpriority - 2, the field name is misleading); attacker `animationCenter` is passed but never read.
* **Fire Blast**: `attackerPictureCenter` (72,98)/(176,50) and `targetPictureCenter` (176,42)/(72,88) = the pic points (exact); `targetSpriteSlot` = battler slot.
* **Swallow**: `attackerPictureOffset` = pic (72,94)/(176,36), `attackerPictureYOffset` = 6/4 = `coords.yOffset` (exact); attacker `animationCenter` must be the sprite centre (72,86)/(176,36).
  **Stockpile counter, exactly where it lives**: rules `DisableStruct.stockpileCounter` (`battleScriptRulesContext.ts:325-326`); `Cmd_stockpiletohpheal` sets `gBattleScripting.animTurn = stockpileCounter` before `attackanimation`
  (`battle_script_commands.c:6918`; production `battleScriptStockpileOpcode.ts:95-117,181`) and `Move_SWALLOW` branches on `jumpifmoveturn` (`battle_anim_scripts.s:8257-8258`); the MOVE_ANIMATION request is built at
  `battleScriptHitChainOpcode.ts:2276-2295` with `animTurn` as `turn` (`BattleMoveAnimationRequest.turn`, `battleMoveAnimation.ts`). **So `request.turn` already carries it, presentation-only:** measured on a real
  generated route (Swalot set 248, seed 33 streak 7): Stockpile x1/x2/x3 then Swallow -> request `turn` 1/2/3 (`prep6-swallow-probe.json`). The adapter needs `stockpileCount = request.turn` and nothing threaded. Swallow only
  animates when the attacker is damaged (full HP: `STRINGID_PKMNHPFULL`, no request): the accepted-species Pelipper route (set 213) did not reach a Swallow request in the tested sequence.
* **Knock Off**: only target `animationCenter` (consumed by the renderer, exact) and `animationAgeOffset`. See s2.4.
* **Double Team / Faint Attack**: spriteCorners and Faint Attack's target `animationCenter` exact (player-back ONIX -> GROVYLE); the animation profiles are the `ONIX_TO_GROVYLE_*` constants (stock-controller ages).

### 2.2 Slots (answers 2) - `prep6-slots.json`, `prep6-sprites-analysis.json`, `prep6-plans.json`
* **Row 0 of every dense window equals the known-entry host** `createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove` = slots [0,1,2,6,8,60,61,62,63] (healthboxes 0/1/63/61, enemy shadow 2, battlers 6/8, bars 60/62): **12/12**.
  (Self-Destruct rows start 4 frames into the script so they also hold the first explosion sprite at slot 3; the opponent Swallow three-stockpile branch has a switched-in Sableye and battlers off 6/8: that history is outside the known-entry model.)
* **Every spawn is first-free** against the real per-frame occupancy: 0 non-first-free spawn frames in all 12 dense runs and all 10 dumped runs (Rock Tomb 5/5, Pain Split 3/3 frames, Dragon Dance 2/2, Safeguard 3/3,
  Sweet Scent 23/23, Fire Blast 12/12, Self-Destruct 9/9, Knock Off 5/5, Swallow 9..19 per branch).
* **Accepted slot fields equal first-free**: Rock Tomb rocks [3,4,5,7] + Red-X 9; Safeguard `ringSlots` [3,4,5]; Dragon Dance `allocationSlots` [3,4,5,7,9,10]; Sweet Scent `PETAL_SLOTS` (24 entries, ROM spawn order, slots reused after a petal dies);
  Fire Blast `targetSpriteSlot` 6/8 and the free pool 0..63 minus reserved. **A plan row (spawn ages + lifetimes from the anim script) plus the known-entry host is enough**; ages/lifetimes are in `prep6-plans.json`
  (`runsByTemplate`: slot, spawn age, last-alive age). Spawn ages: Rock Tomb 26/46/66/86/122; Safeguard 7/13/19; Dragon Dance 20 x5 + 21; Pain Split 4/29/54 (x2); Sweet Scent 4,31,35,42,46,50,54,58,62,66,70,74,...; Fire Blast rings 4/11/18, crosses 113..158.

### 2.3 Order scans (answers 3) - `prep6-tie-scan.json`, `prep6-order-seed.json`, `prep6-dd-order.json`
* Method: the reduced `sSpriteOrder` model (`src/animation/spriteOrder.ts`) replayed over the ROM sprite keys (priority, subpriority, oam y/affine/size) of every frame, restricted to the non-reserved pool. With the **ROM's own row-0
  `sSpriteOrder` as seed it equals the ROM order on every frame** for Pain Split (81/81), Dragon Dance (142), Safeguard (71), Sweet Scent (175), Fire Blast (197), Self-Destruct (113), Swallow (6/6 branches), Knock Off (59), both orientations.
  One gap: **Rock Tomb 126/174** - on 48 frames the ROM puts slot 7 before slot 5 for a rock whose OAM y is wrapped (231..243, falling from above the screen); the reduced model's wrap rule orders them the other way (the two are not on screen
  together at those ages; reducer rule `rockTombSettledRocksForPainter`). Worth passing to the provider design (`SortSprites` y wrap).
* Row-0 `sSpriteOrder` has exactly **two shapes** over the accepted scenarios: **A** `[62,60,0,63,1,61,6,8,2,3,4,21,20,5,...]` (Rock Tomb player, Pain Split, Safeguard, Sweet Scent, Fire Blast, Self-Destruct) and
  **B** `[...,2,4,3,21,...]` (Rock Tomb opponent, Dragon Dance, Knock Off); they differ only in the relative position of slots 3 and 4. The ROM keys then order slots 3,4,... identically in A and B for every move except Dragon Dance.
* Sensitivity to *arbitrary* seeds (ascending, descending, 40 LCG shuffles of the pool): **Rock Tomb, Pain Split, Safeguard, Sweet Scent, Self-Destruct, Swallow: 0 frames change -> seed-independent.** Knock Off: 0..4 of 59 frames
  (20/40 seeds). Dragon Dance: exactly one frame (age 20, the six orbs coincide): orb order front-to-back is 4,3,5,9,7 under seed B (== ROM, `allocationOrder` [0..5]) and 3,4,5,9,7 under seed A; ages 21+ are identical.
  Fire Blast: 1..35 of 197 frames. Double Team's `frontClone` is the same one bit (slots 3/4).
* **Seed shape the free-slot provider needs**: the 64-entry persistent `sSpriteOrder` immediately before the move's first allocation (restricted to the allocatable pool, `createSpriteOrderState(pool, seed)`); for the known-entry first move only
  the relative order of slots 3 and 4 varies in the accepted evidence (A or B), which is all that Dragon Dance and Double Team consume; Fire Blast needs the whole permutation (its `FIRE_BLAST_ORDER_SEED` is shape A).
  Histories after earlier animations (second+ move) are *not* measured here.
* Tie scan (`prep6-tie-scan.json`) over-reports where views carry no keys (Dragon Dance 2450 equal-key pairs, Fire Blast 20140, Safeguard 36, Swallow 172..2082 overlapping): these are the pairs the experiment above resolves.

### 2.4 Activation, window, shadow row, duration, tails (answers 4) - `prep6-summary.json`, `prep6-activation/`
(`script end` = first inactive frame; table in s0 has the per-orientation numbers.)
* Row 0, window end == script end, no tail: **Rock Tomb, Pain Split, Dragon Dance, Safeguard, Sweet Scent, Fire Blast, Swallow (6 branches)**.
* **Self-Destruct**: window starts 4 frames after activation (78 vs 82 / 82 vs 86): row -4 (not in the map; first 4 script frames have no accepted pixels, same class as Dragon Rage -7, Taunt -10) and **ends 10 frames before the script end**
  (194/204, 198/208): 10-frame uncovered tail. 113 rows.
* **Knock Off**: window starts 5 frames *before* activation (70 vs 75, 74 vs 79) and ends 4 after the script end (128 vs 124, 132 vs 128); accepted `firstFramePresentationAge -11`: the reducer's animation age 0 is frame 81 / 85
  = **activation + 6** in both orientations (re-derived from the fresh receipts). A live window that starts at the activation frame needs `animationAgeOffset = -6`; the shadow row (act - start + offset) is -6. 59 rows.
* **Faint Attack**: row -4 (window 4 frames after activation), window ends on the last active frame (2564, script first inactive 2565). 221 rows. **Double Team**: row -1; window 2337..2566 covers the body (script ends 2494) and
  the following general stat-change animation (move 0, 2498..2573): 7-frame uncovered tail; 230 rows.
* #142 map additions (`LIVE_MOVE_OPPONENT_SHADOW_ROW`, row 0): 317, 220, 349, 219, 230, 126, 256 (rows -4/-6/-1/-4 for 120, 282, 104, 185 are not in the map). Swallow's duration depends on branch and side: player 163/178/193, opponent 161/176/191
  (= 148 + 15*turn / 146 + 15*turn); the Swallow `request.turn` selects it.

### 2.5 Ad-hoc shadow draws to retire (answers 5)
`battleScene.ts:44925-44930` (Pain Split: `opponentToPlayer && painState.age === 0`, fixed enemy shadow at (176, 69)) and `:21746-21757` (Swallow: `opponentAttacker && swallowState.age === 0`, `animationCenter.x - width/2`,
`battlePositionCenter.y + 29`). None in the other nine branches (grep of `shadow|age === 0|liveField` over the eleven spans).

## 3. Ordinary generated-rental routes (answers 6) - `prep6-routes.json` (party member 0 = `rentals[0]`, `rentsCount 0`, `playerTrainerId 416049562`, seeds ascending, streak 0..42 step 7), `prep6-route-probe.json`

| Move | Route (seed / streak / slot) that **requests the body** (measured) | Rental (set) | Accepted species a carrier? | Other carrier species | slot-0 hits |
|---|---|---|---|---|---|
| SELF_DESTRUCT | 56 / 14 / 0 (request at frame 1141, attacker HP 0) | Sudowoodo set 298 (25,89,67,120) | yes (only carrier) | none | 93 |
| DOUBLE_TEAM | 0 / 7 / 0 (frame 585) | Delcatty set 162 (290,185,104,215) | **no (Onix)**; Grovyle is | 38 species (Chansey, Gardevoir, Grovyle, Snorlax, Venusaur, ...) | 4819 |
| FAINT_ATTACK | 0 / 7 / 0 (frame 584) | Delcatty set 162 | **no (Onix, Grovyle)** | 17 (Murkrow, Sneasel, Umbreon, Sableye, Sudowoodo, ...) | 2661 |
| ROCK_TOMB | **41 / 0 / 0** (route 0/0/0 Grimer set 110 emits no Rock Tomb request: miss/other; 41/0/0 hits, opponent Onix, frame 814) | Grimer set 110 (124,317,151,107) | yes | 18 (Golem, Rhydon, Machoke, Poliwrath, Steelix, ...) | 2015 |
| PAIN_SPLIT | 46 / 21 / 0 (frame 750) | Misdreavus set 374 (220,247,109,86) | yes | Dusclops | 193 |
| DRAGON_DANCE | 44 / 14 / 0 (frame 1078) | Dragonair set 306 (216,156,86,349) | yes | Altaria, Charizard, Gyarados, Kingdra, Lapras, Salamence, Seadra, Shelgon (first: 4/35/0 Kingdra set 653) | 1136 |
| SAFEGUARD | 59 / 0 / 0 (frame 693) | Bayleef set 180 (75,92,219,113) | yes | Bellossom, Chimecho, Dragonair, Milotic, Wobbuffet (first: 44/7/0 Dragonair set 201) | 795 |
| SWEET_SCENT | 31 / 0 / 0 (frame 898) | Weepinbell set 165 (75,51,35,230) | yes | Ivysaur, Victreebel | 517 |
| FIRE_BLAST | 21 / 14 / 0 (frame 993) | Octillery set 361 (190,126,86,189) | yes | 14 (Charizard, Arcanine, Gyarados, Typhlosion, ...) (first: 8/21/0 Charizard) | 1668 |
| SWALLOW | 33 / 7 / 0 with `[Stockpile x n, Swallow]` = slots [0 x n, 1] -> Swallow `turn` n (frames 1044 / 1221 / 1703) | Swalot set 248 (254,256,255,124) | **no (Pelipper)**; accepted-species route 161/7/0 Pelipper set 213 (352,332,254,256) = slots [2..3] did not reach a Swallow request (attacker at full HP) | Swalot | 188 |
| KNOCK_OFF | 15 / 7 / 0 (frame 582) | Sableye set 163 (185,109,282,252) | **no (Shuppet RAM / Plusle chrome)** | Armaldo, Banette, Crawdaunt, Farfetch'd, Kabutops, Krabby | 821 |

Caveat (as in prep4/5): pixel evidence covers only the accepted species pairs; the other carriers are generic art through the same branch and not pixel-pinned. The drafted `derivedFields` hold the production-derived values.

## 4. Drafted fixtures
`tools/integration/fixtures/prep6-<move>-{player,opponent}.json` (`<side>` = attacker side), 13 files: SELF_DESTRUCT, ROCK_TOMB, SAFEGUARD, SWEET_SCENT, KNOCK_OFF, SWALLOW (three stockpile `variants` per side), FAINT_ATTACK (player only), by `prep6Draft.mjs`.
Shape of `prep5-*.json`: `schema prep6-adapter-draft/v1`, `attacker/target`, `fieldProfile` (accepted HP/gender; rental HP differs), `denseWindow` (`ageOffset` 0 except Knock Off -11), `draft` {`activationFrame`, `scriptEndFirstInactive`, `shadowRow`, `shadowRowInMap`,
`expectedDuration`, `acceptedWindow`, `derivedFields` (the pin values), `consumedFieldDifferences`, `acceptedConfigExtras` (slot lists, `targetSpriteSlot`, `effectCenter`, `stockpileCount`, `attackerPicture*`), `order`, `adhocShadowDraw`}, plus
`displayedAttackerHp` (Self-Destruct), `liveAnimationAgeOffset` (Knock Off), `stockpileCountSource` (Swallow). `expectedDuration === rows`.

## 5. Recommended batch order
1. **Batch A (6 moves / 12 fixtures): ROCK_TOMB, SAFEGUARD, SWEET_SCENT, SWALLOW, SELF_DESTRUCT, KNOCK_OFF.** Recipe + known-entry plan rows only (slots first-free), seed-independent, no new helper beyond `affineCenterBattler` (Swallow) and the request `turn`.
   Do Rock Tomb/Safeguard/Sweet Scent/Swallow first (row 0, no tails); Self-Destruct (row -4, 10-frame tail) and Knock Off (live offset -6, window end 4 after script) carry a window decision each. FAINT_ATTACK (player-attacker only) can ride along only if a side gate to the fallback for opponent attackers is acceptable.
2. **PAIN_SPLIT** after `painSplit.ts` takes `coords.yOffset` per side (one reducer input; formula pinned) and the species-typed renderer branch is generalised; retire the age-0 shadow.
3. **DRAGON_DANCE, FIRE_BLAST, DOUBLE_TEAM** after the free-slot order provider (seeds: relative order of slots 3/4 for Dragon Dance and Double Team; the full pool permutation for Fire Blast); Double Team also needs an opponent-attacker accepted scenario.

## 6. Open questions
1. **Self-Destruct**: window starts 4 frames after the script (row -4) and stops 10 frames before it ends; confirm what is on screen for those frames (as for Dragon Rage / Taunt). Opponent-attacker route HP not measured.
2. **Knock Off**: the accepted -11 is window-relative; the live adapter must use -6 if its window starts at the activation, and the accepted window spans 5 frames before activation and 4 after the script end. Plusle chrome vs Shuppet RAM: the accepted attacker species is PLUSLE.
3. **Swallow**: the `request.turn` branch selection is the contract (turn 0 would be the failed/unstocked case); the opponent three-stockpile accepted branch has a switched-in Sableye (non-known-entry sprite history) though the reducer reads no slots;
   a Pelipper route that reaches Swallow needs a damaged attacker; the shadow draw is to be retired.
4. **Double Team / Faint Attack**: only player-back ONIX -> GROVYLE is accepted and the opponent staging probe did not produce the move (`stage-double-team-opponent.json`: AI picked move 157; `stage-faint-attack-opponent.json`: an earlier-turn 185 at 1967);
   Double Team's window (230 rows) includes the following stat-change animation, 7 frames short of its end; `frontClone` is the slot 3/4 bit (measured shape A at the clone creation in the player-back stage).
5. **Pain Split**: reducer typed `MISDREAVUS`/`GENGAR`; needs `coords.yOffset` (or per-phase y2) per side before generated carriers (Misdreavus/Dusclops vs any target).
6. **Order**: pixel effect of the tie flips was not rendered; Rock Tomb's wrapped-y gap (48 frames) in the reduced model; histories after earlier animations (second+ move of a battle) are not measured; Fire Blast `FIRE_BLAST_ORDER_SEED` is shape A only.
7. **Safeguard** paints rings by an orientation rule (matches the ROM key order here); confirm it holds for other attacker species (ring y keys follow the attacker pic).
8. Drafts unverified (no harness run); `prep6Accepted.mjs` copies the literal accepted configs (Pain Split, Dragon Dance, Sweet Scent, Swallow) from their framebuffer tests, which do not export them.

## 7. Evidence paths
`docs/next-adapters-prep6.md`; `tools/integration/fixtures/prep6-{pins,slots,plans,tie-scan,order-seed,dd-order,pain-split-yoffset,sprites-analysis,summary,routes,route-probe,swallow-probe}.json`;
`tools/integration/fixtures/prep6-route-scan-rock-tomb{,-grimer}.jsonl`; `tools/integration/fixtures/prep6-activation/{mechanic-,tail-mechanic-,stage-}*.json`; `tools/integration/fixtures/prep6-sprites/*.json`;
`tools/integration/fixtures/prep6-<move>-{player,opponent}.json` (13); scripts `tools/integration/prep6{Accepted,Pins,Slots,TieScan,OrderSeed,DdOrder,PainSplitY,DumpAnalysis,Draft}.mjs`, `prep6{Plans}.py`,
`prep6{Activation,SpriteDump}.sh`, `prep6{ActivationTail,StageActivation,SpriteDump}.py`, `prep6{Routes,Replay,RouteProbe,RouteScan,SwallowProbe}.ts`.
