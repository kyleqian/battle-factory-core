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
secondary-effect path and the next action-menu display transition. The staged
outcome keeps `status1 = 0`; the presentation does not roll or apply that
outcome. The fully printed super-effective message remains stable while the
battle script completes, and `gCurrentMove` clears at oracle frame 2692.
Frames 2693–2694 prove the settled post-command boundary. At frame 2695 /
age 356 the controller clears the result line, leaving the standard message
box blank for seven displayed frames.

Frame 2702 / age 363 atomically reveals the normal action windows ("What will
ONIX do?" and FIGHT/BAG/POKéMON/RUN), matching
`PlayerHandleChooseAction`'s two off-screen `BattlePutTextOnWindow` calls and
the following `HandleChooseActionAfterDma3` reveal. The next controller pass
restarts `DoBounceEffect` for the active battler and healthbox. The portable
adapter re-anchors the existing source/RAM-proved generic sine reducer to the
profile's reveal age; it does not use the oracle frame number. The dense
continuation through frame 2800 covers a 99-frame settled bounce window,
including the rare healthbox `y2=2` state, while keeping the supplied
117/117 player HP and already-resolved 112 target HP immutable.

Therefore ICE PUNCH remains `partial`. The accepted dense window is now
**2339–2800, 462/462 exact**. Its complete staged player-back move and
controller-display window is covered; exact promotion still requires an
evidence-backed opposite-side/geometry audit.

## Opposite-side successful-freeze completion

The GROVYLE→ONIX fixture is now **1294/1294 exact** (oracle frames
**1966–3259**, relative ages **0–1293**). Ages 314 onward prove the complete
controller effectiveness printer. The oracle line is
“It’s super effective!”—Ice is super-effective against ONIX’s Ground type;
the earlier handoff’s “not very effective” label was not the staged output.

The staged controller supplies a successful immutable freeze outcome:
`status1` becomes `STATUS1_FREEZE` at frame 2366 / age 400. The adapter
exposes that supplied boundary, plus the later healthbox-status,
current-move-reset, and next-controller clocks, without rolling RNG or
mutating battle state.

The source-extracted `ANIM_TAG_ICE_CUBE` compositor preserves all four
subsprites and their compiled tile offsets: 64×64 at (-16,-16), 64×32 at
(-16,48), 32×64 at (48,-16), and 32×32 at (48,48), around the task anchor
`GetBattlerSpriteCoord(target, X_2/Y_PIC_OFFSET) + (-32,-36)`. A reusable
callback reducer matches the probed BLDALPHA sequence: 1→9 fade-in, two
separately delayed cycles rotating OBJ palette entries 13/14/15, 8→0
fade-out, sprite destruction, and blend-register teardown. The staging probe
now records the cube template plus BLDCNT/BLDALPHA directly.

Both source-spawned tasks use that same reducer. The first creation/setup is
at frame 2375 / age 409 and first visible at 2376 / age 410. The second is at
frame 2683 / age 717 and first visible at 2684 / age 718. The dense window
also covers both complete “ONIX was/is frozen solid!” printers, FRZ
healthbox installation at age 607, `gCurrentMove` clear at age 618, both
task teardowns, and the settled frozen-solid tail through age 847.

Age 848 begins the existing source-proved held-item display chain, not a new
battle outcome. Re-anchoring the generic Sitrus component to the
controller-supplied identity age 847 reproduces the three 32-display rotation
cycles, two granting-star sprites, cyan tint and expanding ring, heal printer,
blank hold, and action-menu redraw without consulting the oracle frame. The
fixture supplies the already-resolved Sitrus result and immutable 31→61 HP
endpoints; the presentation only displays the one-HP-per-frame climb.

The heal line begins at relative component age 204, the display climb at 306,
the message clears at 342, and the action menu redraws at 348 (overall
presentation age 1195 / oracle frame 3161). Dense acceptance continues for a
99-frame settled bounce through oracle frame 3259, including player sprite and
healthbox y-offset extrema. The complete player-side no-freeze case remains
**462/462**, so the two evidence-required attacker-side/controller variants are
now covered and ICE PUNCH is exact.

## THUNDER PUNCH sibling check

The same normal-controller stage successfully dispatches move id 9 for the
same ONIX→GROVYLE pair (dispatch 2305, PP write 2335, HP write 2525, move
clear 2626). Source composition confirms reuse of the hands/impact assets,
fist/hitsplat commands, and `AnimTask_ShakeMon`, but its blackout,
screen-inversion, and lightning-sprite overlay is distinct. No dense app
comparison is committed, so THUNDER PUNCH remains unsupported.
