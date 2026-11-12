# Next adapters prep 32: source-derived provider prototypes for MOVE_NIGHTMARE (171) and MOVE_FLATTER (260) (S10A, side lane)

Evidence + prototypes; **new files only** (no tracked file edited; no `src/`, adapter, `PROGRESS.md` / `ISSUES.md` / ledger change). Method = `docs/next-adapters-prep24.md` / `prep26.md` / `prep31.md`: a full per-age input model checked field by field against every window, then fed to the **unchanged** reducer / renderer for a pixel check. Every emulator number is a ROM frame from the accepted corpora (`tools/compare/evidence/{nightmare,flatter}-{player,opponent}-dense-state.json.gz` + raw RGB tarballs) or an **independent direct mGBA run** (`tools/compare/{nightmare,flatter}Probe.py` through the vendor libmgba-py; the shared HTTP oracles were never contacted). Base `7a6b1086f`.

Reproducibility: every probe scenario (8: 6 Nightmare, 2 Flatter) ran twice from fresh processes, byte-identical (`cmp`), in each of two independent probe passes (`/tmp/p32/a`, then `/tmp/p32/b` for Nightmare and `/tmp/p32/c` for Flatter: 4 fresh processes per scenario; pass-A and pass-B probe JSONs are also `cmp`-identical). The 20 receipts in `tools/integration/fixtures/prep32/` were generated from pass A and regenerated end to end from pass B / C (fresh `OUT` + `REC`): `cmp`-identical.

## 0. Results

### 0.1 Verdicts

| Move | Verdict | Field checks (every row of every window) | Unchanged renderer fed with prototype inputs vs raw ROM RGB |
|---|---|---|---|
| **Nightmare 171** | **READY (faithful timing)**: every caller-owned input of `nightmareAtAge` is source-derived and exact in **8/8 windows** given two **T** bits (`lag149`, `restoreRow`), with one renderer change recommended for elevated-target species (row 0, §1.5) | 8 windows x 168 / 169 rows, 17 fields per row: unfaded / faded / hardware palette, the complete register file, attacker and target battler sprites (slot, template, callback, x, y, x2, y2, subpriority, attr, flags, matrixNum, matrix, data), the 64-slot painter order (SortSprites), allocator + matrices, monbg source scroll, and the unchanged reducer fed with these inputs: cursor, tasks (slot, callback, data[0..15]), clone sprite (slot, attr, x, y, x2, y2, subpriority, flags, matrix, data), registers, target shake, animation RNG, plus the OAM RAM+1 latch: **22,921 / 22,925 field-rows**; the 4 misses are the reducer's Task_FadeToBg state on row 148 in the 4 `restoreRow = 148` windows (T, state only, §1.4) | **measured phase 1348/1349 rows 0 px** (8/8 windows; the one row is d4a GENGAR -> GOLBAT row 0, 200 px = the GOLBAT enemy shadow in the pre-activation latch, §1.5). **Policy phase** (`liveMoveTimingPolicy.ts:77`, lag): 5/5 lag windows 0 px; the 3 no-lag windows 16 rows each (rows 150..165, 274,592 - 284,976 px: the fade-out one row late) |
| **Flatter 260** | **NEEDS-PROVIDER (hardware OAM + matrices only)**: words, confetti, registers, palettes are source-derived and exact; the birth split (T) is **display-neutral**; the hardware OAM / matrix provider (spotlight, VerticalDip, battlers, SortSprites order, assembler) was **not reached** (§4) | 4 windows (accepted P / O NIDORINA -> ONIX, prep25 HYPNO -> GOLEM P / O) x 219 rows: registers (all 21) 219/219, unfaded / faded / hardware palette 219/219, **38 confetti** (slot, x, y, x2, y2, tile, data[0..3], presence) 152/152 rows from the burst end (row 67) to the end; the **114 words** reproduce all 38 confetti's tile offset + velocities in 4/4 windows and the gRng2Value after the burst | corpus hardware OAM / matrices (the missing provider) + **prototype registers + palettes: 876/876 rows 0 px** (4/4 windows); **every split alternative (15/14/9, 14/14/10, 14/15/9) 0 px** on rows 63..70 in 4/4 windows |

Windows. Nightmare: accepted `nightmare-{player,opponent}-dense-state` (HAUNTER -> SHUCKLE / KANGASKHAN), prep25 alternates `prep25-nightmare-alt-{player,opponent}-gengar-golem`, D4a extra pairs `d4a-nightmare-extra-{player,opponent}-{gengar-golbat,haunter-snorlax}` (all after Hypnosis + the target's SLP status animation). Flatter: accepted `flatter-{player,opponent}-dense-state` (NIDORINA -> ONIX), prep25 alternates `prep25-flatter-alt-{player,opponent}-hypno-golem`. Each window from its own activation row (row 0 = probe row 0).

### 0.2 Negative controls (receipts `fixtures/prep32/*-neg-*.json`, accepted windows)

| Move | Perturbation | Field check | Pixels |
|---|---|---|---|
| Nightmare | ghost palette word 9 ^ 1 (`--neg=palette`) | unfaded / faded 41/169, hardware 41/169 (rows 21..148) | 48/169 rows (172,825 / 136,411 px) |
| Nightmare | `bg3cnt` ^ 1 in the activation registers (`registers`) | registers 0/169, reducer registers 0/169 | -- |
| Nightmare | target anchor x + 1 (`shake`) | target sprite 0/169, registers / monbg scroll / reducer tasks 79/169, clone 89/169 | 0/169 rows (79,258 / 147,368 px) |
| Nightmare | T `lag149` flipped (`phase`) | registers 152/169, battlers 168/169, cursor 168/169, animation RNG 149/169 | flipped phase in §0.1: 16 rows / window |
| Nightmare | activation order = known-entry lend (`--lend=entry`) | **64-slot order 0/169 in 8/8 windows** (only the free tail differs), ranks of the drawn slots (attacker, target, clone) still 169/169 | **169/169 0 px** (accepted P / O) |
| Flatter | activation Random2 ^ 1 (`seed`) / one RfuMain1 step fewer (`steps`) | words: 0/38 confetti in both; check: confetti 121/152 rows (exact only after all are destroyed) | -- |
| Flatter | `bg3cnt` ^ 1 (`registers`) / spotlight palette word ^ 1 (`palette`) | registers 0/219; palettes 1 / 1 / 2 of 219 | BLDY + 1 (`registers`): 14/219 rows (5.2 M px); confetti palette word ^ 0x0421 (`palette`): 189/219 (1,709 px) |

### 0.3 Field classes (as prep24 / prep26 / prep31; **T** = differs between scenarios only by a CPU phase)

| Class | Nightmare | Flatter |
|---|---|---|
| S | ghost BG palette load on row 21 (BG bank 2) and restore at the restore row; `MoveBattlerSpriteToBG` on row 40: target OBJ palette (bank `16 + attr2 >> 12`) -> BG bank 8 (BG1, opponent target) / 9 (BG2, player target), `BGnCNT = cnt0 & ~0xc003 | 0x4000 | 2` from row 41, source scroll `(32 - x, 32 - y)` with the ShakeMon x (3 on rows 45 + 4k, 46 + 4k up to 120), hardware `HOFS / VOFS` = previous row's source scroll & 0x1ff, cleared on 131; `Task_FadeToBg` BLDY ramps; `AnimTask_NightmareClone` blend; target invisible on rows 40..126; clone = `CloneBattlerSpriteWithBlend` (struct copy of the target, OBJ blend, invisible cleared, `data[6..7]` = `SpriteCallbackDummy`); hardware palette = faded of the previous row (row 40: same row); **painter order: one SortSprites pass per row (`priority << 8 | subpriority`, larger signed `oam.y` first, free slots carry the dummy key `3 << 8 | 0xff`, y 160), the clone sorted on rows 43..123 (sorted before `RunTasks` destroys it on 123)**: exact 64-slot order in 8/8 | words (§2.1), slots (lowest free in source order), `x = -8 / 248`, `y = 104`, `AnimFlatterConfetti_Step` per row (steps 0 on 65 / 66, 1 on 67 / 68 (lag), `row - 67` after; destroyed at step 31, row 98); register schedule (WIN0 0 on row 1, `AnimTask_CreateSpotlight` row 7 (WININ 0x1f3f, DISPCNT \| WIN1), `AnimTask_HardwarePaletteFade` BLDCNT 0xf8 + BLDY 1..10 every 4 rows from 8, spotlight WINOUT 0x1f3f row 49, spotlight destroy row 175 (WINOUT 0x3f3f, DISPCNT ^ OBJWIN), BLDY 9..0 every 4 rows from 177, BLDCNT 0 row 217, `AnimTask_RemoveSpotlight` row 218); palette loads row 1 (spotlight) / 4 (confetti) into the first free tag slots >= `reservedPaletteCount` (OBJ banks 7 / 8), hardware one row later |
| K | activation registers / palettes / allocator / matrices, task slots (fade 0, monbg update 1, clone 0, shake 2, clear 0, restore 2), the battlers' own matrices for the first-inactive affine reset (player 1, opponent 2: `attr0 \| 0x100`, matrixNum), host sprites' sort keys (healthboxes, shadow), `SpriteCallbackDummy` address, BG VRAM change rows 20 / 41 / 129 / 131 / 148 (8/8) | activation registers / palettes, confetti tile base (`ANIM_TAG_CONFETTI` tile range: 433 in 4/4), occupied slots at the burst |
| A | target / attacker sprite x, y (monbg origin, clone position) | -- (confetti start off-screen, side-only) |
| P | `gBattleAnimBgPalette_Ghost` (`src/assets/gen/battle-anim-ghost-bg.json`, 5 -> 8 bit expansion inverted) | spotlight / confetti palettes (`src/animation/assets/flatter.json`) |
| L | activation 64-slot order (§1.3: carries the Hypnosis + SLP history; pixel-neutral) | -- |
| H | WIN0 `0,0` at activation (later body, prep25 §B.5): part of the activation registers here | -- (first body: WIN0 `240,161` on row 0, cleared on row 1 in 4/4) |
| **T** | **`lag149`** (the optional lag of `liveMoveTimingPolicy.ts:77`): present in 5 windows (accepted P / O, d4a O GENGAR, d4a P / O HAUNTER -> SNORLAX), absent in 3 (prep25 P / O, d4a P GENGAR); a no-lag window is the lag program with row 149 deleted (`programAge`). **`restoreRow`** (the `Task_FadeToBg` restore iteration that loads the battle BG palette completes before the row-148 VBlank or not): 148 in 4 windows (the 3 no-lag + d4a O GENGAR), 149 in 4. Combinations measured: (lag, 149) x 4, (no lag, 148) x 3, (lag, 148) x 1 | **confetti birth split**: draws completed at the burst snapshots 65 / 66 = 43 / 87 (accepted P: the VBlank inside the 15th confetti's callback, its sprite caught with only `tileNum` written), 45 / 87, 42 / 84, 42 / 87; births (completed callbacks) 14/15/9, 15/14/9, 14/14/10, 14/15/9 (prep25 counted the half-initialised sprite in row 65: 15/14/9) |

## 1. Nightmare (`Move_NIGHTMARE`, `src/animation/nightmare.ts`, `battleScene.ts:24433`)

### 1.1 What the branch reads

`nightmareAtAge` returns the caller's palettes / painter order / battler sprites unchanged and overwrites only `bldcnt / bldalpha / bldy` and the monbg `BGnCNT / HOFS / VOFS`; the renderer reads `palette.hardware` (BG banks 2..4, 8 / 9, the battlers' OBJ banks), `registers.bldy / bldalpha`, `painterOrder` ranks of the attacker / target / clone slots, the battler `slot / subpriority / attr[2]`, and the reducer's age-gated clone / shake / `targetOnBg`. The prototype (`prep32NightmareModel.ts`) produces every caller-owned input per row; `prep32NightmareLib.ts liveInputs` packs them as `NightmareLiveInputs`.

### 1.2 Row conventions found while building (all checked)

| Item | Rule |
|---|---|
| no-lag windows | the lag program with row 149 deleted: render / reduce at `programAge(row) = row >= 149 ? row + 1 : row` |
| restore row | `unfaded / faded` bank 2 back to the activation words on 148 / 149 (T), hardware one row later; invisible (BLDY 16 on rows 146..150) |
| clone in the sort | created by the script command (CB1) on 43 and sorted that row; destroyed by `AnimTask_NightmareClone_Step` in `RunTasks` on 123, after `BuildOamBuffer`: still keyed in row 123's sort, gone from 124 (sorting it out on 123 misses row 123 in 8/8) |
| first inactive row (168 / 167) | both battler sprites switch to affine normal on their own matrix (player 1, opponent 2), 8/8 |

### 1.3 The order lend after Hypnosis + SLP

The activation order is the same in all 8 windows: occupied prefix `[62, 60, 0, 63, 1, 61, 6, 8, 2]` (= `KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER`, `spriteOrderProvider.ts:263`) and free tail `[4, 3, 9, 10, 5, 7, 21, 20, 19, ..., 11, 54, ...]`, **not** the known-entry tail `[4, 3, 21, 20, 5, 19, ..., 11, 10, 9, 7, 54, ...]` (`KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER`, `:38`): it carries the Hypnosis body + SLP status history, in the free tail only (the free slots 9, 10, 5, 7 used by those animations moved forward). Every other activation field the reducer reads is the known entry (allocator in-use `[0, 1, 2, 6, 8, 60..63]`, matrices, task-free, palettes composite). Measured effect: the 64-slot order under the known-entry lend is wrong on every row (0/169 x 8), but the ranks of the three drawn slots are exact (169/169 x 8) and the pixels are 0 px (accepted P / O): the clone always takes the lowest free index (3) and sorts ahead of every dummy key. **Production rule**: require a known lend (`spriteOrderInput?.known`) and build the activation order as Megahorn does (`spriteOrderWithOccupiedPrefix(lend.free, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)`, `liveMoveAnimation.ts:3016`); the tracker's carried free order (`lendLiveSpriteOrder`, `liveSpriteOrderHost.ts:396`, Hypnosis bodies are EXACT-PLAN `95:player / 95:opponent` in `fixtures/sprite-order-body-plans.json`) gives the exact 64-slot order, any known lend gives exact pixels.

### 1.4 The T bits

`lag149` is the policy parameter already in `LIVE_MOVE_TIMING_POLICY` (5 of 8 with the lag, same count as the D4a tie-break). Under the policy the 3 no-lag windows lose rows 150..165 (the fade-out drawn one row late, 16 rows, ~17-18 k px each). `restoreRow` is new but **pixel-neutral** (BLDY 16 on 146..150 in both phases); it moves the BG-palette restore (state, hidden) and the `Task_FadeToBg` state word on row 148 (the reducer encodes 149: its tasks miss row 148 in the 4 restore-148 windows). The policy phase with restore 149 is exact on the lag + restore-148 window (d4a O GENGAR, 169/169 0 px). No new policy entry is needed.

### 1.5 Pixels

`fixtures/prep32/nightmare-pixels.json`: measured phase 8/8 windows 0 px on every row except d4a GENGAR -> GOLBAT (player attacker) row 0: 200 px in x 160..191, y 65..72 = the GOLBAT enemy shadow, which the pre-activation hardware latch still shows (the shadow sprite is already invisible in row 0's state) and which the NIGHTMARE branch draws at age 0 only for an **opponent attacker** (`battleScene.ts:24499`). Recommended renderer change (out of scope here): draw the opponent battler's shadow at age 0 whatever the attacker side. No other residual in 1349 rows.

## 2. Flatter (`Move_FLATTER`, `src/animation/flatter.ts`, `battleScene.ts:25851`)

### 2.1 The 114 words (`prep32FlatterModel.ts flatterConfetti`, receipt `flatter-words.json`)

Rule (as prep29 Luster Purge): `s = gRng2Value at activation` (row 0 `animationRng`); step `s = s * 0x41c64e6d + 0x6073` once per main-loop iteration (RfuMain1) for ages 1..65 (no lag before 65); the script's confetti burst (19 x `call CreateFlatterConfetti`, all with `delay 0`: one script callback) then draws **114 words back to back**, 3 per confetti in source order (attacker, target, ...), `w = s >>> 16`: `tile += w0 % 12`, `data[0] = 0x5e0 +/- (w1 & 0x1ff)`, `data[1] = 0x480 +/- (w2 & 0xff)` (`battle_anim_effects_3.c:3039-3053`). No RfuMain1 draw interleaves (the burst is one main-loop iteration spanning the VBlanks of rows 65 / 66): `animationRng` on row 67 equals the model's state after the 114 draws in 4/4 windows. Activation values: 370756553 (accepted P and O), 689912548, 1989536647 (alternates).

### 2.2 The birth split is display-neutral

In all 4 windows the software OAM buffer does not change on rows 65, 66, 67 and the hardware OAM of rows 66 and 67 repeats row 65's latch (no `BuildOamBuffer` runs inside the burst); the hardware palette and registers do not change either (`splitReachesDisplay` in `flatter-words.json`). So the split decides only which confetti structs a mid-burst snapshot shows (sprite state, T), never a display buffer: the renderer fed with each alternative split is 0 px on rows 63..70 in 4/4 windows (`flatter-pixels.json splits`). **Pixel cost of every split alternative: 0 px.** The words do not depend on the split either (§2.1).

### 2.3 Per-row confetti / registers / palettes

`flatter-check.json`: from row 67 every confetti is `confettiState(c, confettiSteps(row))` (step 0 on 65 / 66, one step in row 67's iteration, row 68 the measured lag frame (no step), then one per row; destroyed at `data[3] == 31` = row 98): 152/152 rows x 4 windows, all 38 sprites x 10 fields. Registers 219/219 and palettes 219/219 x 4 (§0.3 S).

### 2.4 Pixels

`flatter-pixels.json`: corpus `buffers` (hardware OAM / matrices: the provider not built here) + prototype registers + palettes: 219/219 rows 0 px in each of the 4 windows (the alternates displayed as HYPNO / GOLEM, field profile from the window's parties).

## 3. Integration recipe (no src change made here)

1. **Nightmare** (READY, faithful timing): `src/engine/liveNightmareInputs.ts` (or a section of `liveOamMoves.ts` next to `liveMegahornInputs`): port `nmPalettes / nmRegisters / nmBattlers / nmClone / nmOrders / monbgOrigin` from `prep32NightmareModel.ts` and `liveInputs` from `prep32NightmareLib.ts:39` as `liveNightmareInputs(args) -> { duration, animationInputsAt(age) }`; replace the row-0 snapshot (`knownFor`, `prep32NightmareLib.ts:28`) by the host: activation registers = known entry with WIN0 `0,0` (later body, H), palettes `composeLivePalettes` (equal to the ROM at activation, prep25 `palette-check.json`), battler sprites from `liveBattlerAnchors`, host sort keys / in-use slots / allocator of the known entry, the activation order from the lend (§1.3), `spriteCallbackDummy` from the symbol table; `lag149 = liveMoveOptionalLagAge(171) !== null` (`liveMoveTimingPolicy.ts:156`), `restoreRow = 149` (pixel-neutral, matches the reducer's tasks). Wire in `liveMoveAnimation.ts` next to Megahorn (`case 224`, `:3009`; known-lend gate `:3013`, non-shiny gate `:3014`): `config = { move: "NIGHTMARE", ..., animationInputs: inputs.animationInputsAt(age) }`; `liveMoveAnimationDuration` (`:530`): `case 171: return liveMoveTimingBodyRows(171)` (as `case 224`, `:839`). The reducer and renderer need no change for the 8 measured windows; the age-0 shadow condition (`battleScene.ts:24499`) for elevated opponent targets is a separate one-line renderer fix. Expected dense acceptance: lag windows framebuffer-exact; no-lag windows 16 rows (faithful-timing bucket).
2. **Flatter** (NEEDS-PROVIDER): reuse `prep32FlatterModel.ts` (`flatterConfetti` with the live `animationRng` at activation + 65 steps (the presentation-RNG provider `liveMovePresentationRng.ts` already advances it per frame), `confettiState / confettiSteps`, `flatterRegisters`, `flatterPalettes`); still missing: the hardware OAM + matrices per row (spotlight `gSpotlightAffineAnimTable` matrices + OBJ-window entry, the two VerticalDip translations of the target, battlers, confetti entries, SortSprites order with 38 equal-priority y keys, `buildLiveHardwareOam`, `liveMoveOamAssembler.ts:65`). No timing-policy entry is needed for the split (display-neutral); the lag at 68 is a measured constant (4/4).

## 4. Not reached / limits

- **Flatter hardware OAM / matrix provider** (spotlight affine anim, VerticalDip target y2, order with 38 confetti y keys, the 128-entry assembler): not built; the pixel results use the corpus buffers for OAM / matrices. This is the remaining NEEDS-PROVIDER item.
- Nightmare: the production host values (`composeLivePalettes`, entry registers with WIN0 0,0, allocator) are taken from each window's row 0 here; prior preps measured them equal to the host providers at activation (prep25 §0.1 item 5), not re-measured in this prep.
- Flatter alternates exist for one species pair only (prep25 HYPNO / GOLEM); no fresh pair was probed.
- Doubles, shiny battlers, contest paths not covered.

## 5. Files

| File | Role |
|---|---|
| `tools/integration/prep32NightmareModel.ts` | Nightmare per-row palettes, registers, battler sprites, clone allocation, SortSprites painter order, program-age map |
| `tools/integration/prep32NightmareLib.ts` | window loader, measured T, known-entry snapshot, `liveInputs` (reducer inputs), field-check core (`--lend=entry`, `--neg=palette|registers|shake|phase`) |
| `tools/integration/prep32NightmareCheck.ts` / `prep32NightmarePixels.ts` | field check / renderer pixel check at the measured, flipped and policy phases (`--neg=palette|shake`, `--lend=entry`) |
| `tools/integration/prep32FlatterModel.ts` | Flatter words + confetti (slots, per-row step state), register schedule, palette loads |
| `tools/integration/prep32FlatterWords.ts` / `prep32FlatterCheck.ts` / `prep32FlatterPixels.ts` | words + split T + display reach (`--neg=seed|steps`) / per-row field check (`--neg=seed|registers|palette`) / pixels incl. split alternatives (`--neg=registers|palette`) |
| `tools/integration/prep32Probes.sh` / `prep32Run.sh` | probes (each scenario twice, cmp'd; `OUT` required) / whole reproduction (`OUT` + `REC` required, never reuses /tmp implicitly) |
| `tools/integration/fixtures/prep32/*.json` | 20 compact receipts (counts, mismatch rows; no RGB, no mGBA logs) |

## 6. Reproduce

```sh
OUT=/tmp/p32x/alt REC=/tmp/p32x/rec sh tools/integration/prep32Run.sh        # probes (8 scenarios x 2, cmp'd, ~1 min) + checkers + pixels + negatives (~4 min)
for f in tools/integration/fixtures/prep32/*.json; do cmp $f /tmp/p32x/rec/$(basename $f); done
OUT=/tmp/p32x/alt REC=/tmp/p32x/rec2 SKIP_PROBES=1 sh tools/integration/prep32Run.sh   # second checker pass over the same probes
npx vite-node tools/integration/prep32NightmareCheck.ts <dense.json[.gz]>:player|opponent ...
npx vite-node tools/integration/prep32FlatterWords.ts <dense.json[.gz]> ...
```
Probes need the vendor libmgba-py / venv (set in the scripts; the shell prints segfaults on mGBA teardown, outputs are complete).

## 7. Papercuts

- PAPERCUT: `vite-node` drops the script path from `process.argv`, so an `argv[1].endsWith(...)` main guard silently never runs; split library and entry files instead, ~3 minutes.
- PAPERCUT: the accepted Flatter / Nightmare harnesses hard-code species, genders and hp (`flatterActualCore.ts liveConfig`, `verifyNightmareReducer.ts nightmareConfigFor`), so alternate windows need their own field profile from the window's parties, ~2 minutes.
