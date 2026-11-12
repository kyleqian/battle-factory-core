# Next adapters prep 31: source-derived provider prototypes for MOVE_SUPERPOWER (276) and MOVE_SPIT_UP (255, all three Stockpile counters) (S10A, side lane)

Evidence + prototypes; **new files only** (no tracked file edited; no `src/`, adapter, `PROGRESS.md` / `ISSUES.md` / ledger change). Method = `docs/next-adapters-prep24.md` / `prep26.md` (full per-age input model checked field by field, then fed to the **unchanged** renderer) with the prep20 hardware-OAM assembler shape. Every emulator number is a ROM frame: the accepted corpora (`tools/compare/evidence/superpower-*-dense-state.json.gz`, `spit-up-{player,opponent}-{1,2,3}-dense.json.gz`) or an **independent direct mGBA run** (shared HTTP oracles never contacted). Base `245106c76`.

Reproducibility: every probe scenario (10: 4 Superpower, 6 Spit Up) ran **twice from fresh processes, byte-identical (`cmp`)** in each of two independent probe passes (`/tmp/p31a`, `/tmp/p31b`: 4 fresh processes per scenario); the receipts in `tools/integration/fixtures/prep31/` were regenerated from both probe passes (pass A twice, pass B end to end with fresh `OUT` + `REC`; the Superpower set once more over pass B after adding the derived-order receipt) and are `cmp`-identical every time.

## 0. Results

### 0.1 Verdicts

| Move | Verdict | Field checks (every row of every window) | Unchanged renderer fed with prototype inputs vs raw ROM RGB |
|---|---|---|---|
| **Superpower 276** | **READY (faithful timing)**: every per-age input the reducer / renderer reads is source-derived and exact in 6/6 windows given one **T** bit (`monbgCntRow` 10 / 11, §1.4) | 6 windows x 248 rows: hardware OAM **31616/31616 entries** per window (247/247 rows; with the corpus order lent **and** with the SortSprites-derived order), hardware matrices 247/247, move-owned sprites (orb, shake sprite, 5 rocks, fireball: slot, x, y, x2, y2, callback, data[0..3]) 248/248, registers (all 21) 248/248, battleBg 248/248, hardware / faded / unfaded palette 248/248, tasks (slot, callback, data[0..15]) 248/248, target x2 248/248 | **1487/1488 rows**: 5 windows 248/248 **0 px**; prep25 alt player 247/248 (row 10, 889 px = the reducer's `monbg.active` age gate `superpower.ts:75` encodes the dominant player phase 10, this window is phase 11) |
| **Spit Up 255** (counters 1 / 2 / 3) | **READY**: every input the evidence replayer passes through and the renderer reads is source-derived and exact in 12/12 windows (M burst lag, L free-slot order, §2.4) | 12 windows (6 accepted + 6 prep29 alternates) x 108 / 108 / 109 rows: hardware OAM **13696/13696** (counters 1, 2) / **13824/13824** (counter 3) entries per window, matrices every row, orb + hit-splat sprites (slot, x, y, x2, y2, invisible, matrixNum) every row outside the T partial-snapshot burst rows, attacker deform (x2, y2) every row, target x2, three palettes, registers, tasks every row | **1300/1300 rows, 0 px** (12/12 windows) |

Windows. Superpower: accepted `superpower-{player,opponent}-dense-state` (NIDOQUEEN / SEVIPER display -> SHUCKLE), prep25 alternates `prep25-superpower-alt-{player,opponent}-machamp-golem`, **fresh prep31 pair** `prep31-superpower-alt-player-machamp-weezing` (elevated target, WEEZING elevation 6) and `prep31-superpower-alt-opponent-weezing-snorlax` (elevated attacker, tall player target); each window from the scenario's own activation frame (the probe's row 0). Spit Up: accepted `spit-up-{player,opponent}-{1,2,3}` (KECLEON display -> BLISSEY) and `prep29-spit-up-alt-{player,opponent}-seviper-golem-{one,two,three}-stockpile`.

### 0.2 Negative controls (receipts `fixtures/prep31/*-neg-*.json`, accepted windows)

| Move | Perturbation | Field check | Pixels |
|---|---|---|---|
| Superpower | attacker anchor x + 1 (`--neg=oam`) | OAM 48/247 (player), 34/247 (opponent) rows; sprites 41 / 35 of 248 | OAM frozen at row 1: 19/248 rows (493752 px / 529515 px) |
| Superpower | orb palette word ^ 1 / ^ 0x0421 (`palette`) | hardwarePalette 2/248, unfaded / faded 1/248 | 42/248 (231004 px), 36/248 (371406 px) |
| Superpower | body win0h + 1 (`registers`) / registers frozen at row 1 | registers 1/248 | 12/248 (938643 px), 13/248 (1011448 px) |
| Superpower | T bit flipped (`phase`: 10 <-> 11) | registers 247/248 (row 10 / 11) | -- |
| Spit Up | attacker anchor x + 1 (`--neg=oam`) | OAM 95 / 88 / 88 of 107 / 107 / 108 rows | OAM frozen at row 1: 23 of 108 / 109 rows (114 k - 148 k px per window) |
| Spit Up | red orb palette ^ 1 / ^ 0x0421 (`palette`) | unfaded / faded 1 row, hardware 2 rows | 79 - 84 of 108 / 109 rows (5460 - 7669 px per window) |
| Spit Up | free-slot order lent as plain slot order (`--lend=slot`) | counter 3 OAM 96/108 (counters 1, 2 unaffected: no equal-y pair spans the slots >= 13) | -- |

### 0.3 Field classes (as prep24 / prep26; D4: **T** = differs between scenarios only by a CPU phase)

**S** source program, **K** known-entry constant, **A** battler anchor, **P** asset palette, **L** lent, **M** measured constant (identical in every scenario, cause named), **H** history, **T** CPU phase.

| Class | Superpower | Spit Up |
|---|---|---|
| S | orb (`AnimSuperpowerOrb(_Step)`: data[0]++ to 180, then `SetGpuReg(BLDCNT, 0)` + `InitAnimLinearTranslation` 16 steps to the target, `DestroySpriteAndMatrix` on the next frame; affine `sAffineAnim_SuperpowerOrb` set 0x20, +4 x64, -6 x8 / +6 x8 looping, matrix `0x10000 / scale`, affine-double 64x64 corner -64); 5 rocks (`AnimSuperpowerRock` Step1 `y = (120 << 8 - speed n) >> 8` for arg3 frames, Step2 `(x, y) << 4 += target - attacker`, destroy `x + 8 > 256` (u16) / `y < -8` / `y > 120`, tile + 4 x arg2); fireball (16-step linear translation, HFLIP / VFLIP when the target is on the player side, `DestroyAnimSprite`); `AnimShakeMonOrBattlePlatforms` (BG3_Y += velocity on every 2nd Step, 180 frames, restore 0; `bg3vofs` = previous row & 0x1ff); `AnimTask_ShakeMon2(target, 8, 0, 16, 1)` x2 / data; monbg (`Task_UpdateMonBg` data, BG offsets `32 - x / 32 - y`, palette copy OBJ bank -> BG bank 9 / 8), `bgNcnt` formula, `splitbgprio` (PLAYER_LEFT only: BG1 priority 1), `setalpha 12,8`, `blendoff` at clear, `Task_ClearMonBg`; slots / matrix id lowest-free in creation order; script rows from the delays (`delay N` -> next command N + 2 rows: 13, 35, 77 + 10 i, 193, 211) | orbs (`AnimSpitUpOrb`: x2 += `Sin(a, 10)`, y2 += `Cos(a, 7)` from `gSineTable` (`trig.c`), destroyed on the 13th step; affine scale 0x80 + 8 per step; 8x8 double corner -8; wave 1 angles 0..224 step 32, counter 2 adds 16 / 80 / 144 / 208, counter 3 adds 16..240 step 32 via `jumpifmoveturn`), attacker rot-scale (`AnimTask_SpitUpDeformMon` = `RunAffineAnimFromTaskData` over `gSpitUpDeformMonAffineAnimCmds`, matrix `[xScale, 0, 0, yScale]` on the battler's own matrix, `SetBattlerSpriteYOffsetFromYScale` y2, END -> affine-normal identity), `AnimTask_ShakeMon2(ATTACKER, 1, 0, 8, 2)`, `AnimTask_ShakeTargetBasedOnMovePowerOrDmg(FALSE, 1, 8, 1, 0)` (power 100 -> d15 8, d13 = d14 = 4), flashing hit splats (`InitSpritePosToAnimTarget` + (-12, 10) / (12, -10) x-mirrored for an opponent attacker, invisible ^= 1, destroyed at data[0] 13, affine anim 1 -> matrix 303), task data, SortSprites order (priority << 8 / subpriority, larger signed y first, stable), slots / matrices lowest-free |
| K | healthbox 9-entry block, dummy entry, battler attrs, tile / bank / priority of orb / rock / meteor (attr2 of the first sprite: allocator), free matrix (lowest free bit of the activation `matrixBitmap`), registers0 / body `win0`, palettes0 (three baselines), CLEAR row 242 | same blocks, tile / bank of red orb / impact, `matrixBitmap` (battlers own matrices 1 / 2), `StorePointerInVars` halves of `gSpitUpDeformMonAffineAnimCmds` (-7200, 2140), body lengths 108 / 108 / 109 |
| A | attacker / target `BATTLER_COORD_X_2 / Y_PIC_OFFSET` (orb birth; target = orb + the rocks' Step2 delta) | attacker / target X_2 / Y_PIC_OFFSET (orb / splat births), attacker `yDelta` (pic `y_offset`, the value reproducing y2 on every deform row) |
| P | `superpower-rock-orb-fire.json` (circleOfLight bank 7, meteor 8, flatRock 9) | `spit-up-red-orb.json` (bank 7), `battle-anim-hitsplat.json` (bank 8) |
| L | -- (the OAM order is **derived** by SortSprites, `--order=derived`, exact in 6/6 windows from the sprites' own subpriorities; the corpus `spriteOrder` lent as in prep26 gives the identical result) | the activation 64-slot `sSpriteOrder` position of the free slots a burst takes (here: slots < 13 ascending, slots >= 13 descending; matters only for counter 3's equal-y wave-2 pairs) |
| M | -- | **burst lag** (prep29 "lag age 60 (+68)"): an 8-orb `createsprite` burst overruns its frame: tasks hold on the burst row (59; counter 3 also 67), the sprite step of that frame completes on the next row (60 / 68), whose hardware OAM repeats the previous row (missed transfer); later script rows shift by one per earlier burst (wave 2 at 67, ShakeTarget + splat 1 at 74 / 75, splat 2 at 81 / 82). Identical in all 12 windows. |
| H | -- | -- (the L order above is the history of the slots >= 13; production carries it, §3) |
| **T** | **`monbgCntRow`** (the monbg `BGnCNT` + `HOFS/VOFS` write row): accepted player **10**, prep25 alt player **11**, prep31 alt player (MACHAMP -> WEEZING) **10**, all three opponents **11**; with 10 the init writes HOFS / VOFS of the same row | **partial-snapshot burst rows** (state only, never reaching hardware OAM or pixels): number of orbs already stepped at row 59: 4 in 9 windows, 5 (accepted player 2, alt player 2), 3 (alt opponent 2); row 67 (counter 3): 8 of 16 sprites stepped, a different subset per window (5, 6, 8, 5 sprites equal to the model's "first 4" choice) |

## 1. Superpower (`Move_SUPERPOWER`, `src/animation/superpower.ts`, `battleScene.ts:25308`)

### 1.1 What the branch reads

`superpowerDisplayPlan` decodes `buffers.hardwareOam / hardwareMatrices` (attacker / target by attr2, orbs / rocks / meteors by tile ranges); the branch reads `palette.hardware`, `registers.bg3hofs / bg3vofs` (BG3 shake), `bgNhofs / bgNvofs` of the monbg BG, `bldcnt` (`alpha.active`) and `bldalpha` (eva / evb), `resources.*TileBase`, `background.monbgPaletteBank`, and the reducer's age-gated `monbg.active` (player >= 10, opponent >= 11, <= 245). The prototype produces all of them plus sprites, tasks, battleBg, faded / unfaded palettes and target x2 (`prep31SuperpowerModel.ts`).

### 1.2 Row conventions found while building (all resolved, all checked)

| Item | Rule |
|---|---|
| hardware OAM / matrices | `hardwareOam[row] = build(state row - 1)` (prep20) |
| target x2 in OAM | `AnimTask_ShakeMon2` created on row 211: the init value (x2 = 8) is in the build of state 211, every later Step (RunTasks) lands one build later (`x2(state - 1)`) |
| shake sprite | its Step also runs on the creation row (timer 179 on row 35), so BG3_Y = -4 when `((row - 34) >> 1)` is odd, rows 36..214 |
| orb / fireball callbacks | `AnimTranslateLinear_WithFollowup` on rows 192..208 (orb) / 193..208 (fireball), the stored `DestroySpriteAndMatrix` / `DestroyAnimSprite` callback visible on row 209, gone on row 210 |
| `monbgCntRow` detection | first row whose monbg `HOFS` changes (the WEEZING player window keeps `bg2cnt` at the monbg value from row 0, so `BGnCNT` cannot be used) |

### 1.3 Pixels

`fixtures/prep31/superpower-pixels.json`: accepted player / opponent 248/248, prep25 alt opponent 248/248, prep31 alt player (MACHAMP -> WEEZING, phase 10) 248/248, prep31 alt opponent (WEEZING -> SNORLAX) 248/248, all 0 px; prep25 alt player 247/248 (row 10, 889 px). Row 0 uses the corpus buffers (pre-activation, as prep20 / prep24 / prep26). Species / healthbox hp are the active battlers' (`battlers.*.hp`; the harness `superpowerConfigFor` hard-codes NIDOQUEEN / SEVIPER / SHUCKLE, so the alternates pass their names).

### 1.4 The T bit

`monbgCntRow` is the same class as prep26 Revenge's / prep24 Return's `bg*cnt` row. Measured: player {10: 2 windows, 11: 1}, opponent {11: 3}. The reducer's gate (`superpower.ts:75`) already encodes the dominant player phase 10 (and 11 for opponents), so with the D4 "dominant measured phase" policy no reducer change is needed: phase-10 player windows and every opponent window are framebuffer-exact; a phase-11 player window loses row 10 only (889 px: the reducer draws the monbg copy one row before the ROM moves the attacker to BG2).

## 2. Spit Up (`Move_SPIT_UP`, `src/animation/spitUp.ts`, `battleScene.ts:24783`)

### 2.1 What the branch reads

`spitUpAtAge` is an evidence replayer (prep29): it passes `buffers`, `palette`, `resources` through; the branch decodes `buffers.hardwareOam / hardwareMatrices` (attacker / target by attr2, red orbs by `redOrbTileBase + 0..2`, impacts by `impactTileBase + 0..15`, affine attacker drawn with its matrix), `palette.hardware`, `resources.redOrbLoaded / impactLoaded / *TileBase`. Registers never change (all 12 windows). So a per-age `animationInputsAt(age)` that returns the prototype's buffers / palettes / resources makes the existing reducer + renderer exact.

### 2.2 Program rows (state rows; counter = `request.turn`, ROM animTurn - 1 at activation, prep29)

loadspritegfx rows 1 / 4; deform + attacker ShakeMon2 row 7 (deform steps hold on the task-lag rows; END at step 78 -> affine normal, identity, task gone); wave 1 row 59 (8 orbs, slots 3 4 5 7 9 10 11 12, matrices 0 3..9); wave 2 row 67 (counter 2: 4 orbs, counter 3: 8 orbs); ShakeTarget + splat 1 row 74 (counter 3: 75); splat 2 row 81 (82); first inactive 107 / 107 / 108.

### 2.3 Order

The spit-up corpus schema has no `spriteOrder`; the OAM order is derived (`orderFor`): one stable SortSprites pass per completed frame (`priority << 8 | subpriority`, larger signed `oam.y` first), no pass on a burst row (the frame completes on the next row). The subpriorities are the sprites' own (battlers 30 / 40, orbs 28, splats from the template offset). The only lent input is the activation order of never-used free slots (§0.3 L): plain slot order breaks counter 3 rows 69..80 (`spitup-neg-check-lend-slot.json`), "slots >= 13 descending" is exact in all 4 counter-3 windows.

### 2.4 Pixels

`fixtures/prep31/spitup-pixels.json`: 12/12 windows, 1300/1300 rows, 0 px (alternates displayed as SEVIPER / GOLEM; accepted as the harness's KECLEON / BLISSEY).

## 3. Integration recipe (no src change made here)

1. **Superpower**: `src/engine/liveSuperpowerInputs.ts` (or a section of `liveOamMoves.ts` next to `liveReturnInputs`, `liveOamMoves.ts:506`): port `superpowerSprites` / `assembleSuperpowerHardwareOam` / `superpowerModel` 1:1 as `liveSuperpowerInputs(args) -> { duration: 248, animationInputsAt(age) }`; replace `known.*` by `liveBattlerAnchors` (X_2 / Y_PIC_OFFSET of attacker and target), the allocator (`prepareLiveMoveSpriteAllocator`: occupied slots, tile / bank of tags 10212 / 10256 / 10257, lowest free matrix bit), the host palettes (palette0 / faded0 / unfaded0) and registers0; build the OAM with `carryLiveSpriteOrder` (`liveMoveOamAssembler.ts:52`) + `buildLiveHardwareOam` (`:65`) (the shape of `liveReturnHardwareOamRows`, `:387`; the order rule is `derivedOrder` in `prep31SuperpowerCheck.ts`, exact in 6/6 windows); `monbgCntRow` = 10 (player) / 11 (opponent) from a `LIVE_MOVE_TIMING_POLICY` entry (`liveMoveTimingPolicy.ts:59`, kind `bg-write-row`, alternatives player {10: 2, 11: 1}); `background.monbgPaletteBank` 9 / 8. `liveMoveAnimation.ts`: `case 276: return 248` in `liveMoveAnimationDuration` (`:521`, next to `case 216` `:860`), wire next to Return (`:2986`, import `:93`). No Random2 plan.
2. **Spit Up**: `liveSpitUpInputs(args)` from `prep31SpitUpModel.ts` (`spitUpSprites`, `deformState`, `spitUpTasks`, `assembleSpitUpHardwareOam`) with the counter = `request.turn` (1..3; precedent: Swallow `liveMoveAnimation.ts:754-757`, Stockpile `:1899`); the order = `carryLiveSpriteOrder` seeded with the host's live 64-slot order at activation (the L input; the host already carries it for the oam1 moves), `yDelta` from the species pic coords (`GetBattlerYDeltaFromSpriteId`), the burst-lag rows as program constants (M). `liveMoveAnimationDuration`: `case 255: return request.turn === 3 ? 109 : request.turn >= 1 && request.turn <= 2 ? 108 : null`. Feed `buffers.hardwareOam / hardwareMatrices`, `palette.*`, `resources` per age; the reducer (`spitUp.ts`) needs no change.
3. Expected dense acceptance: Spit Up 12/12 windows framebuffer-exact; Superpower all opponent windows and phase-10 player windows exact, phase-11 player windows one row (faithful timing, counted separately).

## 4. Not reached / limits

- Subpriorities (Superpower orb 38 / rocks 3 / fireball 37 / battlers 30, 40 in the accepted player window; Spit Up orbs 28) are taken from each sprite's first corpus row (K); production derives them from the template subpriority offsets.
- Spit Up: no fresh species pair beyond the prep29 SEVIPER / GOLEM alternates (the brief asked for a fresh pair for Superpower only). The free-slot order (L) is one rule fitted on 4 counter-3 windows; production should carry the live order rather than this rule.
- The Spit Up partial-snapshot rows (T) are recorded, not modelled (they never reach the hardware OAM or the framebuffer).
- Doubles, shiny battlers, contest paths (`ShouldRotScaleSpeciesBeFlipped`) not covered.

## 5. Files

| File | Role |
|---|---|
| `tools/integration/prep31SuperpowerModel.ts` | Superpower sprite programs, OAM + matrix assembler, registers / battleBg / palettes / tasks / target x2 |
| `tools/integration/prep31SuperpowerCheck.ts` / `prep31SuperpowerPixels.ts` | field check (`--order=derived` SortSprites order, `--neg=oam|palette|registers|phase`) / renderer pixel check (`--neg=oam|palette|registers`) |
| `tools/integration/prep31SpitUpModel.ts` | Spit Up programs (orbs, splats, deform, shakes, tasks), burst lag, OAM + matrix assembler |
| `tools/integration/prep31SpitUpCheck.ts` / `prep31SpitUpPixels.ts` | field check incl. SortSprites order (`--neg=oam|palette`, `--lend=slot`) / pixel check (`--neg=oam|palette`) |
| `tools/integration/prep31Probes.sh` / `prep31Run.sh` | probes (each scenario twice, cmp'd; `OUT` required) / whole reproduction (`OUT` + `REC` required, never reuses /tmp implicitly) |
| `tools/integration/fixtures/prep31/*.json` | 17 compact receipts (counts, mismatch rows; no RGB, no mGBA logs) |
| `tools/battle-lab/prep31-superpower-alt-{player-machamp-weezing,opponent-weezing-snorlax}.json` | fresh Superpower species pair |

## 6. Reproduce

```sh
OUT=/tmp/p31x/alt REC=/tmp/p31x/rec sh tools/integration/prep31Run.sh        # probes (10 scenarios x 2, cmp'd, ~1 min) + checkers + pixels + negatives (~4 min)
for f in tools/integration/fixtures/prep31/*.json; do cmp $f /tmp/p31x/rec/$(basename $f); done
OUT=/tmp/p31x/alt REC=/tmp/p31x/rec2 SKIP_PROBES=1 STAGES=superpower sh tools/integration/prep31Run.sh   # second pass, one move
VERBOSE=1 npx vite-node tools/integration/prep31SuperpowerCheck.ts <alt-r1.json>:player|opponent ...
VERBOSE=1 npx vite-node tools/integration/prep31SpitUpCheck.ts <alt-r1.json>:player|opponent:1|2|3 ...
```
Probes need the vendor libmgba-py / venv (set in the scripts; the shell prints segfaults on mGBA teardown, outputs are complete).

## 7. Papercuts

- PAPERCUT: the Spit Up dense corpora use a different schema from every other move (no `spriteOrder`, no `battlerSprites`, sprite x / y / x2 / y2 only inside the raw struct hex), so the order had to be re-derived and positions decoded from `raw` offsets 0x20..0x27 / 0x43, ~8 minutes.
- PAPERCUT: `superpowerConfigFor` / `spitUpConfigFor` hard-code display species and party[0] hp (same as prep26's harness note), ~2 minutes.
