# lsd198 -- the Scene ON Leech Seed drain draws `Move_ABSORB`'s body

Branch `worker/integration-20261023-000807`. Presentation only, Scene ON only: no kernel event, RNG draw, HP value or timing total changes (the 218-row
drain command keeps its length; Scene OFF output is unchanged). Before this step the `general-animation` command `LEECH_SEED_DRAIN` held the right 208 source
rows (lsd186 / lsd194) but drew nothing.

## 1. Rule

`General_LeechSeedDrain` (`reference/pokeemerald/data/battle_anim_scripts.s`) is `createvisualtask AnimTask_GetBattlersFromArg, 5; delay 0; goto Move_ABSORB`.
The drain is therefore the ordinary Absorb body with different battlers, drawn by the existing live MOVE_ABSORB adapter (`liveMoveAnimation.ts` case 71).

1. **Battlers (source).** `BattleScript_LeechSeedTurnDrainRecovery` does `playanimation BS_ATTACKER, B_ANIM_LEECH_SEED_DRAIN, sB_ANIM_ARG1`; `ENDTURN_LEECH_SEED`
   sets `animArg1 = gBattlerTarget` (the seed owner, who is healed) and `animArg2 = gBattlerAttacker` (the seeded mon, who is drained).
   `AnimTask_GetBattlersFromArg` (`battle_anim_throw.c:2502`) writes `gBattleAnimAttacker = arg & 0xff`, `gBattleAnimTarget = arg >> 8`. So the Absorb attacker is
   the seed owner (the other battler from the command's `battler`) and the Absorb target (hit splat, shake) is the seeded battler (= `command.battler`).
   Player seeds the foe: attacker 0 / target 1. Foe seeds the player: attacker 1 / target 0.
2. **Start row.** The Scene ON drain command is 218 rows. Absorb body age = command age - 21 (`LEECH_SEED_DRAIN_BODY_START_AGE`); the body is 194 rows
   (command ages 21..214). Ages 0..20 are the ordinary idle pose (no effect), ages 215..217 are the old inert `general-animation` effect (battlers at x2 0, as the ROM
   leaves them). Found by the dense ROM scan (best ROM frame offset per command age): exact at offset 0.
3. **Production seams.**
   - `battleResolutionPresentation.ts`: the `general-animation` command gets `animated?: true` from the kernel's animation receipt (Scene ON only).
   - `battleResolutionPresentationRender.ts`: `leechSeedDrainAbsorbEffect` builds `{type:"move", request:{moveId:71, attacker, target, power 0, damage 0, ...}, age, spriteOrderInput, battlerX2Input}`.
   - `factoryRoundBattleOrchestrator.ts` (`prepareResolutionPalette`, now exported for the route tool): the drain command's `eventSequence` is the later healthbarupdate event, so the sprite-order lend
     and the x2 history use the sequence of the earlier `animation` LEECH_SEED_DRAIN event (`drainAnimationSequence`), i.e. strictly before the animation receipt.
     The lend is `lendLiveSpriteOrder(orderHost, 71)`; the adapter requires `spriteOrderInput.known`.
   - Fixture data never feeds production: the receipts and the dense tool live under `tools/integration/`; no `src/` file imports them (pinned in the test).

## 2. Evidence: dense ROM framebuffer window, both orientations

ROM = direct mGBA (`sub183RomFrames.py` via `tools/run-mgba-probe.py`, scenarios `mechanic-leech-seed-{player,opponent}-exeggcute-...`), production = the ordinary battle route
(`lsd186Production` -> `prepareResolutionPalette` per command -> `createBattleResolutionPresentationRenderView` -> `renderBattleResolutionLiveView`), full 240x160 compared
(regions box y >= 112 / opp sprite / ply sprite / other). Window: from the "was seeded!" print through the "LEECH SEED sapped" print. Alignment (lsd194): production row A <-> ROM frame D - 10.

| orientation (seed, Onix move 33) | rows compared | exact rows | mismatching rows | mismatching px | rows outside the 218-row command (all exact) | animation span |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| player seeds, foe drained (57) | 446 | 445 | 1 | 1,843 (opp sprite) | 228 / 228 | 217 / 218 exact |
| foe seeds, player drained (4) | 437 | 436 | 1 | 1,476 (ply sprite) | 219 / 219 | 217 / 218 exact |

box, other and the seeder's sprite are 0 in both. Twice fresh (r1 and r2 independent mGBA runs and independent production renders): rows and RGB identical
(`fixtures/lsd198/r1-r2-identity.txt`: `cec8221e7c592aaa` / `210c92a47abdc4ca` rows hashes r1 == r2; the file also records the RGB hash `d69482ec68c026df` / `b8ededf10e05bde4`).
Receipts: `fixtures/lsd198/dense/{p,o}-on.json`, ROM rows `fixtures/lsd198/rom/`, `rom-drain-runs.json`.

## 3. Residual (not accepted; not fixed)

One ROM frame per orientation, **command age 41 (body age 20)**, target sprite only (the drained mon). The ROM shows the target at x2 0 / y2 +5 for one display where production
shows its idle x2 / y2 0. Fitted against the unshifted pose, the ROM target y shift is +5 at body ages 20, 23, 24, 27, 28 and 0 otherwise. Ages 23-24 and 27-28 are
what `absorbAtAge` models (ShakeMon `AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 5, 5, 1`, shakeY = 5 at source ages 22-23 and 26-27, displayed one pass later). The extra body age 20 row is a
one-display creation toggle that `absorbAtAge` models as "not displayed". The mechanism inside `General_LeechSeedDrain` is unknown, and there is no ordinary Absorb ROM scenario in the receipts
to say whether it is drain-specific. A one-row fix would need a flag through the request, the adapter and `absorbAtAge`, with no mechanism behind it; it is left as a localised, quantified residual.

The 1,091 px foe-pose residual reported in lsd194 for the drain was an artefact of that harness (`lsd194DrainDense.ts` used `LIVE_BATTLER_X2_IDLE` history). The real route history is exact, as above.

## 4. Tests and files

- `tests/lsd198LeechSeedDrainAnimation.test.ts` (new, Tier 1): command flag (Scene ON true / OFF absent, both orientations); effect = move 71 with the right attacker / target and body age at command ages 21 / 41 / 100 / 214;
  lend known; ages 0..20 null, 215..217 inert general-animation; the render differs from the same row without `animated`; Scene OFF draws no move effect; no production file imports `tools/` or the fixtures; the committed receipt numbers and the single residual row.
- `tests/lsd194PrintFloorAndDrain.test.ts`: title text updated only.
- Run alone under `timeout 300` (`POKEBENCH_VITEST_MAX_WORKERS=1`), all green: lsd198 (15), lsd194 (12), battleResolutionPresentation (39), animationBoundaryRatchet (3), spriteOrderEventTransform (15),
  liveSpriteOrderHost (22), seedProjectileLeechSeedTrack (4), leechSeedSourceCheckpoint (4), aud56GeneralAnimationAllocator (22), fpp150FocusPunchPrePassPresentation (5), land96ScanlineHistory (7),
  spriteOrderPlans51 / 54 / 69 (4 / 11 / 5), spriteOrderPrep64 (5).
- Tools: `tools/integration/lsd198Route.ts` (production route per command), `lsd198DrainDense.ts` (dense compare, `--scan` best-offset, `--dump` PNG pairs), `lsd198Probes.sh` (scenarios -> ROM runs -> dense compare r1/r2).
  `lsd198Probes.sh` was not run end to end as one script; its pieces were run separately and the re-run of the player case through `lsd198Route` was byte-identical to the receipt.

## 5. Not run

Per the supervisor's instruction (heavy gates running on the host) the full `npm test`, `npm run build`, `npm run typecheck` and any census were not run; production changes normally need them. Out of scope: Scene OFF, other general animations, Ingrain / Wish heals, Double Team.

## lsd199 -- the residual row: the drain's script is task-hosted (fixed, 0 residual both orientations)

Branch `worker/integration-20261023-010407`. Presentation only, Scene ON only: no kernel event, RNG draw, HP value, command or timing total changes.

### Mechanism (source)

- Ordinary moves run their anim script from the battler controller (`battle_controller_{player,opponent}.c` `*DoMoveAnimation` case 2: `gAnimScriptCallback()`),
  i.e. in `BattleMainCB1`, before `BattleMainCB2` (`AnimateSprites; BuildOamBuffer; ...; RunTasks`). General animations run it from
  `Task_ClearBitWhenBattleTableAnimDone` (`battle_gfx_sfx_util.c`, created by `TryHandleLaunchBattleTableAnimation` with priority 10), i.e. inside `RunTasks`.
- `Cmd_createvisualtask` (`battle_anim.c`) does `CreateTask(AnimTask_ShakeMon, 5); taskFunc(taskId)`. `AnimTask_ShakeMon` (`battle_anim_mon_movement.c`) writes
  x2 = 0, y2 = 5 and its immediate first `AnimTask_ShakeMon_Step` only decrements the delay counter, so the creation state is x2 0 / y2 +5.
- `InsertTask` (`task.c`) puts the priority-5 task ahead of every priority-10 task. Controller-hosted: the task is new before `RunTasks`, so it steps once more in the
  same pass (y2 back to 0) before `Task_UpdateMonBg` (`battle_anim.c`, priority 10) copies `x2/y2` into the monbg layer's BG1 scroll; the +5 never shows.
  Task-hosted (the drain): the task is inserted ahead of the running `Task_ClearBitWhenBattleTableAnimDone`, so `RunTasks` does not reach it this pass, but
  `Task_UpdateMonBg` (later in the list) does, and copies the creation state (x2 0, y2 +5). From the next pass both hosts hold the same shake state.
- The monbg target is a BG copy, which is why no OBJ entry for the target exists in `gMain.oamBuffer` while monbg is up (`oy` = null in the probe).

### RAM evidence (direct mGBA, `tools/integration/lsd199ShakeProbe.py`, receipts `tools/integration/fixtures/lsd199/ram/`)

End-of-frame target `gSprites[gBattlerSpriteIds[target]].{x2,y2}` and the `RunTasks` list while Move_ABSORB's priority-5 ShakeMon is alive
(`AnimTask_ShakeMon_Step` = 0x080d5221, `Task_UpdateMonBg` = 0x080a47d9, `Task_ClearBitWhenBattleTableAnimDone` = 0x0805da49, static symbols located between their map neighbours):

| case | first ShakeMon frame | y2 per frame | task list on the creation frame |
| --- | ---: | --- | --- |
| ordinary Absorb, player attacker (`mechanic-absorb-player-lombre-opponent-onix`) | 243 | 0 0 5 5 0 0 5 5 | ShakeMon p5, UpdateMonBg p10 |
| ordinary Absorb, opponent attacker | 243 | 0 0 5 5 0 0 5 5 | ShakeMon p5, UpdateMonBg p10 |
| drain, player seeds (`mechanic-leech-seed-player-...`) | 516 | **5** 0 0 5 5 0 0 5 5 | ShakeMon p5, table task p10, UpdateMonBg p10 |
| drain, opponent seeds | 511 | **5** 0 0 5 5 0 0 5 5 | ShakeMon p5, table task p10, UpdateMonBg p10 |

x2 is 0 on every listed row (the idle x2 before it). Hypothesis (a) is refuted: the ordinary Absorb has no such row (its prep9 window covers body age 20 and the RAM shows
y2 already 0); (b) is right in kind (ShakeMon's creation write) and (c) is not a VBlank/OAM latch but the task order above.

### Fix

- `absorbAtAge(..., taskHostedScript = false)` (`src/animation/absorb.ts`): with the flag the ShakeMon creation pass is displayed at source age 19 (y2 +5, x2 0);
  the task-hosted script frame is one source age earlier than the controller-hosted one (its sprite effects reach OAM one pass later), so from age 20 the state is
  identical. New `AbsorbState.targetPoseOwned` (`age >= 20`, or the creation pass) replaces the renderer's `absorbState.age < 21` idle-x2 rule (`battleScene.ts`;
  identical for the ordinary body: displayed age = source age + 1).
- Plumbing: `BattleMoveAnimationRequest.taskHostedScript?: true` (presentation-only, like `rolloutCounter`), set by `leechSeedDrainAbsorbEffect`; `liveMoveAnimation.ts`
  case 71 forwards it to `SceneOnAbsorbConfig.taskHostedScript`; `sceneOnAbsorbView` passes it to `absorbAtAge`. No frame-number special case: the flag names the host.

### Proof (tested tree = the lsd199 commits on this branch)

- Drain dense (`lsd198DrainDense.ts`, fresh ROM runs via `lsd194Probes.sh` r1/r2; ROM rows byte-identical to the lsd198 receipts, RGB `d69482ec68c026df` / `b8ededf10e05bde4`
  as before): player seeds 446 / 446 exact, opponent seeds 437 / 437 exact (animation span 218 / 218 both, box / opp / ply / other all 0). Run against r1 and r2: the
  output JSONs are byte-identical (`p` `ab0f8d967f6cb15d`, `o` `d0b9f4b377d07076`). Receipts `fixtures/lsd199/dense/{p,o}-on-r1.json`.
- Ordinary Absorb: `tools/integration/lsd199AbsorbRenderIdentity.ts` renders the live MOVE_ABSORB adapter at every age -2..196, both orientations, LOMBRE and VENUSAUR
  attackers; base `556d1057d` and lsd199 give identical digests (`all` `47219a5f2ca88264`, `fixtures/lsd199/ordinary-absorb-render-identity.txt`), so the prep9
  dense zero-residual proof still describes the ordinary body unchanged. A new ordinary dense window from the activation edge was not run (pixels provably unchanged).
- Tests (each alone, `timeout 300`, `POKEBENCH_VITEST_MAX_WORKERS=1`, green): lsd199DrainShakeCreation (10, new), lsd198LeechSeedDrainAnimation (15; the receipt block is now
  titled as the pre-fix receipt), lsd194PrintFloorAndDrain (12), battleResolutionPresentation (39), animation/animationBoundaryRatchet (3), animation/absorb (7),
  animation/livePrep9MoveAdapters (12), elevatedRendererPostBody (7), animation/factoryAnimationInventory (8), liveMoveAnimationPalette (14), leechSeed (5),
  leechSeedSourceCheckpoint (4), leechSeedEvidenceCheckpoint (3), seedProjectileLeechSeedTrack (4), greenSparkleMoonlightTrack (4), ingrainSource (1),
  dreamEater / gigaDrain / megaDrain SourceCheckpoint (4 / 4 / 4) and Evidence (5 / 4 / 5), waterPulseSourceCheckpoint (2), spriteOrderGigaDrainGeometry (10),
  spriteOrderDreamEaterGeometry (4), recover (5). `git diff --check` clean.
- Not run (supervisor instruction): full `npm test`, `npm run build`, `npm run typecheck`, census. Production files changed, so those gates remain owed.
