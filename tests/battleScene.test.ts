import { describe, expect, it } from "vitest";
import {
  advanceBattleScene,
  BALL_OAM_PRIORITY,
  ballIcons,
  ballStatusBarPositions,
  cursorState,
  CURSOR_START_TICK,
  evaEvb,
  INITIAL_BATTLE_SCENE_STATE,
  PARTICLE_OAM_PRIORITY,
  PARTICLE_OAM_SUBPRIORITY,
  renderBattleScene,
  sendOutPressEligible,
  sendOutTextVisibleChars,
  shiftBottom,
  shiftTop,
  sortAliveParticlesByScreenY,
  TEXT_START_TICK,
  TEXT_TOTAL_CHARS,
  textVisibleChars,
  TICK0,
  windowRange,
  type BattleSceneState,
} from "../src/engine/battleScene.ts";
import { blendComponentToWhite } from "../src/engine/paletteFade.ts";
import grovyleFrontSpritesAsset from "../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import sendOutHealthboxOpponentAsset from "../src/assets/gen/sendout-healthbox-opponent.json" with { type: "json" };

function pixelAt(t: number, x: number, y: number): [number, number, number] {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: null });
  const o = (y * 240 + x) * 4;
  return [fb[o]!, fb[o + 1]!, fb[o + 2]!];
}

/** Same as `pixelAt`, but with the send-out A-press already registered at trace tick 1420 (`sendOutPressElapsed = 380`, matching the §7.2/§7.3 tests above). */
function pixelAtSentOut(t: number, x: number, y: number): [number, number, number] {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380 });
  const o = (y * 240 + x) * 4;
  return [fb[o]!, fb[o + 1]!, fb[o + 2]!];
}

const grovyleFront = (grovyleFrontSpritesAsset as Record<string, { tileset: { columns: number; tiles: number[][] }; palette: { r: number; g: number; b: number }[] }>).GROVYLE!;
/** GROVYLE_CORNER-relative (31,7) - the sprite's own first opaque pixel in raster order (tile 3, pixel (7,7)), used to pin the materialize-gate tick without hardcoding a color by hand. */
const GROVYLE_FIRST_OPAQUE_OFFSET = { x: 31, y: 7 };
const grovyleFirstOpaquePixel = grovyleFront.palette[grovyleFront.tileset.tiles[3]![63]!]!;

const healthboxContent = sendOutHealthboxOpponentAsset as { x: number; y: number; width: number; height: number; pixels: number[] };

// Oracle/RAM cross-check: tools/compare/traces/scene-assembly.json is NOT
// yet 256/256 (see PROGRESS.md for the current count and the open gap).
// The window/shift schedules below were re-derived this session by scanning
// the oracle's own captured frames (unambiguous ground truth: everything
// outside the window is pure black) - one tick later throughout than the
// naive RAM-tick reading, a consistent "task writes this tick, display
// shows it next tick" lag also confirmed directly via `ram-probe.py` for
// `gBattle_BG1_X` and the scanline buffers (see src/engine/battleScene.ts's
// module doc + docs/battle-scene-notes.md §2).

describe("battleScene: state advance", () => {
  it("has no phase split - elapsed just keeps incrementing forever", () => {
    let state = INITIAL_BATTLE_SCENE_STATE;
    for (let i = 0; i < 500; i += 1) state = advanceBattleScene(state);
    expect(state.elapsed).toBe(500);
  });
});

describe("battleScene: vertical reveal window", () => {
  it("is null (fully black) before tick 1075", () => {
    expect(windowRange(1074)).toBeNull();
    expect(windowRange(1000)).toBeNull();
  });

  it("opens exactly 1px (row 80 only) at tick 1075 (pixel-ground-truthed - the oracle's own capture, not the naive RAM-tick reading)", () => {
    expect(windowRange(1075)).toEqual({ top: 80, bottom: 81 });
  });

  it("grows by 1px top/bottom per tick through tick 1107 (RAM: gBattle_WIN0V -= 0xFF/tick, one tick later than the raw RAM value)", () => {
    expect(windowRange(1080)).toEqual({ top: 75, bottom: 86 });
    expect(windowRange(1106)).toEqual({ top: 49, bottom: 112 });
    expect(windowRange(1107)).toEqual({ top: 48, bottom: 113 });
  });

  it("switches to a 4px/tick second phase from 1108 (RAM: gBattle_WIN0V -= 0x3FC/tick), fully open at 1119", () => {
    expect(windowRange(1108)).toEqual({ top: 44, bottom: 117 });
    expect(windowRange(1118)).toEqual({ top: 4, bottom: 157 });
    expect(windowRange(1119)).toEqual({ top: 0, bottom: 160 });
  });

  it("stays fully open past 1119", () => {
    expect(windowRange(1200)).toEqual({ top: 0, bottom: 160 });
    expect(windowRange(2000)).toEqual({ top: 0, bottom: 160 });
  });
});

describe("battleScene: BLDALPHA schedule (RAM-confirmed, docs/battle-scene-notes.md §2; render-lagged by 1 tick, module doc point 2's GAP A resolution)", () => {
  it("holds 8:8 before tick 1139, including tick 1139 itself (the write lands in RAM at 1139 but only shows on the tick-1140 capture, the same one-tick render lag as bg1X/window edges/shift decay)", () => {
    expect(evaEvb(1000)).toEqual({ eva: 8, evb: 8 });
    expect(evaEvb(1138)).toEqual({ eva: 8, evb: 8 });
    expect(evaEvb(1139)).toEqual({ eva: 8, evb: 8 });
  });

  it("steps EVA down / EVB up by 1 every 6 ticks, first showing at tick 1140 (one tick after the RAM write)", () => {
    expect(evaEvb(1140)).toEqual({ eva: 7, evb: 9 });
    expect(evaEvb(1145)).toEqual({ eva: 7, evb: 9 });
    expect(evaEvb(1146)).toEqual({ eva: 6, evb: 10 });
  });

  it("reaches 0:16 at tick 1182 (one tick later than the naive RAM-tick pivot) and holds", () => {
    expect(evaEvb(1181)).toEqual({ eva: 1, evb: 15 });
    expect(evaEvb(1182)).toEqual({ eva: 0, evb: 16 });
    expect(evaEvb(1226)).toEqual({ eva: 0, evb: 16 });
  });
});

describe("battleScene: per-scanline shift (RAM-confirmed: gTasks[0].data[2], docs/battle-scene-notes.md §2)", () => {
  it("is 0 before tick 1075 and after the slide ends (tick 1227)", () => {
    expect(shiftTop(1074)).toBe(0);
    expect(shiftBottom(1074)).toBe(0);
    expect(shiftTop(1227)).toBe(0);
    expect(shiftBottom(1227)).toBe(0);
    expect(shiftTop(5000)).toBe(0);
  });

  it("holds a constant leftover 240 for ticks 1075-1107 (RAM: gScanlineEffectRegBuffers unwritten by this task yet, one tick later than the raw RAM-tick reading)", () => {
    expect(shiftTop(1075)).toBe(240);
    expect(shiftTop(1107)).toBe(240);
  });

  it("decrements by exactly 2/tick from tick 1108, reaching 2 at tick 1226 (RAM-confirmed via the actual DMA'd buffer content, not just data[2]'s own value)", () => {
    expect(shiftTop(1108)).toBe(238);
    expect(shiftTop(1109)).toBe(236);
    expect(shiftTop(1226)).toBe(2);
  });

  it("top/bottom halves are equal-magnitude opposite sign throughout the shift", () => {
    expect(shiftTop(1150)).toBe(-shiftBottom(1150));
    expect(shiftTop(1200)).toBe(-shiftBottom(1200));
  });
});

describe("battleScene: intro text cadence (docs/battle-scene-notes.md §3.2, 1 tick/char incl. spaces)", () => {
  it("has 39 total printable characters across both lines", () => {
    expect(TEXT_TOTAL_CHARS).toBe(39);
  });

  it("shows 0 characters before the first glyph tick", () => {
    expect(textVisibleChars(TEXT_START_TICK - 1)).toBe(0);
  });

  it("shows exactly 1 char/tick from the first glyph tick, clamped at the total", () => {
    expect(textVisibleChars(TEXT_START_TICK)).toBe(1);
    expect(textVisibleChars(TEXT_START_TICK + 10)).toBe(11);
    expect(textVisibleChars(TEXT_START_TICK + TEXT_TOTAL_CHARS - 1)).toBe(TEXT_TOTAL_CHARS);
    expect(textVisibleChars(TEXT_START_TICK + 1000)).toBe(TEXT_TOTAL_CHARS);
  });
});

describe("battleScene: wait-cursor bob / 36-tick idle cycle (docs/battle-interface-assets.md)", () => {
  it("is hidden before its first draw tick", () => {
    expect(cursorState(CURSOR_START_TICK - 1).visible).toBe(false);
  });

  it("cycles through the 4-phase/9-tick schedule, oracle-confirmed at ticks 1274/1283/1292/1295", () => {
    expect(cursorState(1274)).toEqual({ visible: true, yOffset: 0 });
    expect(cursorState(1282)).toEqual({ visible: true, yOffset: 0 });
    expect(cursorState(1283)).toEqual({ visible: true, yOffset: 1 });
    expect(cursorState(1291)).toEqual({ visible: true, yOffset: 1 });
    expect(cursorState(1292)).toEqual({ visible: true, yOffset: 2 });
    expect(cursorState(1295)).toEqual({ visible: true, yOffset: 2 });
  });

  it("keeps cycling correctly indefinitely past this window (36-tick period)", () => {
    expect(cursorState(1274 + 36)).toEqual(cursorState(1274));
    expect(cursorState(1300 + 36 * 5)).toEqual(cursorState(1300));
  });
});

describe("battleScene: GAP A streak-window trainer OBJ + BG3 512px-width fixes (module doc point 2, oracle-pinned)", () => {
  it("draws the opponent trainer OBJ's own raw color during the slide (tick 1150, x=11/y=40) - the pixel GAP A's blend arithmetic was numerically unreachable for, root-caused as a missing OBJ layer, not a blend-ramp bug", () => {
    expect(pixelAt(1150, 11, 40)).toEqual([123, 90, 82]);
  });

  it("draws the player trainer OBJ's own raw color mid-slide too (tick 1180, x=88/y=53)", () => {
    expect(pixelAt(1180, 88, 53)).toEqual([156, 140, 74]);
  });

  it("does not show BG3's sky-gradient tile block a second time past its true 256px-wide screen block (tick 1150, x=230/y=55) - static's real hardware width is 512px (screenSize=1, two side-by-side blocks), wrapping at 256 aliased the gradient's own leading tiles back into view here", () => {
    expect(pixelAt(1150, 230, 55)).toEqual([247, 247, 255]);
  });

  it("blends BG1 opaque pixels in 8-bit-expanded space, not 5-bit-then-reexpand (module doc point 2's GAP A residual, root-caused this session): tick 1150, x=120/y=84 - oracle (242,246,252) is mathematically unreachable by ANY blend of two 5-bit GBA palette colors (blended5 = floor((c1*eva+c2*evb)/16) can only ever produce one of 32 fixed (c5<<3)|(c5>>2) values per channel, none of which are 242/246/252 - brute-forced exhaustively), but is hit exactly by floor((tgt1_8bit*eva+tgt2_8bit*evb)/16) on the already-8-bit-expanded source colors (entrySlide's (222,231,247) blended with static's white (255,255,255) at eva=6/evb=10) - mGBA's own blend implementation evidently operates in its native 8bpp framebuffer domain rather than re-deriving 5-bit hardware precision", () => {
    expect(pixelAt(1150, 120, 84)).toEqual([242, 246, 252]);
  });
});

describe("battleScene: party-status-summary ball-icon + bar widget entrance slide (RAM-confirmed, module doc point 3)", () => {
  it("has 12 icons (6 opponent + 6 player), all hidden before their side's creation tick", () => {
    const icons = ballIcons(1000);
    expect(icons).toHaveLength(12);
    expect(icons.every((icon) => !icon.visible)).toBe(true);
  });

  it("player-side icons become visible at tick 1229, opponent-side at tick 1232 (not simultaneous - one tick later than their own RAM creation tick, the same render lag GAP A found)", () => {
    expect(ballIcons(1228).every((icon) => !icon.visible)).toBe(true);
    expect(ballIcons(1229).slice(6).every((icon) => icon.visible)).toBe(true);
    expect(ballIcons(1229).slice(0, 6).every((icon) => !icon.visible)).toBe(true);
    expect(ballIcons(1232).every((icon) => icon.visible)).toBe(true);
  });

  it("the bars' own first-visible ticks are asymmetric (module doc point 3, RAM+pixel-confirmed): player bar needs one further tick than the ordinary render lag (createTick+2 = 1230, not 1229), opponent bar matches the ordinary lag (createTick+1 = 1232) - RAM-probing gSprites[].x2 shows the player bar's SpriteCB_StatusSummaryBar_Enter callback stalls one extra tick right after creation (x2=95 at both RAM tick 1228 and 1229) while the opponent bar's decrements every tick with no stall", () => {
    expect(ballStatusBarPositions(1229).player.visible).toBe(false);
    expect(ballStatusBarPositions(1230).player.visible).toBe(true);
    expect(ballStatusBarPositions(1229).opponent.visible).toBe(false);
    expect(ballStatusBarPositions(1232).opponent.visible).toBe(true);
  });

  it("settles at the CreatePartyStatusSummarySprites corner formula by tick 1292", () => {
    const icons = ballIcons(1292);
    expect(icons[0]).toEqual({ x: 26, y: 32, state: "Empty", visible: true });
    expect(icons[5]).toEqual({ x: 76, y: 32, state: "Full", visible: true });
    expect(icons[6]).toEqual({ x: 156, y: 88, state: "Full", visible: true });
    expect(icons[11]).toEqual({ x: 206, y: 88, state: "Empty", visible: true });
    const bars = ballStatusBarPositions(1292);
    expect(bars.opponent.x).toBe(-24);
    expect(bars.player.x).toBe(136);
  });

  it("mid-slide: player icon 0 offset by its own RAM-baked x2 table (e.g. tick 1230 -> x2=120, tick 1245 -> x2=57)", () => {
    expect(ballIcons(1230)[6]).toEqual({ x: 276, y: 88, state: "Full", visible: true });
    expect(ballIcons(1245)[6]).toEqual({ x: 213, y: 88, state: "Full", visible: true });
  });
});

describe("battleScene: send-out A-press #3 registration + text cadence (docs/battle-scene-notes.md §7.2/§7.3, oracle sha-transitions re-verified this session)", () => {
  it("the idle wait-cursor must be visible before the press is eligible - not before CURSOR_START_TICK", () => {
    expect(sendOutPressEligible(CURSOR_START_TICK - 1)).toBe(false);
    expect(sendOutPressEligible(CURSOR_START_TICK)).toBe(true);
    expect(sendOutPressEligible(1420)).toBe(true);
  });

  it("no visible chars before pressTick+5 (the 5-tick registration lag, matching press #2's own lag)", () => {
    expect(sendOutTextVisibleChars(1424, 1420)).toBe(0);
    expect(sendOutTextVisibleChars(1425, 1420)).toBe(1);
  });

  it("35 total printable chars ('BUG CATCHER DESTIN sent' + 'out GROVYLE!'), 1 tick/char, last change at pressTick+39", () => {
    expect(sendOutTextVisibleChars(1459, 1420)).toBe(35);
    expect(sendOutTextVisibleChars(1460, 1420)).toBe(35);
  });

  it("state advance preserves sendOutPressElapsed once set, and elapsed keeps incrementing regardless", () => {
    let state: BattleSceneState = { ...INITIAL_BATTLE_SCENE_STATE, sendOutPressElapsed: 380 };
    state = advanceBattleScene(state);
    expect(state).toEqual({ elapsed: 1, sendOutPressElapsed: 380 });
  });
});

describe("battleScene: post-text visual handoff (docs/battle-scene-notes.md §7.4-7.6, pixel-brute-force-confirmed this session against tools/compare/traces/sendout.json)", () => {
  const GROVYLE_CORNER = { x: 144, y: 12 };
  const HEALTHBOX = { x: healthboxContent.x, y: healthboxContent.y, w: healthboxContent.width, h: healthboxContent.height };

  // v4/v5 truth (PROGRESS.md #78, docs/battle-scene-notes.md §7.11): with Battle
  // Scene ON, the affine-emerge sequence itself still completes at tick 1519
  // (same as v3), but GROVYLE's species front-sprite entrance animation
  // (ANIM_V_STRETCH) now plays afterward, unmatched-and-unrendered by this
  // engine, so the settled pose's hard step moves to tick 1544 - the v3-only
  // "hard step at 1519" pin this replaces is now stale (Battle Scene OFF only).
  it("Grovyle's settled materialize pose appears as a hard step at tick 1544, not before (§7.5/§7.11)", () => {
    const before = pixelAtSentOut(1543, GROVYLE_CORNER.x + GROVYLE_FIRST_OPAQUE_OFFSET.x, GROVYLE_CORNER.y + GROVYLE_FIRST_OPAQUE_OFFSET.y);
    const after = pixelAtSentOut(1544, GROVYLE_CORNER.x + GROVYLE_FIRST_OPAQUE_OFFSET.x, GROVYLE_CORNER.y + GROVYLE_FIRST_OPAQUE_OFFSET.y);
    expect(after).toEqual([grovyleFirstOpaquePixel.r, grovyleFirstOpaquePixel.g, grovyleFirstOpaquePixel.b]);
    expect(before).not.toEqual(after);
  });

  it("Grovyle's settled pose is static (no further change) through the end of the trace", () => {
    const at1544 = pixelAtSentOut(1544, GROVYLE_CORNER.x + GROVYLE_FIRST_OPAQUE_OFFSET.x, GROVYLE_CORNER.y + GROVYLE_FIRST_OPAQUE_OFFSET.y);
    const at1555 = pixelAtSentOut(1555, GROVYLE_CORNER.x + GROVYLE_FIRST_OPAQUE_OFFSET.x, GROVYLE_CORNER.y + GROVYLE_FIRST_OPAQUE_OFFSET.y);
    expect(at1555).toEqual(at1544);
  });

  it("opponent healthbox is entirely absent before tick 1495, then slides in at +5px/tick, settling (dx=0) from tick 1517 (§7.6)", () => {
    // A distinctive interior pixel (the nameplate's own beige border, local
    // (30,5) - not one that happens to coincide with the plain background).
    const cx = 30;
    const cy = 5;
    const i = (cy * HEALTHBOX.w + cx) * 3;
    const contentColor = healthboxContent.pixels.slice(i, i + 3);
    expect(contentColor).not.toEqual([255, 255, 255]);

    // Not created yet at tick 1494: this pixel's settled screen position
    // is still plain background.
    const before = pixelAtSentOut(1494, HEALTHBOX.x + cx, HEALTHBOX.y + cy);
    expect(before).not.toEqual(contentColor);

    // Settled (dx=0) from tick 1517 on: the content sits exactly at its
    // extracted (x,y).
    const at1517 = pixelAtSentOut(1517, HEALTHBOX.x + cx, HEALTHBOX.y + cy);
    expect(at1517).toEqual(contentColor);

    // One tick earlier (dx=-5): the same content pixel is 5px further left
    // on screen - confirming the pure-translation slide formula (not a
    // re-assembly / redraw of different content per tick).
    const at1516 = pixelAtSentOut(1516, HEALTHBOX.x + cx - 5, HEALTHBOX.y + cy);
    expect(at1516).toEqual(contentColor);
  });

  // §7.22/§7.23: the healthbox's rectangular pixel-harvest bounding box
  // includes real background pixels around its own non-rectangular shape
  // (the box's own corners/right edge are diagonal, not square) - during the
  // slide-in these bleed pixels were painted verbatim (frozen at their
  // POST-materialize-fade settled color), clobbering the correctly-faded
  // (fully white at this tick) background underneath with stale texture. A
  // fixed ~138px band, root-caused by direct pixel comparison against a
  // plain unfaded render of the background at the healthbox's own settled
  // position (`tools/compare/scratch/band_diag.mjs`, not curve-fit).
  it("opponent healthbox background-bleed margin pixels let the correctly-faded background show through during the slide-in fade window, instead of painting stale post-fade texture over it (§7.22/§7.23)", () => {
    // Local (97,10) - background-bleed (matches the plain unfaded bg at its
    // settled screen position, oracle-cross-checked) - at tick 1500 (dx=-85)
    // lands on-screen at (25,26), inside the fade's y=16 (fully-white)
    // plateau (`SENDOUT_BG_FADE_Y`, r=34-41).
    const bleed = pixelAtSentOut(1500, 25, 26);
    expect(bleed).toEqual([255, 255, 255]);

    // Local (75,0) - genuine healthbox border content (not bleed) - at the
    // same tick lands on-screen at (3,16); confirms the mask only skips
    // true background-bleed pixels, not real healthbox art.
    const content = pixelAtSentOut(1500, 3, 16);
    expect(content).toEqual([82, 107, 99]);
  });

  // §7.20: `SENDOUT_BG_FADE_Y`'s own ramp was one step short at both ends -
  // handoff+19/20 (1481/1482) and handoff+54/55 (1516/1517) render as y=2 in
  // the oracle (direct pixel decode via `blendComponentToWhite` against a
  // clean background swatch, cross-checked first at the table's own
  // already-established r=21/22 and r=50/51 entries to confirm the method),
  // not the unfaded fallback the table previously produced there. A clean
  // background tile at (150,60) makes the fade's own on/off boundary
  // directly visible without any sprite/particle overlap.
  it("send-out BG-to-white fade ramps one more step at both ends than the table's old boundaries (handoff+19/20 and +54/55 render y=2, not unfaded) (§7.20)", () => {
    const unfaded = pixelAtSentOut(1480, 150, 60);
    const expectedY2: [number, number, number] = [
      blendComponentToWhite(unfaded[0], 2),
      blendComponentToWhite(unfaded[1], 2),
      blendComponentToWhite(unfaded[2], 2),
    ];
    expect(pixelAtSentOut(1481, 150, 60)).toEqual(expectedY2);
    expect(pixelAtSentOut(1482, 150, 60)).toEqual(expectedY2);
    expect(pixelAtSentOut(1516, 150, 60)).toEqual(expectedY2);
    expect(pixelAtSentOut(1517, 150, 60)).toEqual(expectedY2);
    expect(pixelAtSentOut(1518, 150, 60)).toEqual(unfaded);
  });

  it("message text stays fully printed (all 35 chars) throughout the visual handoff, past its own completion tick", () => {
    const chars35Pixel = pixelAtSentOut(1462, 16, 121);
    const laterPixel = pixelAtSentOut(1555, 16, 121);
    expect(laterPixel).toEqual(chars35Pixel);
  });

  it("the player's own party-status-summary bar stays visible through the handoff - only the sending (opponent) battler's side despawns (§7.4.3)", () => {
    const playerBar = ballStatusBarPositions(1500);
    const atBar = pixelAtSentOut(1500, playerBar.player.x + 4, 96 + 4);
    const stillIdle = pixelAt(1300, playerBar.player.x + 4, 96 + 4);
    expect(atBar).toEqual(stillIdle);
  });

  // §7.4.2/§7.11 mechanism 2 (PROGRESS.md): the send-out ball sprite, pixel-
  // brute-force-confirmed against this trace's own regenerated ground truth
  // (tools/compare/scratch/{find_ball,ball_ticks}.mjs, throwaway, not
  // committed) - corner (168,56), closed frame ZERO-diff exact 1464-1479,
  // open frame ZERO-diff exact at 1480. Screen (174,58) = corner+(6,2) is
  // opaque gray (idx7, both palettes coincidentally (66,66,66)) in the
  // CLOSED frame's tile but transparent (idx0) in the OPEN frame's tile at
  // the same offset - a clean three-state signal (background -> gray ->
  // background-again) pinning both boundary ticks without hand-picking a
  // background color.
  it("send-out ball: closed frame appears at handoff+2 (tick 1464, not the handoff tick itself) and is replaced by the (locally transparent) open frame at handoff+18 (tick 1480) (§7.4.2/§7.11)", () => {
    const before = pixelAtSentOut(1463, 174, 58);
    const closed = pixelAtSentOut(1464, 174, 58);
    const stillClosed = pixelAtSentOut(1479, 174, 58);
    const afterOpen = pixelAtSentOut(1480, 174, 58);
    expect(closed).toEqual([66, 66, 66]);
    expect(stillClosed).toEqual([66, 66, 66]);
    expect(before).not.toEqual([66, 66, 66]);
    expect(afterOpen).not.toEqual([66, 66, 66]);
  });

  // §7.5/§7.11 mechanism 4 (PROGRESS.md): the materialize affine-scale-in +
  // ball-color tint. GROVYLE_CORNER+(33,32) (one px right of dead-center) is
  // opaque in the source across every accumulator in `affineEmerge`'s table
  // (near-zero relative offset maps close to source-center regardless of
  // scale), so it's a clean signal for the tint window's own boundaries
  // without depending on the scale-in's exact per-tick bounding box. §7.21:
  // the exact dead-center pixel is no longer usable for render 1481 once
  // `MATERIALIZE_Y2_TABLE[0]=14` shifts it into `PARTICLE_ORIGIN`'s own
  // territory (mechanism 3 draws on top there, out of this fix's scope) -
  // `+(1,0)` was checked directly against the full composited render (not
  // just the isolated sprite) across every covered tick 1481-1492 and
  // avoids every occluder.
  it("Grovyle's materialize tint (flat RGB(255,181,247)) is absent before handoff+19 (1481), present through handoff+41 (1503), then a hard cutoff at handoff+42 (1504) (§7.5/§7.11 mechanism 4)", () => {
    const TINT: [number, number, number] = [255, 181, 247];
    const before = pixelAtSentOut(1480, GROVYLE_CORNER.x + 33, GROVYLE_CORNER.y + 32);
    const first = pixelAtSentOut(1481, GROVYLE_CORNER.x + 33, GROVYLE_CORNER.y + 32 + 14);
    const last = pixelAtSentOut(1503, GROVYLE_CORNER.x + 32, GROVYLE_CORNER.y + 32);
    const after = pixelAtSentOut(1504, GROVYLE_CORNER.x + 32, GROVYLE_CORNER.y + 32);
    expect(before).not.toEqual(TINT);
    expect(first).toEqual(TINT);
    expect(last).toEqual(TINT);
    expect(after).not.toEqual(TINT);
  });

  // §7.21: the materialize renderer's own vertical `y2` offset (RAM-probed,
  // `MATERIALIZE_Y2_TABLE`) - pins its exact per-tick decay via the same
  // occluder-free `+(1,0)` pixel from the test above (the negative case,
  // "not tinted without the offset," is already covered by that test's
  // `first` check at tick 1481 alone - later ticks' `y2` is too small to
  // guarantee the un-offset pixel misses the silhouette too).
  it("Grovyle's materialize silhouette carries a decaying y2 offset (RAM-probed, §7.21) through renders 1481-1492", () => {
    const TINT: [number, number, number] = [255, 181, 247];
    const table = [14, 13, 12, 11, 10, 9, 8, 7, 5, 4, 3, 2];
    for (let i = 0; i < table.length; i += 1) {
      const tick = 1481 + i;
      const shifted = pixelAtSentOut(tick, GROVYLE_CORNER.x + 33, GROVYLE_CORNER.y + 32 + table[i]!);
      expect(shifted).toEqual(TINT);
    }
  });

  // §7.22/§7.23: mechanism 5 (GROVYLE_STRETCH_EARLY_TABLE) starts writing its
  // affine matrix at handoff+35 (1497), not handoff+42 (1504) - closing
  // §7.21's own named "matrix-early" gap. Mechanism 4's window is shortened
  // to match (et<35, was et<42) and mechanism 5's early portion is drawn in
  // mechanism 4's OLD (pre-ball/particle) call slot so the particle burst
  // still correctly occludes Grovyle through et 35-41 (the compositing-order
  // correction named in §7.22). Pins the table's own asymmetric xScale/
  // yScale silhouette-edge boundary (not just tint presence, which mechanism
  // 4's own flat cutoff would also show) at two covered ticks - a boundary
  // pixel pair straddling the exact silhouette edge the RAM-derived scale
  // produces, confirming the table's specific values (not a neutral
  // fallback) are what's actually rendered.
  it("mechanism 5's affine matrix write starts 7 ticks early (handoff+35, GROVYLE_STRETCH_EARLY_TABLE) - the corrected silhouette edge at renders 1499 and 1503 (§7.22/§7.23)", () => {
    const TINT: [number, number, number] = [255, 181, 247];
    const before1499 = pixelAtSentOut(1499, GROVYLE_CORNER.x + 48, GROVYLE_CORNER.y + 4);
    const after1499 = pixelAtSentOut(1499, GROVYLE_CORNER.x + 49, GROVYLE_CORNER.y + 4);
    expect(before1499).not.toEqual(TINT);
    expect(after1499).toEqual(TINT);

    const before1503 = pixelAtSentOut(1503, GROVYLE_CORNER.x + 48, GROVYLE_CORNER.y + 2);
    const after1503 = pixelAtSentOut(1503, GROVYLE_CORNER.x + 49, GROVYLE_CORNER.y + 2);
    expect(before1503).not.toEqual(TINT);
    expect(after1503).toEqual(TINT);
  });

  // §7.25: mechanism 2's ball sprite has a 3rd visible frame the prior
  // sessions missed. `ANIMCMD_FRAME(8,5)`'s own tile data (`poke.png`'s
  // frame slot 2) genuinely is blank, but `LoadBallGfx` (pokeball.c:1308-
  // 1332) unconditionally DMAs a SEPARATE graphic (`gOpenPokeballGfx` =
  // `graphics/balls/open.png`, a full round ball, not the "halves
  // separated" look of the "open" frame) over that exact VRAM tile range
  // when the ball sprite is created - so the ball is genuinely visible for
  // 6 more render ticks (1485-1490) than previously modeled, and only truly
  // goes invisible at handoff+29 (1491), not handoff+23 (RAM-probed:
  // `gSprites[9]`'s `invisible` flag flips at RAM tick 1490, `animEnded` at
  // RAM 1489, `animCmdIndex` 0->1 at RAM 1484 - all with this window's
  // established +1 render lag). (172,65) is `BALL_CORNER`-relative (4,9) -
  // `openFinal`'s own gray button pixel (palette index 6, `(148,148,148)`),
  // checked against the full composited render (not just the isolated
  // sprite) for occluder-free stability across every covered tick and both
  // its neighbors (handoff+22/1484 shows the ball's own "open" frame there
  // instead; handoff+29/1491 shows the mon's materialize tint once the ball
  // is truly gone).
  it("the ball's 3rd frame (openFinal, open.png) is visible handoff+23..28 (1485-1490), not blank - genuinely invisible only from handoff+29 (1491) (§7.25)", () => {
    const OPEN_FINAL_GRAY: [number, number, number] = [148, 148, 148];
    const beforeOpenFinal = pixelAtSentOut(1484, 172, 65);
    expect(beforeOpenFinal).not.toEqual(OPEN_FINAL_GRAY);
    for (let tick = 1485; tick <= 1490; tick += 1) {
      expect(pixelAtSentOut(tick, 172, 65)).toEqual(OPEN_FINAL_GRAY);
    }
    expect(pixelAtSentOut(1491, 172, 65)).not.toEqual(OPEN_FINAL_GRAY);
  });

  // §7.24: mechanism 5's LATE window (`GROVYLE_STRETCH_TABLE`, handoff+42/
  // render 1504 on) was drawn AFTER `drawBallOpenParticles` in its original
  // call site - the same compositing-order bug §7.22/§7.23 already fixed for
  // the EARLY window (handoff 35-41), just not yet applied here because a
  // prior session's own comment asserted "by then the particles have mostly
  // cleared this screen region." That assertion doesn't hold: the existing
  // (unmodified) particle age formula puts several particles still alive
  // with ages well under `PARTICLE_MAX_AGE` throughout 1504-1518 (e.g. index
  // 12 at age 10, render 1504; index 12 at age 22, render 1516) - the same
  // particle-position formula already pixel-validated elsewhere in this
  // file. Moving mechanism 5's late call site to before
  // `drawSendOutBall`/`drawBallOpenParticles` (matching the early window's
  // already-established slot; `drawSendOutBall` is itself a confirmed no-op
  // past handoff+23, so this doesn't disturb ball occlusion) lets particles
  // occlude Grovyle's stretched silhouette again, closing `sendout.json`'s
  // 1504-1518 span (221/256 -> 236/256) without touching any table/formula.
  it("mechanism 5's late window (handoff+42 on) no longer paints over the still-alive particle burst - renders 1504 and 1516 show particle color, not Grovyle's tint, at a particle's own predicted footprint (§7.24)", () => {
    const PARTICLE_COLOR: [number, number, number] = [255, 173, 0];
    expect(pixelAtSentOut(1504, 173, 40)).toEqual(PARTICLE_COLOR);
    expect(pixelAtSentOut(1516, 174, 16)).toEqual(PARTICLE_COLOR);
  });

  // Mechanism 3 (PROGRESS.md, docs/battle-anim-assets.md §1): the ball-open
  // particle burst. PARTICLE_ORIGIN (172,55) + local (2,1) is tile0's own
  // first opaque pixel (palette index 2, orange) - particle 0 (angle 0,
  // radius 0 at age 0) renders exactly there, undisplaced, the tick it
  // first appears.
  it("ball-open particle burst: the first particle (angle 0) appears at PARTICLE_ORIGIN+(2,1) at handoff+19 (1481), not before (mechanism 3)", () => {
    const ORIGIN = { x: 172, y: 55 };
    const PARTICLE_COLOR: [number, number, number] = [255, 173, 0];
    const before = pixelAtSentOut(1480, ORIGIN.x + 2, ORIGIN.y + 1);
    const first = pixelAtSentOut(1481, ORIGIN.x + 2, ORIGIN.y + 1);
    expect(before).not.toEqual(PARTICLE_COLOR);
    expect(first).toEqual(PARTICLE_COLOR);
  });

  // §7.18: pins the RAM-confirmed one-tick global engine stall correction
  // (`PARTICLE_STALL_LOGICAL_TICK`). Particle 0 (angle 0, straight down) is
  // at real age 12 (radius 22) by render tick 1494 (logicalT 13), one tick
  // BEHIND the naive age-13/radius-24 the un-corrected formula would use -
  // RAM-probed directly (`gSprites`' own `x2`/`y2` duplicate across RAM
  // ticks 1493/1494, `tools/probe/ram-probe.py` against this trace's own
  // segments). Local (2,1) is tile0's own first opaque pixel (age%6===0 at
  // both age 12 and 13, so the tile itself doesn't disambiguate - only the
  // vertical position does).
  it("ball-open particle burst: the global one-tick engine stall shifts particle 0 to radius 22 (not the naive 24) by handoff+32 (1494) (§7.14/§7.18 mechanism 3)", () => {
    const ORIGIN = { x: 172, y: 55 };
    const PARTICLE_COLOR: [number, number, number] = [255, 173, 0];
    const correctedRadius = pixelAtSentOut(1494, ORIGIN.x + 2, ORIGIN.y + 22 + 1);
    const naiveRadius = pixelAtSentOut(1494, ORIGIN.x + 2, ORIGIN.y + 24 + 1);
    expect(correctedRadius).toEqual(PARTICLE_COLOR);
    expect(naiveRadius).not.toEqual(PARTICLE_COLOR);
  });

  // §7.18: pins the death-boundary fix (`PARTICLE_MAX_AGE` 25 -> 24) for the
  // last-spawned particle (index 15, itself also delayed one tick by the
  // same stall - `PARTICLE_LATE_SPAWN_START_INDEX`). RAM shows the register
  // write for a particle's final age (25, radius 48) happens the same tick
  // `DestroyBallOpenAnimationParticle` runs, so it's never actually
  // composited to screen - rendering it anyway (the pre-fix behavior)
  // regressed render tick 1522 from bit-exact to an 12px mismatch at screen
  // (141,88), oracle-cross-checked (`tools/compare/out/latest` at the time
  // of the regression).
  it("ball-open particle burst: particle 15 does not render past its RAM-confirmed death tick, handoff+60 (1522) (§7.18 mechanism 3)", () => {
    const PARTICLE_COLOR: [number, number, number] = [255, 173, 0];
    const pixel = pixelAtSentOut(1522, 141, 88);
    expect(pixel).not.toEqual(PARTICLE_COLOR);
  });

  // §7.26: the real SortSprites() compositor model, source-verified against
  // reference/pokeemerald (pokeball.c's sBallOamData vs. its
  // AnimateBallOpenParticles(..., 1, 28, ...) call sites). Lower oam.priority
  // wins unconditionally, regardless of screen position - the particle burst
  // (priority 1) always renders on top of the ball sprite (priority 2) it
  // shares screen space with.
  it("particle-vs-ball OAM priority: the particle burst's oam.priority (1) beats the ball sprite's (2), source-verified literals from pokeball.c", () => {
    expect(PARTICLE_OAM_PRIORITY).toBeLessThan(BALL_OAM_PRIORITY);
    expect(PARTICLE_OAM_SUBPRIORITY).toBe(28);
  });

  // §7.26 Finding 2: same-burst particles share identical oam.priority/
  // subpriority, so their relative order is decided ENTIRELY by SortSprites'
  // Y tie-break - ascending screen Y (higher Y renders on top, i.e. drawn
  // last), and on an EXACT Y tie the insertion sort's strict `<` never
  // fires, so original (ascending spawn-index) order survives, meaning the
  // OLDER (lower-index) particle keeps the lower final OAM index and renders
  // on top - it must be drawn LAST.
  it("particle-vs-particle Y tie-break (§7.26): distinct screen Y sorts ascending (higher Y drawn last/on top); an exact Y tie draws the older (lower-index) particle last/on top", () => {
    const distinctY = sortAliveParticlesByScreenY([
      { i: 0, age: 5, dx: 0, dy: 10 },
      { i: 1, age: 3, dx: 0, dy: -4 },
    ]);
    expect(distinctY.map((p) => p.i)).toEqual([1, 0]);

    const tiedY = sortAliveParticlesByScreenY([
      { i: 3, age: 0, dx: 0, dy: 0 },
      { i: 4, age: 0, dx: 0, dy: 0 },
    ]);
    expect(tiedY.map((p) => p.i)).toEqual([4, 3]);
  });

  // Mechanism 1 (PROGRESS.md, §7.4.3): the opponent party-status-summary
  // despawn (alpha blend + per-icon staggered exit slide). Icon j=5 (the
  // rightmost, delay 0) starts sliding+fading the very first active tick;
  // its own tile's opaque pixel at local (3,2) sits at screen (82,34) at
  // that tick (base x=76 + exit offset 3 for n=1 active tick).
  // §7.30 correction: handoff+0 (1462) is the icon's own SETTLED color, not
  // background - `drawOpponentSummaryExit` only starts at handoff+1, so
  // handoff+0 needs the settled render (see `drawSendOutHandoff`'s own
  // `t === handoffTick` branch). The old pin asserted `after (1493) ==
  // before (1462)`, which only passed because both were background under
  // the pre-fix bug (the settled opponent icon wasn't drawn at 1462 at all)
  // - not a real equality. All three ticks are oracle-pixel-exact now.
  it("opponent party-summary despawn: icon j=5 is its own settled color at handoff+0 (1462), blended at handoff+1 (1463), and gone (background) once the blend reaches 0 at handoff+31 (1493) (mechanism 1)", () => {
    const settled = pixelAtSentOut(1462, 82, 34);
    const during = pixelAtSentOut(1463, 82, 34);
    const after = pixelAtSentOut(1493, 82, 34);
    expect(settled).toEqual([74, 66, 90]);
    expect(during).not.toEqual(settled);
    expect(after).not.toEqual(settled);
    expect(after).toEqual([247, 247, 255]);
  });

  // §7.31 (ISSUES #18, closes render 1493 - `SUMMARY_EXIT_LAST_ALIVE_ELAPSED`):
  // at handoff+31 (1493) the bar's own blend has bottomed out at eva=0, but
  // the bar sprite itself isn't destroyed until RAM tick 1494 (render 1495)
  // - RAM/VRAM-confirmed (`tools/compare/scratch/probe_bar_vram.py`,
  // throwaway). Screen (164,43)/(165,43) sit under the bar's own opaque
  // tile-0 diagonal edge, directly over Grovyle's opaque materialize
  // silhouette there - real hardware still composites the bar at eva=0
  // (100% target-2, the plain background), so these pixels must show the
  // background's own faded color, not Grovyle's flat tint.
  it("opponent summary bar: still composites at eva=0 on handoff+31 (1493), showing background (not Grovyle's tint) under the bar's own opaque edge (§7.31)", () => {
    const GROVYLE_TINT: [number, number, number] = [255, 181, 247];
    const BG_FADED: [number, number, number] = [247, 247, 255];
    expect(pixelAtSentOut(1493, 164, 43)).toEqual(BG_FADED);
    expect(pixelAtSentOut(1493, 165, 43)).toEqual(BG_FADED);
    // sanity: Grovyle's own tint is genuinely reachable nearby, so this
    // isn't just "the whole region is background regardless".
    expect(pixelAtSentOut(1493, 168, 43)).toEqual(GROVYLE_TINT);
  });

  // §7.32 (ISSUES #18, closes renders 1494/1495): RAM/VRAM-confirmed
  // (§7.31's `probe_bar_vram.py`) the bar's own sprite slot is destroyed and
  // reused starting RAM tick 1494 (render 1495) - but empirically extending
  // `SUMMARY_EXIT_LAST_ALIVE_ELAPSED`'s closed-form `elapsed` uniformly
  // overshoots (the bar's exit-slide position, `barExitX2`, keeps advancing
  // 2px/tick past the point the real sprite stopped moving). The oracle's
  // own pixels prove the position/blend clock STALLS for exactly one extra
  // tick at handoff+31 (1493's own `elapsed=30` value repeats at 1494) then
  // resumes normal 1:1 counting from there (1495 uses `elapsed=31`, not 32) -
  // a one-tick engine stall of the same family as §7.18's particle stall,
  // plausibly the same RAM-confirmed destroy/reuse event pausing whatever
  // internal counter drives this exit animation for one tick while the slot
  // transitions. Verified against the oracle by direct pixel search (not
  // assumed): freezing at 30 alone closes 1494 but leaves 1495's own wider
  // edge open (3px); resuming at 31 (not 32) for 1495 closes it exactly.
  it("opponent summary bar: elapsed clock stalls one tick at the RAM-confirmed destroy/reuse (handoff+31/+32, renders 1494/1495) - render 1494 stays frozen at 1493's own edge, render 1495 widens by one more step (§7.32)", () => {
    const GROVYLE_TINT: [number, number, number] = [255, 181, 247];
    const BG_FADED: [number, number, number] = [247, 247, 255];
    // 1494 is pixel-identical to 1493's own frozen edge (elapsed=30 reused).
    expect(pixelAtSentOut(1494, 164, 43)).toEqual(BG_FADED);
    expect(pixelAtSentOut(1494, 165, 43)).toEqual(BG_FADED);
    expect(pixelAtSentOut(1494, 166, 43)).toEqual(GROVYLE_TINT);
    // 1495 resumes counting (elapsed=31) and widens the background edge by
    // one more step - these three pixels are still Grovyle's tint at 1494
    // (and would stay tint forever under a naive elapsed=30 freeze).
    expect(pixelAtSentOut(1495, 165, 42)).toEqual(BG_FADED);
    expect(pixelAtSentOut(1495, 166, 43)).toEqual(BG_FADED);
    expect(pixelAtSentOut(1495, 167, 43)).toEqual(BG_FADED);
    // sanity: Grovyle's own tint is still reachable nearby at both ticks.
    expect(pixelAtSentOut(1494, 168, 43)).toEqual(GROVYLE_TINT);
    expect(pixelAtSentOut(1495, 168, 43)).toEqual(GROVYLE_TINT);
  });

  // §7.30: the opponent trainer-pic's exit slide (`trainerExitX`/
  // `TRAINER_EXIT_X2`) starts at x2=2 at handoff+0 (1462, RAM tick 1461's
  // value, +1 render lag) - RAM-probed (`sendout-trainer-exit2.json`,
  // `sprite4x2`) AND independently confirmed by an exhaustive oracle-pixel
  // dx sweep (best match at dx=+2, cutting this tick's trainer-bbox
  // mismatch 796px->151px). Screen (197,20), inside the trainer's hat brim,
  // is background if x2 is wrongly treated as 0 (the pre-fix behavior) but
  // the hat's own color once the +2 offset lands, matching the oracle.
  it("opponent trainer-pic exit slide starts at x2=2, not 0, on handoff+0 (1462)", () => {
    expect(pixelAtSentOut(1462, 197, 20)).toEqual([156, 140, 74]);
  });

  // §7.19: pins the bar's OWN exit slide (`SpriteCB_StatusSummaryBar_Exit`,
  // `barExitX2` in battleScene.ts) - a constant +2px/tick, distinct from the
  // icons' accelerating slide, plus the subsprite-table width swap
  // (`EXIT_BAR_TILE_ORDER`). At rest (1461, still in the pre-handoff settled
  // branch) the bar's opaque tip pixel sits at screen (96,40) (oracle-
  // confirmed exact color, direct pixel probe against
  // tools/compare/out/sendout-baseline). At handoff+1 (1463, the first
  // active exit tick) that same screen position is bare background - the
  // tip has slid +2px right to (98,40)/(99,40) (also oracle-confirmed),
  // proving the slide actually moves the bar rather than just fading it in
  // place or just widening it. (handoff+0/1462 itself is a separate,
  // out-of-scope one-tick gap - see docs/battle-scene-notes.md §7.19 - not
  // used here.)
  it("opponent party-summary bar: the bar's own tip slides +2px/tick, landing at screen (98-99,40) at handoff+1 (1463) (§7.19 mechanism 1)", () => {
    const stillSettled = pixelAtSentOut(1461, 96, 40);
    const slid = pixelAtSentOut(1463, 98, 40);
    const oldPositionAfterSlide = pixelAtSentOut(1463, 96, 40);
    expect(stillSettled).toEqual([33, 57, 0]);
    expect(slid).toEqual([46, 69, 15]);
    expect(oldPositionAfterSlide).toEqual([255, 255, 255]);
  });

  // §7.17: pins the corrected `drawSpriteSheetAffineStretch` sampling math
  // (the OAM matrix element is `xScale`/`yScale` DIRECTLY, not
  // `0x10000/xScale`) for render tick 1525 (handoff+63, table index 21:
  // xScale=269, yScale=232, y2=-3, frame 0/tileset per the breathing
  // cadence). Screen (193,12) = GROVYLE_CORNER+(49,0) is a destination
  // pixel that the OLD (inverted) formula sampled out of the source tile's
  // own bounds (blank) - the real oracle (and the fixed formula) puts
  // opaque body color RGB(82,165,189) there; oracle-cross-checked directly
  // (tools/compare/out/sendout-baseline/oracle-01525.png).
  it("Grovyle's front-sprite stretch (mechanism 5) samples in-bounds body color at a destination pixel the old inverted-matrix formula wrongly left blank, render tick 1525 (§7.17)", () => {
    const pixel = pixelAtSentOut(1525, GROVYLE_CORNER.x + 49, GROVYLE_CORNER.y + 0);
    expect(pixel).toEqual([82, 165, 189]);
  });

  // §7.17: pins the corrected front-sprite breathing-frame cadence
  // (`sAnim_Grovyle_1`: frame 0 for 10 RAM ticks, frame 1 for 18, frame 0
  // for 7, ..., `GROVYLE_FRONT_ANIM_START_OFFSET`-anchored). GROVYLE_CORNER+
  // (31,7) samples a different source position under each tick's own
  // affine stretch, but the two render ticks land in different
  // `animCmdIndex` spans (1517 in the frame-1/frame2 span, 1525 in the
  // following frame-0/tileset span) and so read different source frames -
  // both expected colors oracle-cross-checked directly
  // (tools/compare/out/sendout-baseline/oracle-0151{7,25}.png @ (175,19)).
  it("Grovyle's front-sprite breathing cadence: frame 1 active at render 1517, frame 0 active at render 1525 (§7.17, RAM-probed gSprites[8].animCmdIndex boundaries)", () => {
    const atFrame1Tick = pixelAtSentOut(1517, GROVYLE_CORNER.x + GROVYLE_FIRST_OPAQUE_OFFSET.x, GROVYLE_CORNER.y + GROVYLE_FIRST_OPAQUE_OFFSET.y);
    const atFrame0Tick = pixelAtSentOut(1525, GROVYLE_CORNER.x + GROVYLE_FIRST_OPAQUE_OFFSET.x, GROVYLE_CORNER.y + GROVYLE_FIRST_OPAQUE_OFFSET.y);
    expect(atFrame1Tick).toEqual([198, 239, 189]);
    expect(atFrame0Tick).toEqual([189, 255, 181]);
  });
});
