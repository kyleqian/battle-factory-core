# ICE PUNCH portable Scene-ON checkpoint

The existing portable staging probe now selects move ids 8/9 through the same
normal controller seam used by FIRE PUNCH. It changes only
`gBattleMons[0].moves[0]` and PP at the settled action menu; turn order,
damage, RNG, and controller state remain game-owned oracle inputs.

## ICE PUNCH

- Case: player-back ONIX → opponent-front GROVYLE, Battle Scene ON.
- Move dispatch: oracle frame 2305; PP write: 2332.
- First `Move_ICE_PUNCH` script-owned display: **2339** (presentation age 0).
- Dense accepted window: **2339–2560, 222/222 exact**.
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

The accepted move body now also closes the palette and script teardown.
`simple_palette_blend(F_PAL_BG, 7→0, delay 0)` begins changing the displayed
BG palettes at age 166. Source `gPaletteFade.deltaY = 2` and the alternating
BG/OBJ callback toggle produce coefficients **5/5, 3/3, 1/1, 0** across ages
166–172. The generic teardown reducer profiles those callbacks rather than
storing frames. RAM pins the target battler's OBJ visibility restoration and
the same-pass `clearmonbg`/`blendoff` commands at age 179; `gAnimScriptActive`
clears at age 183 after `Cmd_end`'s sound wait. Ages 183–186 remain the
pixel-stable controller handoff before generic hit animation begins at 2526.

The accepted continuation reuses the generic source hit reaction after script
teardown. Frame 2526 / age 187 is the first displayed +1 healthbox pose; the
20-display +1/-1 wobble and four-frame target blink blocks use the same
phase-relative reducer as ROCK SLIDE, with the generic preceding-pass OAM
latch. The reaction is complete and the field is stable again through frame
2560 / age 221. HP remains the immutable staged value throughout this bounded
window.

The contiguous continuation includes the controller-owned 143→112 HP
drain and immediate super-effective message handoff. The bar begins its first
displayed decrement at frame 2562 / age 223, reaches 112 without the
presentation calculating or committing damage, and the source-script atomic
HP write follows at frame 2594. The result printer begins at frame 2598 /
age 259 and is fully typed plus stably held through frame 2620 / age 281.
The same generic one-HP display reducer and message renderer already used by
the presentation seam are driven only by immutable staged inputs.

The controller tail is now dense-exact through the completed no-freeze
secondary-effect path. The staged outcome keeps `status1 = 0`; the
presentation does not roll or apply that outcome. The fully printed
super-effective message remains stable while the battle script completes,
and `gCurrentMove` clears at oracle frame 2692. Frames 2693–2694 prove the
settled post-command boundary. The first uncovered frame, 2695, introduces
the next controller-owned display transition and is deliberately outside
this animation increment.

Therefore ICE PUNCH remains `partial`. The accepted dense window is now
**2339–2694, 356/356 exact**. The precisely uncovered contiguous remainder
begins at frame **2695**, plus any geometry/orientation variant required by
source or comparison evidence.

## THUNDER PUNCH sibling check

The same normal-controller stage successfully dispatches move id 9 for the
same ONIX→GROVYLE pair (dispatch 2305, PP write 2335, HP write 2525, move
clear 2626). Source composition confirms reuse of the hands/impact assets,
fist/hitsplat commands, and `AnimTask_ShakeMon`, but its blackout,
screen-inversion, and lightning-sprite overlay is distinct. No dense app
comparison is committed, so THUNDER PUNCH remains unsupported.
