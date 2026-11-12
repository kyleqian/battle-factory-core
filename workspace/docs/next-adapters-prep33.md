# Next adapters prep 33: source-derived provider prototypes for MOVE_SHOCK_WAVE (351) and MOVE_SKILL_SWAP (285) (S10A, side lane)

Evidence + prototypes; **new files only** (no tracked file edited; no `src/`, adapter, `PROGRESS.md` / `ISSUES.md` / ledger change). Method = prep24 / prep26 / prep30 / prep31 (per-age input model checked field by field against ROM rows, then fed to the **unchanged** renderer). Every emulator number is a ROM frame from the accepted corpora (`tools/compare/evidence/{shock-wave,skill-swap}-{player,opponent}-dense-state.json.gz` + raw RGB tarballs) or an **independent direct mGBA run** (the shared HTTP oracles were never contacted). Base `21540d7c2` (src tree `efec2d66`).

Reproducibility: all 8 probe scenarios (2 prep22 alternates + 2 fresh prep33 scenarios per move) ran **twice from fresh processes; state JSON is `cmp`-identical and the RGB dump directories are `diff -rq`-identical** (`prep33Probes.sh` checks both). A second, independent pass (`prep33Run.sh`, fresh `OUT` + `REC`) re-probed all 8 scenarios twice more: the state JSON is `cmp`-identical across both passes, so 4 fresh processes per scenario agree, and all 9 receipts in `tools/integration/fixtures/prep33/` are `cmp`-identical to that pass. The affine tables for the orbs are `sAffineAnims_SkillSwapOrb` 0..3 (`battle_anim_psychic.c:305-348`), not modelled (§2.3).

## 0. Results

### 0.1 Verdicts

| Move | Verdict | Field checks (every row of every window) | Unchanged renderer, prototype inputs vs raw ROM RGB |
|---|---|---|---|
| **Shock Wave 351** | **READY-WITH-CHANGE**: every input the reducer and renderer read is source-derived. The one change is the reducer timing (`shockWaveTimingFor` hard-codes the accepted rows, `shockWave.ts:156-158`, `:334-336`), now derived from geometry. **No T field.** | 6 windows (1591 rows): cursor, animArgs, all 7 task records, every owned sprite (slot, template, callback, attr, x, y, x2, y2, anim state, subpriority, flags, matrix, data[0..7]), battler OAM + matrix, **painter order**, matrix bitmap, resource lifetimes and allocation, every palette bank the renderer reads (hardware / faded / unfaded), BG values, monbg `BGnCNT` / `HOFS` / `VOFS`, `bldcnt` / `bldalpha`, the other registers, cleanup counters and the gRng2 echo all match on **every row**, given the timing change | **1590/1592 rows, 0 px**. Accepted P 267/267, accepted O 263/263, prep22 MANECTRIC->WAILMER P 266/266 and O 264/264, prep33 RAICHU->WEEZING P 266/267 and WEEZING->SNORLAX O 263/264. The 2 misses are **row 0 only** (195 px): the 32x8 enemy shadow at (160,65), which is visible in the pre-activation hardware OAM and hidden from row 1 by `gAnimScriptActive`. The renderer does not draw it (§1.4). |
| **Skill Swap 285** | **NEEDS-PROVIDER (partial)**: geometry, slots, the orb program, task records, orb + battler hardware-OAM words, `bldcnt` / `bldy`, the body length and the ability outcome are derived (one **T** bit, the lag row 176). Not reached: the per-row hardware-OAM **order**, the orb **affine matrices**, the **palette** program (psychic BG bank 2 rotation, `BlendMonInAndOut` white blends). | 6 windows (1173 rows): cursor, both `AnimTask_SkillSwap_Step` records (data[0..15]), blend task slots, all 24 orbs (slot, matrixNum, x, y, x2, y2, data[0..7]), **orb hardware-OAM content** (attr0 / attr1 position + affine + matrixNum, attr2, as a set per row), battler OAM words, `bldcnt` / `bldy`, first-inactive row: **every row exact** | not run: the renderer decodes `buffers.hardwareOam / hardwareMatrices` and `palette.hardware` as a whole. Without an order, matrix and palette model, a pixel run would only replay lent buffers, so it would prove nothing. |

Windows. Shock Wave: accepted `shock-wave-{player,opponent}` (FLAAFFY <-> CORSOLA), prep22 alternates `prep22-shock-wave-alt-{player,opponent}-manectric-wailmer`, and the **fresh prep33 pair** `prep33-shock-wave-alt-player-raichu-weezing` (elevated target) and `prep33-shock-wave-alt-opponent-weezing-snorlax` (elevated attacker, tall player target). Skill Swap: accepted `skill-swap-{player,opponent}` (GIRAFARIG <-> SHUCKLE), prep22 `prep22-skill-swap-alt-{player,opponent}-alakazam-golem`, and the **fresh pair** `prep33-skill-swap-alt-player-espeon-weezing` and `prep33-skill-swap-alt-opponent-weezing-snorlax`. Each window starts at the scenario's own activation frame (probe row 0).

### 0.2 The Shock Wave timing (why the accepted reducer is not live-ready as is)

Measured ROM rows vs the source derivation `prep33ShockWaveModel.ts shockWaveTiming33` (progressing-bolt destroy row from the attacker `Y_PIC_OFFSET`; lightning count from the target `BATTLER_COORD_Y`):

| Window | attacker pic y | lightning (count) | ShakeMon | clearmonbg | first inactive | hard-coded table |
|---|---|---|---|---|---|---|
| accepted P FLAAFFY -> CORSOLA | 97 | 159 (3) | 195 | 262 | 266 | 159 / 195 / 262 / 266 = |
| accepted O FLAAFFY -> CORSOLA | 50 | 153 (4) | 191 | 258 | 262 | 153 / 191 / 258 / 262 = |
| prep22 P MANECTRIC -> WAILMER | 92 | **158** (3) | 194 | 261 | **265** | 266 (wrong) |
| prep22 O MANECTRIC -> WAILMER | 44 | **154** (4) | 192 | 259 | **263** | 262 (wrong) |
| prep33 P RAICHU -> WEEZING | 96 | 159 (3) | 195 | 262 | 266 | = |
| prep33 O WEEZING -> SNORLAX | 36 | **154** (4) | 192 | 259 | **263** | 262 (wrong) |

The derivation equals the ROM in **6/6** windows. Column 1 of the progressing bolt walks up from the attacker's pic y in steps of 8 (`battle_anim_electric.c:1153-1265`), so the destroy row moves by one for every 8 px of pic y. The lightning count is `((Y + 32) - first) / 32 + 1` with `first <= 16` (`:1278-1325`), so ShakeMon = lightning + 2N + 30. `BATTLER_COORD_Y` is the plain `sBattlerCoords` y with **no elevation**: ROM lightning `data[15]` = 72 for an elevated WEEZING target; `liveBattlerAnchors().battlePositionCenter` (`liveMoveAnimation.ts:461`) already has exactly this value. With the unchanged reducer, 3/4 alternates fail from the lightning row on: tasks 181-186 of 264-266 rows, pixels 206/264 rows (87635 px) on WEEZING->SNORLAX (`shockwave-check-unchanged.json`, `shockwave-neg-unchanged-reducer.json`).

### 0.3 Skill Swap: ability outcome (E-OUT), body length (T)

- **Ability outcome: no input.** `BattleScript_EffectSkillSwap` (`data/battle_scripts_1.s:2497-2507`) is `accuracycheck` -> `tryswapabilities BattleScript_ButItFailed` -> `attackanimation`. On failure (Wonder Guard, or either ability `ABILITY_NONE`) `Cmd_tryswapabilities` jumps past the animation, so the animation **only plays after a successful swap**. `Move_SKILL_SWAP` (`battle_anim_scripts.s:3830-3841`) has **no branch**: two `AnimTask_SkillSwap` legs plus `BlendMonInAndOut`, inside `Set/UnsetPsychicBackground`. The reducer passes `abilityOutcome` straight through to `state.outcome` (`skillSwap.ts:624`), and the SKILL_SWAP renderer branch (`battleScene.ts:24592-24678`) never reads it. **Production rule:** the adapter fires on the `attackanimation` event of the success path; the TS engine already gates it in `battleScriptTryswapabilitiesOpcode.ts` (the failure jump). `abilityOutcome` is a neutral pass-through (the post-swap `gBattleMons[].ability` bytes if wanted, never rendered). This window set covers 6/6 success bodies; there is no failure body to probe because the failure path has no animation.
- **Body 194 / 195 rows = T (CPU phase), not the side.** The extra row is a lag frame at **row 176**, seen as a gRng2 stall (`animationRng` repeats). It occurs in **4/6** windows: all 3 player-attacker windows and the fresh **opponent** WEEZING->SNORLAX. The accepted and ALAKAZAM opponent windows have none. With the bit, first inactive is 195; without it, 194. The cursor, `bldcnt` / `bldy` (the restore fade counts executed frames) and first-inactive checks are exact in 6/6 with the measured bit. Flipping it (`--neg=lag`) fails cursor 1 row, first-inactive 2 rows and `bldy` 17 rows per window. Policy: as Psywave (`liveMoveTimingPolicy.ts`, D4 dominant phase): `firstInactiveAge` 195 with the lag (measured 4 of 6), alternative 194.

### 0.4 Negative controls (receipts `fixtures/prep33/*-neg-*.json`)

| Move | Perturbation | Field check | Pixels |
|---|---|---|---|
| Shock Wave | attacker pic x + 1 (`--neg=anchor`) | tasks / sprites 140/267 (accepted P), 142/264 (WEEZING O) | 141/267 rows (25238 px), 143/264 (27743 px) |
| Shock Wave | lightning palette word ^ 0x0421 (`palette`) | renderer banks 11/267, 11/264 | 258/267 (4070 px), 252/264 (4870 px) |
| Shock Wave | lent sSpriteOrder reversed (`order`) | painter order 0/267, 0/264 | 267/267, 263/264 (pixel-neutral in these windows: no equal-priority overlap whose order matters) |
| Shock Wave | **unchanged reducer** (hard-coded timing) | WEEZING O: cursor 255, tasks 181, sprites 228 of 264 | 206/264 (87635 px) |
| Skill Swap | attacker pic x + 1 (`anchor`) | skill tasks 82-83, orbs 83-84, hw OAM 101-111 of 195-196 | -- |
| Skill Swap | T lag bit flipped (`lag`) | cursor 194-195, first inactive 194, `bldy` 178-179 of 195-196 | -- |

### 0.5 Field classes (prep24 / prep26 / prep31 classes; **T** = CPU phase)

**S** source program, **K** known-entry constant (equal in all 6 windows), **A** battler anchor / species table, **P** asset palette, **L** lent by the host, **M** measured constant, **H** history, **T** CPU phase.

| Class | Shock Wave | Skill Swap |
|---|---|---|
| S | timing (§0.2); reducer programs (charging particles, orb affine, progressing bolts, lightning, ShakeMon, blends, monbg); sprite slots by lowest-free (`shockWaveSpriteSlots`: palette-blend 3 at row 16, orb 19 at row 45); orb matrix = lowest free bit of the bitmap (0); monbg `setupX/Y = 32 - sprite x/y` (`Task_UpdateMonBg`) | the 24-orb program (12 per leg, 7-row cadence from rows 42 / 60, 16-row life, `InitAnimLinearTranslation` + `Sin(phase, +-10)`), orb (slot, matrix) by **chronological** lowest-free over the interleaved legs, hardware-OAM rule `hw[row] = build(state row - 1)` with task-created orbs one row later (born after `BuildOamBuffer`), `Task_FadeToBg` C1 = 4 / C2 = 156 (`skillSwapBlend33`, the merged Psywave `fadeY`) |
| K | battler slots 6 / 8, subpriorities 30 / 40, battler attr2 2417 / 6617; task slots `{charging 0, monbg 1, progressing 2, lightning 0, shake 0, blend 2, clear 0}`; occupied `[0,1,2,6,8,60..63]`, matrix bitmap 6; resource allocator (tile slot / range / palette slot: electricOrbs 6 [305,4] 7, circleOfLight 7 [537,64] 8, spark 10 [309,24] 9, lightning 11 [601,80] 10); attr2 words; healthbox block; monbg `BGnCNT` 24066 / 23554, banks 9 / 8 | `(slot, matrix)` pairs `(3,0) (4,3) (5,4) (7,5) (9,6)`; task slots `{fade 0, psychic 1, targetOrbs 0, targetBlend 2, loop 3, attackerOrbs 4, attackerBlend 5, restore 0}`; orb attr2 31025 (tile 305, bank 7); battler attr2 2417 / 6617 |
| A | attacker / target `X_2` / `Y_PIC_OFFSET`, target `BATTLER_COORD_Y` (plain), battler sprite centre (`spriteCenter`), orb attr position; enemy-shadow OAM for an elevated opponent (order key only) | trajectory bounds = `GetBattlerSpriteCoordAttr` LEFT / RIGHT / TOP / BOTTOM = `X_2 -+ w/2`, `Y_PIC_OFFSET -+ h/2` from the species pic `.size` (`battle_anim_mons.c:2273-2280`; production `liveBattlerCoordAttrs`, `liveMoveAnimation.ts:474`); battler OAM words |
| P | `shock-wave.json` asset palettes (electricOrbs, circleOfLight, spark, lightning) == ROM banks 23..26 from their load rows | (orb palette not checked here) |
| L | the activation 64-slot `sSpriteOrder` (painter order; exact on every row when lent, a reversal breaks the field) | not reached (hardware OAM order) |
| H | activation registers / BG scroll (first body: `win0h 240, win0v 161`, scroll 0) | -- |
| T | **none** (6/6 windows on one rule) | **lag row 176** (§0.3) |
| not read | VRAM handles (`initialVram` / `setupVram` / `clearingVram` / `clearVram`: the SHOCK_WAVE branch never reads them, so labels are passed); BG bank 1 (the reducer's simple blend writes it; the branch draws the static BG from banks 2 / 3 / 4, and the composite leaves it 0); resource / monbg banks before their load rows; `win0h/win0v` (ROM zeroes them at row 1, the reducer keeps the activation value, the branch never reads them); audio | `abilityOutcome`, audio, VRAM handles, shared task data, live counts |

## 1. Shock Wave (`Move_SHOCK_WAVE`, `src/animation/shockWave.ts`, renderer `battleScene.ts:24283-24433`)

### 1.1 What is new vs prep22

prep22 classed Shock Wave NEEDS-PROVIDER because `ShockWaveLiveInputs` carries VRAM snapshots, register blocks and an allocator. That was a reading of the input type. Measured here, the reducer is a **source model** (it builds its own sprites, OAM words, painter order, tasks and palettes from a small input), and the renderer reads no VRAM. So the provider is a **builder** in the Water Spout style, plus the timing change.

### 1.2 Input builder (`prep33ShockWaveModel.ts shockWaveInputs33`)

From production-available facts only: species ids + sides (A via `prep30Species.ts`; production `liveBattlerAnchors`), `SW_K` constants (K), `assetPalette` (P), `composeLivePalettes` (`liveMovePaletteComposite.ts:19`) for the activation palette, and the host's activation `sSpriteOrder` / registers / BG scroll (L / H). No capture row is used except as that host snapshot (`--neg=order` shows the order is load-bearing for the field).

### 1.3 The proposed src change (`prep33ShockWavePatch.ts`, applied to a runtime copy; vite alias `prep33.vite.config.ts`)

1. `shockWaveTimingFor(input)` (`shockWave.ts:156`): when the input has the anchors, it derives `lightningStart = progressing destroy row + 1`, `shakeStart = lightningStart + 2N + 30`, `clearStart = shakeStart + 67`, `cleanupAge = clearStart + 4`. The side tables stay as the fallback for side-only callers (`shockWaveFirstInactiveAge`).
2. `shockWaveSourceAtAge(age, lightningStart, shakeStart?)` (`:334-336`): it takes the derived `shakeStart` instead of `lightningStart === 153 ? 38 : 36`. The call site is `:637`.
Nothing else changes: the reducer's progressing / lightning / shake / palette / cleanup code already reads the timing object and the geometry.

### 1.4 Pixels

`fixtures/prep33/shockwave-check-patched-pixels.json`: 1590/1592 rows at 0 px through `render(state)`. Row 0 of the two elevated-opponent windows differs by exactly the enemy shadow (32x8 at x 160..191, y 65..72). The shadow is in the hardware OAM of the frame before activation, and `SpriteCB_EnemyShadow` hides it once `gAnimScriptActive` is set (row 1 on). Row 0 is the hand-off frame: the live adapter starts after the field renderer, which owns the shadow.

## 2. Skill Swap (`Move_SKILL_SWAP`, `src/animation/skillSwap.ts`, renderer `battleScene.ts:24592`)

### 2.1 What the branch reads

`skillSwapDisplayPlan` (`skillSwap.ts:292`) decodes `buffers.hardwareOam` (128 entries, OAM index = draw order) and `buffers.hardwareMatrices`. The branch also reads `palette.hardware` (BG banks 2 / 3 / 4 or the psychic BG bank 2, battler and orb OBJ banks), `registers.bldy` (darken), `background.phase` (reducer, age-based), `resources.tileRange / paletteBank` and `fieldProfile`. So, as Psywave / Extrasensory, the provider must supply per-age **buffers** (an `animationInputsAt(age)`), not a static config.

### 2.2 Derived and checked (`prep33SkillSwapCheck.ts`, `fixtures/prep33/skillswap-check.json`)

Every row of 6 windows: cursor (via `firstInactiveAge` from the T bit), both orb-leg task records (data[0..15]: timer, spawned count, trajectory endpoints = derived bounds), blend task slots, all orbs (slot, matrixNum, x, y, x2, y2, data[0..7]), the orb hardware-OAM words as a set per row (`[(y + y2 - 8) & 0xff | affine, (x + x2 - 8) & 0x1ff | matrixNum << 9 | 16x16, 31025]`, present from spawn + 2), battler OAM words (body rows), `bldcnt` / `bldy`.

### 2.3 Not reached (the remaining provider work)

- **Hardware-OAM order** (OAM index of every entry, per row). It needs the SortSprites order of battlers + orbs + healthboxes, as `carryLiveSpriteOrder` / `buildLiveHardwareOam` (`liveMoveOamAssembler.ts`) does for Psywave. It was not attempted.
- **Orb affine matrices**: `affineAnimation = (ordinal + 1) & 3` of the orb template's affine table. Measured values seen: `[303,0,0,303]` and `[341,0,0,341]` at row 61. Not modelled.
- **Palette program**: the psychic BG load + bank 2 rotation (`SetPsychicBackground_Step`, the same subroutine as Psywave: load row 23, restore = `UnsetPsychicBackground`), and the two `AnimTask_BlendMonInAndOut(battler, RGB_WHITE, 12, 3, 1)` passes on the target (row 42) and attacker (row 60) OBJ banks. Not modelled. The Psywave port (`livePsywaveInputs.ts`) has the psychic part with Psywave constants; the restore row here is 156 + 19 = 175, which matches the reducer's `backgroundPhase` "restored" at 175.
- So no pixel check yet (§0.1).

## 3. Integration recipes (no src change made here)

1. **Shock Wave (READY-WITH-CHANGE).**
   - (a) Apply §1.3 to `src/animation/shockWave.ts` (`:156`, `:334-336`, `:637`). Update `tests/animation/shockWaveReducer.test.ts` / `tools/compare/verifyShockWaveReducer.ts` only if they call `shockWaveTimingFor` with a side-only object (they do, `verifyShockWaveReducer.ts:72`; the fallback keeps them green, and `:189` / `:192` pass the full input, whose derived timing equals the table for the accepted corpora).
   - (b) Add `liveShockWaveInputs` (a section of `liveOamMoves.ts` or `src/engine/liveShockWaveInputs.ts`) ported 1:1 from `shockWaveInputs33`: anchors from `liveBattlerAnchors` (`picOffsetPoint`, `spriteCenter`, `battlePositionCenter`), K constants `SW_K`, palettes from `composeLivePalettes` (`liveMovePaletteComposite.ts:19`; gate shiny with `liveBattlerIsShiny`), resource palettes from `src/animation/assets/shock-wave.json`, and `spriteOrder` from the host's activation order (`spriteOrderWithOccupiedPrefix(..., KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)`, as the Psywave case `liveMoveAnimation.ts:3037-3058`). Registers / BG scroll come from the known first-body entry (H; gate later bodies as Water Spout).
   - (c) `liveMoveAnimation.ts`: in `liveMoveAnimationDuration` (`:535`) add `case 351:` returning `shockWaveTiming(...).cleanupAge + 1` rows from the live geometry (262..266 measured). In the config switch next to `case 149` (`:3037`), add `config = { move: "SHOCK_WAVE", attacker, target, fieldProfile, animationInputs }`.
   - The renderer branch needs **no change**. No Random2 plan (prep22: 0 draws). Expected dense acceptance: every body row exact. Row 0 of an elevated-opponent window is the hand-off frame (the shadow belongs to the field renderer).
2. **Skill Swap (NEEDS-PROVIDER, partial).**
   - The derived pieces port as `liveSkillSwapInputs`: `skillSwapBounds` -> `liveBattlerCoordAttrs` + `picOffsetPoint`, `orbAllocations33`, `SS_K`, `skillSwapBlend33`, and `firstInactiveAge` from a `LIVE_MOVE_TIMING_POLICY` entry (`liveMoveTimingPolicy.ts:70`, kind `optional-lag-age`, age 176, dominant 195 = 4 of 6).
   - Remaining before READY: the per-row hardware-OAM assembler (`buildLiveHardwareOam` with the derived orb words + order), the orb affine-anim matrices, and the psychic / BlendMonInAndOut palette program (port the Psywave palette code with Skill Swap rows).
   - Ability outcome: none (§0.3).

## 4. Not reached / limits

- Skill Swap per-row OAM order, orb matrices and palette program, and therefore any Skill Swap pixel check (§2.3).
- Shock Wave later bodies (non-first-body registers / order) and doubles / shiny were not probed. The Shock Wave `animationRngSeed` is the host's activation gRng2 (echo); it is exact on every row in 6/6, but the renderer never reads it.
- The Skill Swap orb palette bank (23) contents and the target / attacker `BlendPalette` starts were not checked.

## 5. Files and reproduction

| File | Role |
|---|---|
| `tools/integration/prep33ShockWaveModel.ts` | timing derivation, `SW_K`, `shockWaveInputs33` (input builder), `shockWaveSpriteSlots` |
| `tools/integration/prep33ShockWavePatch.ts` + `prep33.vite.config.ts` | the proposed reducer change on a runtime copy, and the alias so the unchanged renderer runs on it |
| `tools/integration/prep33ShockWaveCheck.ts` | field check (+ `--pixels`, `--neg=anchor|palette|order|registers`) |
| `tools/integration/prep33SkillSwapCheck.ts` / `prep33SkillSwapRun.sh` | Skill Swap derived-field check (`--neg=anchor|lag`) |
| `tools/integration/prep33Scenarios.py` / `prep33Probes.sh` / `prep33Run.sh` | fresh scenarios (chosen before probing) / probes (x2, state `cmp` + RGB `diff -rq`) / full reproduction (`OUT` + `REC` required) |
| `tools/battle-lab/prep33-{shock-wave,skill-swap}-alt-*.json` | fresh species pairs |
| `tools/integration/fixtures/prep33/*.json` | 9 compact receipts (counts, mismatch rows; no RGB, no mGBA logs) |

```sh
OUT=/tmp/p33x/probe REC=/tmp/p33x/rec sh tools/integration/prep33Run.sh            # probes (8 scenarios x 2, ~45 s) + checks + pixels + negatives (~5 min)
for f in tools/integration/fixtures/prep33/*.json; do cmp $f /tmp/p33x/rec/$(basename $f); done
OUT=/tmp/p33x/probe REC=/tmp/p33x/rec2 SKIP_PROBES=1 sh tools/integration/prep33Run.sh   # second checker pass
```

## 6. Papercuts

- PAPERCUT: zsh does not word-split `$VAR` (`${=VAR}` needed). The first multi-window check run passed every window as one argument and died on a misleading `species` TypeError, ~2 minutes.
- PAPERCUT: the evidence-replayer seams (Skill Swap, Psywave) take whole per-age buffers in a config the type calls "live inputs". From the type alone you cannot tell which fields the renderer reads (prep22 misclassified Shock Wave from its type), ~5 minutes to read both renderer branches.
