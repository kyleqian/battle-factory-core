# ICE PUNCH portable Scene-ON checkpoint

The existing portable staging probe now selects move ids 8/9 through the same
normal controller seam used by FIRE PUNCH. It changes only
`gBattleMons[0].moves[0]` and PP at the settled action menu; turn order,
damage, RNG, and controller state remain game-owned oracle inputs.

## ICE PUNCH

- Case: player-back ONIX → opponent-front GROVYLE, Battle Scene ON.
- Move dispatch: oracle frame 2305; PP write: 2332.
- First `Move_ICE_PUNCH` script-owned display: **2339** (presentation age 0).
- Dense accepted window: **2339–2502, 164/164 exact**.
- The window covers the stable handoff and the complete source-composed
  `simple_palette_blend(F_PAL_BG, 0→7, delay 1)` plus
  `AnimTask_BlendBattleAnimPal(F_PAL_TARGET, 0→9, delay 2)` opening ramp.
  The relative reducer uses no canonical tick.
- Fresh sprite-template RAM evidence places the first four
  `gIceCrystalSpiralInwardSmall` sprites in RAM at **2374 / age 35**. The
  displayed OBJ state has the source engine's one-frame OAM lag, so 2374 is
  pixel-identical to 2373 and the first visible small crystals are at 2375.
  Large spiral sprites join RAM at 2381 and become visible at 2382. The exact
  window now covers both source batches through their complete inward
  translation, the shared fist/hitsplat/shake overlap, and the final
  large-crystal state at displayed age 72.
  `IceCrystalEffectShort` begins at 2429; the last observed hit crystal is
  2501. The animation script remains active through 2525 and hands to generic
  hit resolution at 2526.

The portable reducer pins the generic `TranslateSpriteInGrowingCircle`
geometry (phase + 9 per callback, radius -2 per callback, 30 displayed
states), the large crystal's +40 affine rotation, target-center translation,
and stable `SortSprites` OAM-Y ordering. RAM additionally pins the overlapping
sprites' subpriorities: fist 26, hitsplat 27, both crystal batches 28.

The former **153-pixel** overlap residual across 2402–2410 was the GBA's
selected-OBJ rule, not geometry or palette error. The PPU retains only the
frontmost opaque OBJ texel at a screen pixel. If that texel is OBJ mode 1,
BLDALPHA target 2 comes from an eligible BG/backdrop layer; a lower OAM OBJ
texel is no longer available. The portable compositor now keeps one pre-OBJ
target-2 buffer while visiting the source-ordered objects back-to-front.
Tier-1 separately pins this generic rule and the RAM-derived crystal 28 →
hitsplat 27 → fist 26 draw order.

The accepted continuation also covers the complete source
`IceCrystalEffectShort` call. Its seven target-relative sprites enter RAM at
ages 90/96/102/108/114/120/126 (oracle frames
2429/2435/2441/2447/2453/2459/2465) and become visible through the shared
one-frame OBJ latch. Their affine matrices grow from 310 to identity over ten
callbacks, hold through the six-frame affine tail, then flicker for 20
callbacks before destruction. All seven use subpriority 38; the compositor
replays `SortSprites`' descending top-Y OAM order back-to-front. The same
window pins the target palette's source-driven 9→0 restoration beginning at
age 139.

Fresh `gMain.oamBuffer` evidence at 2399–2405 plus the dense sprite/matrix
records through 2411 resolve the callback boundary without a frame special
case. `TranslateSpriteInGrowingCircle`'s radius-zero callback state is
destroyed before reaching hardware, so the 30th displayed state retains step
29's translation. The large affine animation continues independently for
that display: at 2411 the position remains `(x2,y2)=(1,1)` while matrix A/D
advance from -97 to 142. The same general reducer rule closes the small
boundary at 2404 and the large boundary at 2411.

Therefore ICE PUNCH is `partial`. The precisely uncovered contiguous
move-body remainder is **2503–2525**: BG palette restoration,
`clearmonbg`/`blendoff`, and script teardown.
Generic hit/damage presentation after 2525 and any variant dependency found
while closing that body also remain unaccepted.

## THUNDER PUNCH sibling check

The same normal-controller stage successfully dispatches move id 9 for the
same ONIX→GROVYLE pair (dispatch 2305, PP write 2335, HP write 2525, move
clear 2626). Source composition confirms reuse of the hands/impact assets,
fist/hitsplat commands, and `AnimTask_ShakeMon`, but its blackout,
screen-inversion, and lightning-sprite overlay is distinct. No dense app
comparison is committed, so THUNDER PUNCH remains unsupported.
