# Next adapters prep 24: source-derived provider prototypes for MOVE_MEGAHORN (224) and MOVE_RETURN (216, friendship 255) (S10A, side lane)

Evidence + prototypes; **new files only** (no tracked file edited; no `src/`, adapter, `PROGRESS.md` / `ISSUES.md` / ledger change). Method = `docs/next-adapters-prep20.md` (hardware-OAM assemblers) + `docs/next-adapters-prep23.md` (full per-age input model checked field by field, then fed to the **unchanged** renderer). Every emulator number is a ROM frame from an **independent direct mGBA run** (shared HTTP oracles never contacted); every relied-on alternate probe ran **twice from fresh processes, byte-identical (`cmp`)**; the checkers were run twice and their receipts compared (`cmp`, all 11 receipts identical).

## 0. Results

### 0.1 Verdicts

| Move | Verdict | Field checks (rows exact / rows) | Existing renderer fed with the prototype inputs vs raw ROM RGB |
|---|---|---|---|
| **Megahorn 224** | **MODEL EXACT in 6/6 windows** for every non-OAM input, given two **frame-phase (H) bits** that the source cannot supply (§1.3) | registers (21) **1061/1061**; battleBg (8) **1061/1061**; hardwarePalette (512 words) **1061/1061**; unfadedPalette **1061/1061**; live tasks (slot, callback, data[0..15]) **1061/1061**; target x2/y2 program **1061/1061**. prep20 OAM + matrices on the **new Onix alternates**: 22528/22528 entries, 176/176 rows (both orientations) | **1061/1061 rows, 0 px** (prep20 OAM + prep24 registers / palette / tasks): accepted player 177, accepted opponent 176, HERACROSS->GOLEM both orientations 177 + 177, HERACROSS->ONIX both orientations 177 + 177 |
| **Return 216, friendship 255** | **ASSEMBLER + MODEL EXACT in 6/6 windows**; one renderer gap (row 0, §2.4) | hardware OAM (128 entries / row, incl. matrix pad words) **35968/35968** per window, rows 1..281 **281/281** in all 6; hardware matrices (32) **281/281** x 6; registers **282/282** x 6; battleBg **282/282** x 6; hardwarePalette **282/282** x 6; unfadedPalette **282/282** x 6; live tasks **282/282** x 6; target x2 **282/282** x 6 | **1691/1692 rows, 0 px** in 5 windows; **1 row = 200 px** (SNORLAX -> PIDGEOT player window, **row 0**, identical with *all-corpus* inputs: renderer, not model, §2.4) |

Windows (6 per move): accepted player + accepted opponent corpora (`tools/compare/evidence/{mega-horn,return}-{player,opponent}-dense-state.json.gz`; Megahorn 177 / 176 rows, Return 282 / 282) and fresh probes, each x2 identical: Megahorn `prep18-megahorn-{alt,altopp}-heracross-golem` (HERACROSS -> GOLEM, both orientations) + **new** `tools/battle-lab/prep24-megahorn-{alt,altopp}-heracross-onix.json` (tall 64x64 ONIX target); Return `prep18-return-{alt,altopp}-snorlax-golem` + **new** `prep24-return-{alt,altopp}-snorlax-pidgeot.json` (elevated PIDGEOT target). Probe sha256 prefixes of the r1 outputs: megahorn alt/altopp golem `fc289cbb` / `404051df`, onix `14bf814e` / `4a8547b7`; return golem `25ca05f6` / `bac7d8f3`, pidgeot `71632fff` / `e21ceb76`.

Negative controls (the inputs matter; receipts `fixtures/prep24/*-neg-*.json`): Megahorn accepted player with the registers frozen at row 0: 12/177 rows exact (2.7 M px); palette frozen: 32/177; **phase bits flipped: 161/177 (accepted player) / 160/176 (opponent), 16 rows of 17.5 k px each (the final BLDY fade, rows 158..173)**. Return accepted player: registers frozen 7/282, palette frozen 10/282, OAM frozen at row 0 28/282.

### 0.2 What is source-derived, what is measured, what is lent

Legend: **S** source program (script + task / sprite callbacks, replayed), **K** known-entry constant (allocator / host, equal across all 12 windows), **A** battler anchor / art (production `liveBattlerAnchors`), **P** assets-only palette, **L** lent (sprite order), **M** measured constant (a row offset the model takes as a named constant, cause not found in the source), **H** frame-phase of the capture (not derivable).

| Class | Megahorn | Return |
|---|---|---|
| S | target x2/y2 (SlideMonToOffset / ShakeMonInPlace / SlideMonToOriginalPos overlap, exact order script -> sprites -> tasks, `(s8)(data3>>8)+data5`), Task_FadeToBg / BeginHardwarePaletteFade BLDCNT/BLDY staircases (out 0..16, in 16..0), AnimTask_StartSlidingBg BG3 scroll (+-9 / -+3 per row, `data10 &= 0xff`), Task_UpdateMonBg BGnX/Y (`spriteX - (x+x2) + 32 - spriteX`), BlendPalettes white flash (`BlendPalette`, y 10, banks BG 1-3 + monbg + both OBJ banks, selector `F_PAL_BG|ATTACKER|TARGET`, restore on y2 = 0), ShakeMon / ShakeMonInPlace / ClearMonBg / FadeToBg / SlidingBg / UpdateMonBg task data | gVerticalDip y2 programs (d steps `+dy`, 2 hold rows, d steps `-dy`, died `c+2d+3`), AnimTask_ShakeMon target x2 + task data, AnimTask_TraceMonBlended clones (`CloneBattlerSpriteWithBlend`: attacker attr at creation, blend bit, priority 2, lowest-free sprite id, 6 rows), gBasicHitSplat position (`target X_2 / Y_PIC_OFFSET + offset`, x negated for an opponent attacker, y never), affine matrix (372 for anim 2, identity for anim 0, matrix id lowest-free), lowest-free sprite slots and task slots in script order, BeginNormalPaletteFade BG darkening (y 2/4/6 and 4/2/0 every 2nd row), monbg BG1/BG2 cnt + hofs/vofs |
| K | activation registers + palette (row 0), healthbox 9-entry block, dummy entry, slots, tile / bank / matrix ids, the loadspritegfx / monbg prologue rows (horn 2, impact 5, monbg 7, FadeToBg 10) | activation registers + palette (row 0), body `win0h/win0v` (0 from row 1), healthbox block, slots, impact tile / bank, monbg row 4, ClearMonBg row 277, event schedule (`src/animation/return.ts:488` `PROGRAMS.strongest`: dips, impacts, shakes, traces, simple blends) |
| A / P | target pic anchor (the hit splat), target idle rest `(x2, y2)`; horn / impact / drill palettes from `mega-horn-horn-hit-2.json`, `battle-anim-hitsplat.json`, `horn-drill.json` (BGR555 = `c >> 3`) | target pic anchor, idle rest; impact palette |
| L | sprite order (as prep20) | sprite order |
| M | hit-splat life 9 rows; the restorebg fade holds `y = 1` for 3 rows and rows 137-138 run **no** slot >= 1 task (BG3 slide and FadeToBg stall, §1.2) | hit-splat life 10 rows (anim 2) / 9 (anim 0); trace clone is in the OAM from `first + 1` (created after the OAM build of its frame); hit-splat visible with the matrix for exactly its sprite lifetime |
| **H** | **(a)** row of the monbg `BGnCNT` write: 7 (altP, altO, onP) or 8 (accP, accO, onO); with row 7 the init also writes `hofs/vofs` of the **same** row; **(b)** the final restorebg fade ends **one row late** in 5 / 6 windows (accepted opponent early): rows 158..174 vs 157..173 | `BGnCNT` row 5 in 5 / 6 windows, **4** in the SNORLAX -> GOLEM player alternate |

### 0.3 Mismatch classes found while building (all resolved unless listed)

| Class | Move | Cause | Resolution |
|---|---|---|---|
| tasks at rows 137-138 and BG3 scroll frozen 2 rows | Megahorn | `Task_ClearMonBg` ResetBattleAnimBg frames: the slot 2 FadeToBg and slot 3 SlidingBg do not step; `y = 1` is held 3 rows | M: `eff(r) = r - 2` for `r >= CLEAR + 3` in the BG3 scroll; fade-3 start stall 2 |
| `unfadedPalette` one row before the faded one | both | `LoadCompressedPalette` writes unfaded now, the faded buffer shows one row later | unfaded event at row `e - 1` |
| bg3cnt restore at 157 in every window | Megahorn | `UpdateAnimBg3ScreenSize(TRUE)` in the slide task's destroy frame, visible one row later | `slideEnd + 1` |
| trace clone present in the OAM one row early | Return | the clone is created after `BuildOamBuffer` of its frame | first OAM state `first + 1` |
| splat x off by 20 for an opponent attacker | Return | `InitSpritePosToAnimTarget`: x offset negated for an opponent attacker, y not | `xSign` |
| BG1/2 X/Y not reset at the end | Return | UpdateMonBg is destroyed at `CLEAR + 3` and the scroll resets that row | reset at `CLEAR + 3` |

## 1. Megahorn (`Move_MEGAHORN`, `battle_anim_scripts.s:6109-6145`)

### 1.1 Chain of script rows (all derived from delays / waits; each checked 6/6)

`FADE1 = 10` (Task_FadeToBg) -> fade-out BLDCNT 0xe8 at 11, BLDY 1..16 at rows 12..27, tState 2 at 28 -> `LoadMoveBg` row `L1 = 29` (BG3CNT 14859, slide task, unfaded drill palette; faded palette at 30) -> fade-in BLDY 15..0 at rows 31..46, BLDCNT 0 at 47 -> `SHAKE = L1 + 19 = 48` (setalpha 12,8: BLDCNT 0x3f40 / BLDALPHA 2060; ShakeMon x15) -> `SLIDE_A = 48 + 28 + 1 + 12 = 89` -> horn `+5 = 94` -> hit splat + target slide `+6 = 100` -> `SHAKE_IN = 100 + 9 + 1 = 110` (+ the white flash at 110, visible 111, restored 116) -> `BACK_A = +12 = 122`, `BACK_T = +5 = 127` -> `CLEAR = 127 + 7 + 1 = 135` (blendoff, restorebg) -> fade-out 136.., BG3 slide destroyed 156, bg3cnt restored 157, fade-in -> BLDCNT 0 at 175 (174).

### 1.2 Field table (what `megaHornDisplayPlan` + the renderer read per age)

| Renderer read (`battleScene.ts:25358-25418`) | Provider |
|---|---|
| `palette.hardware` banks 2-4 (BG), horn / impact / battler OBJ banks, monbg bank | `megahornModel().hardwarePalette` |
| `registers.bg3cnt == 14859` (drill active), `bg3hofs/vofs`, `bldy` (darken of the field banks) | model registers |
| `registers.bg1/bg2 hofs/vofs` (monbg target draw), `view.monbg.active` (age) | model registers |
| `hardwareOam` / `hardwareMatrices` | prep20 assembler (unchanged) |
| `liveTasks`, `battleBg`, `unfadedPalette` | not read by this branch; produced and checked anyway (the live `animationInputs` carry them) |

### 1.3 The two H bits

`monbgCntRow` and `endLate` change the **pixels** (negative control above: 16 rows, 17.5 k px each when `endLate` is wrong). They are phases of the capture against VBlank (as prep23 R1 / P1), not of the script. In the 6 windows: `(8, late) accP`, `(8, early) accO`, `(7, late) altP`, `(7, late) altO`, `(7, late) onP`, `(8, late) onO`. Production recipe: the live renderer has no VBlank phase either, so pick the dominant constants (`endLate = true`, `monbgCntRow = 8` -- the accepted-corpus values; the existing oam1 providers hard-code the same kind of constant, `liveOamMoves.ts:127 / 232 / 322`) and accept the phase residual (<= 1 row of the fade, `monbgCntRow` only moves one register row) or gate on a measured phase. This is a documented, **named** non-derivable class, not an unexplained one.

### 1.4 Integration recipe (oam1 style, no src change made here)

1. New `src/engine/liveMegahornInputs.ts` next to `liveOamMoves.ts`: port `tools/integration/prep24MegahornModel.ts` 1:1 as `liveMegahornInputs(args)` returning `{ duration, animationInputsAt(age) }` exactly like `liveWillOWispInputs` (`liveOamMoves.ts:89-148`: `args.palettes.hardware` composite + asset palettes loaded on the source rows + `registersAt(age)` from `S0_REGISTERS`, win0h/win0v = 0 from row 1 (`:125`) and the monbg block). Replace the model's `palette0 / unfaded0 / registers0` reads by `args.palettes` and the production S0 / activation block; target idle rest `(x2, y2)` = `liveBattlerAnchors().frontIdleRest`; target pic anchor = `battlePositionCenter` / `spriteCenter` as in the Wisp provider.
2. Hardware OAM + matrices: port `prep20MegahornAssembler.ts` into `liveMoveOamAssembler.ts` (it already exports `carryLiveSpriteOrder :52` and the walk of the lent order; `known` fields = the allocator values already read for Wisp: `prepareLiveMoveSpriteAllocator`, `liveMoveSpriteAllocator.ts:75`).
3. Wire in `liveMoveAnimation.ts` in the oam1 block next to Will-O-Wisp / Pursuit / Fury Cutter (`:2565-2625`, import `:84`, duration rows `liveMoveAnimationDuration :464`, a `case` per move id 224 -> 177 / 176 rows, side-keyed as `megaHorn.ts:62` `cleanup = player ? 176 : 175`), with the same gates (first / known-entry body: the corpora follow a Tackle, `bg2cnt 0x5e02`, **not** S0 -- the activation block must be read from the live host registers, not `S0_REGISTERS`); decline shiny battlers as the Wisp block does (`:2567`).
4. `animationInputsAt(age)` feeds `createSceneOnMovePresentation({ ... animationInputs })` (`sceneOnPresentation.ts` Megahorn config, `battleScene.ts:25358` branch unchanged). Expected dense acceptance: 177 / 176 rows x 2 orientations + alternates, framebuffer 0 px (this note: 1061/1061).

## 2. Return, friendship 255 (`ReturnStrongest`, `battle_anim_scripts.s:8991-9060`)

### 2.1 The model

`prep24ReturnAssembler.ts` (OAM + matrices) and `prep24ReturnModel.ts` (registers / battleBg / palette / tasks); events from `src/animation/return.ts` `PROGRAMS.strongest` (`:488`): 9 vertical dips, 13 hit splats (anim 2 x9 then anim 0 x4), 9 target shakes (the last 24 reps), 7 trace tasks, simple blends at 11 / 264, monbg 4 -> clear 277. The assembler walks the lent order of row-1: attacker (slot 6, `y2` = sum of the dip programs, idle `y2` subtracted from the attr), target (monbg: absent from state `monbgBirth + 1` to `clearMonbg - 1`, then art attr minus the idle rest), traces (attacker attr at its creation row, `|0x0400`, priority 2), splats (`0x0100 | 0x0400 | y-16`, `0x8000 | matrix << 9 | x-16`, tile / bank K, priority 2), dummy entries, pad halfword = hardware matrix parameter. Slots / matrix ids are lowest-free over the creation order (`returnAllocations`): dips slot 3, first splat 4, traces 5 and 7 (6 = battler), second concurrent splat matrix 3.

### 2.2 Check numbers

`fixtures/prep24/return-model-check.json`: windows accepted player / opponent, SNORLAX->GOLEM both orientations, SNORLAX->PIDGEOT both orientations; each 35968/35968 OAM entries, rows 1..281 exact 281/281, matrices 281/281, and 282/282 for registers, battleBg, hardwarePalette, unfadedPalette, tasks, target x2.

### 2.3 Pixels

`fixtures/prep24/return-pixels.json`: accepted 282/282 + 282/282, GOLEM alternates 282/282 + 282/282, PIDGEOT player 281/282 (row 0), PIDGEOT opponent 282/282.

### 2.4 The single residual: renderer, not model

SNORLAX (player) -> PIDGEOT (opponent target), **row 0**, 200 px: `prep24ReturnRow0Control.ts` feeds that row with **only** corpus inputs (`returnConfigFor`) and still gets 200 px. The ROM draws the age-0 ground shadow of the elevated opponent target; the RETURN branch draws `drawSourceOpponentEnemyShadow` only for an opponent **attacker** (`battleScene.ts:25766-25770`, `moveState.age === 0 && attacker.side === "opponent"`). The same class as prep20 0.2.5 (Will-O-Wisp alternate opponent, 180 px). Fix belongs to the integration lane's renderer pass (draw the shadow for an elevated opponent *target* at age 0) or to gating Return at row 0 with the host's own pre-activation frame.

### 2.5 Integration recipe

Same shape as 1.4: `liveReturnInputs` in `liveOamMoves.ts` style (port the two prototypes; `src/animation/return.ts` already owns the branch selector and the program table, so only the buffers / palette / registers are new), duration 282 rows both sides, `friendship` request plumbing is **not** needed for the Factory (always 255 -> strongest; `returnAtAge` selects the branch), gates as for Megahorn (first / known-entry body, non-shiny). `ReturnLiveInputs.taskSlots / motionSlots / impactAllocations / traceAllocations` (`return.ts:83-86`) = `returnAllocations()` (slots) and the task allocation in `returnModel` (`tasks[].slot`).

## 3. Not reached / limits

- Not measured: Return weak / medium / strong branches (Factory-unreachable); a second Return alternate with a different attacker size (both alternates use SNORLAX); doubles; a later body (both moves were measured as the first and only body after a Tackle, like the prep20 corpora); Megahorn with an attacker whose idle rest is non-zero (all 12 windows have zero attacker rest; the target idle rest is non-zero for ONIX / GOLEM and handled).
- The sprite order is lent (prep20 G1). The healthbox block / dummy entry are measured scene constants (prep20).
- The Return event schedule is taken from the repo's own `return.ts` program table (itself source-derived and ROM-confirmed there); this note re-checks it indirectly through 13 impact / 9 dip / 7 trace / 9 shake events x 6 windows but does not re-derive it from the script text. Megahorn's chain (1.1) **is** derived from the script waits.
- The H bits (1.3) are not derivable; no phase probe was attempted (needs VCOUNT at the capture instant).
- No `src/` change, no adapter wiring, no ledger edit.

## 4. Files

| File | Role |
|---|---|
| `tools/integration/prep24MegahornModel.ts` | Megahorn model: `megahornModel(known) -> rows[{registers, battleBg, hardwarePalette, unfadedPalette, tasks, target}]` |
| `tools/integration/prep24MegahornCheck.ts` / `prep24MegahornPixels.ts` | field-by-field check; renderer pixel check (+ `--neg=registers|palette|phase`) |
| `tools/integration/prep24ReturnAssembler.ts` / `prep24ReturnModel.ts` | Return OAM + matrices; Return registers / battleBg / palette / tasks |
| `tools/integration/prep24ReturnCheck.ts` / `prep24ReturnPixels.ts` / `prep24ReturnRow0Control.ts` | checks, pixels (+ `--neg=registers|palette|oam`), the row-0 control |
| `tools/integration/prep24Probes.sh` / `prep24Run.sh` | 16 probe processes (8 scenarios x 2, cmp'd) / the whole reproduction |
| `tools/integration/fixtures/prep24/*.json` | compact receipts (counts, mismatch rows; no RGB, no mGBA logs) |
| `tools/battle-lab/prep24-{megahorn-alt,megahorn-altopp}-heracross-onix.json`, `prep24-{return-alt,return-altopp}-snorlax-pidgeot.json` | new alternates |

## 5. Reproduce

```sh
sh tools/integration/prep24Run.sh                                   # probes (~1 min) + checkers (~4 min); receipts -> tools/integration/fixtures/prep24/
REC=/tmp/rec2 SKIP_PROBES=1 sh tools/integration/prep24Run.sh       # second checker pass; cmp the receipts
# per piece (probes in /tmp/p24/alt):
npx vite-node tools/integration/prep24MegahornCheck.ts <alt.json>:player|opponent ... [--out=out.json]
npx vite-node tools/integration/prep24MegahornPixels.ts <alt.json>:<rgbDir>:player|opponent:ATT,TGT ... [--neg=registers|palette|phase]
npx vite-node tools/integration/prep24ReturnCheck.ts <alt.json>:player|opponent ... ; prep24ReturnPixels.ts <alt.json>:<rgbDir>:player|opponent ...
```
Alternates need `PYTHONPATH=../../vendor/libmgba-py` and the vendor venv (set in the scripts; the shell prints segfaults on exit: mGBA teardown, outputs are complete).

## 6. Papercuts

- `npx vite-node` does not satisfy `process.argv[1] === import.meta.filename` main-guards (the CLI silently printed nothing), use an env guard, ~5 min.
- macOS `sed -i` needs `-i ''`; my first two scripted edits silently did nothing, ~3 min.
- `verifyReturnReducer.returnConfigFor` hard-codes DRAGONAIR / ONIX species names (`returnActualCore.ts namedConfig` throws on others), so alternates need a species map in the pixel script, ~5 min.
- `megaHornInputsFor` hard-codes SEAKING / ONIX, the alternate pixel runs need the species override that prep20 already used, ~5 min.
