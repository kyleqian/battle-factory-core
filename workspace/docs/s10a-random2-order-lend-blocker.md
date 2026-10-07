# S10A blocker: post-body sprite-order lend for multi-body Random2 moves (Ice Ball 301, Dive 291)

S10A integration worker, 2026-10-07, base `a7402719b` (src `58b592bc`). Evidence only: no `src/` change and no live claim.
Receipt: `tools/integration/fixtures/s10a-live/blockers/order-lend-blocker.json`, written by
`tools/integration/s10aOrderLendBlocker.ts`. It reproduced three times byte-identical: twice on the prep26 alternate outputs, then once
on fresh direct-mGBA `prep26Probes.sh iceball` outputs. Those fresh outputs are byte-identical to the prep26 ones.

## What blocks the two adapters

Ice Ball counters 1..4 always follow an earlier Ice Ball body of the same chain. Dive's attack body always follows its setup body. At
the later body's activation edge, the order of the free slots in `sSpriteOrder` is the earlier body's end state:

- **Ice Ball:** before death, the shards are y-sorted by `SortSprites`. Their final y is `randB * 20 >> 8`, which comes from the earlier
  body's Random2 words.
- **Dive:** the setup droplets are sorted the same way. Their velocities come from the setup words.

As a result, the activation orders differ for every later body in the corpora:

- Ice Ball: accepted bodies 2..5 of both sides and alternate bodies 2..5 / 2..3 (`fixtures/prep26`, state probe `spriteOrder` row 0).
- Dive: all 4 attack bodies (prep25 state probes):
  - `[..2,4,3,15,14,13,7,9..]`
  - `[..2,10,12,9,7,15,13..]`
  - `[..2,4,3,13,12,5,7..]`
  - `[..2,14,5,11,10,4,9..]`

Dig's post-setup order is a constant (`DIG_POST_SETUP_FREE`). These two orders are not constant.

The production order host cannot lend them:

- `SPRITE_ORDER_PRODUCTION_BODIES` has no `301:*` / `291:*` plan. Ice Ball is not observed in the plan evidence, and Dive is NEEDS-KEYS
  ("equal priority word, different y"). So the tracker invalidates after the earlier body, and consumers decline.
- A constant plan cannot exist, because the result depends on presentation Random2 words.
- The tracker lives in `factoryRoundBattleOrchestrator` (logical tick). The words live in `EngineState.presentationRng`, which is
  presentation-owned, outside the orchestrator and never read by logical code (docs/presentation-rng.md "Ownership").

## Measured: the tie order is visible

All numbers come from the existing renderer branches against raw ROM RGB.

| Window set | True activation order (carried with `carryLiveSpriteOrder`) | Words-free lend (known-entry order) |
|---|---|---|
| Ice Ball, 18 windows, 1535 rows (accepted 5 + 5 bodies, GLALIE -> GOLEM player 5 / opponent 3) | carried order == ROM `sSpriteOrder` on **1535/1535** rows; **0 px** in 18/18 | counter-0 bodies 0 px (4/4); **13 of 14 later bodies differ**: 482 px total, 1..4 rows each, all in rows 38..42 (shard births: the same-y shards tie-break by order position) |
| Dive accepted attack bodies (CHINCHOU / ONIX, 93 rows each) | **0 px** (the reducer's `spriteOrderSeed` = ROM row 15) | **116 px** (player-back, rows 17..22), **61 px** (opponent-front, rows 17..19) (droplet births) |

The carry is exact, so production can reproduce the order given the earlier body's words and its activation lend. The missing piece is
plumbing, not a source model. The prep26 Ice Ball and prep25 Dive per-age programs are unaffected.

## Unblock designs (supervisor decision; not started here)

1. **Seam-resolved deferred lend (recommended).** The presentation RNG host keeps every activated body of the battle
   (`host.bodies`, `presentationRngBodyWords(host, key)`), so the render seam can read an earlier body's words by key.
   - The order host records a marker at the earlier body: its presentation body key (`liveMovePresentationRngBodyKey`), the lent
     activation free order, the counter / side, and the following units (as `digSetup` / `bonemerangHit1` record their unit counts).
   - It then lends `{ known: true, deferred: { key, activationFree, units } }` instead of invalidating.
   - The seam resolves the lend: it carries the order through the earlier body with that body's words (the adapter's own sprite program
     + `carryLiveSpriteOrder`), then applies the units that followed. For Ice Ball those are the target hit blip, the opponent's
     EXACT-plan body, the prompt cycle and so on. For Dive it is "setup first, nothing since" (the Dig gate).
   - The tracker state stays word-free. Only the lend's resolution, which is presentation-side and render-pure, reads the words.
   - Estimate: infrastructure + tests ~60-90 min, then each adapter ~45-60 min with its dense fixtures and routes.
2. **Presentation-side order tracker mirror.** Move the order tracker, or a copy of it, into presentation state ticked with the
   presentation RNG session. This is larger, because every lend consumer would read the new host.

Without one of these, both moves can ship only for the earlier body: Ice Ball counter 0, and the Dive setup body. That does not meet the
step's acceptance (all 5 Ice Ball counter bodies and a chain of >= 3 bodies; both Dive bodies with the hidden-attacker gap), so neither
move was shipped.

## Reproduce

```sh
OUT=/tmp/s10a-ib sh tools/integration/prep26Probes.sh iceball        # direct mGBA, r1 == r2 (teardown SIGSEGV is the known mGBA exit)
npx vite-node tools/integration/s10aOrderLendBlocker.ts OUT.json \
  /tmp/s10a-ib/prep25-ice-ball-alt-player-glalie-golem-r1.json:/tmp/s10a-ib/prep25-ice-ball-alt-player-glalie-golem-r1-rgb:player \
  /tmp/s10a-ib/prep25-ice-ball-alt-opponent-glalie-golem-r1.json:/tmp/s10a-ib/prep25-ice-ball-alt-opponent-glalie-golem-r1-rgb:opponent
cmp OUT.json tools/integration/fixtures/s10a-live/blockers/order-lend-blocker.json
```
