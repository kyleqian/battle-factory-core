# Next adapters prep 34: close the evidence gaps of MOVE_EXTREME_SPEED (245, X-AGE) and MOVE_MEMENTO (262, D-SCAN) (S10A, side lane)

Evidence only; **new files only** (no tracked file edited; no `src/`, adapter, `PROGRESS.md` / `ISSUES.md` / ledger change). Method = `docs/next-adapters-prep24.md` / `prep26.md` / `prep31.md` (full per-age model checked field by field, then fed to the **unchanged** renderer) and `prep29.md` / `prep30.md` (activation scanline state). Every emulator number is a ROM frame from an **independent direct mGBA run** (shared HTTP oracles never contacted). Base `2c96f1a00` (production src tree `58b592bc`).

Reproduce: `OUT=<fresh probe dir> REC=<fresh receipt dir> sh tools/integration/prep34Run.sh` (probes each scenario twice from fresh processes and `cmp`s them, then every checker, pixel run and negative control; `STAGES="es"` / `"memento"` for one move; `SKIP_PROBES=1` for a second checker pass over existing probes). Committed receipts: `tools/integration/fixtures/prep34/`.

## 0. Results

### 0.1 Verdicts

| Move | Verdict | Field checks | Unchanged renderer vs raw ROM RGB |
|---|---|---|---|
| **Extreme Speed 245** | **READY-WITH-CHANGE** (scoped exact for the reducer; renderer needs the standard live-field recipe, §1.5). X-AGE is closed: the reducer age at the activation frame is **43** in all four windows (both orientations, accepted ARCANINE -> DUGTRIO and alternate SMEARGLE -> GOLEM); the source body is **321 rows** (activation .. first inactive row) in all four; rows before the accepted windows (reducer ages 43..51) and after them (355..363) are idle / cleanup rows the reducer already models | 4 windows x 321 rows: **2229/2229 field-rows per window, 8916/8916** (7 fields: darken BLDY, BG3 variant, BG3 HOFS, attacker OAM centre + matrix, target x2 (OAM or monbg BG HOFS), hit splats, dust); with the caller's hard-coded ARCANINE y_offset (6 / 2) the SMEARGLE windows fail (attacker OAM 315/321, 314/321) -> **A** input `yOffset` | accepted pair, both orientations: **321/321 rows 0 px** each (pre-accepted rows 0..8 9/9, accepted 9..311 303/303, post-accepted 312..320 9/9). Alternate SMEARGLE -> GOLEM: the renderer branch throws for any pair but ARCANINE / DUGTRIO (`battleScene.ts:30365-30379`), so the alternate is checked field-by-field only |
| **Memento 262** | **READY-WITH-CHANGE** (scoped exact; first-body gate). D-SCAN is closed: the activation scanline state of the battle's **first animation body** is the production `FIRST_BODY_SCANLINE` constant (`liveOamMoves.ts:822`, the Dig / Rapid Spin / Extrasensory entry) **up to a bank relabeling** — buffers[srcBuffer] = 320 x 0, buffers[srcBuffer ^ 1] = 80 x +2 / 80 x -2 / 160 x 0 in every measured first body, while the absolute parity (srcBuffer 0 or 1) is fixed during the battle intro (before trace frame 0) and differs between parties (the four scenarios with the player party WEEZING / KADABRA / MILTANK: 0; the other six measured scenarios: 1); the renderer reads only `buffers[srcBuffer]`. Every other reducer input is source-derived (A / K) | 4 first-body windows (accepted P / O, fresh WEEZING -> GOLEM P / O) x 175..179 rows x 12 fields: **8531/8532** with the production constant (scanline compared relative to srcBuffer; the one miss = the attacker-init BLDCNT row 7, a **display-neutral T** phase: ROM frames rows 5..10 are pixel-identical in all 6 windows); absolute bank comparison fails only on the parity-0 windows (0/178, 0/179) as expected; captured-RAM scanline gives the identical counts | accepted pair with the production-derived config (derived battler inputs + `FIRST_BODY_SCANLINE`, no RAM input): **178/178 and 175/175 rows 0 px** (the player window has the opposite parity). The residue is display-neutral for this renderer: captured / swapped banks / all-zero banks all 178/178 + 175/175 0 px. Alternates field-only (the branch throws for any pair but WEEZING / ONIX, `battleScene.ts:29356-29366`) |

### 0.2 Negative controls (receipts `fixtures/prep34/*-neg-*.json`)

| Move | Perturbation | Field check | Pixels |
|---|---|---|---|
| Extreme Speed | reducer age basis 44 (`--neg=age`) | 1753/2229 per window (BLDY 257/321, BG3 HOFS 50/312, attacker 299/321, target 282/321, splats 315/321, dust 238/321) | age0 42: 26/321 rows (P 2,926,767 px; O 2,765,829 px); age0 44: 26/321 rows (same counts, different rows) |
| Extreme Speed | scroll + 1 (`--neg=scroll`) | BG3 HOFS 0/312 in every window | -- |
| Extreme Speed | target animationCenter x + 1 (`--neg=anchor`) | hit splats 291/321 in every window | -- |
| Extreme Speed | caller's hard-coded y_offset 6 / 2 (`--yoffset=hardcoded`) | accepted 2229/2229 (ARCANINE is the hard-coded species); SMEARGLE P 2223/2229, O 2222/2229 (attacker OAM y on the stretch rows) | -- |
| Memento | attacker / target `shadowTop` + 1 (`--neg=top`) | 1690/2137 (P), 1759/2100 (O), 1699/2149, 1794/2148 (alts): task data, scanline buffers, phase lengths | 112/178 rows (27,285 px), 114/175 rows (2,043 px) |
| Memento | monbg `bgX` + 1 (`--neg=bgx`) | battleBg / monbg 27/178, 27/175, 27/179, 27/179 | 72/178 rows (13,541 px), 65/175 rows (10,900 px) |
| Memento | first-body inputs after an earlier **scanline** body (Dragon Dance, `prep34-memento-after-dragon-dance-*`) | 2017/2124: gBattle_BG1_Y = 3 left by Dragon Dance (battleBg 86/177), dmaDest BG1HOFS (scanlineRegs 170/177), relative buffers rows 0..6 (170/177), WIN0 row 0 | not renderable (DRAGONITE) |

### 0.3 Reproducibility

Memento + scanline history: two independent full `prep34Run.sh` passes (`OUT` B and C, 20 probe scenarios each = 4 ES + 6 Memento + 10 scanline-history probes, every one twice from fresh processes): r1 == r2 in both, pass B == pass C for all 20 probe files; the Memento receipts regenerated by `SKIP_PROBES=1 STAGES=memento` over B and over C are `cmp`-identical (12 + 1 files), as are all 20 receipts of the C run vs a checker pass over B. The two accepted Memento probes are JSON-identical to the retained corpora `tools/compare/evidence/memento-{player,opponent}-dense-state.json.gz`.

Extreme Speed: two independent probe passes (`OUT` A and B, each scenario twice from fresh processes = 4 fresh mGBA processes per scenario): r1 == r2 `cmp`-identical in both passes and pass A == pass B for all 4 scenarios; the 8 receipts from pass B (full `prep34Run.sh`) and from a `SKIP_PROBES=1` checker pass over pass A are `cmp`-identical.

## 1. Extreme Speed (`Move_EXTREME_SPEED`, `src/animation/extremeSpeed.ts`, `sceneOnPresentation.ts:12961`, `battleScene.ts:30355`)

### 1.1 Windows

| Window | Scenario | Activation .. first inactive | Rows | Accepted window (presentation age at its first frame) |
|---|---|---|---|---|
| accepted P | `tools/battle-lab/mechanic-extreme-speed-player-arcanine-dugtrio.json` | 78 .. 398 | 321 | 87 .. 389 (48, `animationAgeOffset` 4) |
| accepted O | `tools/battle-lab/mechanic-extreme-speed-arcanine-dugtrio.json` | 82 .. 402 | 321 | 91 .. 393 (52, offset 0) |
| alt P | `tools/battle-lab/prep34-extreme-speed-alt-player-smeargle-golem.json` (new; FRONTIER_MON_SMEARGLE is a legal Factory Extreme Speed user) | 78 .. 398 | 321 | -- |
| alt O | `tools/battle-lab/prep34-extreme-speed-alt-opponent-smeargle-golem.json` (new) | 82 .. 402 | 321 | -- |

Probe: `tools/integration/prep34ExtremeSpeedProbe.py` (the generic dense probe `tools/compare/sweetScentProbe.py` parameterised for move 245, `Move_EXTREME_SPEED` .. `Move_UPROAR`): every row from the first frame the script pointer is inside the move's source with `gAnimScriptActive`, through the first inactive row.

### 1.2 The age basis (X-AGE)

The accepted windows start 9 rows after activation at reducer age 52 (= presentation age 48 + offset 4, or 52 + 0), i.e. **reducer age 43 at the activation row in both orientations**; prep2's "ages 0..47 never accepted" were presentation ages of the staged fixture, not source ages. The reducer's first event is the BLDY ramp at age 52 (`EXTREME_SPEED_FADE_FIRST_AGE`); ROM rows 0..7 are idle (the two `loadspritegfx` + `AnimTask_GetAttackerSide` + `fadetobg` script rows), row 8 writes BLDCNT 0xe8 with BLDY 0, row 9 BLDY 1. The alternates use the same basis (the checker passes with `--age0=43` on all four windows, fails with 44, and the pixel run fails with 42 / 44). So the live config is `animationAgeOffset: 43` with live age 0 = activation (the Aerial Ace / Quick Attack / Fire Punch convention, `liveMoveAnimation.ts:1979`, `:1996`), and the renderer's own `presentationAge` -> reducer conversion is unchanged.

The 9 post-accepted rows (ages 355..363: `clearmonbg`, `blendoff`, the two `delay 1` rows, BLDCNT 0, BLDALPHA cleared at row 312, monbg BG1/BG2 HOFS reset at row 316) are display-neutral for the reducer's idle state (0 px).

### 1.3 Field checks (`prep34ExtremeSpeedCheck.ts`, receipt `es-check.json`)

Each field is the hardware-visible value of the same row compared with the reducer at age 43 + row through the renderer's own display conventions (no per-field lag fitted):

| Field | ROM side | Reducer side | Result (each window) |
|---|---|---|---|
| darken BLDY | `BLDY` when `BLDCNT` is darken (0xC0), else 0 | `background.bldy` | 321/321 |
| BG3 variant | `BG3CNT` 0x3a0b (highspeed tilemap) / 0x5a0b | `background.background` | 312/312 + 9 display-neutral rows (BG3 darkened by 16: rows 24..27 and 290..294; the register swap lands one row after the reducer's swap age on rows 25 / 292, invisible) |
| BG3 HOFS | `BG3HOFS & 0x1ff` | `scrollX mod 512` | 312/312 (+ the same 9 neutral rows) |
| attacker | hardware OAM entry of the attacker's tile: centre (corner + 32, or + 64 for affine-double) and `gOamMatrices` transfer | `attackerAffine` (x/yScale, y2 from `yOffset`) + `attackerVisible`, drawn iff `!invisible || visible` | 321/321 |
| target x2 | hardware OAM x - corner while the target sprite is in OAM; then the monbg copy (`Task_UpdateMonBg`): `wrap((32 - target.x) - HOFS)` on BG1 (opponent target) / BG2 (player target) | `extremeSpeedImpactAtAge(age - 1)` (the renderer's displayed impact) | 321/321 |
| hit splats | hardware OAM entries of the `gMonEdgeHitSplatSpriteTemplate` tile: (x, y, matrix) | `animationCenter + (targetX2, y2) - 16`, matrix 512 | 321/321 |
| dust | hardware OAM entries of the `gSpeedDustSpriteTemplate` tiles: (x, y, tile frame) | `battlePositionCenter + (x2, y2) - 8`, tile base + 4 x frame | 321/321 |

### 1.4 Field classes and production sources

| Class | Inputs |
|---|---|
| **S** | the whole reducer program (fade 52..67, BG swap 68, scroll 9 px/row from 70, stretch 90..97, hide 98, impact 123..182, splats 128 / 140 / 152, dust 183.., reappear 193.., restore fade 318.., default BG 335, visible ramp to 353); `extremeSpeedBackgroundVariant` (the variant names the attacked side) |
| **K** | `animationAgeOffset` **43** (reducer age at activation, both sides, both species pairs); duration **321** rows (activation .. first inactive, both sides, both pairs) |
| **A** | attacker sprite centre (`liveBattlerAnchors` / the art view: P (72, 86 ARCANINE / 90 SMEARGLE), O (176, 42 / 46)); **attacker pic-coords `yOffset`** (back table for a player attacker, front for an opponent: ARCANINE 6 / 2, SMEARGLE 10 / 6; today hard-coded at `sceneOnPresentation.ts:12977-12980` (the `6 : 2` at :12979); source `src/data/gen/mon-pic-coords.json` via `createBattleCommandFieldArtView(field)[side].coords.yOffset`, `battleCommandFieldArt.ts:20-34`); target `animationCenter` (X_2 / Y_PIC_OFFSET = the target battler sprite (x, y): DUGTRIO (176, 53) / (72, 91), GOLEM (176, 45) / (72, 96)); `battlePositionCenter` (per-side constants (72, 80) / (176, 40)) |
| **P** | the accepted assets (`extremeSpeedBg`, dust, hit splat); battler art from `liveSceneOnBattlerArt` |
| **L / M / H / T** | none. No Random2 draw, no lag frame (321 rows in all four windows), no history input. |

### 1.5 Integration recipe (renderer + adapter; not done here)

1. `src/animation/sceneOnPresentation.ts:12977-12980`: replace `side === "player" ? 6 : 2` with a config field (e.g. `attackerYOffset`, default the current constants so the staged fixtures stay byte-identical) fed from the art view's `coords.yOffset`.
2. `src/engine/battleScene.ts:30364-30378`: `(liveField || species === …)` on the four gates; `liveSceneOnBattlerArt(view.attacker|target)` for the hard-coded ARCANINE / DUGTRIO sheets (`:30416-30463`) and the live sprite corners instead of (40, 54) / (144, 10) / (144, 21) / (40, 59); `speciesFrontIdleRestOffsetOrZero` for an opponent-side target's resting x (GOLEM / DUGTRIO have none); wrap the healthbox + message block (`:30497-30530`) in `if (!liveField)` (this removes the "HP-less fieldProfile" concern: the live HUD owns it).
3. `src/engine/liveMoveAnimation.ts`: duration `case 245: return 321;` beside the others (`:558+`), config case `{ move: "EXTREME_SPEED", attacker, target, animationAgeOffset: 43, fieldProfile }`, and 245 in `LIVE_MOVE_OPPONENT_SHADOW_ROW` (`:290`; the window now starts at activation, so an elevated opponent's #142 shadow is on row 0 — not exercised here: ARCANINE / SMEARGLE / DUGTRIO / GOLEM are not elevated).
4. Gate: first body only is not required (no H input); decline shiny if the art view lacks the shiny palette (as other branches).
5. Proof: rerun `prep34ExtremeSpeedPixels.ts`-style windows through `liveAdapterFramebuffer.ts` for the accepted pair (must stay 321/321 0 px) and the SMEARGLE -> GOLEM pair (field-exact here, pixels only possible after step 2).

## 2. Memento (`Move_MEMENTO`, `src/animation/memento.ts`, `sceneOnPresentation.ts:1984`, `battleScene.ts:29346`)

### 2.1 Windows

| Window | Scenario | Activation .. first inactive | Rows | Activation scanline (srcBuffer; relative == first body) |
|---|---|---|---|---|
| accepted P (WEEZING -> ONIX) | `tools/battle-lab/mechanic-memento-player-weezing-opponent-onix.json` | 70 .. 247 | 178 | 0; yes |
| accepted O (WEEZING -> ONIX) | `tools/battle-lab/mechanic-memento-opponent-weezing-player-onix.json` | 74 .. 248 | 175 | 1; yes |
| alt P (WEEZING -> GOLEM) | `tools/battle-lab/prep34-memento-alt-player-weezing-golem.json` (new; WEEZING is the only Factory Memento user) | 70 .. 248 | 179 | 0; yes |
| alt O (WEEZING -> GOLEM) | `tools/battle-lab/prep34-memento-alt-opponent-weezing-golem.json` (new) | 74 .. 252 | 179 | 1; yes |
| later body, non-scanline (CHIMECHO Psywave first) | `tools/battle-lab/prep34-memento-after-psywave-player-weezing-chimecho.json` (new) | 392 .. 568 | 177 | 0; yes |
| later body, scanline (DRAGONITE Dragon Dance first) | `tools/battle-lab/prep34-memento-after-dragon-dance-player-weezing-dragonite.json` (new) | 529 .. 705 | 177 | 0; **no** (dmaDest BG1HOFS, Dragon Dance waver banks) |

Probes: `tools/compare/mementoProbe.py` (unchanged accepted probe) and `tools/integration/prep34ScanlineHistoryProbe.py` (the `gScanlineEffect` state at trace frame 0, every change, and every animation-script activation edge up to the Memento activation). Receipt `scanline-history.json`: in all 10 scenarios (6 Memento + 4 Extreme Speed) the state at trace frame 0 already equals the activation state when no scanline body intervenes (0 changes); the Dragon Dance scenario shows 76 changes (`AnimTask_DragonDanceWaver`, rows 88..163, then state 3 -> 0) and leaves dmaDest 0x04000014 and the waver banks.

### 2.2 The activation scanline state (D-SCAN)

* **First body.** The intro residue is one constant up to bank labels: `buffers[srcBuffer]` = 320 x 0 and `buffers[srcBuffer ^ 1]` = 80 x +2, 80 x -2, 160 x 0 (state 0, dmaDest BG3HOFS 0x0400001c, dmaControl 0xa2600001). The absolute `srcBuffer` is 1 in 6 of 10 scenarios (as `FIRST_BODY_SCANLINE`) and 0 in the four with the player party WEEZING / KADABRA / MILTANK (accepted P, alt P and both later-body scenarios); it is set inside the battle intro (already final at trace frame 0), so it is history of the intro's VBlank count, not of anything the live host owns. It never matters: `reduceMemento` writes lines 0..111 of both banks at age 7 (attacker) and at the target start, applies the shadow program to `banks[srcBuffer]` and flips `srcBuffer` per row, so a relabeled entry produces the relabeled state; the renderer reads `displayed.scanline.buffers[displayed.scanline.srcBuffer]` only (`battleScene.ts:29387`). Checked: with `FIRST_BODY_SCANLINE` every row of all 4 first-body windows is exact relative to srcBuffer (`scanlineRelative` and the displayed lines 0..159 `scanlineDisplayed`), and the unchanged renderer is 0 px on both accepted windows including the parity-0 player window.
* **Residue lines 112..319 are display-neutral** for this body: the renderer is 0 px with the captured, the swapped (`buffers[src]` = the +-2 bank) and an all-zero activation buffer set (`memento-pixels-scanline-{captured,swapped,zero}.json`). Lines 112..159 are under the opaque battle message window.
* **Later bodies.** After a non-scanline body (Psywave) the scanline residue is unchanged (relative == first body) and every field is exact once the initial WIN0 is the later-body value 0 / 0 instead of the first-body 240 / 161 (`memento-check-later-body-win0-zero.json`: 2124/2124). After a scanline body (Dragon Dance) the entry differs (dmaDest, banks rows 0..6, plus a non-scanline residue gBattle_BG1_Y = 3): 2018/2124 even with WIN0 0 / 0. **Gate: the battle's first animation body** (`spriteOrderInput.firstBody`, the Extrasensory precedent `liveMoveAnimation.ts:3131`); widening to "no earlier scanline-effect body" would need the host to track scanline bodies and is supported by one window only.

### 2.3 Field checks (`prep34MementoCheck.ts`, receipt `memento-check.json`)

The reducer is run once per window on the production-derived config and compared with the ROM row by row (the accepted `mementoPortable.ts` projection): `active`, `scriptOffset`, `visualTaskCount`, `task` (name + data[16]), `battleBg` (gBattle_BG1/2 X/Y, WIN0H/V), `monbg`, `registers` (WIN0H/V, WININ, WINOUT, BLDCNT, BLDALPHA), `battlerPriority`, `blackBgPaletteIds`, `scanlineRegs` (state, dmaDest, dmaControl, setFirstScanlineReg), `scanlineRelative` (parity XOR row-0 parity + both banks relative to srcBuffer), `scanlineDisplayed` (lines 0..159 of the DMA source bank while the effect runs), and `scanlineAbsolute` (reported, not gated). Window lengths match in all 6 (the body length depends on the shadow geometry: 175..179).

| Window | Fields (excl. absolute) | Misses |
|---|---|---|
| accepted P | 2136/2136 | absolute 0/178 (parity 0) |
| accepted O | 2100/2100 | -- |
| alt P | 2148/2148 | absolute 0/179 (parity 0) |
| alt O | 2147/2148 | registers row 7 BLDCNT 0x3f40 vs 0x3f42 (**T**, display-neutral) |
| after Psywave | 2123/2124 (2124/2124 with WIN0 0 / 0) | row 0 WIN0 (later body) |
| after Dragon Dance | 2017/2124 | see §2.2 (gated out) |

### 2.4 Field classes and production sources

| Class | Inputs |
|---|---|
| **S** | the reducer program (attacker shadow task 0..3 states, `AnimTask_MementoHandleBg`, target task incl. its window widening and alpha fade, `DoMementoShadowEffect` on `banks[srcBuffer]`, `ScanlineEffect_SetParams` / flip / state 3 -> 0, `monbg_static` / `clearmonbg_static`, blendoff, script offsets) |
| **K** | dmaControl 0xa2600001, setFirstScanlineReg, dmaDest 0x0400001c at entry, WIN0 240 / 161 at a first body; `bg` / `bgPriorityRank` / `bgPaletteId` per side (opponent BG1 / 1 / 8, player BG2 / 2 / 9); `shadowBottom` = per-side battle-position y + 31 (111 / 71) |
| **A** | `x` = battler sprite x; **`shadowTop` = Y_PIC_OFFSET - height / 2 - 7** with Y_PIC_OFFSET = the battler sprite y on the opponent side and sprite y + 8 (clamp 104) on the player side (`GetBattlerSpriteFinal_Y(.., TRUE)`; = `liveBattlerAnchors(..).picOffsetPoint`) and `height` from `mon-pic-coords.json` (back / front) — the accepted harness hard-codes WEEZING / ONIX values (`tools/compare/mementoPortable.ts:52-62`); `bgX` / `bgY` = 32 - (x + x2), 32 - (y + y2) (x2 = an opponent front sprite's idle rest, ONIX 1) |
| **H** | the activation scanline banks = `FIRST_BODY_SCANLINE` up to relabeling (first body only) |
| **T** | the attacker-init BLDCNT write row (`SetGpuReg` from the task lands the same row or one row later): same-row in accepted O and after Dragon Dance, next-row in accepted P, alt P / O, after Psywave; the reducer encodes BG1 same-row / BG2 next-row; frames rows 5..10 are pixel-identical in every window (`memento-row7-neutral.json`), so no D4 timing claim is needed |
| **L / M** | none (no Random2, no sprites, no lag) |

Self-KO: the window ends at the first inactive row; the attacker's HP / faint are later HUD commands (the census's "displayed HP 0" input, prep6 Self-Destruct) and are not read inside the body. The renderer's own healthbox block reads `fieldProfile` (HP / max HP) only for the staged fixture.

### 2.5 Integration recipe (not done here)

1. `src/engine/liveMoveAnimation.ts`: config case 262 gated on `spriteOrderInput?.known && spriteOrderInput.firstBody` (as `:3131`), `reducer` = the §2.4 inputs from `liveBattlerAnchors` (sprite x / y, `picOffsetPoint.y` for Y_PIC_OFFSET, the battler x2 input for bgX) + the art view's `coords.height`, `initialScanlineSourceBuffer` / `initialScanlineBuffers` = `FIRST_BODY_SCANLINE` (export it from `liveOamMoves.ts:822` or share a constant), `initialWindow` 240 / 161; duration = `reduceMemento(config).length` with the displayed field (the Water Spout field-dependent pattern, `:564`), 175..179 rows here.
2. `src/engine/battleScene.ts:29356-29379`: `(liveField || species === …)` gates, `liveSceneOnBattlerArt` for the WEEZING / ONIX sheets (the opponent front sheet uses frame 0, `subTileset(.., 0, 8)`), `speciesFrontIdleRestOffsetOrZero` instead of the ONIX-only `sceneOnBattlerFrontIdleRest`; wrap the healthbox + message block (`:29423-29437`) in `if (!liveField)`.
3. `LIVE_MOVE_OPPONENT_SHADOW_ROW`: WEEZING is an elevated species; the window starts at activation, so 262 joins the #142 row-0 list (an elevated opponent attacker's shadow on the activation frame) — not pixel-checked here because the accepted renderer draws the staged scene.
4. Proof: the accepted pair through `liveAdapterFramebuffer.ts` (must stay 178/178, 175/175 0 px) and WEEZING -> GOLEM (field-exact here; pixels only after step 2), plus a later-body route that declines.

## 3. Not reached / limits

* No alternate-species **pixel** check for either move: both renderer branches are species-gated (`battleScene.ts:30365-30379`, `:29356-29366`), and this step forbids `src/` changes. The alternates are field-checked on every row against hardware-visible state (Extreme Speed) or the full reducer state (Memento).
* Elevated-opponent #142 shadow rows were not exercised (no elevated target / attacker in the Extreme Speed windows; WEEZING's row-0 shadow is drawn by the staged renderer's own scene).
* The intro parity rule (which parties end the intro on srcBuffer 0) was not derived; it is display- and reducer-neutral up to relabeling, so production does not need it.
