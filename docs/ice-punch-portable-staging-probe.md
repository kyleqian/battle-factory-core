# ICE PUNCH portable Scene-ON checkpoint

The existing portable staging probe now selects move ids 8/9 through the same
normal controller seam used by FIRE PUNCH. It changes only
`gBattleMons[0].moves[0]` and PP at the settled action menu; turn order,
damage, RNG, and controller state remain game-owned oracle inputs.

## ICE PUNCH

- Case: player-back ONIX → opponent-front GROVYLE, Battle Scene ON.
- Move dispatch: oracle frame 2305; PP write: 2332.
- First `Move_ICE_PUNCH` script-owned display: **2339** (presentation age 0).
- Dense accepted window: **2339–2401, 63/63 exact**.
- The window covers the stable handoff and the complete source-composed
  `simple_palette_blend(F_PAL_BG, 0→7, delay 1)` plus
  `AnimTask_BlendBattleAnimPal(F_PAL_TARGET, 0→9, delay 2)` opening ramp.
  The relative reducer uses no canonical tick.
- Fresh sprite-template RAM evidence places the first four
  `gIceCrystalSpiralInwardSmall` sprites in RAM at **2374 / age 35**. The
  displayed OBJ state has the source engine's one-frame OAM lag, so 2374 is
  pixel-identical to 2373 and the first visible small crystals are at 2375.
  Large spiral sprites join RAM at 2381 and become visible at 2382. The exact
  window now covers both source batches through their inward translation at
  displayed age 62, including the first exact shared fist/hitsplat frame.
  `IceCrystalEffectShort` begins at 2429; the last observed hit crystal is
  2501. The animation script remains active through 2525 and hands to generic
  hit resolution at 2526.

The portable reducer pins the generic `TranslateSpriteInGrowingCircle`
geometry (phase + 9 per callback, radius -2 per callback, 30 displayed
states), the large crystal's +40 affine rotation, target-center translation,
and stable `SortSprites` OAM-Y ordering. RAM additionally pins the overlapping
sprites' subpriorities: fist 26, hitsplat 27, both crystal batches 28.

An attempted dense extension through 2410 leaves **153 pixels across 7/9
frames** in 2402–2410 (per-frame residuals 2, 7, 21, 0, 0, 10, 18, 45, 50).
They are confined to the tightly clustered crystal/fist/hitsplat overlap and
require a generic pixel-level semi-transparent OBJ-over-OBJ compositor; the
source geometry, matrices, and whole-sprite OAM ordering are already pinned.
No coordinate/RGB fit was retained.

Therefore ICE PUNCH is `partial`. The precisely uncovered contiguous
move-body remainder is **2402–2525**: the last three displayed small-crystal
states and last ten large-crystal states where they overlap the reused
fist/hitsplat/shake chassis, the unverified post-spiral gap, seven-spawn
crystal burst, palette restoration, and script teardown. Generic hit/damage
presentation after 2525 and any variant dependency found while closing that
body also remain unaccepted.

## THUNDER PUNCH sibling check

The same normal-controller stage successfully dispatches move id 9 for the
same ONIX→GROVYLE pair (dispatch 2305, PP write 2335, HP write 2525, move
clear 2626). Source composition confirms reuse of the hands/impact assets,
fist/hitsplat commands, and `AnimTask_ShakeMon`, but its blackout,
screen-inversion, and lightning-sprite overlay is distinct. No dense app
comparison is committed, so THUNDER PUNCH remains unsupported.
