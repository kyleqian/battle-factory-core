# Next adapters prep 30: source-derived provider prototypes for MOVE_EXTRASENSORY and MOVE_PSYWAVE (S10A, side lane)

Evidence + prototypes; **new files only** (no tracked file edited; no `src/`, adapter, ledger, `PROGRESS.md` / `ISSUES.md` change). Method = prep24 / prep26 (full per-age input model checked field by field against ROM, then fed to the **unchanged** renderer) with the prep20 hardware-OAM assembler shape. Every emulator number is a ROM frame from the accepted corpora (`tools/compare/evidence/{extrasensory,psywave}-{player,opponent}-dense-state.json.gz` + raw RGB) or an **independent direct mGBA run** (shared HTTP oracles never contacted). Base `75bdb7bff`. Census ids: Extrasensory = move 326 (census 285), Psywave = move 149 (census 284).

Windows (6 per move): accepted P / O, the prep25 alternate pair (ALAKAZAM -> GOLEM, both orientations) and one **fresh pair ESPEON -> CROBAT** (CROBAT: `gEnemyMonElevation` 6 and front `y_offset` 0, i.e. an elevated, tall target; `tools/battle-lab/prep30-{extrasensory,psywave}-alt-{player,opponent}-espeon-crobat.json`, written by `prep30Scenarios.py`). Every window is read from its own activation row (row 0 = first anim-active frame).

**Twice-identical.** `prep30Probes.sh` runs every alternate scenario twice from fresh processes (state JSON `cmp` + RGB directories `diff -r`, 8/8 identical); a complete second reproduction (`prep30Run.sh` into fresh `/tmp/p30b`, `/tmp/p30b-rec`: probes x2 again + every checker / pixel run) produced probe files byte-identical to the first run (8/8) and **all 16 receipts byte-identical** to `tools/integration/fixtures/prep30/` (`cmp`).

## 0. Results

### 0.1 Verdicts

| Move | Verdict | Field checks at the measured phase (6 windows) | Existing renderer fed with prototype inputs vs raw ROM RGB (measured phase) | Other phase value |
|---|---|---|---|---|
| **EXTRASENSORY 326** | **READY-WITH-CHANGE** (provider exact; D4 phase bit; reducer must take the distortion window from the target elevation; the opponent-target scanout split is a CPU phase, D4) | **968 rows**: hardware OAM **123136/123136** entries (962/962 rows), hardware matrices 962/962, registers 968/968, battleBg 968/968, hardware / unfaded / faded palette 968/968 each, tasks (slot, callback, data[16]) 968/968, scanline state (state, srcBuffer, dmaDest) 968/968, **both 320-word scanline buffers** 968/968, VRAM-handle timeline 968/968, clone sprite (y2, matrix) 968/968: **every row exact** | **0 px** in 4/6 windows (accepted P 161/161, accepted O 161/161, ALAKAZAM/GOLEM O 162/162, ESPEON/CROBAT O 161/161); opponent-target alternates **ALAKAZAM->GOLEM P 139/161 rows, 1433 px** and **ESPEON->CROBAT P 93/162 rows, 11551 px** = scanout-split CPU phase (§1.4); **prototype-fed receipt byte-identical to the corpus-fed receipt** (the residual is not a provider defect) | `lateLag` flipped: rows 143..158 move (16 rows x 18.3k-19.2k px, the restore BLDY staircase one row late / early) + the final row; OAM / matrices / scanline / VRAM / battleBg unaffected |
| **PSYWAVE 149** | **READY** (provider exact; D4 phase bit) — one renderer note: row-0 enemy shadow of an elevated opponent (§2.4) | **1228 rows**: hardware OAM **156416/156416** entries (1222/1222 rows), matrices 1222/1222, registers 1228/1228, palettes 1228/1228 (hardware, faded) and unfaded 1227/1228 (§2.3, a sub-row T cut, not displayed), the target-bank blend cycle 1228/1228, 12 ring sprites (slot, matrixNum, x, y, x2, y2, data[0..7], matrix) 1228/1228, tasks (fades, SetPsychicBackground_Step, RunSinAnimTimer) 1228/1228, VRAM-handle timeline 1228/1228 | **0 px** in 5/6 windows (accepted P 205/205, accepted O 205/205, GOLEM P 205/205, GOLEM O 204/204, CROBAT O 204/204); **ESPEON->CROBAT P 204/205 rows, 200 px on row 0 only** (activation row: the renderer's elevated-opponent shadow, identical with corpus-fed input) | `lateLag` flipped: rows 186..201 move (16 rows x 17.1k-18.6k px) + the final row |

Negative controls (accepted windows, receipts `*-neg-*.json`): Extrasensory clone y2 anchor +4 -> 140/161 rows (15 k px P), psychic palette perturbed -> 44/161 rows (2.1 M px), scanline window +4 -> 89/161 rows (44.7 k px); Psywave ring origin y +3 -> 114/205 rows (10.8 k px), psychic palette perturbed -> 48/205 rows (2.8 M px). Phase flipped in the field checker: Extrasensory registers 144/161, palettes 160/161, tasks 159/161 per window; Psywave registers 187/204, palettes 203/204, tasks 202/204 per window (`*-check-flip.json`).

### 0.2 Field classification

Classes: **K** constant (script rows, slots, equal in every measured window), **PD** production-derivable (species tables / battler anchors / allocator state at the known entry / asset palettes), **L** lend (sprite order), **H** history (activation-row state carried from before the move), **T** CPU phase (D4, explicit `phase` parameter), **M** measured constant whose cause is not derived.

| Field | Extrasensory | Psywave |
|---|---|---|
| hardware OAM / matrices | battlers K (row-0 attrs, target absent OAM rows 41..120), clone PD (`CloneBattlerSpriteWithBlend` attrs + double-affine corner -64; scale `256 - sin(4j) >> 1`; `y2 = (v - (v << 8) / d) / 2`, `v = 64 - 2 * y_offset(attacker)` = `SetBattlerSpriteYOffsetFromOtherYScale`; task-driven, so OAM row r uses task step r-2: BuildOamBuffer precedes RunTasks), clone slot / matrix PD (lowest free at activation: 3 / 0 in 6/6), healthbox K, order **L** | battlers K, 12 rings PD (births 42 + 6k K; slots / matrices lowest-free PD; `InitSpritePosToAnimAttacker` origin = attacker X_2 +-10, Y_PIC_OFFSET + 10; dest = target X_2 / Y_PIC_OFFSET from `front/back_pic_coordinates.h` + `enemy_mon_elevation.h`; `InitAnimLinearTranslation` 30 steps (u16 accumulators); `Sin(data6 >> 8, +-16)`, data6 += 0xD200 / 30 with the > 127 wrap; phase seed `gBattleAnimArgs[7] = 3 * (birth - 42)`; two callback steps on the birth row; affine scale `0x20 + 7 (a + 1)`, matrix `0x10000 / scale`), ring tile / bank K (allocator at activation), order **L** |
| registers | bldcnt / bldy: two `Task_FadeToBg` (C1 1, C2 120; registers = value of task step e(r-1)+1) K; setalpha 0x3f40 / 0x080c rows 42..119 K; monbg BGnCNT formula row 40 K (6/6, unlike Revenge's H row); BGnHOFS / VOFS = gBattle_BGn one row later, **and during HBlank-DMA frames = `buffer[srcBuffer(r-1)][160]`** (the last DMA'd word; 0 here) PD + H; win0 body = row 1 (H, first-body rule of prep22) | bldcnt / bldy (C1 4, C2 165) K; win0 row 1 (H) |
| battleBg | gBattle_BG1/2 = (32 - x, 32 - y) of the target rows 39..122 PD | none |
| palettes | psychic BG palette (asset `battle-anim-psychic-bg`, P) load row 20, `SetPsychicBackground_Step` rotation of colours 1..11 every 4th step, restore = activation BG bank (H) at row 141; monbg copy of the target OBJ bank row 39 (hardware immediately); `BlendMonInAndOut` on attacker OBJ colours 1..15 (blend from unfaded, y 1..12..0, RGB(27,27,0)) rows 42..65 / 68..91; hardware = faded one row later | BLUE_RING palette (`graphics/battle_anims/sprites/blue_ring.pal`, P) row 1; psychic load row 23 / rotation / restore 184; target-bank `blend_color_cycle` y = 2..12..0 step 2 every 3 rows, **arm rows [69, 93, 117, 141] M** (equal in 6/6; the `gPaletteFade.active` latency is not derived) |
| tasks | all 8 tasks (slots K: fade 0, psy 1, monbg 2, blend 0, distortion 3, clone 0, clear 0, restore 3; data PD) incl. the distortion `data[14] = max(0, yElev - 32)`, `data[15] = yElev + 32` | fades, psy, sin timer (K slots, data PD); **not modelled**: `AnimTask_BlendColorCycleLoop` and `SoundTask_LoopSEAdjustPanning_Step` data (not rendered; recipe: copy prep26 Revenge's cycle-task data shape) |
| scanline | state / srcBuffer / dmaDest from `ScanlineEffect_SetParams` / `InitHBlankDmaTransfer` (flip while state 1, state 3 -> 0) PD; buffers = **activation buffers (H: battle-intro residue, buffer 0 lines 0..159 = +-2)** + the distortion writes (init base, 24 steps, both buffers) PD | none |
| VRAM handle | label edges rows [20, 40, 122, 124, 141] K (sha constant inside, changes at every edge, 6/6) | edges [23, 184] K |
| **T (phase)** | `lateLag` (the optional lag at task row 142): measured **absent 4/6** (accepted P / O, GOLEM P, CROBAT O), present 2/6. With it: restore-fade task data[10] stays 2 on row 141 (the VBlank cuts the tState 2 -> 3 step after the VRAM copy), BG palette restore row 142 instead of 141, registers rows >= 143 one row later, body 161 instead of 160. **Plus the scanout split** (§1.4). | `lateLag` (task row 185): measured **present 4/6** (accepted P / O, GOLEM P, CROBAT P). Same structure (VRAM row 184, palette 185, registers >= 187). Sub-row: accepted O row 184 has 1 unfaded word already copied (cut inside `LoadPalette`). |

## 1. Extrasensory (`Move_EXTRASENSORY`, `src/animation/extrasensory.ts`, `battleScene.ts` EXTRASENSORY branch)

### 1.1 What the reducer / renderer read

`extrasensoryAtAge` passes through `buffers`, `palette`, `registers`, `background` (3 VRAM handles + monbg bank), `scanline` (state, srcBuffer, dmaDest, buffers), `sharedTaskData`, `clone`, `spriteOrder`, `liveCounts`; it derives the distortion / blend / clone task data itself. The renderer draws: the psychic or battle BG darkened by `registers.bldy` from `palette.hardware` banks 2-4, the monbg target with `scanlineHofs` (= `scanline.buffers[srcBuffer]` on displayed rows), the clone and the battlers from the decoded hardware OAM, `bldalpha` for the clone blend. Every one of those inputs is produced by `prep30ExtrasensoryModel.ts` (`extrasensoryModel`, `assembleExtrasensoryHardwareOam`) and checked per row (`prep30ExtrasensoryCheck.ts`).

### 1.2 Program (rows; e(r) = r - #(task lag rows <= r), task lags 122, 123 K (+142 with `lateLag`))

Fade 1 C1 = 1 (BLDCNT 0xe8 row 2, BLDY 1..16 rows 3..18, LoadMoveBg 20, 15..0 rows 22..37, destroy 38); SetPsychicBackground_Step 20..140 (data[5] = (e - 19) % 4; rotation at e = 23 + 4k up to e = 139); monbg 39 (Task_UpdateMonBg 39..122, battleBg 39..122, BGnCNT row 40, target OAM absent rows 41..120); setalpha 42..119; distortion stages 42 / 68 / 94 (steps j = 0..23 write the window, j = 24 state 3, j = 25 destroy; `stage 0: step 2, shift 5, phase 64`, `1: 2, 5, 192`, `2: 4, 4, 0`; `gSineTable[320]` reads 0 past index 319); blends 42 / 68; clone 94 (task steps j = 0..24, sprite destroyed at j = 24, OAM rows 95..119); blendoff + clearmonbg + restorebg row 120 (ClearMonBg 120..122, Fade 2 C2 = 120 in step space, restore LoadDefaultBg + VRAM at 141).

### 1.3 Mismatch classes found while building (all resolved in the model)

| Class | Cause | Resolution |
|---|---|---|
| BGnHOFS = 0 on distortion rows | the HBlank DMA leaves the last transferred word `buffer[160]` in the register | register = `buffers[srcBuffer(r-1)][160]` on frames whose VBlank found state 1 |
| clone OAM lags its task by two rows | `BattleMainCB2` runs AnimateSprites + BuildOamBuffer before RunTasks; the clone's scale / y2 are written by a task | OAM row r = task step r-2 (row 95: y2 0, matrix identity) |
| `lateLag` task data / palette split | the VBlank cuts inside the restore tState 2 -> 3 step (VRAM copied, palette not yet) | T: data[10] = 2 on row 141, palette restore row 142 |
| elevated target window | `GetBattlerYCoordWithElevation` (CROBAT: 40 - 6 = 34 -> lines 2..66) | window from the species elevation table (the accepted reducer hard-codes 8 / 48) |

### 1.4 The opponent-target pixel residual is a CPU phase (T), not an input defect

Feeding the accepted corpus rows instead of the prototype gives a byte-identical pixel receipt (`extrasensory-pixels-corpus-fed.json` == `extrasensory-pixels.json`). The residual lines lie inside the target's monbg rows near the top of the distortion window (GOLEM: lines 18..28; CROBAT: lines 3..18) on displayed distortion rows: the distortion task rewrites **both** scanline buffers during the main loop, i.e. while the current frame is being scanned out, so lines above the beam at write time still show the previous row's values. A sweep of the split line (`--split=S`: lines <= S take row r-1's buffer, S in {0, 8, ..., 36}, `extrasensory-split.json`) makes individual rows exact at S = 8..28 (row-dependent; e.g. GOLEM rows 95 / 97 / 102 exact at S = 24 / 28 / 26, CROBAT rows 49 / 54 / 72 at 8 / 16 / 20); no constant S is exact (best constant: GOLEM S = 0..16, 1433 px; CROBAT S = 16, 6931 px vs 11551 at S = 0). Player-target windows (window lines 48..112) are exact at every swept S (0..36) and the accepted opponent-target window (SHUCKLE) at every S <= 26: there the write lands before the target's visible lines. This is exactly D4's "graphics write that lands on different scanlines depending on CPU load". The accepted reducer already contains one fitted instance (`splitScanout`: opponent target, stage 2, data[1] = 5, lines <= 28 from a *generated* preceding scanline with the hard-coded window 8..72); for CROBAT that row (98) cannot be exact at any S (672 px minimum) because the generated window is wrong.

### 1.5 Pixel results per phase

| Window | measured `lateLag` | rows exact / px at the measured phase | at the other phase |
|---|---|---|---|
| accepted P (NUZLEAF -> SHUCKLE) | false | 161/161, 0 | 145/161, 298048 (rows 143..158) |
| accepted O (NUZLEAF -> SHUCKLE) | false | 161/161, 0 | 145/161, 307696 |
| ALAKAZAM -> GOLEM P | false | 139/161, 1433 (§1.4) | 123/161, 274889 |
| ALAKAZAM -> GOLEM O | true | 162/162, 0 | 145/161, 293344 |
| ESPEON -> CROBAT P | true | 93/162, 11551 (§1.4) | 76/161, 307119 |
| ESPEON -> CROBAT O | false | 161/161, 0 | 145/161, 297888 |

## 2. Psywave (`Move_PSYWAVE`, `src/animation/psywave.ts`, `battleScene.ts` PSYWAVE branch)

### 2.1 What the renderer reads

`psywaveDisplayPlan` decodes `buffers.hardwareOam` / `hardwareMatrices` (battlers by attr2, rings by `resources.tileRange` / `paletteBank`); the branch draws the psychic / battle BG from `palette.hardware` darkened by `registers.bldy`, `background.phase`, the battler art and the rings. The prototype supplies hardware OAM + matrices (`assemblePsywaveHardwareOam`), ring OAM / allocations, palettes, registers, fade task data and VRAM labels; the BlendColorCycle / sound task data, resources (K allocator) and audio come from the base config (not rendered).

### 2.2 Program

Fade 1 C1 = 4 (BLDCNT row 5, BLDY 1..16 rows 6..21, LoadMoveBg 23, destroy 41); BLUE_RING palette row 1 (hardware row 2); SetPsychicBackground_Step 23..183 (rotation at e = 26 + 4k); RunSinAnimTimer 42..140 (data[0] = 141 - r); rings born 42 + 6k (k = 0..11), 29 rows each, slots 3, 4, 5, 7, 9 then reused lowest-free; blend cycle on the target OBJ bank (arms 69 / 93 / 117 / 141, up / down / up / down to 0); Fade 2 C2 = 165 (VRAM 184, palette 184 or 185 with `lateLag`, registers e(r-1)+1).

### 2.3 Sub-row phase note

Accepted O, row 184: one unfaded word (bank 2 colour 1) is already restored while VRAM is restored and the faded / hardware banks are not: the VBlank cut lands inside `LoadPalette`'s copy. The unfaded buffer is never displayed (hardware = faded), so no pixel moves; reported, not modelled (1227/1228).

### 2.4 Row-0 shadow (renderer, not provider)

ESPEON -> CROBAT P row 0 (the activation row, corpus OAM in both feeds): 200 px / 8 lines, identical with corpus-fed input, so not an input of the provider; Extrasensory's branch (age-0 enemy shadow anchored on the opponent's OAM y) is exact on the same pair's row 0. Cause **not diagnosed** here; the likely candidate is the Psywave branch's age-0 placement for an elevated opponent (CROBAT elevation 6). Renderer follow-up, out of scope.

### 2.5 Pixel results per phase

| Window | measured `lateLag` | measured phase | other phase |
|---|---|---|---|
| accepted P (LUVDISC -> ONIX) | true | 205/205, 0 | 188/204, 293488 (rows 186..201) |
| accepted O (SWABLU -> ONIX) | true | 205/205, 0 | 188/204, 293392 |
| ALAKAZAM -> GOLEM P | true | 205/205, 0 | 188/204, 273456 |
| ALAKAZAM -> GOLEM O | false | 204/204, 0 | 188/204, 293344 |
| ESPEON -> CROBAT P | true | 204/205, 200 (row 0, §2.4) | 187/204, 295768 |
| ESPEON -> CROBAT O | false | 204/204, 0 | 188/204, 297888 |

## 3. Integration recipe (wiring; port the prototypes)

1. `src/engine/liveMoveOamAssembler.ts`: add `EXTRASENSORY_ROWS` (161, +1 with the faithful-timing late lag) and `liveExtrasensoryHardwareOamRows(input)` beside `liveReturnHardwareOamRows` (`:387`): port `assembleExtrasensoryHardwareOam` (battlers from `battlerObject`, target absent rows 41..120, clone rows 95..119 from `cloneStep(r - 96)` with the attacker species' picture `y_offset`, clone slot / matrix = lowest free at the known entry), emitting through `buildLiveHardwareOam` (`:65`) with the order from `carryLiveSpriteOrder` (`:52`) (the prototype lent the order; the clone enters at row 94 behind the attacker, subpriority + 1). Same for `PSYWAVE_ROWS` (204 + phase) / `livePsywaveHardwareOamRows` (rings: `psywaveRings` + `ringState`, origin / dest from the battler anchors `spriteCenter` + `picOffsetPoint`).
2. `src/engine/liveOamMoves.ts`: add `liveExtrasensoryInputs(args)` and `livePsywaveInputs(args)` next to `liveReturnInputs` (`:506`), same `{ duration, animationInputsAt }` shape: `paletteAt` / `registersAt` as in `:526-547` but from the prep30 programs (psychic palette asset + rotation, monbg copy, BlendMonInAndOut / blend-cycle tables, two fades, setalpha, monbg BGnCNT / HOFS incl. the DMA word), `scanline` (state / srcBuffer / dmaDest / buffers from `extrasensoryModel`; the activation buffers are history: the Factory battle intro leaves the same residue, a later scanline move in the same battle would not, see D below), `sharedTaskData`, `clone`, VRAM labels (`vram-0..5`), task slots K.
3. Reducer change (Extrasensory, READY-WITH-CHANGE): `distortionData` / `generatedScanline` / `splitScanout` (`src/animation/extrasensory.ts`) take the window from an input `targetYElevation` (`GetBattlerYCoordWithElevation`) instead of the hard-coded `8 / 48` (by code reading the reducer reports distortion data[14..15] = 8 / 72 for CROBAT where the ROM, and the checked model, have 2 / 66); the accepted fixtures keep 8 / 48 (elevation 0).
4. Faithful timing (D4, version both constants): Extrasensory `lateLag = false` (dominant 4/6 measured windows; wrong phase moves rows 143..158), scanout split S = 0 (dominant: exact for player targets and the accepted pair; opponent-target alternates keep the measured residuals 1433 / 11551 px); Psywave `lateLag = true` (dominant 4/6; wrong phase moves rows 186..201). Count both as faithful timing, not exact, outside the accepted species.

## 4. Not reached / limits

- Psywave `AnimTask_BlendColorCycleLoop` and `SoundTask_LoopSEAdjustPanning_Step` task data (not rendered), and the blend-cycle arm rows are measured (M), not derived from the palette-fade engine.
- The sprite order is lent (L) in both prototypes; the production order carry (`carryLiveSpriteOrder`) was not run against these windows.
- Scanline-buffer history: only the battle-intro residue (all six windows are the first scanline move of the battle) was measured; a battle where an earlier move left other buffer contents was not probed.
- The Extrasensory scanout split per row is not derivable (no constant S); no per-row policy is proposed beyond S = 0.
- No production code was run; integration verification is the next step.

## 5. Reproduction (workspace root; fresh directories)

```
sh tools/integration/prep30Run.sh /tmp/p30x /tmp/p30x-rec                 # probes x2 (cmp'd) + every checker / pixel run, ~7.5 min
for f in tools/integration/fixtures/prep30/*.json; do cmp $f /tmp/p30x-rec/$(basename $f); done
SKIP_PROBES=1 sh tools/integration/prep30Run.sh /tmp/p30x /tmp/p30x-rec2  # second checker pass over the same probes
# scripts: prep30Scenarios.py (writes the 4 ESPEON/CROBAT scenarios), prep30Probes.sh OUT (x2 + cmp), prep30Species.ts (decomp tables),
#          prep30ExtrasensoryModel.ts / Check.ts / Pixels.ts (--phase=flip, --feed=corpus, --split=S, --neg=oam|palette|scanline), prep30SplitSummary.py,
#          prep30PsywaveModel.ts / Check.ts / Pixels.ts (--phase=flip, --feed=corpus, --neg=oam|palette)
```
Receipts (`tools/integration/fixtures/prep30/`): `{extrasensory,psywave}-check.json`, `-check-flip.json`, `-pixels.json`, `-pixels-flip.json`, `-pixels-corpus-fed.json`, `-neg-*.json`, `extrasensory-split.json`. No RGB dumps and no mGBA logs.
