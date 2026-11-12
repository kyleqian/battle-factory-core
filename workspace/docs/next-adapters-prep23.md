# Next adapters prep 23: source-relative MOVE_CURSE (174) reducer prototypes (S10A, side lane)

Evidence + design; **new files only** (no tracked file edited; no `src/`, adapter, ledger or `PROGRESS.md` / `ISSUES.md` change). Method = `docs/next-adapters-prep20.md`: a pure source-derived model that **replaces** the corpus inputs of `curseAtAge` (`src/animation/curse.ts:86-106` passes `ownedSprites / liveTasks / buffers / palette / registers / battleBg` straight through), checked field by field per row against the retained corpora and fresh alternates, then fed to the **unchanged** renderer (`battleScene.ts:25091` CURSE branch). Every emulator number is a ROM frame from an **independent direct mGBA run** (shared HTTP oracles never contacted); every alternate probe ran **twice from fresh processes, byte-identical (`cmp`)**; both check runs (and the receipts) were compared (`cmp`). (`docs/next-adapters-prep22.md` is not on this branch; its conventions were taken from prep14/prep20.)

## 0. Results

### 0.1 Verdicts

| Variant | Verdict | Field checks (rows exact / rows) over 5 (stats) / 4 (ghost) windows | Renderer with the model's inputs vs ROM RGB |
|---|---|---|---|
| **Stats (non-Ghost)** | **MODEL EXACT** on every field in 5/5 windows | hardwareOam (128 entries/row, rows 1..175): **875/875**; hardwareMatrices **880/880**; registers (all 21) **880/880**; battleBg **880/880**; hardwarePalette (512 words) **880/880**; live tasks (slot, callback, data[0..15]) **880/880** | **879/880 rows, 0 px** in 4/5 windows; Onix/Pidgeot row 142: 25 px, **identical with the corpus inputs** (renderer gate, §0.4) |
| **Ghost** | **MODEL EXACT** except one scroll-register phase class (2 rows of 1492) | hardwareOam **1488/1488**; tasks **1492/1492**; battleBg **1492/1492**; hardwarePalette **1492/1492**; registers **1490/1492** (2 rows, class R1 below) | accepted player/opponent **746/746 rows, 0 px**; alternates **744/746 rows**, the 2 misses are **row 26 only** (135 px / 15 px), the palette scanout-transfer scanline (class P1), **identical with the corpus inputs** |

Windows: accepted `curse-{stats,ghost}-{player,opponent}-dense-state.json.gz` (176 / 373 rows each); alternates (fresh probes, each x2 identical): `prep14-curse-stat-alt-miltank-golem` (MILTANK player -> GOLEM), `prep23-curse-stat-altopp-miltank-golem` (opposite orientation), `prep23-curse-stat-alt2-onix-pidgeot` (ONIX: tall 64x64 picture, different elevation, vs PIDGEOT), `prep14-curse-ghost-alt-gengar-golem`, `prep23-curse-ghost-altopp-gengar-golem` (opposite orientation). Not reached: a ghost alternate with a different picture size (both ghost alternates are Gengar vs Golem).

### 0.2 Mismatch classes found while building (all resolved unless listed)

| Class | Variant | Cause | Resolution |
|---|---|---|---|
| OAM x of the attacker 2 rows late | stats | the battler OAM x2 appears **2 rows** after the SwayMon sprite snapshot (`OAM_LAG`), the move-owned sprites 1 row | measured constant |
| copy-sprite OAM ends 4 rows after the sprite is destroyed; last palette-fade step 4 rows late; task visible 4 rows after destroy | stats | the end of `AnimTask_DrawFallingWhiteLinesOnAttacker_Step` (n = 64) is observed 4 rows late in OAM/palette (rows 144-148); the pure `UpdateNormalPaletteFade` simulation predicts the last y=0 blend 4 rows earlier | **kept as measured constants** `COPY_LAST_ROW = 147`, `FINAL_FADE_EXTRA = 4`, `DRAW_TASK_LAST_ROW = 145`; cause not found (**open: ~1 h source/ROM stepping**); equal in all 5 windows |
| BLDCNT/BLDALPHA/WIN rows | both | nail / ghost-sprite `SetGpuReg` is visible in the **same** snapshot row, task `SetGpuReg` one row later, `gBattle_WIN0H` one row later | event-frame convention, §1.2 |
| win0h/win0v 240/161 at row 0 only | stats alt (Miltank) | row-0 host leftover (reset at row 1); accepted corpora start at 0 | row 0 takes `activationRegisters`, rows >= 1 `bodyRegisters` (both K, from rows 0/1) |
| **R1** BG2 scroll registers 1 row early | ghost | `go` row 293 (target monbg on BG2) and `ga` row 7 (attacker monbg on BG2): `bg2cnt/bg2hofs/bg2vofs` appear in the row of the `gBattle_BG2_*` write instead of the next row; the same BG2 write is 1-row late in `gp` (row 8) and `gb` (row 293): a **VBlank-phase** effect of the capture, not of the move | **open**: 2 rows / 1492, cause = frame phase at activation (needs the live VBlank phase, not derivable from the source) |
| **P1** palette scanout transfer scanline | ghost | the mid-frame `CpuSet` palette write in `BeginNormalPaletteFade` at the first `Step2` row (26): `vcount / inHBlank` is **frame-phase** dependent; the fixture `tools/compare/fixtures/curse-palette-transfer-timing.json` is the accepted run's value | **open / genuinely missing**: row 26 residual 135 px (alt player) / 15 px (alt opponent), identical with the corpus inputs. A production adapter cannot know it; see §3 |

### 0.3 Field classification (per-age inputs of the Curse renderer)

Legend: **S** source program (move script + task/sprite callbacks, derived), **K** known-entry allocator constant (first body, equal across corpora + alternates), **A** battler anchor / art (production `liveBattlerAnchors`, species art), **P** assets-only palette composite, **L** lent (sprite order), **H** host/frame-phase, **M** genuinely missing.

| Input (`CurseLiveInputs`) | Stats | Ghost |
|---|---|---|
| `liveTasks` | **S** (SwayMon sine replay `battle_anim_mon_movement.c:751-800`; DrawFallingWhiteLines n/data `battle_anim_utility_funcs.c:278-345`; BlendColorCycleLoop numBlends flips at the second `BeginNormalPaletteFade`) | **S** (UpdateMonBg data from battler x/y; CurseStretchingBlackBg data `battle_anim_ghost.c:945-1034`; ShakeMon2 `battle_anim_mon_movement.c:155-250`; ClearMonBg) |
| `ownedSprites` | the copy sprite (`CreateInvisibleSpriteCopy`, slot 3: **K** lowest-free; attr = attacker attr with OBJ-window mode bit 0x800 and priority 0, **tile/bank = the attacker's own**, which is why prep14's "side-dependent bank/tile" (0/369 vs 1/473) is **derived**, not a constant) | nail (**S**: `AnimCurseNail` :1036-1120 replay), ghost (**S**: `AnimGhostStatusSprite` :1127-1175 replay), simple palette blend (invisible, no OAM) |
| `buffers.hardwareOam` | **S + K + L**: attacker x2 (Sway), copy sprite, battler art attr (A), 9-entry healthbox block (K, as prep20), dummy `{0x00a0,0x0130,0x0c00}`, walk of the lent order of row-1 | **S + K + L**: nail / ghost attrs (`0x4400` / `0x0400` blend shapes, tile base + 8 per nail count, bank K), battler hide windows `[9,288]` / `[295,368]` (monbg), lent order |
| `buffers.hardwareMatrices` | **K** (identity x32, no affine sprite) | **K** (identity) |
| `buffers.softwareOam / softwareMatrices` | not consumed by `curseDisplayPlan` (`curse.ts:108-123` reads `hardwareOam` + `hardwareMatrices` only) | same |
| `buffers.scanlineBuffers` | **K** (all-zero, constant in 176/176 + 373/373 rows: no HBlank DMA effect) | **K** (constant) |
| `registers` | **S + K**: WININ/WINOUT/BLDCNT/BLDALPHA/BG1CNT/DISPCNT writes of `AnimTask_DrawFallingWhiteLinesOnAttacker` (`:279-345`), BG1 scroll `32 - sprite.{x,y} - 4*(n%16)` one row after the task step; activation block **K / lent** (§3) | **S + K**: stretch window (`WIN_RANGE` + the `0.0625` double math truncated as `u16`), BLDY 16, monbg BGnCNT `(cnt & ~0xc003) \| 0x4000 \| 2`, BGn scroll `-(x+x2)+32`, nail/ghost BLDCNT/BLDALPHA sequences |
| `battleBg` | **S** (`gBattle_BG1_X/Y` = `32 - sprite.{x,y} - 4*(n%16)`, written by the task step, 880/880) | **S** (`gBattle_BGn_X/Y` = the monbg scroll; immediate, registers lag one row) |
| `palette.hardware` (+faded/unfaded: not consumed) | **S + A + P**: `BlendPalette` (`util.c:264`) of the attacker OBJ bank towards RGB_RED by the `BeginNormalPaletteFade` y schedule (0..10..0 step 2, period 6), BG idx 129 = white (`sCurseLinesPalette`) | **S + P + A**: nail / ghost palettes are **assets** (`src/animation/assets/curse.json`, BGR555 = `c >> 3`), monbg BG banks 8/9 = copy of the battler OBJ bank, BG banks 1-3 black fade (16 at row 26, 14..0 step 2 / 3 rows from 340) |
| `paletteScanoutTransfer` | none | **H / M** (P1) |
| `resources` (nail/ghost tile base, loaded) | n/a | **K** (allocator: bank 7 tile 305 / bank 8 tile 337) |
| `order` | **L** | **L** |
| `audio`, `gameplayRng`, `gameplayState`, `animationRng` | echo / no pixel consumer (no Random2); `liveCounts` echo | same |

### 0.4 Pixels (existing renderer, no src change)

`tools/integration/fixtures/prep23/stats-pixels.json`, `ghost-pixels.json`. Stats: accepted player/opponent 176/176 rows, 0 px each; Miltank/Golem both orientations 176/176, 0 px; Onix/Pidgeot 175/176, row 142 = 25 px. **Renderer finding** (identical with the corpus inputs, so not the model): the falling-lines mask gate `view.tasks.some(... _Step && task.data[11] < 4)` (`battleScene.ts:25209`) switches the mask off at row 142 (data[11] = 4) while the ROM keeps the white lines until the registers reset at 145; a 64x64 sprite (Onix) exposes 25 px on that one row. A gate keyed on `dispcnt & 0x8000` + `bldcnt` (both already read) would be exact. Ghost: accepted 373/373 each, 0 px; alternates 372/373 (class P1 row 26).

## 1. The models

### 1.1 Files (all new)

| File | Role |
|---|---|
| `tools/integration/prep23CurseStats.ts` | stats model: `swayAtStep`, `blendCycleSchedule` (BeginNormalPaletteFade state machine), `curseStatsRow(row, known)` -> `{hardwareOam, hardwareMatrices, registers, hardwarePalette, tasks}` |
| `tools/integration/prep23CurseGhost.ts` | ghost model: `shakeMon2`, `stretchWin`, `nailSim`, `ghostSim`, `curseGhostRow(row, known)` -> `{hardwareOam, registers, battleBg, tasks, hardwarePalette}` |
| `prep23CurseStatsKnown.ts`, `prep23CurseGhostKnown.ts` | the **known-entry block** read from rows 0/1 of a corpus (allocator slots, healthbox block, battler art/anchors, nail/ghost anchors and tile bases, activation registers/palette, lent order callback): the only corpus reads, none per-age |
| `prep23CurseStatsCheck.ts`, `prep23CurseGhostCheck.ts` | field-by-field per-row comparison |
| `prep23CurseStatsPixels.ts`, `prep23CurseGhostPixels.ts` | feed the model into `createSceneOnMovePresentation` + `render` (config via `tools/compare/curseProduction.ts` `curseConfigFor`, then OAM / matrices / registers / battleBg / palette / tasks replaced) |
| `prep23Probes.sh`, `prep23Run.sh` | reproduction |
| `tools/battle-lab/prep23-curse-*.json` | 3 new alternate scenarios |

### 1.2 Row / frame convention (measured, all 9 windows)

A script command in frame `c` creates the object in frame `c`; the snapshot row `r` shows the state after frame `r` (objects are first visible in row `c+1`); a task `SetGpuReg` / `gBattle_*` write in frame `f` is visible in the registers of row `f+1`; nail / ghost-sprite `SetGpuReg` are visible in the same row; the battler OAM follows its sprite by 2 rows (x2) and the hide window by monbg (`UpdateMonBg` row + 2, `ClearMonBg` first row; `[9,288]` / `[295,368]`); `hardwareOam[row]` = walk of the lent order of row-1 over the sprite state (prep20 §0.1). Script timing: `waitforvisualfinish` releases one row after the last task row, `delay N` = N + 2 rows (stats: Sway end 64 -> 65 -> DrawFalling 77; ghost: stretch end 32 -> 33 -> nail 55 -> shakes 117/160/203 -> ClearMonBg 288 -> monbg2 293 -> ghost sprite 296 -> simple blend 337 -> ClearMonBg 368).

### 1.3 Stats (non-Ghost) body

SwayMon (`AnimTask_SwayMon`, horizontal, amplitude ±10 by side, period 1536, 3 sways) -> 64 rows of `x2 = Sin(waveIndex, amp)` (GBA sine table, arithmetic shift), data[10] as a wrapped s16, toggles `data[11]/[12]`, end at the third toggle (row 64) -> delay 10 -> DrawFallingWhiteLinesOnAttacker (copy sprite slot 3, BG1 mask scroll, BLDCNT 0x3f42 / BLDALPHA 0x0c08 / WINOUT 0x3f3d, `DISPCNT ^= 0x8000` at the end) + BlendColorCycle (attacker palette -> red, `BeginNormalPaletteFade(delay 4)`: y = 2 per 6 rows to 10, hold, 8..0). The OBJ-window copy is the attacker's attr with `attr0 | 0x800`, priority bits cleared (`gMultiuseSpriteTemplate`, `CreateInvisibleSpriteCopy`).

### 1.4 Ghost body

monbg(attacker) at row 7 -> `AnimTask_CurseStretchingBlackBg` (WIN0 stretch 16 steps from `(startX 200|40, 40)`, then BG banks 1-3 faded to black, regs reset when the fade finishes) -> nail sprite (`AnimCurseNail`: `x = anchor ± 24`, `x2 ∓= 2`/row after a 60/40/40-row wait, tile + 8 per hop, three hops, then BLDALPHA 16->0 in 3-row steps, then End) with three `AnimTask_ShakeMon2` (x2 ±4, 10 shakes, delay 0) -> clearmonbg -> monbg(target) + `AnimGhostStatusSprite` (x2 = `Sin(d0, 12)` negated for an opponent user, y2 = -n, BLDALPHA 0x050b -> (0,16) over 11 steps after 30 rows) + ShakeMon2 (±2, 14 shakes, delay 1) -> simple_palette_blend fade-in -> clearmonbg.

## 2. Check numbers (frame by frame, field by field)

`tools/integration/fixtures/prep23/{stats,ghost}-check.json` (`rows`, `oamRows`, `oamRowsExact`, `tasksExact`, `regsExact`, `bbgExact`, `palExact`, `matExact`, mismatch row lists):

| Window | Rows | OAM | tasks | registers | battleBg | palette | matrices |
|---|---|---|---|---|---|---|---|
| stats accepted player (SNORLAX) | 176 | 175/175 | 176 | 176 | 176 | 176 | 176 |
| stats accepted opponent | 176 | 175/175 | 176 | 176 | 176 | 176 | 176 |
| stats alt Miltank->Golem player | 176 | 175/175 | 176 | 176 | 176 | 176 | 176 |
| stats alt Miltank->Golem opponent | 176 | 175/175 | 176 | 176 | 176 | 176 | 176 |
| stats alt Onix->Pidgeot player | 176 | 175/175 | 176 | 176 | 176 | 176 | 176 |
| ghost accepted player (HAUNTER) | 373 | 372/372 | 373 | 373 | 373 | 373 | const |
| ghost accepted opponent | 373 | 372/372 | 373 | **372** (R1 @293) | 373 | 373 | const |
| ghost alt Gengar->Golem player | 373 | 372/372 | 373 | **372** (R1 @7) | 373 | 373 | const |
| ghost alt Gengar->Golem opponent | 373 | 372/372 | 373 | 373 | 373 | 373 | const |

Row 0 is the pre-activation frame and is not assembled (OAM) (as prep20); its registers/palette/tasks are produced and checked.

## 3. Integration brief

**Where it lives.** Port the two models 1:1 into `src/animation/curse.ts` (extend; it already owns `CurseLiveInputs`, `curseSourceAtAge`, `curseDisplayPlan`) as `curseStatsInputsAtAge` / `curseGhostInputsAtAge`, **or** a new `src/engine/liveCurseInputs.ts` that returns the `SceneOnCurseConfig.animationInputs` (`sceneOnPresentation.ts:2833`) so `curseAtAge` (`curse.ts:86`), `sceneOnCurseView` (`sceneOnPresentation.ts:9188`), the CURSE renderer (`battleScene.ts:25091`) and `core.ts:434` stay unchanged. Recommendation: pure models in `src/animation/curseModel.ts`, provider in `src/engine` (no live CURSE provider exists today: `curseConfigFor` is verifier-only, `tools/compare/curseProduction.ts:80`). The only import is `GBA_SINE_TABLE_256` (`src/engine/battleMenu.ts:787`).

**Variant selector.** `Move_CURSE: choosetwoturnanim CurseGhost, CurseStats` (`reference/pokeemerald/data/battle_anim_scripts.s:7640`) picks by `gAnimMoveTurn & 1` (`battle_anim.c:1073`). The battle script sets it: `BattleScript_EffectCurse` (`data/battle_scripts_1.s:1482`) `jumpiftype2 BS_ATTACKER, TYPE_GHOST, BattleScript_GhostCurse` (animTurn 0 = **CurseGhost**); otherwise `copybyte gBattlerTarget, gBattlerAttacker; setbyte sB_ANIM_TURN, 1` (:1491-1492) = **CurseStats** (target aliases the attacker, `animationTargetArt`). So: **variant = ghost iff the attacker has TYPE_GHOST** (`src/engine/battleScriptCurseOpcode.ts` is the gameplay side of the same branch).

**Provider inputs.**

| Input | Source |
|---|---|
| attacker/target sprite x,y (monbg anchors, BG1 scroll), nail anchor, ghost anchor | `liveBattlerAnchors` (`liveMoveAnimation.ts:367`: `spriteCenter`, `picOffsetPoint`); nail anchor = attacker pic anchor, ghost anchor = target pic anchor (`InitSpritePosTo*(TRUE)`); prep14 geometry provenance shows `picOffsetPoint` equality for the same pattern |
| battler art attr words, slots, subpriority | the live battler sprite objects (`battleCommandFieldArt.ts`, as prep20 §4) |
| sprite slots / tile bases / banks | `prepareLiveMoveSpriteAllocator` (`liveMoveSpriteAllocator.ts:75`): copy slot 3, nail bank 7 tile 305, ghost bank 8 tile 337 (K under the known-entry route) |
| healthbox 9-entry block, dummy, healthbox slots | the prep20 host constants (same block) |
| order (row-1) | `lendLiveSpriteOrder` (`liveSpriteOrderHost.ts:377`), per row |
| palettes | assets-only: nail/ghost `curse.json`; battler OBJ banks from the species art; `src/engine/liveMovePaletteComposite.ts` for the activation composite |
| activation registers / palette | K for **first bodies** (`dispcnt 0xbf40`, `bg1cnt 0x9c00`, winin/out 0x3f3f); later bodies need the activation BG-register state (prep14 §1.4/§1.5 pattern) |

**Gates.** (1) **first body** for the activation registers (the model applies the source writes on top of the lent activation block, so a post-body activation works if the block is lent: `DISPCNT ^= 0x8000` and `bg1cnt` charbase are relative writes; not measured on a later body); (2) **order lend** per row (the OAM is exact only with the lent order); (3) **x2 history**: the stats SwayMon/ghost ShakeMon2 programs start from `x2 = 0` and the OAM carries the battler's activation attr (Onix/Pidgeot alt exact, i.e. an idle x2 is inside `attackerAttr`); (4) **ghost row 26** palette scanout transfer needs the live VBlank phase (P1) and the scroll-register phase (R1) is open: the production adapter should keep the existing fixture-timed transfer and accept the 1-row, 15-135 px residual on alternates, or gate the ghost branch behind a measured phase input.

**Expected dense acceptance.** Stats: 176 rows x 2 orientations (+ alternates): all five check classes exact, framebuffer 176/176 (apply the §0.4 renderer-gate fix for tall sprites). Ghost: 373 rows x 2: tasks / OAM / palette / battleBg exact, registers exact except R1, framebuffer 373/373 on the accepted phase, 372/373 on alternates (P1 row 26).

## 4. Reproduction

```
sh tools/integration/prep23Probes.sh                      # 10 mGBA processes, each scenario x2, cmp'd (the shell prints segfaults on exit: mGBA teardown, outputs are complete)
sh tools/integration/prep23Run.sh                         # checks + pixels + receipts into tools/integration/fixtures/prep23/
REC=/tmp/x sh tools/integration/prep23Run.sh              # second run; cmp the receipts
```
Alternates need `PYTHONPATH=../../vendor/libmgba-py` and the vendor venv (set in the scripts). Probe outputs: `/tmp/p23/` (not committed; 13 MB each).
