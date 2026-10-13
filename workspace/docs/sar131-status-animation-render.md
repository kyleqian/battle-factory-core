# sar131 (S10A, ISSUES #168 slice SA4): drawing the Scene ON status animations PSN and PRZ, and the x2 rows of all nine

Base: `2ada2a415` (the sa125 tip; production src `9e124ee2f`). Design: `docs/sta123-status-animations-design.md` §2a / §3 / §5 (SA4 + the
SA9 x2 rows). sa125 added the Scene ON `status-animation` command (timing only). This slice draws PSN and PRZ on the live field and makes
the battler x2 history source-derived after every B_ANIM_STATUS_*. **It adds pixels, not frames.** No kernel, command-timing, RNG, damage,
turn-order or facility change; liveMoveAnimation.ts bodies, the order host / allocator and the palette host are untouched.

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| The renderer | `battleResolutionPresentationRender.ts`: a `status-animation` render effect (battler, animation, age, the tracked x2 input). `battleScene.ts statusAnimationRenderView` + two draw lines in `renderBattleResolutionSceneOffView` (Scene ON's `renderBattleResolutionLiveView` sends non-move effects there, the scd112 path). One row comes from `statusAnimation.ts liveStatusAnimationRow(animation, age, side)`, **one `case` per animation** (PSN, PRZ; every other name returns null = the field as it is, so each later animation is one added case). The battler's displayed picture (species / Castform form art, elevation applied by the draw) at the ShakeMon2 x2 (absolute once shown; before that its tracked rest), its OBJ palette blended (`blendPaletteToward`), the script's sprites in front of it and under the priority-1 healthboxes. The opponent stands at its tracked front idle rest whenever it is not shaken. The elevated opponent's shadow is hidden from age 1 (SpriteCB_EnemyShadow: `gAnimScriptActive`, shown one row late) through the next command's first row (`postBodyShadowHiddenAt`). No draw over the doll / an invisible battler sprite. | `git diff 2ada2a415 -- src/` (5 files, +202 / −5) |
| **Command age vs ROM row** | **command age a == ROM row X + 1 + a**, X = the statusanimation instruction row (a = 0 = the first gAnimScriptActive row, sta123 `firstActive` 0). Pinned by the ROM: 17 / 17 windows 0 px at this offset, **0 / 17 at age + 1** | receipt `productionCompare`, `controls.age+1` |
| Source schedule (no fitting) | **PSN** (Status_Poison, `battle_anim_scripts.s:10224`): `loopsewithpan`, `createvisualtask AnimTask_ShakeMon2 (ATTACKER, 1, 0, 18, 2)`, `blend_color_cycle` (F_PAL_ATTACKER, delay 2, 2 blends, 0 -> 12, RGB(30, 0, 31)) all on script row 0. ShakeMon2 tick k (`shakeMon2Sequence`) is written on row k and shown on row k + 2 (OAM); the battler is at its rest before tick 0 shows, x2 0 from tick 54 (a = 56). The blend is Move_SMOG's (same arguments; `smog.ts targetBlendAtAge`): Y steps by 2 every 4 rows (delay 2 + the BG / OBJ half alternation), 12 held, then 12 -> 0; shown t = a − 2 (palette RAM changes show on their own row). **PRZ** (Status_Paralysis, `:10268`): `loadspritegfx` waits 1 (WaitAnimFrameCount: decrement, hand back, run = 3 rows), so `createvisualtask AnimTask_ShakeMon2 (ATTACKER, 1, 0, 10, 1)` and ElectricityEffect's first `createsprite` run on row 3; tick k shown on row 5 + k (x2 0 from a = 24); ElectricityEffect (`:10137`): 8 x gElectricitySpriteTemplate, `delay 2` = 4 rows apart, AnimElectricity -> WaitAnimForDuration(5) = 6 shown rows from createsprite row + 2; position InitSpritePosToAnimTarget(FALSE) + SetAnimSpriteInitialXOffset with attacker == target (opponent subtracts the x offset, player adds it) around sBattlerCoords (72, 80) / (176, 40), 16x16 centred; tile + 4 x arg3 with the h / v flip (the canonical helper `flippedSparkTiles`) | `src/animation/statusAnimation.ts` |
| **ROM windows** | Direct mGBA (stat101Probe.py, battle-scene-on, explicit lab seed 305419897), 7 scenarios, **r1 == r2 7 / 7** (probe JSON sha256 committed), ROM receipt r1 == r2. **17 windows**: PSN opponent 6 (ONIX: Toxic + 2 end-turn ticks; **elevated LEDIAN**: Toxic + 2 ticks), PSN player 3 (ONIX: Toxic + 2 ticks), PRZ opponent 4 (SNORLAX: Thunder Wave + can't move; **elevated GOLBAT**: Thunder Wave + can't move), PRZ player 4 (SNORLAX, GOLBAT: Thunder Wave + can't move). GOLBAT is Poison type (immune to PSN), hence LEDIAN for the elevated PSN | `tools/integration/fixtures/sar131/receipts/` |
| **Production comparator** | **17 / 17 windows 0 px, full screen, every row activation − 1 .. release + 2** (PSN 74 rows, PRZ 42 rows per window; 1,002 rows), r1 == r2. Per animation x side: PSN opponent 6 / 6, PSN player 3 / 3, PRZ opponent 4 / 4, PRZ player 4 / 4. The next instruction's own print / HP rows (y >= 112) were counted apart and are 0 px too | `tools/integration/fixtures/sar131/production-compare.json` |
| **Controls (must fail)** | `age+1`: **0 / 17**. `no-shake`: **0 / 17**. `no-blend`: **8 / 17** (all 9 PSN windows fail, the PRZ windows have no blend). `no-sparks`: **9 / 17** (all 8 PRZ windows fail). `wrong-side`: **0 / 17**. `base-x2` (the base tree's "status animation -> unknown" x2 rule): **15 / 17** (the two later ONIX windows fail: ONIX drawn at its +1 rest instead of the ROM's 0) | receipt `controls` |
| **x2 rows (step 3)** | `liveBattlerX2History.ts LIVE_BATTLER_X2_STATUS_ANIMATION` replaces "any status animation -> unknown": **zeroed** PSN / PRZ (`AnimTask_ShakeMon2 ANIM_ATTACKER`, attacker = battler) and CURSED / NIGHTMARE (`AnimTask_ShakeMon2 ANIM_TARGET`, target = battler): `AnimTask_ShakeMon2_Step`'s last toggle writes `x2 = 0; y2 = 0` (`battle_anim_mon_movement.c:231-232`). **keep** BRN / SLP / INFATUATION / CONFUSION (sprite-only scripts: gBurnFlameSpriteTemplate / gSleepLetterZSpriteTemplate / gMagentaHeartSpriteTemplate / create_confusion_duck_sprite) and **FRZ** (`monbg` / `clearmonbg` only read x2: MoveBattlerSpriteToBG `battle_anim.c:698 / 702`; `AnimTask_FrozenIceCube` `battle_anim_status_effects.c:381` and its steps write no battler x2 / y2). WRAPPED / unknown name -> unknown | `src/engine/liveBattlerX2History.ts` |
| **Next live body at the predicted x2** | **14 / 14** windows with a next body (both sides; the 3rd tick of each Toxic route ends the trace): ROM gSprites x2 on the row before the body's rise == the prediction (0 everywhere), and **0 px** in the battler's 64x64 rect of the body's pre-activation row (ROM vs production's ordinary field at the predicted x2). The base prediction (unknown -> species rest) differs on 2 (ONIX opponent: +1, 1,091 px) | `tools/integration/fixtures/sar131/next-body-x2.json` |
| **Production routes** (app render path, base `2ada2a415` vs final) | **5 / 5 OK** (Scene ON): seed 87 slot 0 (player SPOINK / GROWLITHE poisoned by an **elevated BUTTERFREE**, Toxic + 8 end-turn ticks, + 2 CONFUSION), seed 0 slot 0 (opponent VIBRAVA: Toxic + 3 ticks), seed 12 slot 0 (opponent IVYSAUR PRZ, Secret Power secondary), seed 2 slot 0 (opponent PLUSLE PRZ), seed 76 slot 0 (player PORYGON poisoned by the elevated BUTTERFREE + 3 ticks; 5 CONFUSION). Identical frame count and per-frame command key / type / age on every route; every differing frame lies inside a PSN / PRZ command (550 / 216 / 34 / 34 / 280 frames) or is the first frame after one with the elevated opponent's shadow hold (4 + 4); **0 unexplained**; CONFUSION commands 0 differing frames (not drawn). Per command differing ages: PSN 54 (ages 2..55: the shake, the blend inside it), PSN with an elevated opponent 70 (+ the shadow hide from age 1), PRZ 34 (ages 5..38). Bodies whose x2 input changed (player side or rest-0 species): 0 differing frames | `tools/integration/fixtures/sar131/routes-delta.json` |
| **Census 0..999** (sa125LiveShareCensus.ts, 10 `--index-from` shards per tree, base `2ada2a415` vs final) | **Identical**: 27,403 move / fade records, **0 key, 0 frame, 0 status, 0 liveFrames, 0 decline changes**; battleDigestExcludingFrames, battleDigest, battleFrames and commandDigest identical on 10 / 10 shards; battle frames 15,915,101 == 15,915,101; 8,063 presented status-animation commands in both. The x2 rows change no live / fallback status anywhere in the census (step 3's status-change list is empty), so there is nothing to explain there; their pixel effect is the later-window / next-body evidence above | `tools/integration/fixtures/sar131/census-delta.json` |
| Canonical Thunder Wave fixture | Untouched: `statusAnimationAtSourceAge` kind "paralysis" and `view.statusAnimation` (battleScene.ts ~:51113 / :51175) are byte-identical (no line changed); `tests/animation/statusAnimation.test.ts` passes unchanged. The live path is a sibling (`liveStatusAnimationRow`), sharing the spark asset and `flippedSparkTiles` | `git diff 2ada2a415 -- src/animation/statusAnimation.ts` (additions only) |

## 2. Production files

- `src/animation/statusAnimation.ts` (+92, additions only): `LiveStatusAnimationName`, `LiveStatusAnimationRow`, `liveStatusAnimationRow`
  (the PSN / PRZ cases, `shakeMon2Row`, `blendColorCycleDelay2To12`, `statusElectricity`).
- `src/engine/battleResolutionPresentationRender.ts`: the `status-animation` render effect (type + branch), `STATUS_ANIMATIONS_DRAWN` (the
  render file may not import src/animation: the animation boundary ratchet; the set is pinned equal to the reducer's cases by the tier-1
  test) and the one-row shadow hold in `postBodyShadowHiddenAt`.
- `src/engine/battleScene.ts`: `statusAnimationRenderView` (+ its type), one import line, two draw sites in
  `renderBattleResolutionSceneOffView` (no reformatting).
- `src/engine/liveBattlerX2History.ts`: the `status-animation` x2 event and `LIVE_BATTLER_X2_STATUS_ANIMATION`.
- **`src/engine/factoryRoundBattleOrchestrator.ts` (+1 condition, +1 comment line)**: the live host passes its existing tracked x2 input at
  a `status-animation` command too (as scd112 did for `stats-change`). Why: before its ShakeMon2 shows (PSN a <= 1, PRZ a <= 4) the battler
  stands at its tracked rest, and the opponent stands at its rest while the player is animated (ROM: ONIX opponent at +1 before the
  shake, 0 after it). Presentation only; the host exists only in Scene ON.

## 3. Pins moved

- `tests/liveBattlerX2History.test.ts`: (1) the event mapping (a PSN receipt is now `{ kind: "status-animation", side, animation: "PSN" }`,
  was `unknown`); (2) seed 110's route: inputs changed 3 -> **8** (+ "5:0:1", "7:0:1", "11:0:1", "13:0:1", "15:0:1": bodies whose ONIX an
  earlier status animation left unknown, now known zeroed; bodies / ON-OFF parity unchanged; seed 134 unchanged).
- No pixel-hash pin of any other test moved (full suite, section 5).

## 4. Tier-1 test (`tests/sar131StatusAnimationRender.test.ts`, 15 tests)

Rows (drawn set == `STATUS_ANIMATIONS_DRAWN`; PSN / PRZ shake, blend and spark schedules); the receipt 17 / 17 and its coverage of both
animations x both sides; **6 windows' every-row production frame sha256 == the 0 px comparator receipt** (ONIX PSN inflicted + tick,
player PSN tick, elevated LEDIAN PSN, elevated GOLBAT PRZ, player PRZ can't move) and their command rows draw; the shadow ages; the doll /
undrawn kinds; the nine x2 rows, the receipt mapping, and the next-body receipt. **Revert experiment** (statusAnimationRenderView returning
null): **7 / 15 fail** (the 6 window pins + the shadow test); restored from a scratch copy.

## 5. Gates (final code: production src `4c1c48c97`)

- `sh tools/integration/sar131Run.sh .integration/validation/run1/out --census` (archive copies of `2ada2a415` and HEAD `2d47a0d0d`,
  production src `4c1c48c97`): **ALL SAME** — scenarios 7 / index SAME, probes r1 == r2 7 / 7, probe sha256 SAME, rom-r1 SAME, r2 == r1,
  comparator 17 / 17 (r1 == r2, == committed), controls 0 / 0 / 8 / 9 / 0 / 15 of 17, next body 14 / 14 SAME, routes 5 / 5 OK SAME,
  census delta SAME (0 changes), receipt SAME.
- Targeted (4 workers): tests/sar131StatusAnimationRender, sa125StatusAnimationCommand, every test touching statusAnimation /
  liveBattlerX2History (14 files), battleResolutionPresentation, factoryAnimationInventory, animationBoundaryRatchet,
  playableAnimationIntegration: **18 files / 240 tests passed**. (The first run failed the boundary ratchet on a render-file import of
  src/animation; fixed by `STATUS_ANIMATIONS_DRAWN`, the two files rerun alone, then the whole set.)
- `npm run typecheck`: green. `npm run test:smoke`: **448 / 448**.
- Full suite, two shards, 4 workers: shard 1 **821 files / 7,059 tests passed** (22 / 119 skipped), shard 2 **820 files / 6,499 tests
  passed** (22 / 104 skipped); total **1,641 files / 13,558 tests passed**, 0 failed.
- `npm run build`: green.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 2ada2a415`:
  **PASS, 624 / 624 captures byte-identical** (235 + 216 + 173): the two canonical railroad traces unchanged, no capture of the app-only
  trace moved (none falls on a drawn PSN / PRZ frame).
- `git diff --check`: clean.

## 6. Open (not in scope)

- SA5..SA8: CONFUSION / BRN / INFATUATION / SLP / FRZ / CURSED / NIGHTMARE are still timing only (each one `case` in
  `liveStatusAnimationRow` + `STATUS_ANIMATIONS_DRAWN`); their gAnimScriptActive shadow hide comes with them.
- SA2 (the IsBattleSEPlaying gate after a damaging hit): an inflicted-after-damage PSN / PRZ starts its rows later in the ROM; the
  renderer follows the command's age, so it inherits that slice's fix.
- The ordinary (message) rows never draw the opponent's idle rest (ONIX / RATTATA +1): a pre-existing residual outside this slice; the
  status-animation command's rows are ROM-exact with it.

## 7. Reproduction (from workspace/)

```
sh tools/integration/sar131Run.sh <fresh-out-dir-inside-the-repo> [--census]   # archive copies, staging == committed, 14 probe jobs (r1 == r2 == sha256),
                                                                                 # rom-r1 == committed, comparator x2 (r1 == r2 == committed), 6 controls,
                                                                                 # next body, 5 routes base vs final, census (--census), receipt == committed -> ALL SAME
python3 tools/integration/sar131Stage.py <dir>/scenarios
sh tools/integration/sar131Probes.sh <out> tools/integration/fixtures/sar131/scenarios
python3 tools/integration/sar131Rom.py <out>/probes/r1 tools/integration/fixtures/sar131/scenario-index.json <rom.json>
python3 tools/integration/sar131NpzToRaw.py <out>/dump <rom.json> <raw-dir>
node --experimental-strip-types --no-warnings tools/integration/sar131ProductionCompare.ts <raw-dir> <out.json> [--neg=age+1|no-shake|no-blend|no-sparks|wrong-side|base-x2]
node --experimental-strip-types --no-warnings tools/integration/sar131NextBodyX2.ts <raw-dir> <out.json>
node --experimental-strip-types --no-warnings tools/integration/sar131RouteRender.ts --routes=87:0:on,0:0:on,12:0:on,2:0:on,76:0:on --out=<f.json> [--scan]
python3 tools/integration/sar131RouteDelta.py <base.json> <final.json> <out.json>
sh tools/integration/sar131Census.sh shards <fresh-dir> <tree-ish>; python3 tools/integration/sar131CensusDelta.py <base-dir> <final-dir> <out.json>
python3 tools/integration/sar131Receipt.py <run-dir> <receipt.json>
npx vitest run tests/sar131StatusAnimationRender.test.ts
```
