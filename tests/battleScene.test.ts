import { describe, expect, it } from "vitest";
import {
  advanceBattleScene,
  ballIcons,
  ballStatusBarPositions,
  cursorState,
  CURSOR_START_TICK,
  evaEvb,
  INITIAL_BATTLE_SCENE_STATE,
  renderBattleScene,
  sendOutPressEligible,
  sendOutTextVisibleChars,
  shiftBottom,
  shiftTop,
  TEXT_START_TICK,
  TEXT_TOTAL_CHARS,
  textVisibleChars,
  TICK0,
  windowRange,
  type BattleSceneState,
} from "../src/engine/battleScene.ts";
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
  // ball-color tint. GROVYLE_CORNER+(32,32) is the sprite's exact center
  // (tile 36, pixel (0,0), palette index 3, opaque) - a destination pixel
  // that stays opaque across every accumulator in `affineEmerge`'s table
  // (near-zero relative offset maps close to source-center regardless of
  // scale), so it's a clean signal for the tint window's own boundaries
  // without depending on the scale-in's exact per-tick bounding box.
  it("Grovyle's materialize tint (flat RGB(255,181,247)) is absent before handoff+19 (1481), present through handoff+41 (1503), then a hard cutoff at handoff+42 (1504) (§7.5/§7.11 mechanism 4)", () => {
    const TINT: [number, number, number] = [255, 181, 247];
    const before = pixelAtSentOut(1480, GROVYLE_CORNER.x + 32, GROVYLE_CORNER.y + 32);
    const first = pixelAtSentOut(1481, GROVYLE_CORNER.x + 32, GROVYLE_CORNER.y + 32);
    const last = pixelAtSentOut(1503, GROVYLE_CORNER.x + 32, GROVYLE_CORNER.y + 32);
    const after = pixelAtSentOut(1504, GROVYLE_CORNER.x + 32, GROVYLE_CORNER.y + 32);
    expect(before).not.toEqual(TINT);
    expect(first).toEqual(TINT);
    expect(last).toEqual(TINT);
    expect(after).not.toEqual(TINT);
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

  // Mechanism 1 (PROGRESS.md, §7.4.3): the opponent party-status-summary
  // despawn (alpha blend + per-icon staggered exit slide). Icon j=5 (the
  // rightmost, delay 0) starts sliding+fading the very first active tick;
  // its own tile's opaque pixel at local (3,2) sits at screen (82,34) at
  // that tick (base x=76 + exit offset 3 for n=1 active tick).
  it("opponent party-summary despawn: icon j=5 is blended (neither pure background nor the icon's own true color) at handoff+1 (1463), and gone again once the blend reaches 0 at handoff+31 (1493) (mechanism 1)", () => {
    const before = pixelAtSentOut(1462, 82, 34);
    const during = pixelAtSentOut(1463, 82, 34);
    const after = pixelAtSentOut(1493, 82, 34);
    expect(during).not.toEqual(before);
    expect(after).toEqual(before);
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
