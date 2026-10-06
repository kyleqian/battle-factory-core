# Next adapters prep 20: source-derived hardware-OAM assemblers for Will-O-Wisp / Pursuit / Fury Cutter / Megahorn (S10A, side lane)

Design + measured evidence; **new files only** (no tracked file edited, no `src/`, adapter, `PROGRESS.md` / `ISSUES.md` / ledger change). Follows `docs/next-adapters-prep18.md` §0.0.3: the five `NEEDS-REDUCER` moves decode a per-frame hardware-OAM buffer that the verifiers feed from the retained corpus and nothing in `src/engine` builds. This note specifies, and proves offline, a **pure assembler that replaces the corpus buffer** for four of them. Every emulator number is a ROM frame from a **direct, independent mGBA run** (the shared HTTP oracles were never contacted); every relied-on alternate probe ran **twice from fresh processes, byte-identical (`cmp`)**; every checker was run twice (r1/r2 inputs) and its receipt compared.

## 0. Results

### 0.0 Verdicts

| Move | Verdict | Hardware-OAM buffer (128 entries x 8 B incl. matrix pad words) | Hardware matrices (32) | Renderer with the prototype buffer vs raw RGB |
|---|---|---|---|---|
| **Will-O-Wisp 261** | **ASSEMBLER EXACT** | **4 / 4 windows exact**: accepted player 27264/27264 (213/213 rows), accepted opponent 27136/27136 (212/212), fresh alt BANETTE->GOLEM player 27264/27264 (213/213), alt opponent 27136/27136 (212/212) | constant identity (no affine sprite) | accepted 214/214 + 213/213 rows, **0 px**; alt player 214/214, **0 px**; alt opponent 212/213 rows (row 0: 180 px, see 0.2.5) |
| **Pursuit 228** | **ASSEMBLER EXACT** | **5 / 5 windows exact** (102 rows x 128 entries each = 13056/13056): accepted player, accepted opponent, accepted **switchout** opponent, fresh alt UMBREON->GOLEM player + opponent | impact matrix 372 (normal) / 303 (switchout) in the allocated matrix slot, folded into the entry pad words: exact | **515 / 515 rows, 0 px** (all 5 windows) |
| **Fury Cutter 210** | **ASSEMBLER EXACT** | **16 / 16 body windows exact** (8 accepted = 2 sides x counters 1-4, 8 alternate SCYTHER->GOLEM): 86016/86016 entries; plus **counter-5 body** (fresh six-hit scenario, bodies 1-5) 5376/5376 each | constant identity | 688 / 688 rows, 0 px (accepted + alternate); counter 5 body 43/43, 0 px |
| **Megahorn 224** | **ASSEMBLER EXACT** (OAM + matrices; BG/palette not covered) | **4 / 4 windows exact**: accepted player 22528/22528 (176/176), accepted opponent 22400/22400 (175/175), fresh alt HERACROSS->GOLEM player 22528/22528, opponent 22528/22528 (176/176) | **32/32 matrices exact on every row** (horn rotation 30 / -99, hit splat identity) | 177+176+177+177 rows, 0 px **with the corpus palette and BG registers** (the BG_DRILL fade / white flash are not assembled) |
| **Return 216** | **NOT REACHED** | - | - | - |

Totals (new, all checked field-by-field per frame against the retained corpus AND a fresh alternate, both orientations): **0 mismatches** in every window listed; Will-O-Wisp and Pursuit/Fury/Megahorn all compare the **whole 128-entry string** (attr0/attr1/attr2 + the pad halfword = hardware matrix parameter) not only the consumer-visible subset; `consumerRowsExact` (decoded `{oamIndex, attr}` used by `willOWispDisplayPlan`) equals the full-row count.

Reproduction receipts: `tools/integration/fixtures/prep20/*.json` (compact: counts, mismatch classes, pixel rows; no RGB, no mGBA logs).

### 0.1 The one-line model (measured in all 4 moves, all corpora)

`hardwareOam[row] == buildSoftwareOam(sprite state of row-1)` (the VBlank copy lags the sprite snapshot by one row; `softwareOam[row-1] == hardwareOam[row]` on 212/212 rows of the Wisp corpus). Row 0 of a body is the **pre-activation frame** (host/scene OAM: healthbox priority bits, battlers in the pre-body affine state, an enemy-shadow entry in the opponent alternates) and is **not assembled**; every check starts at row 1 and the pixel runs feed the corpus row 0 unchanged (see 0.2.5 for the consequence).

An assembled row = the lent sprite order walked once; each visible slot contributes its attr triple; the leading healthbox group contributes one measured 9-entry block; the rest is the dummy entry `{0x00a0, 0x0130, 0x0c00}`; each entry `i` carries param `i % 4` of hardware matrix `i >> 2` in its pad halfword.

### 0.2 Findings that change the integration plan

1. **The existing reducers' source models are accepted-geometry-specific for Will-O-Wisp.** Running the shipped `willOWispAtAge` against the *alternate* ROM sprite rows: **108 / 214 rows drift on both alternate orientations** (the 4 orbs' `x2/y2` after tick 31). `orbAt` hard-codes `xStep 256/257`, `yStep 75/144`, `orbEnd 146/145`, `fireStart 163/162`; the ROM computes them with `InitAnimLinearTranslationWithSpeed` from the live attacker/target anchors (`yDelta = (|dy| << 8) / |dx|` with the sign flag in bit 0; duration = `|dx|`; last orb row = `start + 31 + |dx|`; fire start = last orb end + 2). The prototype implements the real math (`wispTimeline`, `wispPrograms`) and is exact on both alternates (the alternates' `dx` equals the accepted one, so only `dy`/step rounding is exercised: `dx != 105` is **not** tested). The integration must either port this into `willOWisp.ts` or use the assembler's programs for the OAM and keep the reducer for source/task fields.
2. **Per-age sprite order for the visible objects is derivable from the previous full order**: row order of the visible sprites == stable sort, by `(oam.priority << 8 | subpriority)` ascending then OAM top `y` descending, of the **previous row's full 64-slot `sSpriteOrder`** restricted to the visible sprites (`tools/integration/prep20OrderCheck.cjs`): **exact on 34 / 34 windows** (all accepted + alternate windows of the four moves + counter-5 bodies). What is **not** derived is the *carry* of the full 64-slot order through free/invisible slots: a pure re-sort of a carried order with in-use keys fails on Will-O-Wisp (179-180/214 visible rows; full-64 equality 0/214). The prototype therefore takes the order as **lent per row** (`spriteOrderAt`), like the verifiers do. In production the tracker (`liveSpriteOrderHost.ts`, `lendLiveSpriteOrder` `:377`, called at `factoryRoundBattleOrchestrator.ts:2335-2338`) must carry the full order across the body (`sortGbaSpriteOrder`, `gbaObjCompositor.ts:88`, needs keys for all 64 slots incl. stale ones, the Hyper Beam adapter's problem); this is the **remaining open input** (gap G1).
3. **Target battler visibility in the OAM is a measured window, not the sprite flag**: the target is absent from the OAM build of states `[8, fireEnd+1]` (Will-O-Wisp; sprite `invisible` is set at state 7 and cleared at `fireEnd+1`), `[5, 58]` (Pursuit), `[5, 32]` (Fury Cutter), `[8, 134]` (Megahorn). Source: `monbg` / `Task_UpdateMonBg` start (+1 build lag) and `Task_ClearMonBg` end. After the monbg window Megahorn's target returns at x2/y2 = 0 (its activation idle offset `(1, 0)` in the player corpus is removed by `SlideMonToOriginalPos`/`ShakeMonInPlace`): the assembler subtracts `targetInitialOffset`.
4. **Fury Cutter's slice anchor is the static `sBattlerCoords` table** (`GetBattlerSpriteCoord(BATTLER_COORD_X/Y)` = `battle_anim_mons.c:128-131`: player (72, 80), opponent (176, 40) singles), **not** the live sprite `x+x2, y+y2` that `furyCutterInputsFor` passes as `targetCenter` (46 vs 40: the first attempt was off by 6 px / 13 px). Will-O-Wisp / Pursuit / Megahorn use `X_2` + `Y_PIC_OFFSET` (the resolved pic anchor, e.g. (176, 49), (72, 99), (176, 42), (72, 88)).
5. **Alternate opponent Will-O-Wisp row 0 residual 180 px** is the scene's age-0 enemy-shadow draw for the alternate species (`drawSourceOpponentEnemyShadow`, `battleScene.ts` Wisp branch), not the assembled buffer: row 0 uses the corpus buffer in these runs; rows 1..212 are 0 px.

### 0.3 Expected dense acceptance per move (for the integration lane)

| Move | Windows to replay (rows) | Gate |
|---|---|---|
| Will-O-Wisp | accepted `will-o-wisp-{player,opponent}-dense-state.json.gz` (214 / 213) + alternate BANETTE->GOLEM (214 / 213) | `assembleWispHardwareOam` rows 1..N-1 string-equal; framebuffer rows 214/214, 213/213 (+ alternates, row 0 shadow caveat) |
| Pursuit | accepted player / opponent / switchout-opponent (103 each) + alternate UMBREON->GOLEM both sides (103) | rows 1..102 string-equal; 103/103 framebuffer rows each |
| Fury Cutter | 8 accepted bodies (43 each) + 8 alternate bodies + counter-5 body | rows 1..42 string-equal; 43/43 framebuffer rows each |
| Megahorn | accepted player / opponent (177 / 176) + alternate HERACROSS->GOLEM (177 / 177) | rows 1..N-1 string-equal incl. matrices; framebuffer rows with the **separately provided** BG_DRILL/palette timeline |

## 1. Field classification per move

Legend: **K** = known-entry allocator constant (slot, tile base, palette bank, matrix id, subpriority, healthbox block; equal across accepted + alternates), **A** = battler anchor (production `liveBattlerAnchors` / `battlePositionCenter` / pic anchor), **S** = source animation program (the move script + sprite callbacks, derived), **R** = the reducer's own state (cursor / age), **L** = lent (sprite-order provider), **M** = genuinely missing from a source-derived assembler (not needed for the OAM buffer, listed for completeness), **X** = not consumed by the reducer's plan.

What each reducer reads per frame: `willOWispDisplayPlan` (`willOWisp.ts:146`): attr0/attr1/attr2 and `oamIndex` of the attacker (`attr[2] == art.attr[2]`), the target, every object with tile in `[orbTileBase, +28)` (orbs) and `[fireTileBase, +64)` (fires); the matrix is decoded but the Wisp plan never reads it (no affine). `pursuitDisplayPlan` (`pursuit.ts:306`): attacker, target by attr2; impact = object in the IMPACT tile range with bank match and affine-not-double attr0 bits; matrix via attr1 bits 9-13. `furyCutterDisplayPlan` (`furyCutter.ts:93`): attacker, target, slices in `[cutTileBase, +64)`. `megaHornDisplayPlan` (`megaHorn.ts:77`): attacker, target, horns `[hornTileBase, +8)`, impacts `[impactTileBase, +16)` and the hardware matrices of their `matrixNum`. The prototypes assemble all 128 entries, so every field below is checked.

### 1.1 Will-O-Wisp (`prep20WispAssembler.ts`)

| Field | Class | Derivation |
|---|---|---|
| orb/fire attr0 y (bits 0-7), attr1 x (bits 0-8) | S + A | `(y + y2 - h/2) & 0xff`, `(x + x2 - w/2) & 0x1ff` (orb 16x16, fire 32x32); orb `(x, y)` = attacker pic anchor then `+ Sin(124, dir*4)`, `(x2, y2)` per `AnimWillOWispOrb` cases 1/2 + `AnimTranslateLinear` (§0.2.1); fire `(x, y)` = target `X_2 / Y_PIC_OFFSET`, radial `AnimWillOWispFire` |
| attr0 shape/mode/affine bits | S | template `gOamData_AffineOff_ObjNormal_16x16/32x32` (shape 0, no affine, no blend) |
| attr1 size bits | S | 16x16 -> `0x4000`, 32x32 -> `0x8000`; flip bits 0 |
| attr2 tile | K + S | `orbTileBase 537` / `fireTileBase 305` (allocator, `tileRanges` of tags 10231/10232) + anim frame offset: orb anim 0 `(floor((L+1)/5) % 4) * 4`, anim 1 = 16, anim 2/3 = 20; fire `(floor((L+1)/5) % 4) * 16` (`ANIMCMD_FRAME(.., 5)`, first frame 4 rows) |
| attr2 palette bank | K | orb 8, fire 7 (second / first loaded sheet) |
| attr2 priority | S + R | orb: target BG priority at its creation (`GetBattlerSpriteBGPriority`): opponent target (BG1) 2 until `splitbgprio_all`; player target (BG2) 2 throughout; fire: that priority `+ (data[1] in [64,195] ? 1 : 0)`, `data[1] = ordinal*42 + (L+2)*7 & 255` |
| invisible fire rows | S | `data[2] > 0x14` toggle: `L >= 19 && L odd` -> no OAM entry |
| slots | K + S | lowest-free over lifetimes (orbs 3,4,5,7, fires 3,4,5,7,9,10; occupied `[0,1,2,6,8,60..63]`) |
| lifetimes / ages | S | orb `10+5i .. 10+5i+31+|dx|`; fire `lastOrbEnd+2 .. +27` (§0.2.1) |
| attacker object | A + K | art attr (static); slot/subpriority 6/30 (player) or 8/40 |
| target object | A + K + R | art attr until state 7, absent `[8, fireEnd+1]`, then art attr |
| healthbox 9 entries, dummy, pad words | K | measured constants (identity matrices) |
| `oamIndex` / order | L | lent per row; derivation §0.2.2 |
| BG scroll registers, `monbgHofs` shake, palette | M / X | not in the OAM; the Wisp plan reads `registers[bg*cnt] & 3` and the monbg scroll (BG-register history, prep19) |

### 1.2 Pursuit (`prep20PursuitAssembler.ts`)

| Field | Class | Derivation |
|---|---|---|
| attacker / target attr | A + K | live battler objects (static; target shake is x2 on the monbg copy, not in the OAM) |
| target presence | R | states 0-4 and >= 59 |
| impact attr0 | S | `0x0100 (affine) | 0x0400 (blend) | (y - 16) & 0xff` (`gOamData_AffineNormal_ObjBlend_32x32`) |
| impact attr1 | S + K | `0x8000 | matrixNum << 9 | (x - 16) & 0x1ff`, `(x, y)` = `targetImpactCenter` (`InitSpritePosToAnimTarget(TRUE)` pic anchor, `pursuit.ts targetImpactCenter`) |
| impact attr2 | K + S | tile = `tileRanges[tileSlot][0]` (305 / 405), priority 2 (template), palette bank = allocator slot (7 / 6) |
| impact slot, matrix id | K | allocator: slot 3 (normal, both sides) / 5 (switchout: different UI history), matrix 0 / 2; lowest-free over the live set |
| impact matrix | S | `sBasicHitSplat` affine anim 2 / 1 end value 372 / 303, constant states 47..56, identity before / after (and in the pad words of entries `4k..4k+3` of that matrix id) |
| impact lifetime | R | states 47..56 (`pursuit.ts:439`) |
| healthbox block, dummy, order | K, K, L | as Will-O-Wisp; the switchout window has a different healthbox block and slot set (5/3/0/1...), so the block is a per-scene host constant |
| BG_DARK fade, shake scroll, palette | M / X | not in the OAM |

### 1.3 Fury Cutter (`prep20FuryCutterAssembler.ts`)

| Field | Class | Derivation |
|---|---|---|
| slice position | S + K | `(sBattlerCoords[target].x -/+ 40, y + (target is player ? 8 : 0) - 32)`; `-40` and `hFlip` when `AnimTask_IsFuryCutterHitRight` (`counter & 1`), else `+40`; then `AnimSlice_Step` x20 Q8: `d3 += d1; d4 += d2; d1 += +-0x18; d2 -= 0x18`, `x2 = d3 >> 8`, `y2 = d4 >> 8` (then `WaitAnimForDuration(3)`: 4 constant rows) |
| attr0 | S | `0x0400 (blend) | (y + y2 - 16) & 0xff` (`gOamData_AffineOff_ObjBlend_32x32`) |
| attr1 | S | `0x8000 | (right ? 0x1000 hFlip : 0) | (x + x2 - 16) & 0x1ff` |
| attr2 | K + S | `cutTileBase 305 + 16 * min(3, floor((L+1)/5))`, priority 2, palette bank 7 |
| lifetime | S | states 7..30 (24 rows: 20 steps + 4 waits) |
| slot | K | lowest-free (3); the `gComplexPaletteBlend` helper (slot 4, invisible) emits no entry |
| counter-5 | S | body identical to counter 3 (`rightHit = counter & 1`), verified |
| target presence | R | absent `[5, 32]` |
| palette blend (`complex_palette_blend` x1/x3), BG, shake | M / X | not OAM |

### 1.4 Megahorn (`prep20MegahornAssembler.ts`)

| Field | Class | Derivation |
|---|---|---|
| attacker x2 | S | `AnimTask_ShakeMon(2,0,15,1)` created at state 48: `x2 = 2` at `48 + {0, 3,4, 7,8, ..., 27,28}`; `SlideMonToOffset(0,24,.,6)`: `+-4 * min(n,6)` from state 89; `SlideMonToOriginalPos`: `(+-(24<<8) -+ n * floor((24<<8)/11)) >> 8` (arithmetic shift) from state 122, 11 steps |
| horn attr0/attr1/attr2 | S + A + K | start `(Xpic -+ 42, Ypic +- 25)` (sign flipped for a player target), `StartAnimLinearTranslation` to the pic anchor in 6 steps (`xd = (|dx| << 8) / 6`, sign bit 0), `attr0 = 0x4000 (wide) | 0x0300 (double) | (y+y2-16)`, `attr1 = 0x8000 | matrixNum << 9 | (x+x2-32)`, tile 305 / pal 7 / prio 2; states 94..100 |
| horn matrix | S | `ObjAffineSet` at unit scale, rotation 30 (player attacker) / -99 (opponent): `[trunc(256 cos), trunc(-256 sin), trunc(256 sin), trunc(256 cos)]` = `[189,-171,171,189]` / `[-193,167,-167,-193]`, states 94..100, identity otherwise |
| hit splat | S + K | `0x0100 | 0x0400 | (Ypic-16)`, `0x8000 | 3 << 9 | (Xpic-16)`, tile 313 / pal 8 / prio 2, states 100..108, matrix id 3 (identity values) |
| slots | K + S | lowest-free over the helper-sprite lifetimes (slide helpers are invisible but hold slots): horn 4, splat 3 |
| target | A + R | absent `[8, 134]`, then art attr minus the activation `(x2, y2)` |
| BG_DRILL fade, white flash at 110, monbg shake scroll, target shake | M / X | **not covered**: palette / BG-register timelines are separate providers (prep18 §1.2) |

## 2. Assembler check numbers (frame-by-frame, field-by-field)

All windows compare the whole 128-entry string per row 1..N-1 (matrices for Megahorn); mismatch classes are listed as they were *found* while building (all resolved; the final counts are 0):

| Mismatch class (first run) | Move | Cause | Fix (in the assembler) |
|---|---|---|---|
| target present at row 8 / 193-195 | Wisp | OAM hide window is `[8, fireEnd+1]`, not the sprite flag window `[7, ..]` | measured window (§0.2.3) |
| fire priority 1 instead of 2 | Wisp opponent | player-side target BG2 keeps priority 2 after `splitbgprio_all` | BG priority rule |
| orb y/x off by 1, 356-372 entries | Wisp alternates | hard-coded `yStep` / `xStep` (§0.2.1) | real linear-translation math |
| slice y off by 6 / 13 px | Fury | slice anchor is the static `sBattlerCoords` (§0.2.4) | table |
| attacker x2 phase (56 entries) | Megahorn | `AnimTask_ShakeMon` creation-frame `x2 = 2` then toggles every 2nd frame | source replay |
| target x +1 on rows 136-176 | Megahorn player | idle offset removed after monbg | `targetInitialOffset` |

Per-move numbers: see §0.0. `tools/integration/fixtures/prep20/`: `will-o-wisp-assembler-check.json` (4 windows, entries / rows / consumer rows), `will-o-wisp-pixels.json` (4 windows, framebuffer rows + shipped-reducer drift rows), `pursuit-assembler-check.json` (5 windows with pixels), `fury-cutter-assembler-check.json` (16 windows with pixels), `fury-cutter-six-hits-check.json` (counter 1-5 bodies with pixels), `megahorn-assembler-check.json` (4 windows with matrices and pixels), `sprite-order-check.json` (34 windows).

## 3. Return (not reached)

No prototype. From prep18 §1.5 the classification is: 31 sprites (9 `gVerticalDip` helpers that move the battlers, 11 + 2 `gBasicHitSplat` with a matrix-0 anim and matrix-3 anim, `gMultiuse` trace sprites copying the battler art with side-keyed bank 0 tile 369 / bank 1 tile 473, 2 `gSimplePaletteBlend`), 282 rows; the OAM model above (lagged build, lent order, measured hide window, lowest-free slots, `ObjAffineSet` matrices as in `megaPunch.ts:81`) applies unchanged; the missing work is the battler lunge/dip x2/y2 programs and the trace-blend copies. Factory reaches only friendship 255 (strongest). Not started because the budget went to the four above.

## 4. Integration brief

**Where it lives.** One new engine module per move (or one `src/engine/liveMoveOamAssembler.ts` exporting `assembleWispHardwareOam / assemblePursuitHardwareOam / assembleFuryCutterHardwareOam / assembleMegahornHardwareOam`), ported 1:1 from `tools/integration/prep20*Assembler.ts` (they import only the GBA sine table `GBA_SINE_TABLE_256`, `src/engine/battleMenu.ts`). Wire it as the producer of `animationInputs.buffers.{hardwareOam,hardwareMatrices}` that the live presentation builder currently cannot supply (`grep hardwareOam src/engine` = `battleScene.ts` only); the display plans (`willOWisp.ts:146`, `pursuit.ts:306`, `furyCutter.ts:93`, `megaHorn.ts:77`) and the renderer branches (`battleScene.ts` Wisp branch at ~25424 and the siblings) then run unchanged.

**Provider inputs (each with the source of truth):**

| Input | Provider |
|---|---|
| attacker / target anchors, pic anchors (`X_2`/`Y_PIC_OFFSET`), `targetImpactCenter`, `targetInitialOffset` | `liveBattlerAnchors()` (`spriteCenter`, `battlePositionCenter`, `frontIdleRest`, as used by the Dig adapter, prep18 §1.1); Fury Cutter needs the **static** `sBattlerCoords` (72,80)/(176,40), a constant |
| battler art attr words (slot, attr0-2) | the live battler sprite objects of the scene (`battleCommandFieldArt.ts:122` area) |
| tile bases / palette banks / matrix ids / sprite slots | `liveSpriteAllocator.ts` (`allocateFirstLiveSprite :89`, `allocateEndLiveSprite :100`, `destroyLiveSprite :111`) and `prepareLiveMoveSpriteAllocator` (`liveMoveSpriteAllocator.ts:75`, called at `factoryRoundBattleOrchestrator.ts:2335`); equal to the corpora's K values for the known-entry route |
| sprite order | **lent**: `lendLiveSpriteOrder` (`liveSpriteOrderHost.ts:377`) at activation, then per-age sort with `sortGbaSpriteOrder` (`gbaObjCompositor.ts:88`) over the **full 64-slot order**, keys `(oam.priority << 8 | subpriority, OAM y)`; subpriority = battler subpriority - createsprite offset (Wisp/Fury 28 / 38, Pursuit hit splat 27, Megahorn horn 27, splat 28). Gap G1: carrying the full order through free slots is not derived here (§0.2.2) |
| healthbox 9-entry block, dummy entry | not consumed by any renderer branch (healthboxes are drawn by `drawSendOutHealthbox` / `composePlayerHealthbox`); emit a placeholder block of 9 entries so `oamIndex` offsets stay right, or compare only `oamIndex`-relative order |
| BG priority / registers, palette timeline, monbg scroll | **not** this assembler: BG-register history (prep19, `docs/bg-register-history.md`) and the palette provider (Megahorn needs the BG_DRILL fade + white flash; Pursuit BG_DARK fade) |

**Gates.** First body / tracker: all four corpora are first bodies (Wisp, Pursuit) or follow Tackle-like predecessors (Fury bodies 2-4, Megahorn); the assembler needs only the lent order and the allocator state, not the BG registers, but the display plans also read `registers`/palette, so keep the existing prep16 gates (`firstBody` for BG-snapshot adapters, `liveMoveAnimation.ts:2339, 2498-2501`) until the register history lands. Pursuit: `request.turn & 1` selects normal / switchout (`prep18 §1.6`); the switchout scene has a different healthbox block and slot set, take the slot/matrix/tile from the allocator, not constants. Return-style `friendship` is unrelated.

**Fury Cutter counter plumbing.** The counter is the attacker's `furyCutterCounter` **after** `Cmd_furycuttercalc` incremented it (cap `FURY_CUTTER_COUNTER_FIXED_POINT = 5`, `battleScriptFuryCutterOpcode.ts:25`, increment `:51-64`). Copy the Rollout precedent exactly: add a 7th `MOVE_ANIMATION` argument for move 210 in the hit-chain opcode next to `battleScriptHitChainOpcode.ts:2305-2309` (`...(move === 210 ? [String(attackerBattler.furyCutterCounter)] : [])`), accept 6 or 7 args in `battleMoveAnimationRequest` (`battleMoveAnimation.ts:25`, today `rolloutCounter`; add `furyCutterCounter`), and map counter 5 -> body of counter 3 (`rightHit = counter & 1`, power/blend index `min(counter, 3)`-style: counters 1, 2, 3 select the three scripts, 3+ the strongest; verified: the counter-5 body equals counter 3 on 5376/5376 entries and 43/43 pixel rows). `FuryCutterLiveInputs.counter` is typed `1|2|3|4` and must also admit 5 or be clamped by the caller.

**Expected dense acceptance:** §0.3. Suggested order: Will-O-Wisp (also port the exact orb math, §0.2.1), Pursuit, Fury Cutter (+ counter plumbing), Megahorn last (needs the palette/BG provider).

## 5. Reproduce

```sh
sh tools/integration/prep20Run.sh      # 14 direct-mGBA probe processes (alternates x2, cmp'd) then the 5 checkers; ~4 min on a laptop
# or per piece, with probes from /tmp/p20/alt:
npx vite-node tools/integration/prep20WispCheck.ts  <altP.json> <altO.json> [out.json]
npx vite-node tools/integration/prep20WispPixels.ts <altP.json> <altPrgbDir> <altO.json> <altOrgbDir> [out.json]
npx vite-node tools/integration/prep20PursuitCheck.ts --pixels <alt.json>:<rgbDir>:player-back:UMBREON,GOLEM ... [--out=out.json]
npx vite-node tools/integration/prep20FuryCutterCheck.ts --pixels <alt.json>:<rgbDir>:player:SCYTHER,GOLEM ... [--six=<six.json>:<rgbDir>] [--out=out.json]
npx vite-node tools/integration/prep20MegahornCheck.ts --pixels <alt.json>:<rgbDir>:player:HERACROSS,GOLEM ... [--out=out.json]
node tools/integration/prep20OrderCheck.cjs <altDir> [out.json]
```

Probe scripts are the existing `tools/compare/{willOWisp,pursuit,furyCutter,megaHorn}Probe.py` run on the prep18 alternate scenarios `tools/battle-lab/prep18-*` (three args: scenario, output json, rgb dir). Files: `tools/integration/prep20{Wisp,Pursuit,FuryCutter,Megahorn}Assembler.ts` (+ `Check` / `Pixels` / `Known`), `prep20OrderCheck.cjs`, `prep20Run.sh`.

## 6. Limits (not measured)

- Returns not built; Wisp `dx != 105` not exercised; doubles not exercised; one alternate species pair per move; single bodies only (Fury bodies 1-4 and the counter-5 body are all in sequence on one scene).
- Pixel runs for Pursuit / Fury / Megahorn / Wisp feed the **corpus** palette, BG registers, tasks and audio and the **corpus row 0**; only the hardware OAM (and Megahorn's hardware matrices) are assembled.
- The per-age sprite order is lent (G1); the healthbox block, dummy entry and battler attr words are measured scene constants.
- No `src/` change, no adapter wiring.

## 7. Papercuts

- `willOWispInputsFor` / `pursuitInputsFor` / `furyCutterInputsFor` hard-code the carrier species (`PLUSLE`/`SHUCKLE`, `BEEDRILL`, `GROVYLE`/`BLISSEY`, `SEAKING`/`ONIX`), so the alternate pixel runs need a species override on the config to draw the right art, ~10 min.
- `furyCutterInputsFor.targetCenter` is `sprite.x + x2, y + y2`, not the `sBattlerCoords` anchor `AnimCuttingSlice` uses (§0.2.4), ~10 min to find.
- `npx vite-node` swallows a bare `--` separator, so `-- out.json` silently wrote nothing; use `--out=...`, ~5 min.
