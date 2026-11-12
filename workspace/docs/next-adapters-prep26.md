# Next adapters prep 26: source-derived provider prototypes for MOVE_ICE_BALL (301) and MOVE_REVENGE (279); MOVE_SUPERPOWER (276) not reached (S10A, side lane)

Evidence + prototypes; **new files only** (no tracked file edited; no `src/`, adapter, `PROGRESS.md` / `ISSUES.md` / ledger change). Method = `docs/next-adapters-prep24.md` (full per-age input model checked field by field, then fed to the **unchanged** renderer) with the prep20 OAM assembler shape. Every emulator number is a ROM frame: the accepted corpora (`tools/compare/fixtures/ice-ball/`, `tools/compare/evidence/revenge-*`) or an **independent direct mGBA run** (shared HTTP oracles never contacted). Every relied-on alternate probe ran **twice from fresh processes, byte-identical (`cmp`)**; the checkers ran twice and their 12 receipts compared (`cmp`, all identical). Base `e47c0cd7c`.

## 0. Results

### 0.1 Verdicts

| Move | Verdict | Field checks (windows / rows) | Existing renderer fed with prototype inputs vs raw ROM RGB |
|---|---|---|---|
| **Ice Ball 301** (all 5 counter bodies) | **ASSEMBLER + MODEL EXACT in 18/18 windows** for every per-age input the renderer reads, given the **H lag rows** (§1.4, measured from the Random2 stall, an input) | 18 windows / **1535 rows**: hardware OAM **194176/194176** entries, hardware matrices 1517/1517 rows (rows >= 1), registers (21), battleBg, hardwarePalette / fadedPalette / unfadedPalette (512 words), live tasks (slot, callback, data[0..15]), chunk sprite (x2, y2, callback, data), shard sprites (slot, x2, y2, data[0..4]), target x2: **every row exact** | **1535/1535 rows, 0 px** (accepted player 5 bodies + accepted opponent 5 bodies, alternate GLALIE -> GOLEM / REGISTEEL player 5 bodies, alternate opponent 3 bodies) |
| **Revenge 279** | **ASSEMBLER + MODEL EXACT in 4/4 windows** (two H bits, §2.4) | 4 windows / **580 rows**: hardware OAM **73728/73728**, matrices 576/576 rows, registers, battleBg, three palettes, tasks, target x2: **every row exact** | **580/580 rows, 0 px** (accepted player + opponent, alternate MACHOKE -> GOLEM both orientations) |
| **Superpower 276** | **NOT REACHED** (probes only; §3) | none | none |

Windows: Ice Ball = accepted `{player,opponent}-dense.json.gz` (5 bodies each, 76 / 132 rows per body) + `prep25-ice-ball-alt-{player,opponent}-glalie-golem.json` (alt player: 5 bodies, the target becomes REGISTEEL after the first opponent faints; alt opponent: 3 bodies, the probe stops there, prep25 §B.2). Revenge = accepted `revenge-{player,opponent}-dense-state.json.gz` (145 rows) + `prep25-revenge-alt-{player,opponent}-machoke-golem.json`. Probe outputs: `sh tools/integration/prep26Probes.sh` (8 processes, r1 == r2 byte-identical, printed `probes: r1 == r2 byte-identical`). Superpower alternates (`prep25-superpower-alt-*-machamp-golem`) also ran twice identical (`prep26Probes.sh superpower`); never consumed.

Negative controls (receipts `fixtures/prep26/*-neg-*.json`, accepted windows only): Ice Ball OAM frozen at row 0 **243/872** rows exact (809 k px); chunk / ice palette perturbed 401/872 (2.49 M px); registers frozen 734/872 (2.37 M px); shard Random2 word perturbed 673/872 (67 k px); lag rows shifted by 3 -> field check fails on `registers / hardwarePalette / unfadedPalette / tasks` (accepted opponent body 5: 5 of 7 fields). Revenge: OAM frozen 170/290 (118 k px), palette perturbed 44/290 (343 k px), registers frozen 234/290 (28 k px).

### 0.2 What is source-derived, measured, lent (classes as prep24)

**S** source program, **K** known-entry constant, **A** battler anchor, **P** asset palette, **L** lent, **M** measured constant (named, cause not found in the source), **H** frame phase (not derivable).

| Class | Ice Ball | Revenge |
|---|---|---|
| S | chunk arc (`InitIceBallAnim` / `AnimThrowIceBall`: `linearTranslationDeltaQ8`, 30 ticks, sine arc -40, anim frame 0 then 16 x (1..4) every 4 rows), affine matrix `65536 / {0xe0,0x118,0x150,0x180,0x1c0}`, shard words (2 Random2 per shard at step 37, `(w & 0xff) + 256`, `w & 0x1ff` folded), shard motion (`data[3] += randA`, x2 sign by bit 0, 20 callbacks), `AnimTask_ShakeTargetBasedOnMovePowerOrDmg` data / x2 (`power = 30 << counter`, `/12` clamped 1..16, `+d13 / -d14`), Task_FadeToBg chain (BLDCNT 0xe8, BLDY 1..16 / 15..0, tState 1 -> 2 -> 3, LoadMoveBg at C+19), sprite slots + matrix id lowest-free | small scratch (3 anim cmds x 4 rows), lunge (attacker x2 +4 x6, hold, -4 x5), big scratch (2 cmds x 6), persist hit splat (matrix 303 = 65536 / 0xd8, 18 rows), `AnimTask_ShakeMon2` x2 / task data, Task_UpdateMonBg / Task_ClearMonBg data and BG1 / BG2 scroll, BlendPalette toward red (y 2..8), `bg*cnt` formula, `bldcnt / bldalpha` (setalpha 12, 8), opponent-attacker x negation + flip anims, slots + matrix ids lowest-free |
| K | healthbox 9-entry block, dummy entry, battler art attrs, tile bases / palette banks of chunk / crystals (attr2), chunk matrix id (lowest free bit of the activation `matrixBitmap`), activation registers + palettes (row 0), body registers (`win0` row >= 1), script rows (chunk step 7, fade C1 = 7, C2 = 7 + 37 + 1 + 45 + 2 = 92, shards + shake step 37) | same blocks; script rows: monbg 4, setalpha 7, small 7, lunge 76, big 82, splats 99 / 109, clear 128, `loadspritegfx` windows 1 / 73 / 96, impact palette row 96 |
| A | `attackerPic`, `targetPic` (Y_PIC_OFFSET anchors; taken from the chunk row 7 / shard row 37 sprites) | attacker / target / target-pic anchors (from the small scratch, big scratch, splat births) |
| P | chunk palette (`ice-ball.json`), crystals (`battle-anim-ice-crystals.json`), ice BG (`icy-wind.json`) | purple scratch (`revenge-purple-scratch-swipe.json`; the swipe palette is identical, no diff at row 73), impact (`battle-anim-hitsplat.json`) |
| L | sprite order (`spriteOrder` of the state row) | sprite order |
| M | -- | the blend-cycle arm rows **[21, 34, 46, 58]** (a 5-row gap between the last fade step and the next arm, first fade step +2 then +3 after the arm; the BeginNormalPaletteFade `gPaletteFade.active` clear latency is not derived) |
| **H** | **lag rows** (0-step frames; accepted player body 4 row **38**, accepted bodies 5 row **112**, none in the alternates; §1.4) | **`bg*cnt` row**: 5 (accepted player, both alternates) or **4** (accepted opponent); with row 4 the monbg init writes `hofs / vofs` of the same row |

### 0.3 Mismatch classes found while building (all resolved)

| Class | Move | Cause | Resolution |
|---|---|---|---|
| target OAM x lags the target's own x2 by one extra row | Ice Ball | the shake x2 is written by a **task** (RunTasks after BuildOamBuffer), the chunk / shard x2 by sprite callbacks | target attr x from the task step - 1 (the only reason the first run was 67/75 rows) |
| alternate chunk matrix id | Ice Ball | the alternates allocate the chunk to matrix 2 (the accepted pair: matrix 0) | matrix id = lowest free bit of the activation `matrixBitmap` (K) |
| faded / hardware palette baseline | both | `fadedPalette` row 0 differs from `unfadedPalette` at banks 6..17 | three separate baselines (hardware / faded / unfaded row 0) |
| body registers vs row 0 | both | first body: `win0 = 240,161` at row 0, `0,0` from row 1 | `registersBody` (row 1) |
| lag row 38 (accepted player body 4) | Ice Ball | the shake task was created at step 37 but its RunTasks step ran one row later (row 37 data[0] = 0); sprites hold at the lag row; hardware OAM repeats the previous row (the transfer was missed) | `lagRows` (sprites / OAM) = stall row, `taskLagRows` = stall row - 1, init-only task state at the creation row |
| restorebg lag (accepted bodies 5) | Ice Ball | tState 3 / BLDY hold shifted by one row from row 111 (stall row 112 in the RNG, task step row 111) | same rule: tasks e(r) = r - #(lag <= r) with lag rows stall - 1 |
| healthbox profile | harness | `iceBallConfigFor` / `revengeConfigFor` read `parties[0]` hp; the alternate player body 4 / 5 target is party[1] (REGISTEEL), party[0] is 0 hp | the pixel script feeds the **active battlers'** hp (`battlers.*.hp`), 0 px afterwards (outside the move; production reads the live battler) |
| species names | harness | `iceBallConfigFor` hard-codes SPHEAL / REGISTEEL, `revengeConfigFor` MACHAMP / QWILFISH / SHUCKLE | species map in the pixel script (the target changes mid-sequence) |

## 1. Ice Ball (`Move_ICE_BALL`, `battle_anim_scripts.s`, `src/animation/iceBall.ts`)

### 1.1 Field table (what `iceBallDisplayPlan` + the renderer read per age; `battleScene.ts:24991-25100`)

| Renderer read | Provider |
|---|---|
| `buffers.hardwareOam` + `hardwareMatrices` (chunk by tile range, shards by `crystalsTileBase + 6`, battlers by attr2) | `prep26IceBallAssembler.ts` `assembleIceBallHardwareOam` |
| `palette.hardware` banks 2-4 (battle / ice BG), OBJ banks 7 / 8, battlers | `iceBallModel().hardwarePalette` |
| `registers.bldy` (darken of the BG, counter 4) | model registers (BLDCNT 0xe8 / BLDY staircase) |
| `resources.chunkTileBase / crystalsTileBase` | K (`chunkTile`, `crystalTile`) |
| reducer: sprites, `rng`, `background.phase`, `source` | the existing reducer (`iceBallAtAge`); the prototype re-derives its sprite fields independently (chunk, shards, target x2 checked against the corpus) |
| `tasks`, `battleBg`, `unfadedPalette`, `fadedPalette` | not read by the branch; produced and checked anyway (the live `animationInputs` carry them) |

### 1.2 Program, in step indices `e` (`e(row)` = row - number of lag rows <= row)

Prologue: `loadspritegfx` palettes unfaded at e = 1 (chunk) / 4 (crystals), hardware one row later. Counter 4 only: `fadetobg BG_ICE` task armed at C1 = 7 (BLDCNT 0xe8 at C+1, BLDY 1..16 at C+2..C+17, hold 16 to C+20, ice palette unfaded at C+19, BLDY 15..0 at C+21..C+36, destroyed C+37); chunk created at e = 7, 30 ticks, destroyed e = 54 (anim 1 from e = 37); shards (5 / 7 / 9 / 10 / 10, lowest-free slots after the chunk) + shake task at e = 37 (slot 0, or slot 1 under the fade task); `waitbgfadein` + `delay 45` + `restorebg` -> C2 = 92 (default BG back: unfaded at C2 + 19).

### 1.3 Words / request counter

`shardWords(k)`: Random2 stream from the activation value, one step per non-lag frame, 2 words per shard after 37 steps (matches the reducer's `presentationRngAtAge` and the corpus `animationRng` on every row). Production: `LIVE_MOVE_RANDOM2_PLANS[301] = [{ ageOffset: 37, count: 2 * shards }]`, shards `[5, 7, 9, 10, 10][counter]`, the counter = `rolloutTimerStartValue - rolloutTimer - 1` (`AnimTask_GetIceBallCounter`, `battle_anim_ice.c:1609`) = the `request.rolloutCounter - 1` already carried for Rollout (`liveMoveAnimation.ts:672`, `:2239`).

### 1.4 The H bit: lag rows

Measured as rows with an unchanged `animationRng` (RfuMain1 does not step): accepted player body 4: row 38; accepted bodies 5: row 112 (both orientations); none in accepted bodies 1-3, accepted opponent body 4, **every alternate body** (alternate player body 5 is 131 rows, accepted 132). A lag row (a) repeats the previous hardware OAM, (b) holds sprite state, (c) the task step happens one row earlier (stall - 1). Neither the position nor the existence of a lag row is derivable from the source (VBlank overrun, CPU timing); they are an **input** of the prototype. Production recipe: assume no lag (the dominant case: 15 of 18 windows have no lag row) and accept the +-1 row residual, or gate on a measured phase; the live renderer has no VBlank phase.

## 2. Revenge (`Move_REVENGE`, `src/animation/revenge.ts`, `battleScene.ts:25248`)

### 2.1 Field table

The renderer reads `buffers.hardwareOam / hardwareMatrices`, `palette.faded` (monbg at age 4) and `palette.hardware`, `registers.bldcnt / bldalpha` (alpha blend of the splats), `background.scroll` (= the signed BG1 / BG2 `hofs / vofs` registers), `resources.*TileBase / *Loaded` (loadspritegfx windows), `monbg` (age). The prototype produces all of them plus `tasks`, `battleBg`, `unfadedPalette`, target x2.

### 2.2 Check numbers

`fixtures/prep26/revenge-check.json`: accepted player / opponent, alternate player / opponent: OAM entries 18432 / 18432 per window (144 rows x 128), matrices 144 / 144, and 145 / 145 rows for registers, battleBg, hardwarePalette, fadedPalette, unfadedPalette, tasks, target x2.

### 2.3 Pixels

`fixtures/prep26/revenge-pixels.json`: 145/145 x 4, 0 px. Row 0 uses the corpus buffers (pre-activation, as prep20 / prep24).

### 2.4 H bits and M

`bg*cnt` row 5 (accepted player, alternate player, alternate opponent) or 4 (accepted opponent), the same class as prep24 Return's `monbgCntRow`. The blend-cycle arm rows are an M constant (§0.2).

## 3. Superpower (276): not reached

Time box. Probes ran twice identical (`prep26Probes.sh superpower`, 4 processes). Inventory from the accepted corpus (248 rows, `superpower-*-dense-state.json.gz`): monbg on BG2 rows 10..245 (`bg2cnt` row 10, `bg1cnt` row 13), `splitbgprio`, `bldcnt/bldalpha` 13..192 / 242, a `gShakeMonOrBattlePlatform` sprite (slot 4, rows 35..215) driving `bg3vofs` = 508 / 0 every 2nd row from row 37 (`gBattle_BG3_Y` -4 / 0), `gSuperpowerOrbSpriteTemplate` (slot 3, rows 13..209; `AnimSuperpowerOrb_Step` then `AnimTranslateLinear_With...` from row 192, `DestroySpriteAndMatrix`; affine matrix), five `gSuperpowerRockSpriteTemplate` (rows 77, 87, 97, 107, 117; `AnimSuperpowerRock_Step1` -> `Step2` at ~197, each with its own arc args 120 / 112 / 104 / 96 / 88), `gSuperpowerFireballSpriteTemplate` (created ~190), `AnimTask_ShakeMon2` target rows 216..240, ClearMonBg 242..244, palette events at rows 1 / 4 / 7 / 10 (circle of light, meteor, flat rock, partner). The orb / rock / fireball programs (`battle_anim_fight.c` / `battle_anim_rock.c`) were not derived; estimate 40-60 min (three sprite programs with affine matrices, no Random2). The BG3 shake and monbg parts follow prep24 Return / prep26 Revenge directly.

## 4. Integration plan (no src change made here)

1. **Ice Ball**: `src/engine/liveIceBallInputs.ts` next to `liveOamMoves.ts` (port `prep26IceBallAssembler.ts` + `prep26IceBallModel.ts` 1:1 as `liveIceBallInputs(args)` returning `{ duration, animationInputsAt(age) }`, shape of `liveWillOWispInputs` `liveOamMoves.ts:89` / `liveCurseStatsInputs :394`): replace `known.*` by `liveBattlerAnchors` (pic offsets), `prepareLiveMoveSpriteAllocator` (occupied slots, tile / bank ids, matrix bitmap), the host `composeLivePalettes` (palette0 / faded0 / unfaded0), host registers, `liveMoveOamAssembler.ts` `carryLiveSpriteOrder :52` for the lent order, `lagRows = []`.
2. `liveMovePresentationRng.ts:26` add the counter-keyed plan for 301 (the table is move-keyed; `:61` `LIVE_MOVE_RANDOM2_PLANS[request.moveId]` needs the request counter, like Rollout's body count).
3. `liveMoveAnimation.ts`: duration in `liveMoveAnimationDuration :473` (counter 0..3: 75 + 1; counter 4: 131 + 1 with the lag row, H), wire in the oam1 block next to Will-O-Wisp / Curse (`:2597`, `:2621`, import `:84`), counter from `request.rolloutCounter - 1` (`:672`, `:2239` precedent), first-body gate (corpus bodies follow a Tackle), decline shiny battlers.
4. **Revenge**: `src/engine/liveRevengeInputs.ts`, same shape (port `prep26RevengeAssembler.ts` / `Model.ts`), duration 144 / 145 both sides, `monbgCntRow = 5` (dominant, 3 of 4 windows), no Random2 plan (prep25 §0.1.1).
5. **Superpower**: one more prototype pass (§3) before wiring.
6. Expected dense acceptance with the lag-free assumption: Ice Ball 15 of 18 windows framebuffer-exact; the three lag windows (accepted player bodies 4 and 5, accepted opponent body 5) lose one row of the shake / fade.

## 5. Not reached / limits

- Superpower (§3). A second alternate pair per move (one alternate pair each, as prep25). Alternate opponent Ice Ball bodies 4 / 5 (the prep25 probe stops after 3 bodies). Doubles. Ice Ball with a non-zero attacker idle rest (all windows zero). Shiny battlers.
- The lag rows (Ice Ball) and the `bg*cnt` row (Revenge) are inputs, not derived; the sprite order and the healthbox / dummy block are lent / known-entry (prep20 G1). The blend-cycle arm rows are measured. The script row constants (chunk step 7, C2 = 92, Revenge rows 7 / 76 / 82 / 99 / 109 / 128, loadspritegfx windows) are checked in 18 + 4 windows but only the Ice Ball C2 chain is written as a derivation from the script waits; Revenge's rows are named constants checked equal across windows.
- `iceBallConfigFor` / `revengeConfigFor` harness limits (§0.3) are not fixed here (tracked files).

## 6. Files

| File | Role |
|---|---|
| `tools/integration/prep26IceBallAssembler.ts` | Ice Ball sprite programs (chunk, shards, shake) + hardware OAM / matrices assembler |
| `tools/integration/prep26IceBallModel.ts` | registers / battleBg / three palettes / tasks / sprite fields |
| `tools/integration/prep26IceBallCheck.ts` / `prep26IceBallPixels.ts` | field check (+ `--neg=lag|words|palette`); renderer pixel check (+ `--neg=oam|palette|registers|words`) |
| `tools/integration/prep26RevengeAssembler.ts` / `prep26RevengeModel.ts` | Revenge OAM + matrices; registers / battleBg / palettes / tasks |
| `tools/integration/prep26RevengeCheck.ts` / `prep26RevengePixels.ts` | field check; pixel check (+ `--neg=oam|palette|registers`) |
| `tools/integration/prep26Summary.py` | per-window OK / failing-field summary of a check receipt |
| `tools/integration/prep26Probes.sh` / `prep26Run.sh` | probes (each scenario twice, cmp'd; `iceball revenge superpower`) / the whole reproduction |
| `tools/integration/fixtures/prep26/*.json` | 12 compact receipts (counts, mismatch rows; no RGB, no mGBA logs) |

## 7. Reproduce

```sh
sh tools/integration/prep26Run.sh                                    # probes (~1 min) + checkers + pixels (~3 min); OUT=/tmp/p26/alt, receipts -> tools/integration/fixtures/prep26/
OUT=/tmp/p26/alt REC=/tmp/rec2 SKIP_PROBES=1 sh tools/integration/prep26Run.sh   # second checker pass; cmp the receipts (identical)
STAGES=iceball sh tools/integration/prep26Run.sh                     # one move
python3 -I tools/integration/prep26Summary.py tools/integration/fixtures/prep26/iceball-check.json
npx vite-node tools/integration/prep26IceBallCheck.ts <alt.json>:player|opponent ... [--out=out.json] [--neg=lag|words|palette]
npx vite-node tools/integration/prep26IceBallPixels.ts <alt.json>:<rgbDir>:player|opponent:ATT,TGT ... [--neg=oam|palette|registers|words]
```
Probes need `PYTHONPATH=../../vendor/libmgba-py` and the vendor venv (set in the scripts; the shell prints segfaults on exit: mGBA teardown, outputs are complete).

## 8. Papercuts

- PAPERCUT: macOS has no `timeout`; `timeout 560 wait` failed, the probe subshells were left running and a second launch wrote the same output files concurrently, the final run script re-ran everything cleanly, ~4 minutes.
- PAPERCUT: `iceBallConfigFor` hard-codes SPHEAL / REGISTEEL and reads `parties[0]` for the healthbox profile (the alternate player's second target is party[1]); `revengeConfigFor` hard-codes MACHAMP / QWILFISH / SHUCKLE, ~6 minutes.
- PAPERCUT: `sed -i` on macOS needs `-i ''`; `prep25` probe scripts take one scenario key per argument (as noted in prep25), ~2 minutes.
