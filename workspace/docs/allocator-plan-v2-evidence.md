# Allocator plan v2 (affine matrix + task slots): ROM evidence and design

Side-lane worker, S10A. Evidence only; no production code. All runs are direct in-process mGBA (`tools/run-mgba-probe.py`, Scene ON
bootstrap `oracle/bootstrap/factory.json`), never the HTTP oracles. Every relied-on probe output was produced by two fresh
processes that were byte-identical (checked by `affineTaskBatch.py`, `affineTaskCallBatch.py`, `affineTaskCorpusBatch.py`).

## Answers first

1. **The baseline is a constant.** At the activation of every one of the 481 move/status bodies probed (195 BattleLab
   scenarios over 91 move ids, both orientations, many species, turn 1 and later turns, plus both ordinary-Factory traces) the state on the frame
   before `gAnimScriptActive` rises is `gOamMatrixAllocBitmap = 0x00000006` (matrices 1 and 2 held by the two battler sprites,
   player slot 6 = matrix 1, opponent slot 8 = matrix 2) and **no active task** (`gTasks[0..15].isActive == 0`).
   Evidence: `fixtures/affine-task/corpus-summary.json` (`baseline` of every body: 481 of 481 = `{bitmap: 00000006, tasks: []}`),
   `raw/factory-battle1-turn1-0.json`, `raw/factory-battle1-turn1-varB-0.json` (two different opponent leads and first moves: 104 Double Team / 157, and 157).
   The Factory route and the BattleLab route agree. Also constant: the occupied sprite set at that edge (`mask f000000000000147` =
   slots 0,1,2,6,8,60..63), i.e. the matrix/task baseline is exactly as constant as the sprite free order in `docs/sprite-order-factory-entry.md`.
2. **Every body is net-zero** for matrices, tasks and sprite slots at the frame `gAnimScriptActive` falls: 467 of 467 closed bodies
   (`corpus-summary.json`, `netZeroMatrix && netZeroTask && netZeroSprite`), and all 12 target moves (`plan.json`, `netZero`, `netZeroSprites`).
   The 14 corpus bodies that are not net-zero are all `fallFrame == null`: the trace ended mid-body (status/stat animations), not a leak.
3. **Known-baseline replay is exact.** Replaying each target body's exact call list (`calls/*.json`) from the baseline with the model
   "AllocOamMatrix = lowest free bit, CreateTask = lowest inactive slot, CreateSprite = lowest/highest free slot" reproduces every ROM return
   value: 0 mismatches in 24 target bodies + 7 extra bodies (`plan.json`, `replayMismatches`, `tools/integration/affineTaskPlan.py`).
   The accepted per-age matrix/task state (`tools/compare/evidence/*-dense-state.json.gz`) matches the ROM probe at every age
   (0 differing ages in 24 move/orientation windows, `fixtures/affine-task/accepted-compare.json`, `affineTaskCompare.py`).
4. **Caveat that shapes the design: task slots are not derivable from the visible table.** Bodies create and destroy tasks inside one frame
   (`Task_InitUpdateMonBg` takes slot 0 then creates `Task_UpdateMonBg` in slot 1 and destroys itself at age 7 of Swift, Frustration,
   Seismic Toss, Uproar, Razor Wind body 1; `AnimTask_GetFrustrationPowerLevel`, `GetSeismicTossDamageLevel`, a second `ShakeMon2`,
   `BlendBattleAnimPal` in Thunderbolt...). Per-frame sampling misses them (`affineTaskLowestFree.py` flags 1-4 apparent violations per body, all of
   this kind); the exact in-frame call probe resolves them (`affineTaskCallProbe.py`). So v2 must be an **ordered op timeline per move**, not a pool.
5. **A baseline is only valid until a faint/switch.** After a KO (Guillotine, Psychic, Hi Jump Kick, Focus Punch corpus rows) one battler matrix is freed
   (`settled bitmap 00000004/00000002`, `corpus-summary.json` `settledNetZero:false`, 7 bodies) and a task `Task_DuckBGMForPokemonCry` appears.
   Same invalidation trigger as the sprite host. Post-faint send-out baselines were not measured.
6. **Verdicts** (section 4): READY-WITH-V2 for SWIFT, TRICK, and (first body after the known entry, with the existing first-body order seam)
   THUNDERBOLT, FRUSTRATION, HORN_DRILL, SEISMIC_TOSS, AURORA_BEAM, STOCKPILE, UPROAR, ZAP_CANNON; ROCK_BLAST and RAZOR_WIND need an outcome/body
   input beyond v2. Several "F-AFFINE" fields in the triage are not allocator facts at all (non-affine flip bits): Horn Drill's `hornMatrixId`,
   Thunderbolt/Zap Cannon bolt/arc `matrixNum`, Razor Wind `crescentMatrixIds`.

## 1. Baseline (ROM)

Probe `tools/compare/affineTaskProbe.py` samples after every `oracle.advance`: `gOamMatrixAllocBitmap` (u32 at symbol), per in-use sprite the
affine flag + `matrixNum` (attr0 bit 8, attr1 bits 9-13), `gTasks[0..15]` (isActive, func symbol, priority, prev, next; `struct Task`
`include/task.h:13`, 40 bytes), `gAnimScriptActive`, `sAnimMoveIndex`; frames before the last "no sprites, identity `sSpriteOrder`, empty bitmap"
frame (battle `ResetSpriteData`, `src/sprite.c:294` -> `ResetAffineAnimData:1414` clears the bitmap) are dropped. Same hooks as
`spriteOrderFactoryEntryProbe.py` / `spriteOrderEventProbe.py`.

Ordinary Factory route (`tools/compare/traces-groundtruth/battle1-turn1.json`, `raw/factory-battle1-turn1-{0,1}.json`):

| frame | bitmap | tasks | note |
|---|---|---|---|
| 1057 | 0 | none | ResetSpriteData |
| 1074 | 3 | `BattleIntroSlide3` until 1227 | matrices 0,1 = trainer slides (mats 3,4 sprite slots) |
| 1462..1492 | 0xf -> 0x7 | send-out tasks (`Task_DoPokeballSendOutAnim`, `Task_FadeMon_ToNormal`, `Task_PlayCryWhenReleasedFromBall`, `Task_HandleMonAnimation`, `Task_DuckBGMForPokemonCry`) | entry churn |
| 1624..1963 | `0x6` | none from 1735 (cry tasks gone) | first action prompt and FIGHT menu idle |
| **1963** (rise, move 104 Double Team) | **`0x6`** | **none** | body baseline |
| 2121 fall | `0x6` | none | net-zero |
| 2125 / 2340 (bodies mv 0, mv 157) | `0x6` | none | same baseline |

`varB` (different opponent lead / first move): rise 2113, baseline `0x6`/none. BattleLab entries (`raw/<scenario>-0.json`, 24 target scenarios,
`corpus-summary.json` 195 scenarios): identical baseline. Pre-prompt entry state differs slightly in the lab (e.g. `0xe`/`0xf` windows before
send-out) but converges to `0x6`/none before the first prompt in all 26 raw runs; the idle time before every rise is `0x6` with no tasks except
transient cry tasks that have ended (`Task_DuckBGMForPokemonCry` appears only after a KO).

Two fresh runs: all raw files byte-identical (`cmp` of `-0`/`-1`), corpus `identical: true` for 195/195.

## 2. Per-move timelines (first body, player orientation; opponent identical ids)

Source: `calls/<scenario>.json` (exact in-frame `CreateTask` / `DestroyTask` / `AllocOamMatrix` / `FreeOamMatrix` / `CreateSprite*` / `DestroySprite`
entries with return values and LR-resolved callers), replayed by `affineTaskPlan.py` into `plan.json`. `age` = frames after the act rise.
`sprite.c:1427` AllocOamMatrix (first clear bit), `:1448` FreeOamMatrix (called from `FreeSpriteOamMatrix:884` on `DestroySprite`),
`task.c:27` CreateTask (first inactive slot), `:47` InsertTask (priority list), `:84` DestroyTask.

| move | body len | matrix allocs (ROM, age:id) | task creations (age:slot=func) | net-zero (m/t/s) | orientation |
|---|---|---|---|---|---|
| SWIFT 129 | 77 | 10:0 17:3 24:4 31:5 38:6 (stars, freed 44..72 in order) | 7:0=InitUpdateMonBg(transient) 7:1=UpdateMonBg 24:0=ShakeMon2 24:2=ShakeMon2(transient) 73:0=ClearMonBg | yes/yes/yes | ids identical, ages +2 from 44 |
| TRICK 271 | 224 | 7:0 7:3 (two bags, freed 199) | 25:0=StretchTargetUp 25:1=StretchAttackerUp 173:0,1=ShakeMon | yes/yes/yes | identical |
| THUNDERBOLT 85 | 236 | 105:0,3..9 106:10 (orb 0 + 8 flashes; freed 149/150) | 10:0 28:0 37:1 46:0 57:0 70:0 108,116,124,132:0 (BlendBattleAnimPal/ElectricBolt, 4 transients) 173:0 230:0 | yes/yes/yes | identical |
| SEISMIC_TOSS 69 | 227 | wave1 152:0,3,4,5,6 wave2 168:0,7,8,9,10 wave3 184:0,3,4,5,6 | 7:0(t) 7:1 10:0(t) 13:0 32:2 152:0,2 168:2 184:2,3 223:0 | yes/yes/yes | identical |
| FRUSTRATION 218 | 228 | 71:0 89:0 126:0 133:3 140:0 147:3 154:0 161:3 | 7:0(t) 7:1 10:0(t) 10:0 10:2 119:0 126:2 185:0 224:0 | yes/yes/yes | identical |
| HORN_DRILL 32 | 192 | 74:0 80:3 86:4 92:0 ... 134:3 (flashing hit splats, recycled) | 7:0 26:1(t) 26:2 74:0,1 153:0 | yes/yes/yes | ids identical, one FadeToBg destroy 1 frame earlier opp |
| AURORA_BEAM 62 | 215 | rings 42:0 45:3 48:4 51:5 54:6 57:7, recycled 0,3..7 every 18 | 4:0 42:0 54:1 90:1,2 176:0 | yes/yes/yes | identical |
| STOCKPILE 254 | 98 | 4:0 7:3 10:4 13:5 16:6 19:0 ... 49:0 (orbs recycled) | 4:0=BlendColorCycle 4:1=StockpileDeformMon | yes/yes/yes | identical |
| UPROAR 253 | 72 | 10:0 28:0 46:0 (one matrix per ring/distortion) | 7:0(t) 7:1 10:0 28:0 46:0 63:0 | yes/yes/yes | identical |
| ZAP_CANNON 192 | 111 | 7:0,3..7 8:8,9 | 40:0=ShakeMon2 57:0=WaitAndPlaySE | yes/yes/yes | ids identical, one alloc 1 frame earlier |
| ROCK_BLAST 350 | 89 (x3 bodies/hits) | 12:0 39:0 (rock, hit splat), same in bodies 1,2 | 39:0=ShakeMon | yes/yes/yes | identical |
| RAZOR_WIND 13 | 45 (charge) + 72 (unleash) | body 0: 4:0,3,4 (tornado, freed 44); body 1: none (crescents are not affine) | body 0: none; body 1: 7:0(t) 7:1 37:0,2 56:0 | yes/yes/yes | identical |

(`t` = same-frame transient: created and destroyed in one frame, invisible to per-frame sampling.) Full op lists with callers, priorities and sprite
slot/template per op: `fixtures/affine-task/plan.json` (`ops`), regenerate with the commands at the end.

### Accepted fixture values vs ROM

The accepted reducers consume these values from the dense-state evidence (`tools/compare/evidence/<move>-<side>-dense-state.json.gz`), so the
test is whether the ROM allocator model reproduces them (`accepted-compare.json`: per-age matrix set + task set equal, 0 differing ages for all 24).
Field-level:

| move | consumed field (file:line) | accepted value | ROM / v2 | match | is it an allocator fact? |
|---|---|---|---|---|---|
| SWIFT | `starSlots` (`src/animation/swift.ts:31`, set `tools/compare/swiftReducer.ts:39`) | [3,4,5,7,9] | sprites 3,4,5,7,9 | yes | yes (sprite plan) |
| SWIFT | `targetShakeTaskSlot` (`swift.ts:32`, `swiftReducer.ts:40`) | 0 | ShakeMon2 slot 0 | yes | **yes (needs transient-aware plan)** |
| TRICK | `bagSlots` (`trick.ts:66`, `trickReducer.ts:46`) | [3,4] | sprites 3,4 | yes | yes |
| TRICK | attacker/target `stretchTaskSlot` (`trick.ts:69,74`, `trickReducer.ts:49,54`) | 1 / 0 | StretchAttackerUp 1, StretchTargetUp 0 | yes | yes |
| TRICK | `shakeTaskSlot` (`trickReducer.ts:50,55`) | attacker 0, target 1 | ShakeMon 0,1 | yes | yes |
| AURORA_BEAM | `ringMatrixIds` (`auroraBeam.ts:18`, `auroraBeamFramebuffer.ts:94`) | 0,3,4,5,6,7 (births) | same | yes | yes |
| FRUSTRATION | `angerMatrix`/`impactMatrices` (`frustration.ts:18,20`, `frustrationFramebuffer.ts:63`) | 0 / [0,3] (slots 3 / [3,4]) | 71:0, 126:0 133:3 | yes | yes |
| HORN_DRILL | `impactMatrixIds` (`hornDrill.ts:9`, `hornDrillFramebuffer.ts:108`) | [0,3,4] | 74:0 80:3 86:4 | yes | yes |
| HORN_DRILL | `hornMatrixId` (`hornDrill.ts:7`, `hornDrillFramebuffer.ts:106`) | 0 player / 24 opponent | no allocation (sprite not affine) | n/a | **no: raw OAM flip bits** (`owned-sprites.json`) |
| SEISMIC_TOSS | rocks/hitsplats `matrixNum` (`seismicToss.ts:20-21`, `seismicTossFramebuffer.ts:87-91`) | waves [3-6],[7-10],[3-6]; hit 0 | 152/168/184 allocs above | yes | yes |
| STOCKPILE | `orbMatrixPool` (`stockpile.ts:29`, `stockpileFramebuffer.ts:90`) | [0,3,4,5,6] | same | yes | yes |
| THUNDERBOLT | orb / flashes (`thunderbolt.ts:14-15`, `thunderboltFramebuffer.ts:70,85`) | 0 / 3..10 | 105:0,3..9 106:10 | yes | yes |
| THUNDERBOLT | bolts / arcs `matrixNum` (`thunderbolt.ts:13,16`, `thunderboltFramebuffer.ts:49-54`) | 0 / {0,8,16} | non-affine sprites | n/a | **no: raw OAM bits** |
| ZAP_CANNON | sparks (`zapCannon.ts:26`, `zapCannonFramebuffer.ts:57`) | 0,3..9 | 7:0,3..7 8:8,9 | yes | yes |
| ZAP_CANNON | ball / arcs `matrixNum` (`zapCannon.ts:25,27`) | 0 / {0,8,16} | non-affine | n/a | **no: raw OAM bits** |
| UPROAR | `attackerMatrixSlot` (`uproar.ts:14`, `uproarActualCore.ts:49`) | 1 player / 2 opponent | baseline battler matrices (slot 6 -> 1, slot 8 -> 2) | yes | baseline fact |
| UPROAR | `ringMatrixSlots` (`uproar.ts:15`) | [0,0,0] | 10:0 28:0 46:0 (one matrix, reallocated per distortion) | yes | yes |
| RAZOR_WIND | `tornadoMatrixIds` (`razorWind.ts:31`, `razorWindFramebuffer.ts:128`) | 0,3,4 | body 0 4:0,3,4 | yes | yes |
| RAZOR_WIND | `crescentMatrixIds` (`razorWind.ts:33`, `razorWindFramebuffer.ts:130`) | [16,8,0] constant | body 1 allocates no matrix | n/a | **no: hard-coded flip bits** |
| ROCK_BLAST | `lungeSlot/rockSlot/hitsplatSlot/fragmentSlots/shakeTaskSlot` (`rockBlast.ts:21`, `rockBlastReducer.ts:71-75`) | 3 / 4 / 3 / [4,5,7,9] / 0 | 7:3 12:4 39:3 39:4,5,7,9 task 39:0 | yes | yes (per body, identical in bodies 0,1,2) |

`accepted-config-values.json` (from `affineTaskAccepted.mjs`) holds the reducer-produced Swift/Trick/Rock Blast profile values used above.

## 3. Cross-body: is "known baseline at every body" sound?

Corpus (`affineTaskCorpusBatch.py` over every scenario of `fixtures/allocator-net-zero-manifest.json`, 195 scenarios / 91 move ids, two fresh runs each,
all identical; `corpus-summary.json`): 481 bodies, baseline `0x6`/no tasks in all 481; 467 closed bodies all return to `0x6`/no tasks/same sprite
set at the act-fall row. Includes Tackle-class bodies, status moves, stat-change bodies (`mv 0`), and later-turn bodies (baseline unchanged on turn 2/3).

Sound as a production rule **only while both battler sprites stay alive and no switch/send-out happened since the known entry**:

- Bodies/units that leave state behind at fall: none among closed bodies.
- State after the body when it ends in a KO: matrix of the fainted battler freed (bitmap 0x4 or 0x2) plus `Task_DuckBGMForPokemonCry` (prio 80):
  Guillotine 12, Psychic 94, Hi Jump Kick 136 (both orientations), Focus Punch 264 player (`settledNetZero:false`, `postFallEvents`).
  Aurora Beam (opp. orientation) and Horn Drill (both) in the target scenarios also end in a KO.
- Not measured: baseline after a send-out/switch, after battle N>1 within one ResetSpriteData lifetime, doubles, Scene OFF host; invalidate there.
- Trace-truncated bodies (14) had tasks live at the end of the trace by construction.

## 4. Design

Pure modules beside `src/engine/liveSpriteAllocator.ts` (same freeze/`historyKnown` style, no battle/RNG access):

1. `src/engine/liveAffineTaskAllocator.ts`: `LiveAffineTaskHost { historyKnown, matrixBitmap, matrices: {id, owner}[], tasks: {slot, owner, func, priority}[] }`.
   `createKnownEntryAffineTaskHost()` = bitmap `0x6` (owners: battler player -> 1, battler opponent -> 2) and no tasks.
   `allocateFirstMatrix(host, owner)` (lowest clear bit, `sprite.c:1427`), `freeMatrix`, `createTask(host, owner, func, priority)` (lowest inactive slot,
   `task.c:27`), `destroyTask`, `invalidateLiveAffineTaskHost` (as `liveSpriteAllocator.ts:81`). Owners are semantic (`move:<identity>:<role>:<index>`), never the
   template symbol.
2. `src/engine/liveMoveAffineTaskPlans.ts` (beside `liveMoveSpriteAllocator.ts:28`): `PLANS[moveId] = { identity, bodies: Op[][] }`, `Op = [age, kind, role, ...]` with
   kinds `sprite+ sprite- matrix+ matrix- task+ task-` exactly as the rows of `plan.json` (including same-frame transients; frees reference the
   owner, not an id). One plan drives the sprite host and the new host together so a sprite destroy frees its matrix (`sprite.c:884`).
   `prepareLiveMoveAffineTask(host, sprites, request)` returns `{ next, input }` where `input` carries the ids the reducers consume
   (matrix ids per sprite role, task slots per role); it must end at the baseline (assert net-zero, else invalidate).
3. Invalidation triggers: identical to the sprite host (`liveMoveSpriteAllocator.ts:83-88`): unknown history, any move/status body without an audited
   plan or net-zero listing, any KO/faint, switch, send-out or summary screen. A second set `LIVE_AFFINE_TASK_NET_ZERO_MOVE_IDS` should be derived from
   `corpus-summary.json` (closed bodies net-zero) the same way `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS` was; a body outside it invalidates.
4. Consumers: only consume allocator-derived fields (matrix ids of affine sprites, task slots). Non-allocator constants listed in section 2
   (`hornMatrixId`, bolt/arc/ball `matrixNum`, `crescentMatrixIds`) stay in the adapter: they are OAM flip bits determined by orientation/template.
5. Tests to write with the build: replay `calls/*.json` through the module (0 mismatches); pin baseline `0x6`; plan rows vs `plan.json`; KO invalidates.

Per-move verdict (v2 = this plan; B = existing first-body sprite-order seam `prepareLiveMoveSpriteOrder`, `liveMoveSpriteAllocator.ts:139`):

| move | verdict | needs beyond v2 |
|---|---|---|
| SWIFT | READY-WITH-V2 | none (sprite plan + task slot 0; `swift.ts:28-32`) |
| TRICK | READY-WITH-V2 | none (bags + 4 task slots; `trick.ts:66-74`) |
| THUNDERBOLT | READY-WITH-V2 (first body) | first-body order for bolts/orb/flashes/arcs (`thunderbolt.ts:13-16`, `persistentOrder` `thunderboltFramebuffer.ts:54`) |
| FRUSTRATION | READY-WITH-V2 (first body) | first-body `impactOrders` (`frustration.ts:21`) |
| HORN_DRILL | READY-WITH-V2 (first body) | `spriteOrderSeed` (`hornDrill.ts:10`, `hornDrillFramebuffer.ts:109` = [3,4,5]); `hornMatrixId` is an adapter constant |
| SEISMIC_TOSS | READY-WITH-V2 (first body) | rock/hitsplat `persistentOrder` from the order seam across 3 waves (`seismicTossFramebuffer.ts:88,91`): needs sprite-order evidence at 152/168/184, not only the activation edge |
| AURORA_BEAM | READY-WITH-V2 (first body) | `spriteOrderSeed` (`auroraBeam.ts:20`) |
| STOCKPILE | READY-WITH-V2 (first body) | `spriteOrderSeed` (`stockpile.ts:31`, [3,4,5,9,7]) |
| UPROAR | READY-WITH-V2 (first body) | `spriteOrder` (`uproar.ts:13`) |
| ZAP_CANNON | READY-WITH-V2 (first body) | order for ball/sparks/arcs (`zapCannon.ts:25-27`) |
| ROCK_BLAST | NEEDS-OUTCOME | number of hit bodies; v2 supplies ids (identical per body, bodies 0..2) |
| RAZOR_WIND | NEEDS-OUTCOME + ORDER | charge/unleash body choice (`sceneOnPresentation.ts:2888` body); `spriteOrderSeed` (`razorWind.ts:35`) |

"First body" = first move body after the known entry with no other graphics command in between (current policy of `prepareLiveMoveSpriteOrder`);
v2 itself is valid on every body that starts from the baseline, which the corpus supports, so it lifts only the order seam's limit when a body-plan
order provider exists.

## Open questions

- Baselines after faint/send-out/switch, second battle of a run, doubles; each needs its own known-state probe before the host may stay known.
- Sprite *order* (free `sSpriteOrder`) after each of these bodies is a separate question (class B); this evidence covers occupancy/ids only.
- Interleaving of same-frame ops of different types (e.g. `FreeOamMatrix` vs `CreateTask` order within one frame) is recorded per call in `calls/*.json` but only sequences, not sub-frame timing, are modeled.
- Opponent-orientation timing differs by 1-2 frames in Swift/Horn Drill/Zap Cannon (ids identical); a plan row needs per-orientation ages or age-relative-to-event anchors.
- Rock Blast hit count / Razor Wind body selection are battle outcomes the plan cannot know.

## Evidence index

- Probes: `tools/compare/affineTaskProbe.py` (per-frame), `tools/compare/affineTaskCallProbe.py` (exact in-frame calls; `AFFINE_BODY=N` picks body N).
- Drivers/analysis: `tools/integration/affineTaskBatch.py`, `affineTaskCallBatch.py`, `affineTaskCorpusBatch.py`, `affineTaskAnalyze.py`,
  `affineTaskTimeline.py`, `affineTaskLowestFree.py`, `affineTaskPlan.py`, `affineTaskCompare.py`, `affineTaskOwned.py`, `affineTaskAccepted.mjs`.
- Fixtures (`tools/integration/fixtures/affine-task/`, ~2 MB): `raw/` (per-frame, 26 scenarios x 2 fresh runs), `calls/` (31 bodies), `summary.json`,
  `corpus-summary.json`, `plan.json`, `accepted-compare.json`, `accepted-config-values.json`, `owned-sprites.json`.
- Regenerate: `python3 tools/integration/affineTaskBatch.py && python3 tools/integration/affineTaskCallBatch.py && python3 tools/integration/affineTaskCorpusBatch.py --workers 8 &&
  python3 tools/integration/affineTaskAnalyze.py --json tools/integration/fixtures/affine-task/summary.json tools/integration/fixtures/affine-task/raw/*-0.json &&
  python3 tools/integration/affineTaskPlan.py --json tools/integration/fixtures/affine-task/plan.json &&
  python3 tools/integration/affineTaskCompare.py --json tools/integration/fixtures/affine-task/accepted-compare.json &&
  python3 tools/integration/affineTaskOwned.py --json tools/integration/fixtures/affine-task/owned-sprites.json`
  (the `affineTaskBatch.py`/`affineTaskCorpusBatch.py` raw runs go through `tools/run-mgba-probe.py` and need the mGBA venv).
