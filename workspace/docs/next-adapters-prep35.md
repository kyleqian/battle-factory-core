# Next adapters prep 35: complete source-derived providers for MOVE_SKILL_SWAP (285) and MOVE_FLATTER (260) (S10A, side lane)

Evidence + prototypes; **new files only** (no tracked file edited; no `src/`, adapter, `PROGRESS.md` / `ISSUES.md` / ledger change). Method = prep24 / prep26 / prep30 / prep31: a per-row input model checked field by field against every window, then fed to the **unchanged** reducer / renderer for a pixel check against raw ROM RGB. This prep finishes what prep33 (Skill Swap) and prep32 (Flatter) left open: the hardware OAM in SortSprites order, the affine matrices and (Skill Swap) the palette program. Base `58b589526` (production `src/` unchanged). Every emulator number is a ROM frame from the accepted corpora (`tools/compare/evidence/{skill-swap,flatter}-{player,opponent}-dense-state.json.gz` + raw RGB tarballs) or an **independent direct mGBA run** (`tools/compare/{skillSwap,flatter}Probe.py`); the shared HTTP oracles were never contacted.

Reproducibility: the 6 alternate scenarios (4 Skill Swap, 2 Flatter) ran twice from fresh processes in each of two independent passes (`/tmp/p35a`, `/tmp/p35b`): state JSON `cmp`-identical and RGB dump directories `diff -rq`-identical within each pass **and across the passes** (4 fresh processes per scenario). The 11 receipts in `tools/integration/fixtures/prep35/` are `cmp`-identical to a full fresh `prep35Run.sh` pass (fresh `OUT` + `REC`, probes included) and to a second checker pass over the same probes (`REC2`).

## 0. Results

### 0.1 Verdicts

| Move | Verdict | Field checks (every row of every window) | Unchanged renderer, prototype inputs only vs raw ROM RGB |
|---|---|---|---|
| **Skill Swap 285** | **READY (faithful timing, D4)**: every input the SKILL_SWAP branch reads is source-derived. One **T** bit (optional lag at row 176, prep33), plus a pixel-neutral restore-row split (§1.4). No Random2. | 6 windows (1174 rows): hardware OAM (all 128 entries) **rows 1..end exact in 6/6** (row 0 = the host's pre-activation latch, §1.3), all 32 hardware **and** software matrices, the 64-slot `sSpriteOrder`, palettes (all 512 entries of unfaded / faded / hardware from the lent activation palette: 6/6 except the restore split, 2 rows of 1 window; renderer banks 2/3/4/16/17/23 from the production composite: every row from row 2), `bldcnt` / `bldy` | **Measured phase 1172/1174 rows 0 px.** The 2 misses are **row 0** of the two elevated-WEEZING windows (195 px each = the enemy shadow in the pre-activation latch, the Shock Wave / Nightmare hand-off frame). **Flipped phase**: 16 rows per window (177..192, 17,091 - 18,649 px per row: the restore fade one row early / late) |
| **Flatter 260** | **READY (faithful random, D3)**: the hardware OAM / matrix provider is built (spotlight, both VerticalDip target dips, 38 confetti in SortSprites order, battlers, healthbox block), on top of prep32's words / registers / palettes. **No T field** (the birth split is display-neutral, prep32 §2.2; the burst latch is the same in 4/4). | 4 windows (876 rows): hardware OAM **rows 1..218 exact in 4/4** (row 0 = the pre-activation latch), all 32 matrices, the carried `sSpriteOrder` on every row that ends with a build, the reducer-fed sprite states (spotlight slot / x / y / matrix, target dip y2, all 38 confetti slot / x / y / x2 / y2 / tile from row 67), registers from S0, the known allocator (tile ranges + palette tags), renderer palette banks from the production composite from row 5 | **876/876 rows 0 px** (219/219 in each of accepted P, accepted O, prep25 HYPNO -> GOLEM P and O) |

Windows. Skill Swap: accepted `skill-swap-{player,opponent}` (GIRAFARIG <-> SHUCKLE), prep22 `prep22-skill-swap-alt-{player,opponent}-alakazam-golem`, prep33 `prep33-skill-swap-alt-player-espeon-weezing` (elevated target) and `prep33-skill-swap-alt-opponent-weezing-snorlax` (elevated attacker). Flatter: accepted `flatter-{player,opponent}` (NIDORINA <-> ONIX, target ONIX opponent with a front idle rest x2 = 1), prep25 `prep25-flatter-alt-{player,opponent}-hypno-golem`. Each window from its own activation row.

### 0.2 Per-window numbers (receipts `skillswap-check-pixels.json`, `flatter-check-pixels.json`)

| Window | T (lag176 / restore) | hw OAM rows 1..end | matrices hw / sw | order | palettes lent 512 / composite banks | bld | px measured | px flipped |
|---|---|---|---|---|---|---|---|---|
| SS accepted P | lag / 175 | 196/196 | 196 / 196 | 196 | 196 / 194 (rows 0-1) | 196 | **196/196 0 px** | 180/196 (294,352) |
| SS accepted O | - / 175 | 195/195 | 195 / 195 | 195 | 195 / 193 | 195 | **195/195 0 px** | 179/195 (298,384) |
| SS prep22 ALAKAZAM P | lag / **176** | 196/196 | 196 / 196 | 196 | 194 (175-176) / 192 | 196 | **196/196 0 px** | 180/196 (273,456) |
| SS prep22 ALAKAZAM O | - / 175 | 195/195 | 195 / 195 | 195 | 195 / 193 | 195 | **195/195 0 px** | 179/195 (293,344) |
| SS prep33 ESPEON->WEEZING P | lag / 175 | 196/196 | 196 / 196 | 196 | 196 / 194 | 196 | 195/196 (row 0: 195) | 179/196 |
| SS prep33 WEEZING->SNORLAX O | lag / 175 | 196/196 | 196 / 196 | 196 | 196 / 194 | 196 | 195/196 (row 0: 195) | 179/196 |
| FL accepted P / O | - | 219/219 | 219 | 219 | - / 214 (rows 0-4) | 219 (all regs) | **219/219 0 px** each | - |
| FL prep25 HYPNO P / O | - | 219/219 | 219 | 219 | - / 214 | 219 | **219/219 0 px** each | - |

### 0.3 Negative controls (receipts `fixtures/prep35/*-neg-*.json`; accepted player + one alternate window each)

| Move | Perturbation | Field check | Pixels |
|---|---|---|---|
| Skill Swap | orb affine anim `(ordinal + 1) & 3` (the reducer's `affineAnimation` label, `skillSwap.ts:509`) instead of the source `data[2] & 3` (`--neg=anim`) | hw / sw matrices 86/196, hw OAM 86/196 | 100/196 rows (10,251 px), 95/196 (9,015 px) |
| Skill Swap | no SortSprites carry (`sort`) | order 43/196, hw OAM 85/196 | 172/196 (879 px), 145/196 (1,686 px) |
| Skill Swap | attacker pic x + 1 (`anchor`) | hw OAM 103/196, 102/196 | 103/196 (12,594 px), 115/196 (7,761 px) |
| Skill Swap | orb palette word 3 ^ 0x0421 (`palette`) | palettes 0/196 (rendered banks), 1/196 (all) | 89/196 (9,468 px), 85/196 (9,426 px) |
| Skill Swap | both BlendMonInAndOut starts + 1 row (`blend`) | palettes 134/196, 136/196 | 166/196 (54,264 px), 165/196 (80,217 px) |
| Skill Swap | T lag bit flipped (flipped phase, every window) | (prep33: cursor / bld / first inactive) | 16 rows / window (§0.2) |
| Flatter | no SortSprites carry (`sort`) | order 53/219, hw OAM 94/219 | 94/219 (168,590 px), 94/219 (124,603 px) |
| Flatter | no burst latch (hw row r = state r - 1 on 66..69, `burst`) | hw OAM 216/219, matrices 218/219, order 216/219 | 218/219 (row 68: 1,465 / 747 px) |
| Flatter | activation Random2 ^ 1 (`seed`) | confetti 188/219, order 69/219, hw OAM 189/219 | 189/219 (15,622 / 16,813 px) |
| Flatter | target dip y2 + 1 on rows 51..78 (`dip`) | hw OAM 191/219 | 191/219 (26,253 / 10,741 px) |

### 0.4 Field classes (prep24 / prep26 / prep31 classes; **T** = CPU phase)

**S** source program, **K** known-entry constant (equal in every window), **A** battler anchor / species table, **P** asset palette, **L** lent by the host, **M** measured constant, **H** host history (pixel-neutral here), **T** CPU phase.

| Class | Skill Swap | Flatter |
|---|---|---|
| S | orb lives (spawn 42 / 60 + 7k, 16 callbacks, destroyed + `FreeOamMatrix` -> identity on the 17th), affine anim = `task->data[2] & 3` = leg ordinal & 3 (`battle_anim_psychic.c:925-930`) run through the sprite.c engine (`BeginAffineAnim` on the first AnimateSprite, `AffineAnimDelay`, frame / jump), matrix `0x10000 / scale`; **build rule**: task-created orbs are born after `BuildOamBuffer`, so the build of frame f sees orbs with spawn < f, hardware row r = build of frame r - 1; one SortSprites pass per build (orbs priority 2 / subpriority 0, larger signed y first, stable); palettes: orb sheet row 1 (OBJ bank 23), psychic BG row 23 (bank 2), `SetPsychicBackground_Step` rotation of faded colours 1..11 on rows 26 + 4k (to 174), restore row 175, `BlendMonInAndOut(RGB_WHITE, 12, 3, 1)` on the target (from 42) and attacker (from 60) OBJ banks colours 1..15: coefficient 1..12..0 on rows start + 2 + 3k; hardware palette = faded of the previous row | spotlight program + matrices, VerticalDip y2 and confetti steps from the reducer (`flatterAtAge`, `flatter.ts:611`) fed with derived inputs; spotlight OAM `[0x0b00 \| y - 64, 0xc000 \| m << 9 \| x - 64, attr2]` (affine double, OBJ window) visible unless `flags & 4`; confetti `[(y + y2 - 4), (x + x2 - 4), (433 + tileOffset) \| prio 2 \| bank 8]`; dips are invisible sort keys (priority 3, attacker sub - 2, y 160); script-created sprites are in the build of their creation frame; **burst latch**: hardware rows 66..68 repeat row 65 (build of state 64), row 69 = build of state 68; subpriorities spotlight = target - 2 (38 / 28), dips attacker - 2 (28 / 38), confetti 3 in both orientations (measured, the createsprite subpriority floor); words / slots / registers / palettes = prep32 |
| K | orb (slot, matrix) pairs `(3,0) (4,3) (5,4) (7,5) (9,6)`, orb attr2 31025, the healthbox OAM block (`KNOWN_ENTRY_HEALTHBOX_OAM`), scene occupants (`KNOWN_ENTRY_NON_BATTLER_SPRITES`) | spotlight tile slot 6 = [305, 64], confetti tile slot 7 = [433, 12], palette slots 7 / 8, spotlight matrix 0, scene occupants + healthbox block; slots by lowest free (spotlight 3, dips 4 / 5, confetti from 4 after dip 1 is freed) |
| A | trajectory bounds (prep33), battler OAM (sprite centre) | battler OAM (sprite centre + the opponent's front idle rest x2, `sceneOnBattlerFrontIdleRest`), `BATTLER_COORD_X/Y` (spotlight centre, no elevation) |
| P | `skill-swap-bluegreen-orb.json` orb palette, `battle-anim-psychic-bg.json` | `flatter.json` spotlight / confetti palettes |
| L | activation 64-slot `sSpriteOrder` (load-bearing: `--neg=sort`) | activation `sSpriteOrder`; activation gRng2 value (D3 presentation RNG) |
| H | row 0 hardware OAM (pre-activation build: battlers affine on matrices 1 / 2, healthbox priority 1) and OBJ bank 23 before row 1 (a previous sheet): not drawn | row 0 hardware OAM (pre-activation latch) and OBJ banks 23 / 24 before rows 1 / 4: not drawn |
| M | -- | burst latch rows (4/4), lag at 68 (prep32) |
| T | **lag row 176** (prep33; 4/6 with); **restore row** 175 / 176 (5/6 at 175; the ALAKAZAM P window restores bank 2 on its lag row 176): **pixel-neutral** (BLDY 16 on 175..177) | none |

## 1. Skill Swap (`Move_SKILL_SWAP`, `src/animation/skillSwap.ts`, renderer `battleScene.ts:24600`)

### 1.1 What the branch reads (prep33 §2.1)

`skillSwapDisplayPlan` decodes `buffers.hardwareOam` (OAM index = draw order) and `buffers.hardwareMatrices`; the branch reads `palette.hardware` (BG banks 2 / 3 / 4 or the psychic bank 2, battler OBJ banks 16 / 17, orb bank 23), `registers.bldy`, the reducer's age-based `background.phase`, `resources.tileRange / paletteBank` and the field profile. `prep35SkillSwapModel.ts` supplies all of them per age: `skillSwapDisplayRows35` (OAM + matrices + order), `skillSwapPalettes35` (palettes), and `blend35` (= prep33 `skillSwapBlend33`) in the checker.

### 1.2 Hardware OAM, order and matrices (`skillSwapDisplayRows35`)

The orb positions are the reducer's (`skillSwapAtAge` with a stub input, prep33-exact); the build sees an orb from its row spawn + 1 to spawn + 16 (hardware rows spawn + 2 .. spawn + 17), keyed `(2 << 8 | 0, oam.y)` into the merged `carryLiveSpriteOrder`; `buildLiveHardwareOam` writes the 128 entries with the matrices in the pad halfwords. Matrices: the scale after `f - spawn` affine steps, identity for a free matrix. The affine anim index is `ordinal & 3` (source): the reducer's `affineAnimation: ((ordinal + 1) & 3)` (`skillSwap.ts:509`) is a state-only label that is **wrong** (it fails 110 matrix rows, `--neg=anim`) and never rendered; fix it if the provider reads it.

### 1.3 Row 0

Hardware row 0 is the pre-activation build (battlers in affine mode on matrices 1 / 2, healthboxes priority 1); the model's idle build differs in those bits only and is pixel-neutral (0 px on row 0 in 4/6 windows). In the two elevated-WEEZING windows row 0 differs by 195 px: the enemy shadow, visible in the pre-activation latch and hidden from row 1 (`gAnimScriptActive`), which the SKILL_SWAP branch does not draw (same as Shock Wave prep33 §1.4 and Nightmare prep32 §1.5). Row 0 is the hand-off frame owned by the field renderer.

### 1.4 The T bits

The optional lag at 176 (prep33 §0.3) is the only display-relevant one: flipped, 16 rows per window (177..192) miss by 17-19 k px. The bank-2 restore row (175 in 5/6, 176 in prep22 ALAKAZAM P, whose iteration that restores is split by the lag) moves only faded / hardware bank 2 under BLDY 16 (fully dark): the measured windows are 0 px with the policy restore 175 (the ALAKAZAM P window's 2 palette rows are state only). No policy entry is needed for it.

## 2. Flatter (`Move_FLATTER`, `src/animation/flatter.ts`, renderer `battleScene.ts:25860`)

### 2.1 Inputs (`flatterInputs35`)

A complete `FlatterLiveInputs` from production facts: `attackerCenter` = the attacker sprite centre, `targetCenter` = `BATTLER_COORD_X/Y` (the spotlight is at `(X, Y - 8)`; no elevation), `targetSpriteOrigin` = the target sprite centre, idle rests, battler arts (`battler35`), the spotlight allocation (slot = lowest free = 3, attr2 = tile 305 | prio 2 | slot 7, subpriority target - 2, matrix 0), dip slots 4 / 5, the 38 confetti from prep32 `flatterConfetti(activation gRng2, occupied = scene + spotlight + dip 2)` (start 65, end 97, step-0 state), K resources with the allocator tile ranges. Sprite states then come from the production reducer; every one is checked against the ROM sprites (§0.2).

### 2.2 Hardware OAM (`flatterOamRows35`)

Per build: scene occupants, battlers (target `y2` = the reducer's dip offset), the spotlight, the two invisible dips (sort keys only), the confetti. One `carryLiveSpriteOrder` pass per executed build; the 38 equal-key confetti (priority 2, subpriority 3) sort by signed `oam.y` with the carried order breaking ties (the free-slot order of the activation lend decides their first ranks: `--neg=sort` / `seed` fail). The burst latch (§0.4 S) is load-bearing on row 68 only (`--neg=burst`). Matrices: spotlight `[gSpotlightAffineAnimTable value, 0, 0, 170]` on matrix 0 while it exists (to state 174), identity after.

### 2.3 Pixels

The checker builds the FLATTER config exactly as `verifyFlatterReducer.ts flatterConfigFor` (geometry `animationCenter` = attacker / target centre), with prototype OAM / matrices / order, prep32 registers (`flatterRegisters(age, S0)`) and palettes (`flatterPalettes(age, composeLivePalettes(...), loads)`): 219/219 rows 0 px in 4/4 windows.

## 3. Integration recipes (no src change made here)

1. **Skill Swap (READY, D4 faithful timing).**
   - (a) `src/engine/liveMoveOamAssembler.ts`: add `liveSkillSwapHardwareOamRows` next to `livePsywaveHardwareOamRows` (`:713`), ported 1:1 from `prep35SkillSwapModel.ts` `orbLives35` / `orbScale35` / `orbMatrix35` / `skillSwapDisplayRows35` (orb positions: port `skillSwapAtAge`'s trajectory or pass a seam callback as Will-O-Wisp's `spritesAt`, since src/engine reaches src/animation only through the pinned seam).
   - (b) `src/engine/liveSkillSwapInputs.ts` (as `livePsywaveInputs.ts`): `skillSwapPalettes35` + the bld rule (`prep33 skillSwapBlend33`), with the orb palette from `src/animation/assets/skill-swap-bluegreen-orb.json` and the psychic palette already imported in `liveOamMoves.ts:8`.
   - (c) `src/engine/liveOamMoves.ts`: `liveSkillSwapInputs(args) -> { duration, animationInputsAt(age) }` next to `livePsywaveInputs` (`:752`): battlers from `battlerObject` (`:52`), bounds from `liveBattlerCoordAttrs` (`liveMoveAnimation.ts:497`) + `picOffsetPoint`, `KNOWN_ENTRY_SCENE` (`:42`), task slots / orb pairs `SS35`, `orbOam` entries for the 5 orb slots and `softwareMatrices` per row (the reducer looks them up), resources `{ tag: 10251, tileRange: [305, 4], paletteBank: 23 }`, registers `S0_REGISTERS` (`:34`) + bld.
   - (d) `src/engine/liveMoveTimingPolicy.ts` (`LIVE_MOVE_TIMING_POLICY`, `:72`): `285: optional-lag-age, age 176, alternatives event 196 rows (measured 4) / no-event 195 rows (measured 2), chosen event`. `liveMoveAnimation.ts`: `case 285: return liveMoveTimingBodyRows(285)` next to `case 149` (`:873`); config case next to `case 149` (`:3104`) with the same gates (known lend + `spriteOrderWithOccupiedPrefix`, non-shiny, `composeLivePalettes`), `firstInactiveAge` from the policy.
   - Renderer: no change. Expected dense acceptance in the policy phase: the 4 lag windows exact on every body row (row 0 of an elevated-opponent window = the shadow hand-off frame, 195 px, as Shock Wave), the 2 no-lag windows 16 rows (177..192, faithful-timing bucket). Ability outcome: none (prep33 §0.3).
2. **Flatter (READY, D3 faithful random).**
   - (a) `src/engine/liveMovePresentationRng.ts`: `260: [{ ageOffset: 65, count: 114 }]` in `LIVE_MOVE_RANDOM2_PLANS` (`:27`; the 65 RfuMain1 steps are the presentation RNG's per-frame advance) and 260 in `LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS` (`:67`); the words feed prep32 `flatterConfetti`'s slot / tile / velocity transform.
   - (b) `liveMoveOamAssembler.ts`: `liveFlatterHardwareOamRows` ported from `flatterOamRows35` (the sprite states via a seam callback over `flatterAtAge`, or ported spotlight / dip / confetti programs), including the burst latch and per-build carry.
   - (c) `liveOamMoves.ts`: `liveFlatterInputs` = `flatterInputs35` + prep32 `flatterRegisters` (from `S0_REGISTERS`) / `flatterPalettes` (composite + `src/animation/assets/flatter.json`); `liveMoveAnimation.ts`: duration `case 260` = 219 rows (`FLATTER_FIRST_INACTIVE_AGE + 1`), config `{ move: "FLATTER", attacker / target geometry animationCenter = attackerCenter / targetCenter, animationInputs: animationInputsAt(age) }`; gates: known lend, first body (row-0 registers S0 incl. WIN0 240 / 161), non-shiny.
   - Renderer and reducer: no change. Expected: every body row exact (876/876 measured).

## 4. Not reached / limits

- Later bodies (non-S0 activation registers, other lends), shiny battlers, doubles: not probed for either move. Flatter's row-0 shadow branch (`battleScene.ts`, opponent attacker only) was not exercised by an elevated species here.
- Skill Swap row 0 of elevated-opponent windows needs the field renderer's shadow (hand-off frame), as Shock Wave / Nightmare.
- The production host values (composite palettes, S0, known entry) are used directly; the lent activation order is each window's row 0 (the tracker lend, as in prep30 / prep33).

## 5. Files and reproduction

| File | Role |
|---|---|
| `tools/integration/prep35SkillSwapModel.ts` | Skill Swap orb lives / affine engine / OAM + matrix + order rows / palette program |
| `tools/integration/prep35SkillSwapCheck.ts` | Skill Swap field check + pixels at the measured and flipped phases (`--neg=anim|sort|anchor|palette|blend`) |
| `tools/integration/prep35FlatterModel.ts` | Flatter `FlatterLiveInputs` builder + OAM / matrix / order rows (burst latch) |
| `tools/integration/prep35FlatterCheck.ts` | Flatter field check + pixels (`--neg=sort|burst|seed|dip`) |
| `tools/integration/prep35Run.sh` | probes (each alternate twice, state `cmp` + RGB `diff -rq`) + checks + pixels + negatives into caller-given `OUT` / `REC` |
| `tools/integration/fixtures/prep35/*.json` | 11 compact receipts (counts, mismatch rows; no RGB, no mGBA logs) |

```sh
OUT=/tmp/p35x/probe REC=/tmp/p35x/rec sh tools/integration/prep35Run.sh            # probes (6 scenarios x 2, ~1 min) + checks + pixels + negatives (~5 min)
for f in tools/integration/fixtures/prep35/*.json; do cmp $f /tmp/p35x/rec/$(basename $f); done
OUT=/tmp/p35x/probe REC=/tmp/p35x/rec2 SKIP_PROBES=1 sh tools/integration/prep35Run.sh   # second checker pass
```

## 6. Papercuts

- PAPERCUT: the Skill Swap and Flatter seam configs take whole per-age buffers in a single static `animationInputs`, so a pixel check must build a new presentation per age; the Flatter view also silently rebuilds `attackerCenter` / `targetCenter` from the geometry's `animationCenter` (not the inputs), ~3 minutes.
