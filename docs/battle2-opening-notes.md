# Battle 2 opening evidence

This note records the bounded 2026-07-23 investigation from JENSON's held
room quote through the first Battle 2 menu. Canonical frame numbers name the
input edge at the start of a one-frame button segment, matching the
ground-truth trace's convention.

## Input gates

- JENSON's six-word room quote finishes at 30381. An A edge starting at 30382
  is rejected; 30383 is the first accepted edge. The canonical edge at 32031
  is therefore a valid delayed dismissal.
- The battle-intro text is still rejecting A at 32478. The first accepted
  edge starts at 32479; the canonical edge at 32531 is a valid delayed press.
  Paired traces differing by one idle frame showed the first divergent
  post-input framebuffer at 32482.

Both probes replayed the committed ground-truth prefix and varied only their
candidate A edges.

## RNG and handoff ledger

A fresh mGBA RAM replay watched `gRngValue` and `gMain.inBattle` through
32020-33031. Ordinary field ownership advances the LCG once per VBlank.
Relative to room `settled` elapsed zero at 32036, setup adds 50 calls at
elapsed 0, 22 at +8, 4 at +15, and one transition-selection call at +23.
After that last ordinary VBlank, the selected value's upper half modulo the
12-entry Frontier table is 10. `src/battle_setup.c` identifies entry 10 as
`B_TRANSITION_FRONTIER_CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ`.

Battle-scene elapsed zero is 32245. `gMain.inBattle` changes from 0 to 2 at
32250 after five more initialization calls, and field VBlank ownership then
freezes. The transition begins fading at 32226, is black from 32237, and the
first battle framebuffer is 32280.

The matching source task in `src/battle_transition_frontier.c` creates its
three spiraling circle sprites at task timers 0, 16, and 32, using distinct
centers and angles. This is not Battle 1's circles-meet transition.

## Sequential transition repair

`battle2-transition.json` captures every canonical frame 32031-32279 and is
**249/249 exact**. Relative to room `settled` age 0 at 32036:

- the shared three-cycle gray intro occupies ages 25-72;
- the top/left/right circles first render at ages 76/92/108, follow
  `SpriteCB_LogoCircleSpiral`'s Q4.12 `Sin2`/`Cos2` geometry, and settle 32
  callbacks later;
- center-logo alpha is 0 at age 140, reaches 16 at 156, and the source
  31-tick hold ends with exit-fade age 190; age 201 is solid black; and
- black remains exact through 32279. Frame 32280 is intentionally excluded.

A fresh callback replay found the transition task in `gTasks[7]` and the
three circle sprites in `gSprites[10..12]`. Their spiral callbacks become
live in staggered order and become dummy after the respective 32-step
motions. During overlap, `sprite.c:SortSprites`' signed-OAM-Y order is
load-bearing; its stable inherited order at the single top/right Y tie
explains frame 32162. The engine models that live order rather than a fixed
piece painter order. Battle 1's unchanged `CIRCLES_MEET` path remains
**206/206 exact** in `transition.json`.

## Encounter setup

`src/data/battle_frontier/battle_frontier_trainers.h` identifies JENSON as a
FISHERMAN and supplies the observed DOWNCAST quote. The canonical opponent
lead is KABUTO. Engine setup now carries that identity, the healed
ONIX/MAGBY/BAYLEEF HP tuple `[117, 138, 153]`, and ONIX's real move IDs
`[157, 20, 225, 201]` into `EngineState`; the FIGHT submenu no longer has to
fall back to Battle 1's unrelated fixed setup.

## Exact remaining render work

The room dismissal and transition through the final black frame are exact.
To reach 33030/33031 without forbidden framebuffer harvests, the live
renderer still needs:

1. encounter-parameterized Fisherman intro text/sprite and KABUTO send-out
   animation/healthbox;
2. press-relative ONIX send-out timing; and
3. a composed Battle 2 action-menu base, replacing the Battle 1-only
   full-frame Grovyle idle base for this encounter.

Those dynamic spans must then be committed in capture-cap-sized dense traces.
Only a separately proven byte-static hold may be thinned.
