import { describe, expect, it } from "vitest";
import {
  GO_TEXT,
  GO_TEXT_START_TICK,
  GO_TEXT_STATIC_FROM_TICK,
  GO_TEXT_TOTAL_CHARS,
  goTextVisibleChars,
  BRENDAN_THROW_START_TICK,
  brendanThrowFrame,
  brendanThrowDx,
  PLAYER_THROW_BALL_START_TICK,
  PLAYER_THROW_BALL_EXACT_END_TICK,
  playerThrowBallTopLeft,
  PLAYER_THROW_BALL_SPIN_START_TICK,
  PLAYER_THROW_BALL_ARRIVE_TICK,
  playerThrowBallSpin,
  playerSummaryFadeEva,
  playerSummaryIconExitDx,
  playerSummaryBarExitDx,
  PLAYER_BALL_OPEN_START_TICK,
  PLAYER_BALL_OPEN_END_TICK,
  PLAYER_BALL_OPEN_VISIBLE_BOTTOM,
  playerBallOpenTopLeft,
  PLAYER_BG_FADE_START_TICK,
  playerMaterializeBgFadeY,
} from "../src/engine/battleMenu.ts";
import { renderBattleScene, TICK0 } from "../src/engine/battleScene.ts";

/** Same rig as tests/battleScene.test.ts's `pixelAtSentOut` - send-out A-press already registered at trace tick 1420 (sendOutPressElapsed=380), the fixed script every committed trace in this window shares. */
function pixelAtSentOut(t: number, x: number, y: number): [number, number, number] {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380 });
  const o = (y * 240 + x) * 4;
  return [fb[o]!, fb[o + 1]!, fb[o + 2]!];
}

describe("battleMenu: 'Go! ONIX!' print cadence (docs/battle-menu-notes.md §1/§2)", () => {
  it("'Go! ONIX!' is 9 printable characters", () => {
    expect(GO_TEXT).toBe("Go! ONIX!");
    expect(GO_TEXT_TOTAL_CHARS).toBe(9);
  });

  it("shows 0 characters before the box-clear tick", () => {
    expect(goTextVisibleChars(GO_TEXT_START_TICK - 1)).toBe(0);
  });

  it("box clear and the first glyph land on the same tick (1563)", () => {
    expect(GO_TEXT_START_TICK).toBe(1563);
    expect(goTextVisibleChars(GO_TEXT_START_TICK)).toBe(1);
  });

  it("prints exactly 1 char/tick including the silent space (index 3, tick 1566), clamped at the total", () => {
    expect(goTextVisibleChars(1564)).toBe(2); // "o"
    expect(goTextVisibleChars(1565)).toBe(3); // "!"
    expect(goTextVisibleChars(1566)).toBe(4); // " " (silent - GO_TEXT[3] is a space, still charged a tick)
    expect(GO_TEXT[3]).toBe(" ");
    expect(goTextVisibleChars(1567)).toBe(5); // "O"
    expect(goTextVisibleChars(1571)).toBe(GO_TEXT_TOTAL_CHARS); // "!"
    expect(goTextVisibleChars(1000000)).toBe(GO_TEXT_TOTAL_CHARS);
  });

  it("is static from tick 1572 (last new char at 1571)", () => {
    expect(GO_TEXT_STATIC_FROM_TICK).toBe(1572);
    expect(goTextVisibleChars(GO_TEXT_STATIC_FROM_TICK)).toBe(GO_TEXT_TOTAL_CHARS);
    expect(goTextVisibleChars(GO_TEXT_STATIC_FROM_TICK - 1)).toBe(GO_TEXT_TOTAL_CHARS);
  });
});

describe("battleMenu: rendered pixels (oracle-pinned, tools/compare/traces/menu-text.json)", () => {
  it("still shows the opponent's held 'sent\\nout GROVYLE!' text one tick before the clear (1562)", () => {
    // x=17,y=128 is inside the "G" glyph's cell once printed (1563+) but is
    // plain window background one tick earlier, since no character of
    // "BUG CATCHER DESTIN sent\nout GROVYLE!" occupies that cell.
    expect(pixelAtSentOut(1562, 17, 128)).toEqual([255, 255, 255]);
  });

  it("draws the 'G' glyph's ink color the same tick the box clears (1563)", () => {
    expect(pixelAtSentOut(GO_TEXT_START_TICK, 17, 128)).toEqual([107, 90, 115]);
  });

  it("renders byte-identical frames across the silent space tick (1565 -> 1566)", () => {
    const fb1 = new Uint8Array(240 * 160 * 4);
    const fb2 = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fb1, { elapsed: 1565 - TICK0, sendOutPressElapsed: 380 });
    renderBattleScene(fb2, { elapsed: 1566 - TICK0, sendOutPressElapsed: 380 });
    expect(fb2).toEqual(fb1);
  });

  it("renders byte-identical frames once static (1571 -> 1572)", () => {
    const fb1 = new Uint8Array(240 * 160 * 4);
    const fb2 = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fb1, { elapsed: 1571 - TICK0, sendOutPressElapsed: 380 });
    renderBattleScene(fb2, { elapsed: 1572 - TICK0, sendOutPressElapsed: 380 });
    expect(fb2).toEqual(fb1);
  });
});

describe("battleMenu: Brendan's throw pose-swap + exit translation (docs/battle-menu-notes.md §3, slice 2)", () => {
  it("throw pose starts at tick 1574, not the ~1595 coarse estimate", () => {
    expect(BRENDAN_THROW_START_TICK).toBe(1574);
    expect(brendanThrowFrame(BRENDAN_THROW_START_TICK - 1)).toBeNull();
    expect(brendanThrowDx(BRENDAN_THROW_START_TICK - 1)).toBeNull();
  });

  it("cycles raw frames 0,1,2,0,3 per sAnimCmd_Brendan_1's own FRAME durations (24,9,24,9,50)", () => {
    expect(brendanThrowFrame(1574)).toBe(0);
    expect(brendanThrowFrame(1597)).toBe(0); // et=23, last frame-0 tick
    expect(brendanThrowFrame(1598)).toBe(1); // et=24
    expect(brendanThrowFrame(1606)).toBe(1); // et=32, last frame-1 tick
    expect(brendanThrowFrame(1607)).toBe(2); // et=33
    expect(brendanThrowFrame(1630)).toBe(2); // et=56, last frame-2 tick
    expect(brendanThrowFrame(1631)).toBe(0); // et=57
    expect(brendanThrowFrame(1639)).toBe(0); // et=65, last frame-0-reprise tick
    expect(brendanThrowFrame(1640)).toBe(3); // et=66
  });

  it("x2 offset matches the pixel-fit Q8.8 accumulator exactly at every dense-trace tick sampled this session", () => {
    // tools/compare/traces-groundtruth/battle1-menu-dense.json, 0/1665px
    // mismatch at every one of these ticks against trainer-pic-brendan-back.json's frame 0/1/2.
    expect(brendanThrowDx(1574)).toBe(-2);
    expect(brendanThrowDx(1580)).toBe(-16);
    expect(brendanThrowDx(1588)).toBe(-36);
    expect(brendanThrowDx(1596)).toBe(-55);
    expect(brendanThrowDx(1606)).toBe(-79);
    expect(brendanThrowDx(1614)).toBe(-98);
  });

  it("freezes at n=50 (translation duration) instead of continuing to slide forever", () => {
    const atDurationEnd = brendanThrowDx(BRENDAN_THROW_START_TICK + 49);
    expect(brendanThrowDx(BRENDAN_THROW_START_TICK + 200)).toBe(atDurationEnd);
  });
});

describe("battleMenu: the thrown Poke Ball's arc (docs/battle-menu-notes.md §3, slice 2)", () => {
  it("becomes visible at tick 1607 (spawn, no motion yet) and stops being modeled after 1614 (GBA affine-spin branch kicks in)", () => {
    expect(PLAYER_THROW_BALL_START_TICK).toBe(1607);
    expect(PLAYER_THROW_BALL_EXACT_END_TICK).toBe(1614);
    expect(playerThrowBallTopLeft(PLAYER_THROW_BALL_START_TICK - 1)).toBeNull();
    expect(playerThrowBallTopLeft(PLAYER_THROW_BALL_EXACT_END_TICK + 1)).toBeNull();
    expect(playerThrowBallTopLeft(1607)).toEqual({ x: 16, y: 60 });
  });

  it("traces the Q8.8 linear-x + sine-arc-y curve exactly at every tick this session pixel-fit (0/112px mismatch each)", () => {
    expect(playerThrowBallTopLeft(1608)).toEqual({ x: 17, y: 57 });
    expect(playerThrowBallTopLeft(1609)).toEqual({ x: 19, y: 55 });
    expect(playerThrowBallTopLeft(1610)).toEqual({ x: 21, y: 54 });
    expect(playerThrowBallTopLeft(1611)).toEqual({ x: 23, y: 52 });
    expect(playerThrowBallTopLeft(1612)).toEqual({ x: 25, y: 50 });
    expect(playerThrowBallTopLeft(1613)).toEqual({ x: 27, y: 49 });
    expect(playerThrowBallTopLeft(1614)).toEqual({ x: 29, y: 49 });
  });
});

describe("battleMenu: the thrown Poke Ball's GBA affine 'spin' (docs/battle-menu-notes.md §3 item 4, PROGRESS #94/#96's named blocker)", () => {
  it("is null outside [1615, 1651] - picks up exactly where the plain-arc model (PLAYER_THROW_BALL_EXACT_END_TICK=1614) leaves off", () => {
    expect(PLAYER_THROW_BALL_SPIN_START_TICK).toBe(PLAYER_THROW_BALL_EXACT_END_TICK + 1);
    expect(playerThrowBallSpin(PLAYER_THROW_BALL_SPIN_START_TICK - 1)).toBeNull();
    expect(playerThrowBallSpin(PLAYER_THROW_BALL_ARRIVE_TICK + 1)).toBeNull();
  });

  it("first spin tick (1615) renders RAM tick 1614's matrix (Cos(25,256)=209, -Sin(25,256)=-147) - the same render-lag convention (screen T shows RAM T-1) already established for mechanism 4/5 and RAM-confirmed here via gSprites[5]'s callback pointer", () => {
    expect(playerThrowBallSpin(1615)).toEqual({ centerX: 38, centerY: 56, pa: 209, pb: -147, pc: 147, pd: 209 });
  });

  it("rotation keeps accumulating (25 GBA angle units/tick) all the way to the last spin tick (1650), even though the arc's own duration countdown has already fallen back to the plain (non-spin) branch by then - the affine anim is driven independently by AnimateSprite, not by SpriteCB_PlayerMonSendOut_2's own branch", () => {
    expect(playerThrowBallSpin(1650)).toEqual({ centerX: 72, centerY: 115, pa: -254, pb: 25, pc: -25, pd: -254 });
  });

  it("arrival (1651): the ball snaps to its final center (72,115) and the affine matrix resets to identity (StartSpriteAffineAnim(sprite, 0), the neutral anim) - RAM-confirmed via gSprites[5]'s matrix (gOamMatrices[3]) going back to (256,0,0,256) the same tick its callback switches to SpriteCB_ReleaseMonFromBall", () => {
    expect(playerThrowBallSpin(PLAYER_THROW_BALL_ARRIVE_TICK)).toEqual({ centerX: 72, centerY: 115, pa: 256, pb: 0, pc: 0, pd: 256 });
  });
});

describe("battleMenu: rendered pixels for the ball spin (oracle-pinned, tools/compare/traces/menu-throw.json, 70/70 0-diff)", () => {
  it("the ball's ink color is present at its rotated position early in the spin (tick 1615) and mid-spin (tick 1630)", () => {
    expect(pixelAtSentOut(1615, 35, 52)).toEqual([173, 0, 0]);
    expect(pixelAtSentOut(1630, 52, 59)).toEqual([173, 0, 0]);
  });

  it("arrival (tick 1651): the ball's ink color is present at its final, unrotated resting position", () => {
    expect(pixelAtSentOut(1651, 70, 110)).toEqual([173, 0, 0]);
  });
});

describe("battleMenu: player party-status-summary fade-out (the tick-1574 'ball icon change', PROGRESS #93)", () => {
  it("eva holds at 16 (opaque, no visible blend) the tick the hide task is assigned, then steps down every other tick to 0", () => {
    expect(playerSummaryFadeEva(BRENDAN_THROW_START_TICK - 1)).toBeNull();
    expect(playerSummaryFadeEva(1574)).toBe(16);
    expect(playerSummaryFadeEva(1575)).toBe(15);
    expect(playerSummaryFadeEva(1576)).toBe(15); // held - data[11] alternates
    expect(playerSummaryFadeEva(1577)).toBe(14);
    expect(playerSummaryFadeEva(1605)).toBe(0);
    expect(playerSummaryFadeEva(1614)).toBe(0); // holds at 0, doesn't go negative
  });

  it("icon exit-slide is a per-icon-staggered (7 ticks/icon) triangular ramp, pixel-fit exact (icon 0 at tick 1580: -63px)", () => {
    expect(playerSummaryIconExitDx(1573, 0)).toBe(0);
    expect(playerSummaryIconExitDx(1580, 0)).toBe(-63); // K=6: -3*6*7/2
    expect(playerSummaryIconExitDx(1580, 1)).toBe(0); // icon 1's 7-tick predelay hasn't elapsed yet (K=6-7<=0)
    expect(playerSummaryIconExitDx(1587, 1)).toBe(-63); // icon 1, 7 ticks later, same K=6 shape
  });

  it("bar exit-slide is a flat -2px/tick (no predelay, no acceleration - data[1]'s low nibble never changes)", () => {
    expect(playerSummaryBarExitDx(1573)).toBe(0);
    expect(playerSummaryBarExitDx(1575)).toBe(-2);
    expect(playerSummaryBarExitDx(1584)).toBe(-20);
  });
});

describe("battleMenu: rendered pixels for slice 2 (oracle-pinned, tools/compare/traces/menu-throw.json, 11/11 0-diff)", () => {
  it("Brendan's throw-pose ink color is present at the translated position on the pose-swap tick (1574)", () => {
    expect(pixelAtSentOut(1574, 50, 70)).toEqual([247, 247, 255]);
  });

  it("the thrown ball's ink color is present at its arc position (tick 1607 spawn, tick 1610 mid-arc)", () => {
    expect(pixelAtSentOut(1607, 20, 64)).toEqual([173, 0, 0]);
    expect(pixelAtSentOut(1610, 25, 58)).toEqual([173, 0, 0]);
  });
});

describe("battleMenu: player status-bar subsprite-split exit (docs/battle-menu-notes.md §3 item 4b, this session), oracle-pinned via tools/compare/traces/menu-throw.json (33/33 0-diff, 41-tick window minus 8 ticks named-blocked by a separate mechanism)", () => {
  it("tick 1574 itself still renders the flat (pre-switch) Enter-shaped bar - the table switch has the same 1-tick render lag every other register in this window has, so it isn't visible until the next tick", () => {
    // (232,98) sits at tx=12 of the flat 16-tile draw (barX=136, exit dx=0) -
    // the "tip" subsprite's own first tile, unaffected by the split either way.
    expect(pixelAtSentOut(1574, 232, 98)).toEqual([123, 148, 132]);
  });

  it("tick 1580 renders the widened (24-tile) Exit layout - (220,98) is inside one of the two EXTRA tileOffset-8 duplicate blocks EXIT_BAR_TILE_ORDER inserts before the tip, which the old flat 16-tile draw never had content for at this screen position", () => {
    expect(pixelAtSentOut(1580, 220, 98)).toEqual([92, 112, 101]);
  });

  it("tick 1584 (later in the same exit, bar further slid + more faded) still matches the widened layout at a different duplicate-block offset", () => {
    expect(pixelAtSentOut(1584, 212, 98)).toEqual([116, 133, 125]);
  });
});

describe("battleMenu: ONIX materialize window start - ball 'open' pose swap (docs/battle-menu-notes.md §3 item 5, tools/compare/traces/menu-materialize.json 5/5 0-diff)", () => {
  it("the ball's open pose swaps in exactly one tick after arrival (1651), and stays visible through PLAYER_BALL_OPEN_END_TICK (widened this session - see its own doc comment for the pixel-confirmed vs. still-open sub-range)", () => {
    expect(PLAYER_BALL_OPEN_START_TICK).toBe(1652);
    expect(PLAYER_BALL_OPEN_END_TICK).toBe(1663);
    expect(playerBallOpenTopLeft(1651)).toBeNull();
    expect(playerBallOpenTopLeft(1652)).toEqual({ x: 64, y: 107 });
    expect(playerBallOpenTopLeft(1656)).toEqual({ x: 64, y: 107 });
    expect(playerBallOpenTopLeft(1664)).toBeNull();
  });

  it("terrain occludes the open pose below screen y=112 - only the sprite's own top 2 rows are ever visible at this screen position", () => {
    expect(PLAYER_BALL_OPEN_VISIBLE_BOTTOM).toBe(112);
  });

  it("the visible sliver of the ball's open-pose art renders its own ink color at tick 1652 (oracle-pinned, battle1-menu-dense.json)", () => {
    expect(pixelAtSentOut(1652, 70, 111)).toEqual([255, 156, 123]);
  });
});

describe("battleMenu: PLAYER-side ball-open particle burst (docs/battle-menu-notes.md §3 item 5, mechanism 3's player-side analogue, battleScene.ts's drawPlayerBallOpenParticles - tools/compare/traces/menu-materialize.json 5/5 0-diff)", () => {
  it("nothing particle-colored renders before the burst starts (PLAYER_BG_FADE_START_TICK, 1653) - the origin tile's own pixel is still the ball-open sprite's ink at 1652", () => {
    expect(pixelAtSentOut(1652, 72, 110)).toEqual([66, 66, 66]);
  });

  it("logical tick 0 (trace tick 1653): the single spawned particle's own tile renders exactly, oracle-pinned (battle1-menu-dense.json)", () => {
    expect(pixelAtSentOut(1653, 70, 108)).toEqual([255, 255, 255]);
    expect(pixelAtSentOut(1653, 70, 107)).toEqual([255, 173, 0]);
  });

  it("by logical tick 3 (trace tick 1656) later-spawned particles have grown outward, changing pixels the single-particle tick 1653 frame left as background - oracle-pinned", () => {
    expect(pixelAtSentOut(1656, 75, 111)).toEqual([255, 255, 255]);
    expect(pixelAtSentOut(1653, 75, 111)).toEqual([66, 66, 66]);
  });
});

describe("battleMenu: player-side materialize BG-to-white fade (docs/battle-menu-notes.md §3 item 5, PROGRESS #98's pre-existing ~1653+ residual root-caused this session - the SAME BeginNormalPaletteFade mechanism battleScene.ts's SENDOUT_BG_FADE_Y models for the opponent, re-triggered by the player's own ONIX release)", () => {
  it("starts exactly one tick after the ball's own open-pose swap (1653 = PLAYER_BALL_OPEN_START_TICK+1), 0 (unfaded) the tick before", () => {
    expect(PLAYER_BG_FADE_START_TICK).toBe(1653);
    expect(playerMaterializeBgFadeY(1652)).toBe(0);
    expect(playerMaterializeBgFadeY(1653)).toBe(2);
  });

  it("ramps up 2-per-2-ticks with the same 3-tick y=14 hold as SENDOUT_BG_FADE_Y, to a 16 (white) plateau (oracle-decoded, tools/compare/scratch/menu-audit/decode_player_bgfade.mjs)", () => {
    expect(playerMaterializeBgFadeY(1654)).toBe(2);
    expect(playerMaterializeBgFadeY(1655)).toBe(4);
    expect(playerMaterializeBgFadeY(1663)).toBe(12);
    expect(playerMaterializeBgFadeY(1665)).toBe(14);
    expect(playerMaterializeBgFadeY(1666)).toBe(14);
    expect(playerMaterializeBgFadeY(1667)).toBe(14);
    expect(playerMaterializeBgFadeY(1668)).toBe(16);
    expect(playerMaterializeBgFadeY(1675)).toBe(16);
  });

  it("ramps back down symmetrically and returns to unfaded (0) past the table's own tail - the exact boundary-truncation lesson §7.20 named for the opponent's own table, re-verified here rather than assumed", () => {
    expect(playerMaterializeBgFadeY(1676)).toBe(14);
    expect(playerMaterializeBgFadeY(1688)).toBe(2);
    expect(playerMaterializeBgFadeY(1689)).toBe(2);
    expect(playerMaterializeBgFadeY(1690)).toBe(0);
    expect(playerMaterializeBgFadeY(1700)).toBe(0);
  });

  it("rendered pixels match the oracle's faded background at a clean swatch, tick 1653 and tick 1668's white plateau (oracle-pinned, battle1-menu-dense.json)", () => {
    expect(pixelAtSentOut(1653, 165, 52)).toEqual([198, 198, 165]);
    expect(pixelAtSentOut(1668, 165, 52)).toEqual([255, 255, 255]);
    expect(pixelAtSentOut(1689, 165, 52)).toEqual([198, 198, 165]);
  });
});
