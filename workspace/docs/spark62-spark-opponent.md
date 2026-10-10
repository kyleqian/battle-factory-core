# spark62 — Spark (209) opponent-attacker live adapter

(Results section is filled in after the check grid; the mechanism and prediction below were committed BEFORE the grid ran.)

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
