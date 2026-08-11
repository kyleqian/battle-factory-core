# ENDEAVOR portable staging probe (Battle Scene ON)

This is a synthetic presentation-seam construction, not a Factory-legality
claim. It stages the opposite battler side from canonical turn 2 and compares
the complete move body plus generic-hit and HP-drain handoff without retaining
oracle pixels.

## Construction and source shape

`tools/probe/stage-fire-punch-portable-on.py` replays the canonical ON anchor
through the first action menu at frame **1886**, then changes only the loaded
player battler's first move and PP:

| field | before | staged |
| --- | ---: | ---: |
| `gBattleMons[0].moves[0]` | `MOVE_ROCK_SLIDE` (157) | `MOVE_ENDEAVOR` (283) |
| `gBattleMons[0].pp[0]` | 10 | 5 |

The stock FIGHT controller runs unchanged. GROVYLE's canonical DOUBLE TEAM
resolves first; player-back ONIX dispatches ENDEAVOR at frame **2305**, spends
PP at **2327**, and produces the immutable oracle outcome 143→117 HP at frame
**2473**. The presentation adapter consumes that outcome; it does not calculate
or commit damage, RNG, PP, turn order, or round/facility state.

`Move_ENDEAVOR` (`data/battle_anim_scripts.s:3789-3803`) combines
`AnimTask_SquishAndSweatDroplets`, `AnimTask_BlendMonInAndOut`, two
`AnimTask_ShakeTargetBasedOnMovePowerOrDmg` instances, and two target-relative
basic hitsplats. The reusable reducer keeps the already-probed local schedules
and translates only source inputs:

- attacker base coordinate from `GetBattlerSpriteCoord(..., X/Y)`;
- `SetBattlerSpriteYOffsetFromYScale` from the attacker's extracted pic
  `y_offset` (ONIX back is 0; canonical GROVYLE front is 4);
- target-relative hitsplat centers and the target-side healthbox/flicker;
- immutable stale `gAnimMovePower` (0 here, versus canonical 75).

The opposite-side case also exposes a real OAM-layering variant: ONIX's enlarged
back sprite reaches the opponent healthbox, and the healthbox wins that
overlap. The live compositor now preserves that priority generally.

## Fresh ON evidence

The portable dense window is oracle frames **2345–2485**, mapped to
presentation ages **-2–138**; body age zero is frame **2347**, the first visible
palette/affine frame. All **141/141** frames are byte-exact, including both
squish/blend cycles, all 16 translated droplets, both translated hitsplats,
the +1/0 stale-power target shake, opponent healthbox wobble and flicker, and
the complete 143→117 displayed HP drain up to `gCurrentMove` clearing.

The existing canonical opponent-front GROVYLE→player-back ONIX window is also
dense byte-exact at frames **2894–3130**, **237/237**. Together the cases cover
both singles attacker sides, front/back sheets, distinct pic-coordinate
offsets, target-relative geometry, and both healthbox orientations through the
shared relative presentation seam.

## Reproduction

`npm run compare:endeavor-portable` creates a fresh temporary directory, runs
the stock-controller stage through `tools/run-mgba-probe.py`, and compares live
app RGB for all 141 frames. Canonical verification is:

`npm run compare -- tools/compare/traces/turn2-endeavor-drain.json --capture-range 2894:3130 --summary`

Probe JSON and raw RGB are temporary only; neither is bundled or consulted at
runtime.
