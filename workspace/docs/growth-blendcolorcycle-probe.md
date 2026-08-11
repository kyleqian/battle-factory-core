# MOVE_GROWTH `blend_color_cycle` RAM probe

`mechanic-growth-player-ivysaur-opponent-onix.json` is a legal Level-50
Mechanics Lab case (`overrides.parties`): player IVYSAUR has four GROWTH
slots, opponent ONIX has four TACKLE slots (a single forced legal choice
each side). `mechanic-growth-opponent-ivysaur-player-onix.json` is the
mirrored orientation (opponent IVYSAUR/GROWTH, player ONIX/TACKLE).

Reproduce the dense RAM probe with the mGBA environment (the wrapper accepts
the known post-write teardown SIGSEGV):

```sh
scratch_dir=$(mktemp -d)
probe_python="$(dirname "$(realpath reference/pokeemerald)")/mgba-venv/bin/python"
python3 tools/run-mgba-probe.py "$scratch_dir/growth.json" -- \
  "$probe_python" tools/probe/dump-growth-blendcolorcycle.py \
  tools/battle-lab/mechanic-growth-player-ivysaur-opponent-onix.json \
  "$scratch_dir/growth.json" 0 400
```

## Findings

In the player-IVYSAUR-vs-opponent-ONIX orientation, `Move_GROWTH`'s
`AnimTask_BlendColorCycle` task (selector=ATTACKER, delay=0, numBlends=2,
initialBlendY=0, targetBlendY=8, color=WHITE) is created at oracle tick 211
and runs through tick 237 (gone by 238) - two back-to-back invocations of
`GrowthEffect` (`call GrowthEffect` x2 in `Move_GROWTH`'s script) produce two
such windows, the second at ticks 243-269 (identical relative shape,
confirming the mechanism is a pure function of relative age for a fixed
argv, not tick-of-battle-dependent).

`gPaletteFade`'s bitfield layout (`include/palette.h:35-53`) was RAM-probed
directly rather than assumed: `multipurpose1` (u32, byte 0-3) is
`selectedPalettes` while a normal fade is active; the next u32 (byte 4-7)
packs `delayCounter:6, y:5, targetY:5, blendColor:15, active:1` LSB-first;
the third u32 (byte 8-11) packs `multipurpose2:6, yDec:1,
bufferTransferDisabled:1, mode:2, shouldResetBlendRegisters:1,
hardwareFadeFinishing:1, softwareFadeFinishingCounter:5,
softwareFadeFinishing:1, objPaletteToggle:1, deltaY:4`.

Two timing facts, confirmed tick-by-tick against `gPaletteFade.y` and the
attacker's own `gPlttBufferFaded` OBJ palette row (`src/engine/
blendColorCycle.ts`'s own module doc has the full reasoning; the RAM probe's
raw `paletteFadeWord1`/`attackerObjRow` fields are the ground truth for both):

1. **Only the first leg gets a free extra half-step on its own creation
   tick.** GROWTH's first leg (0→8) shows `y=2` already at age 0 (not `y=0`);
   the second leg (8→0, triggered by `AnimTask_BlendColorCycleLoop` polling
   `!gPaletteFade.active`, not the animation-script interpreter) instead
   holds at `y=8` through its own age 0 and only starts stepping at age 1.
   Attributed to `BeginNormalPaletteFade`'s own synchronous
   `UpdatePaletteFade()` call landing the same engine tick as the regular
   per-frame one only when the *creating* code path is the animation-script
   interpreter (leg 1), not a `gTasks[]` entry polling every frame (leg 2+).
2. **The finishing hold between "`y` reaches `targetY`" and the next leg (or
   task destroy) is a fixed 7-tick sequence** for a same-tick re-`Begin`
   (leg 1→2 here: reach-age 6, task data confirms `tNumBlends`/
   `tRestoreBlend` flip exactly at absolute tick 224 = age 13 = 6+7), **plus
   one more tick when the task destroys instead of re-`Begin`-ing** (leg 2
   here: task gone at age 27 = 6+7+1+... i.e. duration 14, one more than
   leg 1's 13) - the destroy path has no fused same-tick side effect to
   piggyback its detection on.

The attacker's own OBJ palette row updates lag `gPaletteFade.y` by the same
"one step held two ticks" cadence already established for the S4 fades in
`paletteFade.ts`, but land on even-age boundaries here:
`objY(age) = bgY(2*floor(age/2) - 1)`.

## Not yet done

`src/engine/blendColorCycle.ts` ports and Tier-1-pins (`tests/
blendColorCycle.test.ts`) exactly this probed sequence (both legs, both the
`gPaletteFade.y` progression and the OBJ-row pixel blend via the already-
proven `blendComponentToward`). It is **not yet wired** into
`sceneOnPresentation.ts`/`battleScene.ts`'s render path (the
`drawSpriteSheetAffineStretch(..., tintColor, tintCoeff, ...)` hook already
used by other moves' palette flashes is the identified attach point,
confirmed present but not yet exercised for GROWTH), no IVYSAUR species
asset extraction has happened, and no dense oracle comparator exists.
`ANIMATION_COVERAGE.json` intentionally carries no `MOVE_GROWTH` entry yet -
neither `partial` nor `exact` is earned without a real rendered dense
window. The `numBlends==1` degenerate case and negative-`delay` legs
(needed by other family members, not GROWTH) are also not implemented.
