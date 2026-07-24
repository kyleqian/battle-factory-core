# ICE PUNCH portable Scene-ON checkpoint

The existing portable staging probe now selects move ids 8/9 through the same
normal controller seam used by FIRE PUNCH. It changes only
`gBattleMons[0].moves[0]` and PP at the settled action menu; turn order,
damage, RNG, and controller state remain game-owned oracle inputs.

## ICE PUNCH

- Case: player-back ONIX → opponent-front GROVYLE, Battle Scene ON.
- Move dispatch: oracle frame 2305; PP write: 2332.
- First `Move_ICE_PUNCH` script-owned display: **2339** (presentation age 0).
- Dense accepted window: **2339–2373, 35/35 exact**.
- The window covers the stable handoff and the complete source-composed
  `simple_palette_blend(F_PAL_BG, 0→7, delay 1)` plus
  `AnimTask_BlendBattleAnimPal(F_PAL_TARGET, 0→9, delay 2)` opening ramp.
  The relative reducer uses no canonical tick.
- Fresh sprite-template RAM evidence places the first four
  `gIceCrystalSpiralInwardSmall` sprites at **2374 / age 35**. Large spiral
  sprites join at 2381; `IceCrystalEffectShort` begins at 2429; the last
  observed hit crystal is 2501. The animation script remains active through
  2525 and hands to generic hit resolution at 2526.

Therefore ICE PUNCH is `partial`. The precisely uncovered move-body remainder
is **2374–2525**: small/large crystal spiral, reused fist/hitsplat/shake,
seven-spawn crystal burst, palette restoration, and script teardown. Generic
hit/damage presentation after 2525 and any variant dependency found while
closing that body also remain unaccepted.

## THUNDER PUNCH sibling check

The same normal-controller stage successfully dispatches move id 9 for the
same ONIX→GROVYLE pair (dispatch 2305, PP write 2335, HP write 2525, move
clear 2626). Source composition confirms reuse of the hands/impact assets,
fist/hitsplat commands, and `AnimTask_ShakeMon`, but its blackout,
screen-inversion, and lightning-sprite overlay is distinct. No dense app
comparison is committed, so THUNDER PUNCH remains unsupported.
