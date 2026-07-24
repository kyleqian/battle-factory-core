# MAGBY summary front animation — OFF-oracle evidence

This is an evidence checkpoint only. It does not add summary controller or renderer behavior.

## Acceptance window

`tools/compare/traces/summary-info-magby-front-animation.json` explicitly uses the `battle-scene-off` oracle. It opens slot 2 (MAGBY), remains on Info, and captures **every frame 100–300 (201/201)**. The SUMMARY A press starts at trace frame 46; source dispatch is frame 110 (the established inclusive SUMMARY-press +65 point). The trace therefore contains the whole animation, the cry terminal boundary, and 49 static frames after it.

The current app intentionally has no idle-animation implementation. Its evidence comparison is **132/201 exact**: every unmatched frame is within the known MAGBY animation program (112–170 and 181–190); 191–300 are static exact matches. This is a dense evidence route, not a thinned acceptance trace.

Reproduce the RAM read with `tools/probe/specs/summary-magby-front-animation.json` through `tools/run-mgba-probe.py` and the mGBA virtual-environment Python. The committed probe resolves file-static `sMonSummaryScreen` from the pinned ELF address and follows `spriteIds[SPRITE_ARR_ID_MON]`; it is Battle-Scene-OFF and does not rely on a runtime ROM asset.

## Exact boundaries

| Trace tick | Boundary |
| --- | --- |
| 110 | `SpriteCB_Pokemon` calls `PlayMonCry`, `StartSpriteAnim(sprite, 1)`, then `StartMonSummaryAnimation` (`ANIM_V_SQUISH_AND_BOUNCE`). This is the first source state change; the framebuffer first differs at 112 because OBJ state becomes visible later. |
| 111–159 | `VerticalSquishBounce` owns MAGBY's affine motion. The live OAM position/scale state changes every tick; `data[2]` advances 1–49. |
| 160 | The callback resets scale/`y2`, releases the summary affine matrix, restores ordinary OAM, and becomes `WaitAnimEnd`. Motion is complete. |
| 110–124 | Sprite frame program: frame 0 (15 ticks). |
| 125–139 | Sprite frame program: frame 1 (15 ticks). |
| 140–159 | Sprite frame program: frame 0 (20 ticks). |
| 160–169 / 170–179 / 180–189 / 190–199 | Sprite frames 1 / 0 / 1 / 0 (10 ticks each). |
| 200 onward | Frame program has ended on frame 0; all sprite state is stable. The framebuffer was already identical to the base static frame from 191 because the final frame-0 span is pixel-identical. |
| 110 | Cry player is queued (`gMPlay_PokemonCry` becomes non-null); BGM duck counter starts at 2. |
| 111–251 | Cry player has active status `0x00000001`; this is normal-cry playback. It has no framebuffer effect. |
| 252 onward | Cry status is `0x80000000` (no active track); output is still pixel-stable through 300. |

The sprite palette never changes: `oam.attr2 == 0x20f4` (palette bank 2) for every probed tick 100–300. The only visual changes are the two-frame tiles and the summary-specific affine matrix/vertical offset.

## Input ownership

There is **no animation-completion input gate**. `Task_HandleInput` in `pokemon_summary_screen.c` gates only on link receive and `gPaletteFade`; it does not call the unused `IsMonAnimationFinished`. LEFT/RIGHT can therefore begin a page change while the callback is live, and UP/DOWN can begin rental replacement. A or B on Info explicitly calls `StopPokemonAnimations` before closing; a mon replacement subsequently destroys the old sprite. An implementation must preserve that controller ownership rather than blocking page/mon input until tick 200 or cry completion.

## Implementation brief

For MAGBY Info, start the two-frame program and normal cry at the SUMMARY-press +65 source boundary, make affine motion visible one render later, and retain the independent frame program after affine reset. Do not blend, recolor, or pause input during the sequence. The reusable mechanism is `ANIM_V_SQUISH_AND_BOUNCE` plus MAGBY's source frame program in `summary-front-animation.json`; it must remain independent of page switching and mon replacement.
