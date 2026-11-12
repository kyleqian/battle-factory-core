# spark62 — Spark (209) opponent-attacker live adapter

## Results

- **Production change (presentation only):** `liveMoveAnimation.ts` `liveMoveAnimationDuration` case 209 returns 115 for BOTH attackers
  (was `request.attacker === 0 ? 115 : null`). The presentation case is unchanged: all-zero flashing callback / affine advances, the
  accepted `hardwareTieSlotOrder [12,7,3,4,5,9,10,11]`, and the known-order lend gate, now for both attackers. Comments name the mechanism.
- **Mechanism (RAM + source, §Mechanism below):** the "initial callback advance" is NOT a creation-context effect. All 8 flashing sprites are
  created in CB1 by the animation script; the creation iteration overruns the frame and the VBlank edge falls inside `AnimateSprites`, so the
  flashing slots traversed before the edge show one extra `_Step` in the frame-boundary RAM: opponent MINUN / CHINCHOU `[1,1,0,..]`, VOLTORB
  `[1,0,..]`, player `[0,..]` (CPU timing, varies with species). That iteration is a lag frame (byte-identical `screen(c+1) == screen(c)`
  on all 8 rows), which the renderer already encodes (`view(-1)` for the effect sprites at reducer age 43); the spriteAge-0 state where
  the advance lives is never displayed, so every advance in {0,1} renders identically.
- **Prediction vs grid:** prediction (committed in `562cd8b48` before the grid) held on every row: all-zero vectors -> 0 px on the 6 opponent
  pairs and 5 player controls; the accepted `[1,1,0..]/[1,0..]`, the VOLTORB `[1,0..]` and an all-ones vector render identical frames on all
  115 rows (test, 3 pairs); an advance of 2 changes exactly row 44 (non-vacuity control). Tie order: not derived; known-order lend gate kept.
- **Dense windows (production live renderer, `liveAdapterFramebuffer.ts`, two fresh direct-mGBA runs each, lab seed 12):**

  | fixture | rows | residual px (run 0, run 1) |
  |---|---|---|
  | opponent MINUN -> SHUCKLE | 115 | 0, 0 |
  | opponent MINUN -> SNORLAX | 115 | 0, 0 |
  | opponent CHINCHOU -> SHUCKLE | 115 | 0, 0 |
  | opponent CHINCHOU -> SNORLAX | 115 | 0, 0 |
  | opponent VOLTORB -> SHUCKLE | 115 | 0, 0 |
  | opponent VOLTORB -> SNORLAX | 115 | 0, 0 |
  | player MINUN -> SHUCKLE (spark62) | 115 | 0, 0 |
  | player CHINCHOU -> SHUCKLE (spark62) | 115 | 0, 0 |
  | player MINUN / PLUSLE / CHINCHOU -> SHUCKLE (prep10-live, unchanged) | 3 x 115 | 0, 0 each |

  1,265 rows per run, 11 / 11 fixtures 0 px twice. Pre-change control (`5184ed234`'s `liveMoveAnimation.ts`, VOLTORB -> SNORLAX):
  `Error: No live adapter for SPARK`. New test `tests/animation/spark62SparkOpponent.test.ts`: 4 / 6 fail without the change.
- **Census seeds 0..299 (`5184ed234` vs final):** live 7710 -> 7729 commands (96.74 % -> 96.98 %), live frames 1,144,356 -> 1,146,541
  (**+2,185 = 19 x 115**; share by frames 97.96 % -> 97.99 % of the new 1,170,031 presented frames); **0 live -> fallback regressions**;
  command key sequence identical. The 22 opponent Sparks ("duration: no opponent-attacker adapter", 704 fallback frames): **19 live**
  (CHINCHOU, PLUSLE, VOLTORB, MINUN attackers), 3 (battle 107 CHINCHOU) still decline at the known-order gate (`order host: no EXACT plan:
  body 291:opponent`). Presented-frame totals: the 22 commands present 115 frames instead of the 32-frame fallback, so the census
  `battles.frames` grows 4,093,174 -> 4,095,000 (**+1,826 = 22 x 83**); that is the ONLY field of the battle record that differs
  (played / terminal / stalled / errors / stalls / playerTurns identical), hence the battle digest `79313389…` -> `e3603a84…`. The 22
  "pairing mismatches" of `prep43CensusDelta.py` are exactly those 22 records (frames 32 -> 115); the other 7,948 command records are
  identical after stripping the shifted `liveMoveAnimation.ts:<line>` gate numbers. Spark player commands (16) unchanged.
- **Scene ON/OFF parity:** census battle 85 (seed 85, streak 4; two live opponent VOLTORB Sparks, their lend resolved through the
  words-deferred replay after a Sand-Attack, so D3 `faithfulRandomHistory` per command): `spark62Parity.ts 85` exit 0 — Scene OFF logical
  identical, presentation seed B logical identical, fresh repeat frames identical, 18 decision snapshots; per consumer, both Spark bodies
  (115 frames each) render identical frames under seeds A and B (only Sand-Attack's 58 frames differ).
- **Accounting:** `docs/animation-integration-live-status.json` Spark `remaining` edited in place; adapter counts unchanged (Spark was already
  a scoped-exact adapter; its scope widens to the opponent attacker). A live adapter is not whole-playable arbitrary-history exactness.
- **Receipt:** `tools/integration/fixtures/spark62-live-receipt.json` (gates, tested commit / tree).


## Mechanism (RAM, direct mGBA, fresh processes, lab seed 12, every probe twice: r1 == r2 byte-identical)

`tools/integration/spark62Probe.py` replays the flashing-sprite creation frame from the previous frame's raw state one instruction at a
time and logs every entry of `CreateSpriteAndAnimate` (caller via LR), `AnimSparkElectricityFlashing[_Step]` (slot from r0),
`AnimateSprite` (traversal position), `AnimateSprites`, `BattleMainCB1/CB2`, up to the VBlank frame-counter edge
(`fixtures/spark62-probes/r{1,2}/`, summary `fixtures/spark62-analysis.json`).

On all 8 rows (opponent MINUN / CHINCHOU / VOLTORB x player SHUCKLE / SNORLAX; player MINUN / CHINCHOU controls):

1. All eight flashing sprites (slots 3,4,5,7,9,10,11,12, body age 51) are created in **CB1**: `BattleMainCB1 -> {Opponent,Player}DoMoveAnimation
   -> RunAnimScriptCommand -> Cmd_createsprite+0xda -> CreateSpriteAndAnimate`, which runs the init callback (which calls `_Step` once,
   `battle_anim_electric.c:629-652`) and `AnimateSprite` (`sprite.c:591-616`). No sprite or task creates them; the supervisor's expected
   "creation inside the AnimateSprites traversal by a lower slot" is NOT the mechanism.
2. The creation iteration overruns the frame: the **VBlank edge falls inside `BattleMainCB2 -> AnimateSprites`**. Slots traversed before the
   edge: opponent MINUN / CHINCHOU `[0..4]`, opponent VOLTORB `[0..3]`, player MINUN / CHINCHOU `[0]`. The flashing sprites traversed before
   the edge show one extra `_Step` in the frame-boundary RAM sample: opponent MINUN / CHINCHOU `[1,1,0,0,0,0,0,0]` (the accepted constants),
   VOLTORB `[1,0,0,0,0,0,0,0]`, player `[0,...]`. The "initial callback advance" is therefore the CPU-cycle position of the VBlank edge
   inside the overrunning iteration — a property of the RAM sampling instant, varying with species, not a side constant.
3. That iteration is a **lag frame**: the VBlank IRQ copies the previous `BuildOamBuffer` result, so `screen(c+1) == screen(c)` (byte-identical
   screens) on all 8 rows; the main loop finishes `AnimateSprites`/`BuildOamBuffer` after the edge and `WaitForVBlank` waits for the NEXT VBlank,
   so the first displayed flashing frame shows every sprite at the same 2-step state.
4. The production renderer already encodes exactly this: `battleScene.ts` SPARK draws `view(age-1)` and forces `view(-1)` for the effect sprites at
   reducer age 43 (the lag frame). The flashing state at spriteAge 0 (reducer age 42, the only age where `max(spriteAge, advance)` differs)
   is never displayed.

## Prediction (recorded before the check grid)

- Any initial callback / affine advance vector in {0,1}^8 renders identically: the opponent adapter can use the player's all-zero vectors (the
  derived, side-independent rule: displayed frames do not depend on the advance), and the accepted `[1,1,0..]` / `[1,0,..]` give the same pixels.
- Live windows for the opponent attacker (83..197-style, 115 rows, activation + 9) through the production live renderer: 0 px on every probed
  pair with the all-zero vectors, and 0 px with the accepted opponent constants; player windows unchanged 0 px.
- `hardwareTieSlotOrder`: the flashing sprites share one origin (attacker picture offset) and their x2/y2 depend only on the spawn args, so which
  pairs tie on (priority, subpriority, top) is species- and side-independent, but the tie RESOLUTION is the `SortSprites` insertion order of
  `sSpriteOrder`, i.e. history. Not derived here: the opponent attacker takes the same known-order lend gate as the player side (narrowest proven gate).

## Rerun commands (workspace root)

```
sh tools/integration/spark62Probes.sh r1; sh tools/integration/spark62Probes.sh r2       # RAM probes, fresh mGBA each; cmp r1 r2 (exit 139/138 teardown OK)
python3 tools/integration/spark62Analyze.py tools/integration/fixtures/spark62-probes/r1 tools/integration/fixtures/spark62-analysis.json
SPARK62_SCREENS=<dir> <venv-python> tools/integration/spark62Probe.py <scenario> <out.json>  # optional PNG dump, body ages 49..54
<venv-python> tools/integration/prep10Probe.py <scenario> <p10/scenario>                   # activation / HP for the fixtures
node tools/integration/spark62LiveFixtures.mjs <p10-dir>                                    # == tools/integration/fixtures/spark62-live
sh tools/integration/liveFixtureBatch.sh <ev> <sum> tools/integration/fixtures/spark62-live/*.json tools/integration/fixtures/prep10-live/spark-player-*.json
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..299 --out=<a.json> --commands=<a.jsonl>   # base tree and final tree
python3 tools/integration/prep43CensusDelta.py <before.json> <before.jsonl> <after.json> <after.jsonl> <delta.json>
node --experimental-strip-types --no-warnings tools/integration/spark62Parity.ts 85 <out.json>
npm test -- tests/animation/spark62SparkOpponent.test.ts tests/animation/livePrep10MoveAdapters.test.ts tests/animation/spark.test.ts
```

Limits: the tie order is the accepted artifact (SortSprites history), so the opponent attacker, like the player, renders only with a known
order lend (3 / 22 census opponent Sparks still decline there). The lag frame at the flashing creation is measured on 8 rows (both
sides, 5 species, 2 defenders) and the renderer hard-codes it; a creation iteration that did NOT overrun (VBlank after `BuildOamBuffer`)
would display the sprites one frame earlier, and no such history was observed. The window ends 2 rows before the script end (unchanged).
