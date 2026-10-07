# Next adapters prep 34: close the evidence gaps of MOVE_EXTREME_SPEED (245, X-AGE) and MOVE_MEMENTO (262, D-SCAN) (S10A, side lane)

Evidence only; **new files only** (no tracked file edited; no `src/`, adapter, `PROGRESS.md` / `ISSUES.md` / ledger change). Method = `docs/next-adapters-prep24.md` / `prep26.md` / `prep31.md` (full per-age model checked field by field, then fed to the **unchanged** renderer) and `prep29.md` / `prep30.md` (activation scanline state). Every emulator number is a ROM frame from an **independent direct mGBA run** (shared HTTP oracles never contacted). Base `1edfcb3dc` (production src tree `58b592bc`).

Reproduce: `OUT=<fresh probe dir> REC=<fresh receipt dir> sh tools/integration/prep34Run.sh` (probes each scenario twice from fresh processes and `cmp`s them, then every checker, pixel run and negative control; `STAGES="es"` / `"memento"` for one move; `SKIP_PROBES=1` for a second checker pass over existing probes). Committed receipts: `tools/integration/fixtures/prep34/`.

## 0. Results

### 0.1 Verdicts

| Move | Verdict | Field checks | Unchanged renderer vs raw ROM RGB |
|---|---|---|---|
| **Extreme Speed 245** | **READY-WITH-CHANGE** (scoped exact for the reducer; renderer needs the standard live-field recipe, §1.5). X-AGE is closed: the reducer age at the activation frame is **43** in all four windows (both orientations, accepted ARCANINE -> DUGTRIO and alternate SMEARGLE -> GOLEM); the source body is **321 rows** (activation .. first inactive row) in all four; rows before the accepted windows (reducer ages 43..51) and after them (355..363) are idle / cleanup rows the reducer already models | 4 windows x 321 rows: **2229/2229 field-rows per window, 8916/8916** (7 fields: darken BLDY, BG3 variant, BG3 HOFS, attacker OAM centre + matrix, target x2 (OAM or monbg BG HOFS), hit splats, dust); with the caller's hard-coded ARCANINE y_offset (6 / 2) the SMEARGLE windows fail (attacker OAM 315/321, 314/321) -> **A** input `yOffset` | accepted pair, both orientations: **321/321 rows 0 px** each (pre-accepted rows 0..8 9/9, accepted 9..311 303/303, post-accepted 312..320 9/9). Alternate SMEARGLE -> GOLEM: the renderer branch throws for any pair but ARCANINE / DUGTRIO (`battleScene.ts:30365-30379`), so the alternate is checked field-by-field only |
| **Memento 262** | see §2 | | |

### 0.2 Negative controls (receipts `fixtures/prep34/*-neg-*.json`)

| Move | Perturbation | Field check | Pixels |
|---|---|---|---|
| Extreme Speed | reducer age basis 44 (`--neg=age`) | 1753/2229 per window (BLDY 257/321, BG3 HOFS 50/312, attacker 299/321, target 282/321, splats 315/321, dust 238/321) | age0 42: 26/321 rows (P 2,926,767 px; O 2,765,829 px); age0 44: 26/321 rows (same counts, different rows) |
| Extreme Speed | scroll + 1 (`--neg=scroll`) | BG3 HOFS 0/312 in every window | -- |
| Extreme Speed | target animationCenter x + 1 (`--neg=anchor`) | hit splats 291/321 in every window | -- |
| Extreme Speed | caller's hard-coded y_offset 6 / 2 (`--yoffset=hardcoded`) | accepted 2229/2229 (ARCANINE is the hard-coded species); SMEARGLE P 2223/2229, O 2222/2229 (attacker OAM y on the stretch rows) | -- |

### 0.3 Reproducibility

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
