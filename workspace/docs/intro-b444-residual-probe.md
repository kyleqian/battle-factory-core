# Generated intro B+444 residual — Scene-OFF RAM attribution

## Verdict: FIXABLE

The sole generated-intro residual is **10 RGB pixels at B+444** (absolute
frame 1615), in `x=158..165, y=40..42`.  It is **not** an
`sSpriteOrder`/particle tie.  It is the final displayed frame of the
opponent summary bar after the source controller has advanced into its
destroy-and-slot-reuse callback.  The generated compositor uses the prior
canonical `destin` exit-stall selection for this typed introductory route and
therefore paints the bar one source step behind in this small tail.

The bounded fix site is `drawOpponentSummaryExit` in
`src/engine/battleScene.ts:6431-6456`, called by the generated opponent
release compositor at `src/engine/battleScene.ts:4179-4203`.  Give that
caller's typed **initial-opponent-summary tail** an explicit stateless exit
clock: at its `rawElapsed=31` final displayed bar frame use `elapsed=31`
(the next exit step), rather than the current `encounter === "destin"`
fallback's `stallAt=30` / `elapsed=30`.  Keep the rule scoped to the typed
generated initial-release lifecycle; do not add a whole-scene sprite-order
model and do not key it to B-relative time.

No implementation was made by this evidence step.

## Fresh reproduction

The legal source fixture was
`tools/battle-lab/factory-trainer-pic-shizuka-off.json` (SHIZUKA,
MAGNETON, Battle Scene OFF).  A new mGBA process found
`BeginBattleIntro` at absolute frame **1171**, so B+444 is frame **1615**.
Its framebuffer SHA-256 was
`8e37290bdab853c3146b2d39f909975af472a721c8ef3c51979b9afb52853e1d`.

The regenerated typed compositor used the same frozen fixture party and
trainer, with state `{ elapsed: 444, acknowledgedElapsed: 370 }`.  Its only
differences from the ROM were:

| pixel(s) | ROM RGB | compositor RGB |
| --- | --- | --- |
| (158-159, 40) | `ffb5f7` | `ffffff` |
| (160-161, 40) | `ffffff` | `ffb5f7` |
| (158-159, 41) | `ffb5f7` | `f7f7ff` |
| (162-163, 41) | `f7f7ff` | `ffb5f7` |
| (164-165, 42) | `f7f7ff` | `ffb5f7` |

That is exactly 10 pixels and exactly the previously recorded B+444 region.
As a clock control, rendering the otherwise identical compositor at its
next exit step (`elapsed=445`, hence summary `rawElapsed=32` mapped to
`elapsed=31`) matches **all 10/10** pixels in the B+444 residual region;
the preceding steps score 126 (442), 25 (443), and 10 (444) differences in
the `x=145..174, y=35..49` diagnostic crop.  This is a source-clock rule,
not a fitted coordinate or colour change.

## OAM receipt and the rejected `sSpriteOrder` hypothesis

The source's **B+443** pre-display state is the frame that supplies the
visible tail.  The relevant live sprite rows from the fresh RAM receipt are:

| B offset | sprite slot | role / template | tile / pal | x,y + x2,y2 | priority / subpriority | final `sSpriteOrder` position | final OAM |
| --- | ---: | --- | --- | --- | --- | ---: | --- |
| +443 | 6 | opponent summary bar, `0x0832c37c` | 433 / 8 | base `(8,40)` + `(64,0)`; OAM `(40,24)` | 1 / 10 | 19 | index 18: `(136,40)`, 32×16, tile 433/pal 8, OBJ blend |
| +443 | 10 | ball-open particle | 550 / 11 | `(172,79)` | 1 / 28 | 20 | index 24: `(172,79)`, 8×8 |
| +443 | 22 | ball-open particle | 550 / 11 | `(172,55)` | 1 / 28 | 28 | index 32: `(172,55)`, 8×8 |
| +443 | 9 | ball-open particle | 549 / 11 | `(172,55)` | 1 / 28 | 29 | index 33: `(172,55)`, 8×8 |
| +444 | 6 | first-free-slot particle, just created | 549 / 11 | base `(176,59)`, not yet callback-positioned; sprite attrs `(0,0)` | 1 / 28 | 19 | the visible `gMain.oamBuffer` tail still retains the preceding bar at index 18 |

The B+443 bar's final OAM subsprite spans `x=136..167, y=40..55`, directly
covering the whole mismatch.  No particle OAM row covers
`x=158..165, y=40..42`; the nearest particle is slot 15 / OAM `(162,45)`.
Thus there are not two competing sprites at the disputed pixels: the
premise required for a persistent-order attribution is false here.

The actual persistent order was nevertheless read, rather than assumed.
The equal-Y particles at `(172,55)` are slot 22 at order position 28 and
slot 9 at position 29, so slot 22 receives the lower final OAM index and
wins that tie.  This is the same winner as the current stateless painter
rule (newer index first, older index last) for that pair.  Slot 6 retains
its order position when the summary bar is destroyed and `CreateSprite`
reuses the first free slot at B+444, but it neither overlaps the ten pixels
nor reverses the observed particle tie.  The #18 mechanism is therefore not
the cause of this residual.

## Source derivation

`CreatePartyStatusSummarySprites` creates the summary bar with ordinary
`CreateSprite` and creates its icons with `CreateSpriteAtEnd`
(`reference/pokeemerald/src/battle_interface.c:1494-1512`).  On a
battle-start exit, `Task_HidePartyStatusSummary` changes the bar to OBJ
blend, assigns `SpriteCB_StatusSummaryBar_Exit`, and installs the widened
exit subsprite table (`battle_interface.c:1671-1719`).  Its terminal task
then destroys that same bar slot (`battle_interface.c:1740-1764`), leaving
it available to the particle allocator.  `CreateSprite` selects the first
free slot (`reference/pokeemerald/src/sprite.c:502-510`), which is precisely
why slot 6 becomes a particle at B+444.

The ROM does keep `sSpriteOrder` persistently: `ResetAllSprites` seeds it
only at reset (`sprite.c:848-859`), then `BuildOamBuffer` updates coordinates,
priorities, insertion-sorts it, and emits final OAM (`sprite.c:325-337`,
`361-370`, `372-500`).  Its strict comparison preserves prior order only on
an equal packed priority and Y (`sprite.c:413-415`).  The receipt above
shows that this mechanism is real but does not decide the B+444 pixels.

The portable mechanism is instead the source summary lifecycle plus the
one-display-frame tail: source slot 6 is still the blended, widened bar at
B+443, then is destroyed/reused at B+444.  The typed compositor's current
`stallAt=30` is at `src/engine/battleScene.ts:6440-6449`; its wrong B+444
branch is exactly the stateless final-exit clock boundary named in the
verdict.

## Exact probe commands

The scratch directory and probe driver were allocated fresh; the driver was
regenerated from the committed Battle Lab fixture, its `BattleLab._advance`
route, and the committed Slice-3/4 generated-intro test construction (no
recording, trace, or production source was changed).

```sh
probe_dir=$(mktemp -d /tmp/pokebench-intro-b444-final-XXXXXX)
python3 tools/run-mgba-probe.py "$probe_dir/receipt.json" -- \
  python3 "$probe_dir/probe_intro_b444.py" "$probe_dir/receipt.json"
node --experimental-strip-types "$probe_dir/render_app_b444.ts" \
  "$probe_dir/app-b444.rgb" 444
python3 -c 'from pathlib import Path; a=Path("/tmp/.../rom-b444.rgb").read_bytes(); b=Path("/tmp/.../app-b444.rgb").read_bytes(); print(sum(a[i:i+3] != b[i:i+3] for i in range(0, len(a), 3)))'
```

The first command was accepted by `tools/run-mgba-probe.py` after it wrote
valid JSON (the known teardown SIGSEGV was validated, not treated as probe
success by itself).  The receipt sampled B+442..445, `gSprites[64]`,
`sSpriteOrder` at `0x020217f4`, `sSpritePriorities` at `0x02021774`, and the
post-sort `gMain.oamBuffer` at `gMain+0x38`.
