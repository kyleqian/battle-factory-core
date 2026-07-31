# Trainer-pic OFF-window prep scout

## A. Ground truth

### Fixture and method

Banked fixture: `tools/battle-lab/factory-trainer-pic-shizuka-off.json`. It is
a legal Level-50 Factory matchup with `challengeNum: 2`, `battleNum: 2`,
`trainerId: 110`, source set IDs, and Battle Scene OFF. It uses
`factoryLegal`, not `mechanicLab`: this is an ordinary Factory entrance, so
neither custom Pokémon nor injected transient state is needed.
`FRONTIER_TRAINER_SHIZUKA` is id 110
(`reference/pokeemerald/include/constants/battle_frontier_trainers.h:108-116`),
so the trainer is not canonical Battle-1/Battle-2 identity.

Public Battle Lab cannot expose this intro: `BattleLab.prepare` drives the
source route to action menu then resets its public clock
(`../../oracle/battle_lab.py:510-534`); public frame 0 is documented as the
first player action menu (`../../oracle/BATTLE_LAB.md:53-62`). The fixture
therefore honestly has only public capture `[0]`.

Dense evidence used a throwaway subclass of that same source-owned pre-reset
route—no app change and no injected state. Every frame is under
`/var/folders/wk/mq92yc6s53jfllv0m6rwvydc0000gn/T/pokebench-trainer-pic-reprobe.XXXXXX.l7EmJc4COx/oracle-output/`,
with validated receipt
`/var/folders/wk/mq92yc6s53jfllv0m6rwvydc0000gn/T/pokebench-trainer-pic-reprobe.XXXXXX.l7EmJc4COx/receipt.json`.
`tools/run-mgba-probe.py` accepted its known teardown SIGSEGV only after the
receipt parsed. Public fixture output was separately checked with
`bin/oracle lab` in disposable output; PNGs are not committed.

### Timing anchors

All numbers are receipt frames. **P** is route frame 959, the first A edge
that dismisses the Factory-room message and starts the pre-battle transition.
**B** is frame 1171, first `gBattlersCount == 2` and
`gBattleMainFunc == BeginBattleIntro`; `B=P+212`. Every P..1885 frame was
captured (927 inclusive). The receipt reads named RAM symbols—main function,
controller flags, buffer, sprites, healthboxes—resolved by `bin/oracle
symbols`, not fitted pixels.

| Event | Frame / B offset | Evidence |
| --- | --- | --- |
| Transition boundary | P=959 / B-212 | Receipt frame 959 has A; P..B densely covers fade/circles/black. |
| Intro begins | 1171 / B+0 | `BeginBattleIntro` (`reference/pokeemerald/src/battle_main.c:3019-3032`). |
| Opponent pic created | 1197 / B+26 | Battle emits DrawTrainerPic (`reference/pokeemerald/src/battle_main.c:3393-3440`); controller sets x=176, x2=-DISPLAY_WIDTH, speed 2 (`reference/pokeemerald/src/battle_controller_opponent.c:1267-1322`). |
| Pic first step / settle | 1230 / +59; 1349 / +178 | RAM x2 changes -240→-238 then reaches 0. |
| Party summaries | 1197..1350 / +26..+179 | Source emits opponent then player summaries (`reference/pokeemerald/src/battle_main.c:3491-3538`). |
| “BLACK BELT SHIZUKA would like to battle!” | 1351/+180 dispatch; 1356/+185 printer | `STRINGID_INTROMSG` then wait (`reference/pokeemerald/src/battle_main.c:3564-3608`); A at 1541-1542/+370..+371. |
| “BLACK BELT SHIZUKA sent out MAGNETON!” | 1544 / +373 | `STRINGID_INTROSENDOUT` dispatch (`reference/pokeemerald/src/battle_main.c:3583-3608`). |
| Opponent ball task / mon visible | 1582/+411; 1601/+430 | Intro ball task source (`reference/pokeemerald/src/battle_main.c:3642-3683`; `reference/pokeemerald/src/battle_controller_opponent.c:1867-1924`); receipt clears mon invisible at 1601. |
| Opponent healthbox start / settle | 1614/+443; 1637/+466 | RAM x2=-110 then +5/frame to 0; source ball-complete gate starts/slides/makes visible (`reference/pokeemerald/src/battle_controller_opponent.c:292-325`). |
| Player text / ball task | 1693/+522; 1707/+536 | Player intro source (`reference/pokeemerald/src/battle_main.c:3711-3738,3776-3817`). |
| Player mon visible | 1786/+615 | Receipt clears invisible; controller owns intro throw task (`reference/pokeemerald/src/battle_controller_player.c:2931-2959,2977-3007`). |
| Player healthbox start / settle | 1800/+629; 1822/+651 | RAM x2=110 then -5/frame to 0; source gate (`reference/pokeemerald/src/battle_controller_player.c:979-1011`). |
| Visible menu / player-ready | 1881/+710; 1885/+714 | Main becomes action selection at 1881; at 1885 buffer is `CONTROLLER_CHOOSE_ACTION` (18), flags `PLAYER_CONTROLLER_FLAG` (1), matching the lab predicate (`../../oracle/battle_lab.py:1405-1423`). |

Fixture species are evidence of normal controllers, not reusable art/text.
Future rendering must use its own typed party records.

### Trainer-to-pic mapping

SHIZUKA is `FACILITY_CLASS_BLACK_BELT`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_trainers.h:883-889`).
`GetFrontierTrainerFrontSpriteId` maps a Frontier facility class through
`gFacilityClassToPicIndex` (`reference/pokeemerald/src/battle_tower.c:1404-1419`).
That lookup maps BLACK_BELT to `TRAINER_PIC_BLACK_BELT`
(`reference/pokeemerald/src/data/pokemon/trainer_class_lookups.h:1-14`), id
11 (`reference/pokeemerald/include/constants/trainers.h:25-40`). It is in the
50-item extracted catalog, entry id 11 and source
`graphics/trainers/front_pics/black_belt.png`, at
`src/assets/gen/frontier-trainer-pics.json:1`.

## B. Consumer map

| Concern | Existing seam | State-driven? |
| --- | --- | --- |
| Trainer identity and assets | `src/engine/factoryTrainerPresentation.ts:32-89`; `src/engine/battleScene.ts:13522-13558` | Identity/pic selection typed; intro clock legacy. |
| Intro slide/text | `src/engine/battleScene.ts:2671-2740,13707-13780,15915-16021` | Optional typed trainer, but canonical encounter/absolute timing; fixed “would like to battle!”. |
| Send-out/exit | `src/engine/battleScene.ts:2933-3047,13575-13705` | Trainer line 1 typed; KABUTO/GROVYLE line 2 and x2/clock canonical. |
| Generic field/healthboxes | `src/engine/battleCommandPresentation.ts:58-104`; `src/engine/battleCommandFieldArt.ts:56-103`; `src/engine/battleScene.ts:5950-6025` | Typed species art and healthboxes at command window. |
| Generated battle start | `src/engine/battlePresentation.ts:12-18`; `src/engine/roundController.ts:153-158,201-206`; `tools/compare/appTrace.ts:92-128` | `battleStart` carries player party/opponent, but current stage completes it. |
| Resolution/send-out seam | `src/engine/factoryRoundBattleOrchestrator.ts:424-472,739-775` | Typed command/resolution begins after start; no intro lifecycle. |

### Exact gap list

1. **No generated battle-start adapter.** `battleStart` already has player
   party and opponent, but appTrace completes it immediately
   (`tools/compare/appTrace.ts:116-122`). Derive/freeze trainer presentation
   via `factoryTrainerPresentationForOpponent`
   (`src/engine/factoryTrainerPresentation.ts:102-119`) in an app owner, not
   appTrace.
2. **No typed intro lifecycle/relative clock.** Command phases begin at
   `action-enter` (`src/engine/battleCommandPresentation.ts:74-104`); source
   orders slide, summaries, first text, acknowledgement, two send-outs,
   readiness (`reference/pokeemerald/src/battle_main.c:3380-3800`). Extend
   typed lifecycle; no battle-number or absolute-tick branch.
3. **Text is only half generic.** Current text fixes line 2/species
   (`src/engine/battleScene.ts:2695-2727,2933-3003`). Reproduce
   `STRINGID_INTROMSG`/`STRINGID_INTROSENDOUT`
   (`reference/pokeemerald/src/battle_main.c:3564-3608,3711-3738`) from typed
   trainer/active party.
4. **Pic choreography is legacy-clock driven.** Selection works, but slide/
   exit are legacy tables (`src/engine/battleScene.ts:3005-3047,13575-13705`).
   Extend resolver with controller choreography
   (`reference/pokeemerald/src/battle_controller_opponent.c:1240-1322,1867-1924`).
5. **No battle-start summary contract.** Source emits both summaries before
   text (`reference/pokeemerald/src/battle_main.c:3491-3538`). Reuse Slice-5
   compositor with start parties; do not bake fixture icons.
6. **No generic initial release lifecycle.** Typed field art/healthboxes exist,
   but generated renderer starts at command window
   (`src/engine/battleScene.ts:16024-16029`). Reuse those views for normal
   opponent/player controller order, not GROVYLE/KABUTO helpers.
7. **No public dense-lab intro trace.** Lab frame 0 is post-intro
   (`../../oracle/BATTLE_LAB.md:60-62`). A generated route must reach P or
   harness deliberately add pre-reset capture. **PREDICTION:** keep the
   private route as probe until generated route exists; no harness change here.

   **PREDICTION FALSIFIED (2026-07-30).** The harness took the second branch
   the next morning: `preCheckpointCaptureFrames` (`8251953`) plus
   `preCheckpointCaptureAllFrames` (`38fea69`) expose the rental-selection and
   intro-cutscene frames, so this window is publicly capturable and slice 4's
   trace no longer depends on the generated route reaching P first. Mind the
   separate absolute frame numbering — see
   `interactive-routing-flip-design.md` §6.2.

### Recommended slices

1. **Start-command contract (<=35 min):** freeze trainer, parties, active
   indexes, text inputs. No pixel claim.
2. **Generic pre-send-out intro (<=45 min):** relative handoff, pic slide,
   summaries, first printer/cursor/A gate.
3. **Opponent release (<=45 min):** typed sent-out text, exit, ball/release,
   materialization, healthbox; checkpoints B+411/+430/+443/+466.
4. **Player release to command (<=45 min):** player text/throw/release,
   healthbox, menu handoff. This slice claims the OFF generated-route trace:
   estimated **927 captures** (P..B+714).

Open remainder: ground truth is complete, but no public generated app/oracle
trace reaches P yet. This scout intentionally did not create one.
