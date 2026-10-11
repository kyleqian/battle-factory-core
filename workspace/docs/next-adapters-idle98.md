# idle98 (S10A timing fidelity, 2026-10-11): the universal pre / post rows on damaging moves, a temp patch, and the two larger timeline gaps

Base: master `3dd2b74b9` (production src `2e5b1d7c`). Evidence only, new files only. The production change is a TEMP PATCH
(`tools/integration/fixtures/idle98/idle98-universal-rows.diff`). It was applied only to git-archive copies of the base under the gitignored
scratch dir. Direct mGBA only (no shared oracle), with an explicit lab seed in every scenario. Every probe job ran twice in fresh
processes, r1 == r2 byte for byte (36 / 36 scenario outputs + 8 / 8 STATS_CHANGE outputs). Predictions were committed before any probe
(`9e8a6982d`, `fixtures/idle98/predictions.json`).

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| Is pre = 3 / post = 2 universal? | **Yes: 37 / 37 Scene ON bodies.** 8 damaging moves x both sides (Karate Chop, Psychic, Bite, Earthquake = hit; Double Kick = multi-hit, both bodies; Razor Wind = two-turn, charge on both sides + the player's strike; Water Pulse = KO on the opponent side, the player-side target survived its damage roll; Dynamic Punch = a miss on both sides, so no body), plus the targets' 17 Tackle bodies and the Bulk Up control. Pre rows F_att..A-1 are one static image equal to F_att-1 and to row A on 37 / 37. Post rows E..F_after-1 equal the first inactive row E on 37 / 37. On every hit body (33 / 33) the screen stays equal to E for 5 rows (E..E+4); Cmd_hitanimation runs on E+4 | `receipts/compare-r1.json` (r2 identical), `table/classes.tsv` |
| Scene OFF | **F_after - F_att = 35 on 37 / 37** (Cmd_attackanimation -> BattleScript_Pausex20). F_att - G and F_es - F_after are identical ON vs OFF on 37 / 37: only attackanimation..waitanimation depends on the scene | same |
| Production's OFF hit path | **Exact (L_OFF = 0) on all 12 paired first bodies**: its `1 + interveningInstructions + 32` equals the ROM's G+1 -> Cmd_hitanimation span, attG + 36 (42 for BattleScript_EffectHit moves, 48 Earthquake, 53 Double Kick hit 1). G = the final glyph of "X used Y!", so production's move-animation command starts on the ROM frame G+1 in both scenes (same 24-frame message command) | `table/classes.json` (`romOffG1ToHit` == `prodOff`) |
| Frames production loses per body (Scene ON) | **hit / KO: L_ON = prodOff - 30 + N + trail**: Karate Chop 11, Water Pulse 11, Psychic 16, Bite 26, Earthquake 27, Double Kick hit 1 22. **Later multi-hit body: 84** (Double Kick hit 2: ON command 36 vs OFF 115). **No-hit (status, two-turn charge): L_ON = L_OFF - 27 (Bulk Up) / - 30 (Razor Wind charge)**, where L_OFF = (attG - 1) + 35 + k (no OFF command at all). Miss: no body, production ON == OFF on 31 / 31 misses (14 routes) | `table/classes.tsv`, routes `receipts/route-sha256.json` |
| Predictions (`predictions.json`, committed before the probes) | **ROM: all held** (pre 3, post 2, static pre rows, post rows == E, OFF 35, scene-independent outside the span, miss = no body with the same pause in both scenes). **Production: L_OFF = 0 held, and the no-hit class held.** The ON hit-path formula 12 + N + trail held for the attG = 6 moves (Karate Chop 11, Psychic 16, Bite 26) but missed Earthquake (predicted 21, measured 27) and Double Kick hit 1 (predicted 11, measured 22): their attack string is further from attackanimation (attG 12 / 17). prodOff - 30 + N + trail covers all of them. Double Kick hit 2 (84) was badly mispredicted ("same as a single hit") | `table/classes.tsv` |
| Are the lost rows reproducible from production's own frames? | **Yes for pre and post.** Pre: rows G+1..A+N-1 are all the age-0 image (production's own age-0 frame for lead-0 bodies and idle94's 40 static-lead moves). Post: on trail -1 sides, rows E+1..E+3 equal production's last row (E). Not reproducible from frames alone: the multi-hit later-body gap (its 84 frames include screen changes before G) | same |
| **BANKED temp patch** | `liveMoveUniversalRows` + `liveMoveUniversalRowAge` (1 file, +59 / -5). A live move-animation command lasts P + D + T. Its effect age is clamp(elapsed - P, 0, D - 1). P = 3 except 13 masked moves (their lead is unproven: `LIVE_MOVE_NO_PRE_ROW_SIDES`). T = 2 on the 257 trail -1 sides (130 moves, `LIVE_MOVE_POST_ROW_SIDES`), else 0. A Substitute swap and a declined body keep 0 / 0 | `idle98-universal-rows.diff` |
| Patch proof | **Routes 14 / 14** (Karate Chop, Psychic, Water Pulse, Bulk Up, Bite, Earthquake on both sides; Double Kick; Dynamic Punch = masked control, P 0). Patched pre rows == base row 0 (age 0, live). Body rows unchanged (sha, age, live). Exception: the two Random2 adapters on routes whose earlier bodies gained rows (Water Pulse x2, Double Kick) keep age / live everywhere and differ only from their first draw age (91 / 97 >= 86, 11 >= 10). Their presentation-RNG words moved with the timeline (the host advances every frame). Post rows == base last row. Next command's first row equal. r1 == r2 in both trees | `receipts/render-check.json` |
| Census delta (seeds 0..999, ten shards per tree) | **0 status changes (live 26,185 both). 0 per-command mismatches. 23,814 commands moved by exactly P + T**: 11,716 by +5 (255 move-sides), 12,098 by +3 (253 move-sides). 23,687 of them are live; 127 are presentation-stage fallbacks. 111 Substitute swaps kept +0. **+94,874 frames** (3,959,685 -> 4,054,801 incl. seed 434). Key sequence + battleDigestExcludingFrames identical on 9 / 10 shards. Shard 4: seed 434 is a frame-budget stall (the census's FRAME_BUDGET): it ends one turn earlier (338 vs 339 turns) and drops its final Struggle fallback command. Its 265 patched commands are a key prefix of the base's 266. The other 99 battles are identical | `census-delta.json`, `census-summary.json` |
| Test pins the patch moves | **273 tests in 65 files, every one a timing pin**: 267 ordinary-route row / age sequences, 4 row counts, and 2 durations (MOVE_ANIMATION 48 -> 53, Earthquake 198 -> 201). Patched copy: 65 files / 273 tests failed, 1,557 files / 13,042 tests passed (44 / 223 skipped). It ran in its own two-commit git repo, so the appDifferential environment failure idle94 hit does not appear | `pins.json` |
| STATS_CHANGE (issue a) | **A missing presentation, not only timing.** The ROM plays General_StatsChange (AnimTask_StatsChange: an OBJ-window sprite copy of the battler with a scrolling, blended stat-arrow BG) for **75 active frames** (STAT_ANIM_MULTIPLE_PLUS1, Bulk Up: 59 screen changes). It plays **89 frames** in the sharply variant (Swords Dance +2 and Scary Face -2: 81 changes). Scene ON and OFF are identical (r1 == r2). Production presents a 2-frame `stat` command. **Census: 5,698 stat commands in 4,689 groups, 897 / 1,000 battles** (up 3,416 / down 2,282; sharply 1,395) | `receipts/stats-change.json`, `exposure.json` |
| Scene OFF pause (issue b) | **9,975 of the 27,481 census move bodies (36 %) have no hit receipt.** Production's OFF route presents nothing for their 35-frame attackanimation -> Pausex20 -> waitanimation span (plus attG - 1 instruction frames). Spot check (16 battles): ON hit-path bodies 310 == OFF move-animation commands 310 | `exposure.json` |

## 2. Mechanism (source + ROM)

Production's ON move-animation command starts after the 24-frame "X used Y!" message, on the ROM frame G+1 (one callback after the final glyph). This
anchor is fixed by the accepted OFF hit path: its `1 + interveningInstructions + 32` equals the ROM's G+1 -> Cmd_hitanimation span exactly on every
paired body. The ROM then runs the source instructions between the attack string and `attackanimation` one per frame (attG - 1 frames: 5 for
BattleScript_EffectHit, 11 Earthquake, 16 Double Kick hit 1, 2 Bulk Up, 0 the Razor Wind charge, which prints EMPTYSTRING3). gAnimScriptActive rises
3 frames later (pre). The body runs E - A = N + D + trail frames, waitanimation releases 2 frames after E (post), and on the hit path
effectivenesssound takes one more frame before Cmd_hitanimation. Production ON presents only D. So, per body:

| Command class (Scene ON) | ROM frames G+1 -> next production anchor | Production | L_ON (frames lost) | Lost rows reproducible from production's own frames |
|---|---|---|---|---|
| hit, KO hit, two-turn strike, first multi-hit body | (attG - 1) + 3 + (N + D + trail) + 2 + 1 | D | **prodOff - 30 + N + trail** (EffectHit lead 0 / trail -1: 11) | pre: attG + 2 + N rows = age-0 image. Tail: trail + 4 rows, = production's last row when trail = -1 (3 rows) |
| later multi-hit body | the inter-hit instruction span (OFF command 115) + the body | D | **84** (Double Kick hit 2) | no: the span before G has screen changes |
| no hit (status, two-turn charge) | (attG - 1) + 3 + (N + D + trail) + 2 + k | D | L_OFF - 35 + spanOn - D (Bulk Up -27, Razor Wind charge -30). idle94's L = pre + N + trail + post used F_att as the start anchor, which is attG - 1 frames late | pre / post as above |
| miss | no body. BattleScript_MoveMissedPause: G+1 -> the next screen change = 36 frames in both scenes (4 / 4) | the "missed" message follows "used" directly | the same in ON and OFF (main-lane message timing; not anchored here) | n/a |

Scene OFF: hit-path L_OFF = 0. A no-hit body has no OFF command: L_OFF = (attG - 1) + 35 + k (issue b below).

## 3. FOLD INSTRUCTIONS (universal rows)

1. On a tree WITHOUT land97: apply `tools/integration/fixtures/idle98/idle98-universal-rows.diff` from the repo top (`patch -p1 < workspace/tools/...diff`;
   `git apply` run from inside the tree silently skips it). Rerun `sh tools/integration/idle98Run.sh <fresh-out-dir> --census` on the fold's base: every
   receipt must be SAME (the runner's archive base is 3dd2b74b9; on a newer base expect only the census and route sha columns to move).
2. On a tree WITH land97 (idle94 lead rows): the pre rows come before the lead rows. Fold both into one hold: duration = P + N + D + T, and
   age = clamp(elapsed - P - N, 0, D - 1). Use `liveMoveIdleLeadRows` for N and keep this patch's masks for P / T. The 13 masked moves are
   exactly the leads land97 does not cover (Thunder Punch, Bind, Supersonic, Flamethrower, Double Team, Recover, Rock Slide ply, Faint Attack,
   Milk Drink, Spark, Dynamic Punch, Encore, Synthesis).
3. Move the pins listed in section 4. Each ordinary-route age sequence `[0..D-1]` becomes `[0 x (P+1), 1..D-1, (D-1) x T]`. Row counts move by P + T,
   and battle frame totals move by the sum over the route's live bodies.
4. Follow-ups, measured here but not banked:
   - **Full hit-path accounting** (exact alignment of the next command): pre = attG + 2 + N rows instead of 3. Production already has attG on the hit
     path: OFF `1 + I + 32` = attG + 36, so pre = (1 + I + 32) - 34 + N. The ON MOVE_ANIMATION branch needs the same
     `nextHitAnimation` / `instructionExecutionOf` provenance as the OFF branch. Tail = trail + 4 rows (3 for trail -1: E+1..E+3 == E on 33 / 33).
     This removes the residual L_ON - P - T (Karate Chop 6, Psychic 11, Bite 21, Earthquake 22).
   - Later multi-hit bodies (84 frames each). ON-only; the span is not static, so it needs a per-row study. Census exposure: 1,952 adjacent same-move
     hit bodies (an upper bound: repeated turns count too; Struggle 578, Double Kick 116).
   - Tails on trail != -1 sides (95 known sides) and the no-hit class's k (the frames from F_after to the next production anchor).

## 4. Pins the patch moves

Patched copy (`git archive 3dd2b74b9` + the diff, its own two-commit git repo), `npm test`: **65 files / 273 tests failed, 1,557 files /
13,042 tests passed** (44 / 223 skipped). 0 non-timing failures. Each pin asserts a live body's ordinary-route row count, age sequence or command
duration. Each moves by P + T (+3 or +5) per live body on its route. `tools/integration/fixtures/idle98/pins.json` lists all 273 with each assertion's first
line. Per file:

- `tests/animation/liveWallMoveAdapters.test.ts`: 15
- `tests/animation/livePrep8MoveAdapters.test.ts`: 12
- `tests/animation/liveFaithfulTimingAdapters.test.ts`: 11
- `tests/animation/liveOrderConsumerMoveAdapters.test.ts`: 11
- `tests/animation/livePrep11MoveAdapters.test.ts`: 9
- `tests/animation/liveAnchor3MoveAdapters.test.ts`: 8
- `tests/animation/livePrep2MoveAdapters.test.ts`: 8
- `tests/animation/livePrep6MoveAdapters.test.ts`: 8
- `tests/animation/livePrep7MoveAdapters.test.ts`: 8
- `tests/animation/liveProfileMoveAdapters.test.ts`: 8
- `tests/animation/liveQ2Adapters.test.ts`: 8
- `tests/animation/liveAnchor2MoveAdapters.test.ts`: 7
- `tests/animation/liveAnchorMoveAdapters.test.ts`: 7
- `tests/animation/livePrep16MoveAdapters.test.ts`: 7
- `tests/animation/liveAnchor4MoveAdapters.test.ts`: 6
- `tests/animation/liveFieldfxMoveAdapters.test.ts`: 6
- `tests/animation/liveHBufferS1MoveAdapters.test.ts`: 6
- `tests/animation/livePrep10MoveAdapters.test.ts`: 6
- `tests/animation/livePrep5MoveAdapters.test.ts`: 6
- `tests/animation/livePrep9MoveAdapters.test.ts`: 6
- `tests/animation/liveR2GatesRoutes.test.ts`: 6
- `tests/animation/liveFirePunchBody.test.ts`: 5
- `tests/animation/liveOam1MoveAdapters.test.ts`: 5
- `tests/animation/livePhysical2cMoveAdapters.test.ts`: 5
- `tests/animation/liveRandom2R1MoveAdapters.test.ts`: 5
- `tests/playableContactAnimationLifecycle.test.ts`: 4
- `tests/animation/liveNext5MoveAdapters.test.ts`: 4
- `tests/animation/livePhysical2aMoveAdapters.test.ts`: 4
- `tests/animation/livePhysical2bMoveAdapters.test.ts`: 4
- `tests/animation/livePrep13MoveAdapters.test.ts`: 4
- `tests/animation/liveRoarWhirlwindMoveAdapters.test.ts`: 4
- `tests/animation/liveSelectorsMoveAdapters.test.ts`: 4
- `tests/animation/liveEndeavorAdapter.test.ts`: 3
- `tests/animation/liveGlowMoveAdapters.test.ts`: 3
- `tests/animation/liveLaterBodiesBg.test.ts`: 3
- `tests/animation/liveMultihitMoveAdapters.test.ts`: 3
- `tests/animation/liveRandom2R4MoveAdapters.test.ts`: 3
- `tests/animation/liveSkillSwapFlatterAdapters.test.ts`: 3
- `tests/playableAnimationIntegration.test.ts`: 2
- `tests/animation/liveBatonPassAdapter.test.ts`: 2
- `tests/animation/liveCurseStatsAdapter.test.ts`: 2
- `tests/animation/liveDigAdapter.test.ts`: 2
- `tests/animation/liveExtremeSpeedMementoAdapters.test.ts`: 2
- `tests/animation/liveFlyBounce.test.ts`: 2
- `tests/animation/liveIceBallAdapter.test.ts`: 2
- `tests/animation/liveLsbzTiming.test.ts`: 2
- `tests/animation/livePrep29Adapters.test.ts`: 2
- `tests/animation/liveRandom2R5MoveAdapters.test.ts`: 2
- `tests/animation/liveReturnAdapter.test.ts`: 2
- `tests/battleResolutionPresentation.test.ts`: 1
- `tests/playableAnimationLifecycle.test.ts`: 1
- `tests/substituteDollDefenderLive.test.ts`: 1
- `tests/wordsOrderDeferredLend.test.ts`: 1
- `tests/animation/liveDiveAttackAdapter.test.ts`: 1
- `tests/animation/liveDiveSetupAdapter.test.ts`: 1
- `tests/animation/liveDrillPeckAdapter.test.ts`: 1
- `tests/animation/liveHowlAdapter.test.ts`: 1
- `tests/animation/livePhysicalMoveAdapters.test.ts`: 1
- `tests/animation/liveSheerColdAndFix150.test.ts`: 1
- `tests/animation/liveShockWaveAdapter.test.ts`: 1
- `tests/animation/liveSpitUpAdapter.test.ts`: 1
- `tests/animation/liveStatusMoveAdapters.test.ts`: 1
- `tests/animation/liveSubstituteBodyAdapter.test.ts`: 1
- `tests/animation/liveSuperpowerAdapter.test.ts`: 1
- `tests/animation/liveSupportMoveAdapters.test.ts`: 1

## 5. ISSUES drafts (ready to file)

**(a) STATS_CHANGE: the stat-change animation is missing (Scene ON and OFF).** Mechanism: `Cmd_playanimation` exempts B_ANIM_STATS_CHANGE from
HITMARKER_NO_ANIMATIONS (`battle_script_commands.c:4011`), so `General_StatsChange` (`createvisualtask AnimTask_StatsChange, 5; waitforvisualfinish`) plays in
BOTH scenes. AnimTask_StatsChange (`battle_anim_status_effects.c:482`) picks goesDown / the stat palette / sharply from animArg. StatsChangeAnimation_Step3
(`battle_anim_utility_funcs.c`) fades a scrolling stat-arrow BG in (to blend 10, or 13 sharply), waits 20 (30 sharply) frames and fades out. The overlay
is masked by an OBJ-window copy of the battler sprite (CreateInvisibleSpriteCopy with the battler's species). So the duration depends ONLY on sharply.
Direction sets the scroll velocity (+-3) and BG X. The stat picks the palette. Species and side shape the mask. Evidence: 75 active frames for
STAT_ANIM_MULTIPLE_PLUS1 (Bulk Up, PRIMEAPE both sides, ON == OFF, 59 screen changes) and 89 for the sharply variant up (Swords Dance) and down
(Scary Face), ON == OFF, 81 changes. All r1 == r2 (`fixtures/idle98/receipts/stats-change.json`). Production: `stat` command, STAT_TIMING 2 frames, no
pixels. Exposure (seeds 0..999): 5,698 stat commands in 4,689 groups (one ROM animation each at most: playstatchangeanimation plays one for a
multi-stat move), 897 / 1,000 battles. Lower bound ~ 4,689 x 75 - 5,698 x 2 = 340k frames (~8.6 % of the census timeline), in both scenes. Fix
shape: a `stats-change` presentation command (or a widened `stat` command) per group with the source duration (75 / 89 measured) and a live
adapter for AnimTask_StatsChange (BG arrows + OBJ-window mask), keyed by direction / stat / sharply / battler. One group per
playstatchangeanimation (Bulk Up's two stat events share one).

**(b) Scene OFF: no-hit move bodies lose the BattleScript_Pausex20 span.** Mechanism: in OFF, Cmd_attackanimation pushes BattleScript_Pausex20
(`pause B_WAIT_TIME_SHORT`) for EVERY move, so F_after - F_att = 35 (37 / 37 bodies here, 20 / 20 in idle94). Production's OFF route has a command for
it only when a hit receipt follows (`battleResolutionPresentation.ts` SCENE_OFF_ATTACK_PAUSE: "An attack receipt without a hit receipt ... continue"). Evidence:
route b154 OFF goes "HERACROSS used BULK UP!" (24) -> `stat`. 16 census routes: ON hit-path bodies 310 == OFF move-animation commands 310, while
165 no-hit bodies have none. Exposure: 9,975 / 27,481 census move bodies (Double Team 885, Protect 558, Confuse Ray 532, Rest 467, Dig 338,
Curse 250, ...). At least 35 frames each (~349k OFF frames) plus attG - 1 instruction frames (2 for Bulk Up). Fix shape: emit the OFF move-animation
pause command for every SCENE_OFF_ATTACK_PAUSE receipt. Without a hit receipt it lasts 1 + (instructions through waitanimation) + 32 (attG - 1 + 35
+ the waitanimation frame), using the same provenance as the hit path.

**(c) (new, PLAUSIBLE) Misses: the 32-frame BattleScript_MoveMissedPause in both scenes.** ROM: attackstring -> ppreduce -> `pause B_WAIT_TIME_SHORT` (32)
-> effectivenesssound -> resultmessage. G+1 -> the next screen change = 36 frames, ON == OFF (Dynamic Punch misses, both sides). Production goes
from the "used" message straight to "X's attack missed!" (31 misses on 14 routes, ON == OFF). Whether the "missed" message command already absorbs the
pause was not anchored here (it needs the message command's first-glyph frame). Check that before filing.

## 6. Gates (evidence only)

GATES_SECTION

## 7. Reproduction (from workspace/)

```
sh tools/integration/idle98Run.sh <fresh-out-dir-inside-the-repo>            # archive copies, staging, 36 + 8 probe jobs x2 (r1 == r2), compare,
                                                                             # STATS_CHANGE, 32 class routes, class table, 14 render routes x2 x2
sh tools/integration/idle98Run.sh <fresh-out-dir-inside-the-repo> --census   # + both censuses (seeds 0..999) and the exposure run
# pieces:
python3 tools/integration/idle98Stage.py <dir>/scenarios [--miss-search]
python3 tools/run-mgba-probe.py <o.json> -- <mgba-venv python> tools/integration/idle94Probe.py <scenario> on|off <o.json>
python3 tools/integration/idle98Compare.py <probe-dir> tools/integration/fixtures/idle98/scenario-index.json <out.json>
python3 tools/integration/idle98StatsChange.py <probe-r1> <probe-r2> <compare-r1.json> <out.json>
node --experimental-strip-types --no-warnings tools/integration/idle94Route.ts --seed=N --streak=$((N * 11 % 49)) --scene=on|off --out=<f>
python3 tools/integration/idle98Classes.py <compare-r1.json> <route-dir> <out-dir>
node --experimental-strip-types --no-warnings tools/integration/idle94RouteRender.ts --seed=N --streak=N --move=M --side=S --out=<f>
python3 tools/integration/idle98RenderCheck.py <render-dir> tools/integration/fixtures/idle98/render-routes.txt <patch.diff> <out.json>
python3 tools/integration/idle98CensusDelta.py <base-shards> <patched-shards> <patch.diff> <out.json>
node --experimental-strip-types --no-warnings tools/integration/idle98Exposure.ts --seeds=A..B --out=<f.jsonl>
python3 tools/integration/idle98ExposureSummary.py <exposure-dir> <census-base-shards> <out.json>
```

Files: `tools/integration/idle98{Stage,Compare,Classes,StatsChange,RenderCheck,CensusDelta,ExposureSummary}.py`, `idle98Exposure.ts`, `idle98Run.sh`.
Fixtures `tools/integration/fixtures/idle98/`: `scenarios/` (18) + `scenario-index.json`, `miss-seeds.json`, `predictions.json`, `receipts/` (compare,
probe / route sha256, render check, STATS_CHANGE), `table/classes.{tsv,json}`, `idle98-universal-rows.diff`, `render-routes.txt`, `census-delta.json`,
`census-summary.json`, `exposure.json`, `pins.json`, `.gitattributes`.
