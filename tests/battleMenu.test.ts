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
  PLAYER_BALL_OPEN_FINAL_END_TICK,
  PLAYER_BALL_OPEN_VISIBLE_BOTTOM,
  playerBallOpenTopLeft,
  PLAYER_BG_FADE_START_TICK,
  playerMaterializeBgFadeY,
  PLAYER_HEALTHBOX_SLIDE_START_TICK,
  PLAYER_HEALTHBOX_SLIDE_SETTLE_TICK,
  playerHealthboxSlideDx,
  PLAYER_MATERIALIZE_SETTLE_START_TICK,
  PLAYER_MATERIALIZE_SETTLE_TICK,
  playerMaterializeSettleTintCoeff,
  playerMaterializeSettleY2,
  CLOSED_FIGHT_SUBMENU_STATE,
  doubleTeamAnchorTick,
  doubleTeamCloneOffsets,
  DOUBLE_TEAM_ANCHOR_DELAY,
  DOUBLE_TEAM_VISIBLE_START_DELAY,
  DOUBLE_TEAM_VISIBLE_END_DELAY,
  statsBannerBg1Y,
  STATS_BANNER_BG1_Y_ANCHOR_DELAY,
  rockSlideRockState,
  rockSlideBg3Y,
  rockSlideMonShakeY2,
  rockSlideDrawOrder,
  ROCK_SLIDE_RAM_ANCHOR_DELAY,
  rockSlideOpponentHp,
  ROCK_SLIDE_HP_DRAIN_START_DELAY,
  ROCK_SLIDE_TEXT_CLEAR_DELAY,
  ROCK_SLIDE_MENU_REDRAW_DELAY,
  rockSlideResettledBounceTick,
  MENU_IDLE_BLANK_END_TICK,
  getCurrentPPToMaxPPState,
  ppRemainingGlyphCodes,
  CHAR_SPACER,
  turn2KickoffTextVisibleChars,
  turn2KickoffTextStartTick,
  turnKickoffTextStartTick,
  TURN2_KICKOFF_TEXT_TOTAL,
  endeavorOnixHp,
  ENDEAVOR_HP_DRAIN_START_DELAY,
  openFightSubmenu,
  confirmFightMove,
  turn2SubmenuBounceTick,
  menuIdleBounce,
  FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
} from "../src/engine/battleMenu.ts";
import { renderBattleScene, TICK0 } from "../src/engine/battleScene.ts";

/** Same rig as tests/battleScene.test.ts's `pixelAtSentOut` - send-out A-press already registered at trace tick 1420 (sendOutPressElapsed=380), the fixed script every committed trace in this window shares. */
function pixelAtSentOut(t: number, x: number, y: number): [number, number, number] {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5KoDismissElapsed: null, turn5Resolved: false });
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
    renderBattleScene(fb1, { elapsed: 1565 - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5KoDismissElapsed: null, turn5Resolved: false });
    renderBattleScene(fb2, { elapsed: 1566 - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5KoDismissElapsed: null, turn5Resolved: false });
    expect(fb2).toEqual(fb1);
  });

  it("renders byte-identical frames once static (1571 -> 1572)", () => {
    const fb1 = new Uint8Array(240 * 160 * 4);
    const fb2 = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fb1, { elapsed: 1571 - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5KoDismissElapsed: null, turn5Resolved: false });
    renderBattleScene(fb2, { elapsed: 1572 - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5KoDismissElapsed: null, turn5Resolved: false });
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

describe("battleMenu: player status-bar subsprite-split exit (docs/battle-menu-notes.md §3 item 4b, this session), oracle-pinned via tools/compare/traces/menu-throw.json (41/41 0-diff, was 33/41 until §3c's OBJ-vs-OBJ blend fix closed the other 8)", () => {
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

describe("battleMenu: player status-icon vs. Brendan OBJ-vs-OBJ blend (docs/battle-menu-notes.md §3c, this session), oracle-pinned via tools/compare/traces/menu-throw.json - closes the 8 ticks §7.26 disproved the ordering hypothesis for (78/78 0-diff, up from 70/78)", () => {
  it("tick 1581: icon 0 (already past Brendan's own leading edge) blends against the plain background, not Brendan's raw sprite color underneath - real GBA OBJ-OBJ blending has no 'second sprite' to fall back on", () => {
    expect(pixelAtSentOut(1581, 73, 89)).toEqual([117, 111, 131]);
  });

  it("tick 1589: icon 1 (its own 7-tick predelay elapsed) overlapping Brendan, same mechanism", () => {
    expect(pixelAtSentOut(1589, 50, 90)).toEqual([140, 222, 115]);
  });

  it("tick 1597: icon 2 (14-tick predelay elapsed) overlapping Brendan, same mechanism", () => {
    expect(pixelAtSentOut(1597, 44, 90)).toEqual([247, 222, 220]);
  });

  it("tick 1646: once playerSummaryFadeEva bottoms out at 0 the bar/icons must stop drawing entirely (real hardware destroys them, RAM tick 1605) - regression guard for the fix above, which would otherwise repaint this spot (behind the settled ball) with plain background every tick", () => {
    expect(playerSummaryFadeEva(1646)).toBe(0);
    expect(pixelAtSentOut(1646, 63, 98)).toEqual([66, 66, 66]);
  });
});

describe("battleMenu: ONIX materialize window start - ball 'open' pose swap (docs/battle-menu-notes.md §3 item 5, tools/compare/traces/menu-materialize.json 7/7 0-diff)", () => {
  it("the ball's open pose swaps in exactly one tick after arrival (1651), and stays visible through PLAYER_BALL_OPEN_END_TICK - RAM-confirmed exactly 5 ticks (1652-1656), matching sBallAnimSeq1's own ANIMCMD_FRAME(4,5) duration (see the constant's own doc comment; corrects a prior session's over-widened 1663 guess)", () => {
    expect(PLAYER_BALL_OPEN_START_TICK).toBe(1652);
    expect(PLAYER_BALL_OPEN_END_TICK).toBe(1656);
    expect(playerBallOpenTopLeft(1651)).toBeNull();
    expect(playerBallOpenTopLeft(1652)).toEqual({ x: 64, y: 107 });
    expect(playerBallOpenTopLeft(1656)).toEqual({ x: 64, y: 107 });
  });

  it("terrain occludes the open pose below screen y=112 - only the sprite's own top 2 rows are ever visible at this screen position", () => {
    expect(PLAYER_BALL_OPEN_VISIBLE_BOTTOM).toBe(112);
  });

  it("the visible sliver of the ball's open-pose art renders its own ink color at tick 1652 (oracle-pinned, battle1-menu-dense.json)", () => {
    expect(pixelAtSentOut(1652, 70, 111)).toEqual([255, 156, 123]);
  });
});

describe("battleMenu: ball openFinal pose (PROGRESS #104/this session - the same missing-3rd-frame mechanism §7.25 found for the opponent's own ball, LoadBallGfx DMA'ing graphics/balls/open.png over a nominally-blank anim slot at sprite creation, a battler-generic code path)", () => {
  it("stays visible 6 more ticks past PLAYER_BALL_OPEN_END_TICK, through PLAYER_BALL_OPEN_FINAL_END_TICK (1657-1662) - RAM-confirmed via gSprites[5]'s animCmdIndex/animDelayCounter (see the constant's own doc comment), then gone by 1663 (the ball is already invisible by then, oracle-confirmed)", () => {
    expect(PLAYER_BALL_OPEN_FINAL_END_TICK).toBe(1662);
    expect(playerBallOpenTopLeft(1656)).toEqual({ x: 64, y: 107 });
    expect(playerBallOpenTopLeft(1657)).toEqual({ x: 64, y: 107 });
    expect(playerBallOpenTopLeft(1662)).toEqual({ x: 64, y: 107 });
    expect(playerBallOpenTopLeft(1663)).toBeNull();
  });

  it("renders the openFinal tile's own ink colors (distinct from the open pose's own colors at the same coords), oracle-pinned (battle1-menu-dense.json)", () => {
    expect(pixelAtSentOut(1657, 70, 111)).toEqual([132, 0, 0]);
    expect(pixelAtSentOut(1657, 67, 110)).toEqual([66, 66, 66]);
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

describe("battleMenu: player healthbox slide-in (docs/battle-menu-notes.md §3 item 6/§7 new item, this session) - RAM-probed exact (tools/probe/specs/menu-player-healthbox.json, gSprites[0]: x2 starts 110, steps -5/RAM-tick, settles 0; +1 render lag matches every other mechanism in this window)", () => {
  it("is null (not created / fully off-screen) before the first visible tick", () => {
    expect(playerHealthboxSlideDx(PLAYER_HEALTHBOX_SLIDE_START_TICK - 1)).toBeNull();
    expect(PLAYER_HEALTHBOX_SLIDE_START_TICK).toBe(1667);
  });

  it("starts at dx=110 (mostly off the right edge of the 240px screen) and steps -5/tick", () => {
    expect(playerHealthboxSlideDx(1667)).toBe(110);
    expect(playerHealthboxSlideDx(1668)).toBe(105);
    expect(playerHealthboxSlideDx(1672)).toBe(85);
    expect(playerHealthboxSlideDx(1688)).toBe(5);
  });

  it("settles (dx=0) at PLAYER_HEALTHBOX_SLIDE_SETTLE_TICK (1689) and holds indefinitely after", () => {
    expect(PLAYER_HEALTHBOX_SLIDE_SETTLE_TICK).toBe(1689);
    expect(playerHealthboxSlideDx(1689)).toBe(0);
    expect(playerHealthboxSlideDx(1700)).toBe(0);
    expect(playerHealthboxSlideDx(1741)).toBe(0);
  });

  it("renders nothing at the settled healthbox's own screen position before the box is created (bare background - still under the tail of the materialize BG-white fade at this tick, §3 item 5)", () => {
    expect(pixelAtSentOut(1666, 180, 92)).toEqual([255, 255, 255]);
  });

  it("renders the settled green HP-bar content exact once slid into place, held through the static hold (oracle-pinned, battle1-menu-dense.json)", () => {
    expect(pixelAtSentOut(1689, 180, 92)).toEqual([115, 255, 173]);
    expect(pixelAtSentOut(1710, 180, 92)).toEqual([115, 255, 173]);
    expect(pixelAtSentOut(1741, 180, 92)).toEqual([115, 255, 173]);
  });
});

describe("battleMenu: ONIX color-fade-to-true-color + settle wobble (ISSUES #17, docs/battle-menu-notes.md §3 item 5's own named blocker - RAM-probed via tools/probe/specs/menu-player-materialize-taskfade.json, cross-validated by brute-force pixel decode against battle1-menu-dense.json)", () => {
  it("hands off from drawPlayerMaterialize's own fixed-tint window (ends 1663) with no gap or overlap", () => {
    expect(PLAYER_MATERIALIZE_SETTLE_START_TICK).toBe(1664);
  });

  it("tCoeff (Task_FadeMon_ToNormal_Step) stays fully tinted (16) while frozen polling the concurrent BG-white fade, then ramps down exactly 1/tick, reaching true color (0) at render 1691", () => {
    expect(playerMaterializeSettleTintCoeff(1664)).toBe(16);
    expect(playerMaterializeSettleTintCoeff(1675)).toBe(16);
    expect(playerMaterializeSettleTintCoeff(1676)).toBe(15);
    expect(playerMaterializeSettleTintCoeff(1683)).toBe(8);
    expect(playerMaterializeSettleTintCoeff(1690)).toBe(1);
    expect(playerMaterializeSettleTintCoeff(1691)).toBe(0);
    expect(playerMaterializeSettleTintCoeff(1702)).toBe(0);
    expect(playerMaterializeSettleTintCoeff(1741)).toBe(0);
  });

  it("y2 settle wobble (gSprites[6].y2, RAM-derived table) is irregular/non-monotonic - not DoBounceEffect (too small an amplitude) and not a curve, a genuine third animation (BACK_ANIM_V_SHAKE) - then permanently 0 from PLAYER_MATERIALIZE_SETTLE_TICK (1702) on, matching PROGRESS #109's independently-corrected settle pin", () => {
    expect(playerMaterializeSettleY2(1664)).toBe(2);
    expect(playerMaterializeSettleY2(1669)).toBe(0);
    expect(playerMaterializeSettleY2(1670)).toBe(6);
    expect(playerMaterializeSettleY2(1671)).toBe(11);
    expect(PLAYER_MATERIALIZE_SETTLE_TICK).toBe(1702);
    expect(playerMaterializeSettleY2(1702)).toBe(0);
    expect(playerMaterializeSettleY2(1710)).toBe(0);
    expect(playerMaterializeSettleY2(1741)).toBe(0);
  });

  it("tick 1693 and tick 1700 land on the identical wobble phase (y2=11, both fully true-color) - the same 'oscillating, 7-tick round trip' the docs' own sha comparison independently found", () => {
    expect(playerMaterializeSettleY2(1693)).toBe(playerMaterializeSettleY2(1700));
    expect(playerMaterializeSettleY2(1693)).toBe(11);
  });

  it("rendered pixels: fully tinted through 1666-1675, mid-fade at 1676, settled true gray from 1691 on, oracle-pinned (battle1-menu-dense.json)", () => {
    expect(pixelAtSentOut(1666, 60, 70)).toEqual([255, 181, 247]);
    expect(pixelAtSentOut(1676, 60, 70)).toEqual([247, 173, 239]);
    expect(pixelAtSentOut(1691, 60, 70)).toEqual([132, 123, 123]);
    expect(pixelAtSentOut(1702, 60, 70)).toEqual([132, 123, 123]);
    expect(pixelAtSentOut(1730, 60, 70)).toEqual([132, 123, 123]);
  });
});

describe("battleMenu: DOUBLE_TEAM clone motion (docs/battle-menu-notes.md §10 gap 1, RESOLVED this session) - two independent per-clone x2 sequences, RAM-confirmed via tools/probe/dump-doubleteam-sprites.py's dense gSprites[].data[] dump against battle1-turn1.json, cross-checked against the compare tool (turn1-cloneanim.json's clone window 1964-2093: 0 diff except 4 near-1px edge ticks)", () => {
  const pressTick = 1919;

  it("anchor/window constants match the RAM-confirmed register envelope (BLDCNT/BLDALPHA jump at pressTick+45=1964, pixel-visible pressTick+47=1966 through pressTick+174=2093 with the established one-tick render lag)", () => {
    expect(DOUBLE_TEAM_ANCHOR_DELAY).toBe(45);
    expect(doubleTeamAnchorTick(pressTick)).toBe(1964);
    expect(DOUBLE_TEAM_VISIBLE_START_DELAY).toBe(47);
    expect(DOUBLE_TEAM_VISIBLE_END_DELAY).toBe(174);
  });

  it("null outside the visible window (before 1966, after 2093)", () => {
    expect(doubleTeamCloneOffsets(1964, pressTick)).toBeNull();
    expect(doubleTeamCloneOffsets(1965, pressTick)).toBeNull();
    expect(doubleTeamCloneOffsets(2094, pressTick)).toBeNull();
  });

  it("per-clone x2 sequence is RAM-exact (tools/probe/dump-doubleteam-sprites.py, RAM ticks 1964/1969/1975/1980/1999/2024/2045/2092 read at slots 3/4, shifted +1 tick for render lag) - NOT a shared +/-offset table: clone A and B diverge from an exact mirror at small amplitude (e.g. render 1970: a=0 but b=-1, not -0) because C's arithmetic-right-shift truncation isn't symmetric around zero", () => {
    expect(doubleTeamCloneOffsets(1966, pressTick)).toEqual({ a: 0, b: 0 });
    expect(doubleTeamCloneOffsets(1970, pressTick)).toEqual({ a: 0, b: -1 });
    expect(doubleTeamCloneOffsets(1976, pressTick)).toEqual({ a: 1, b: -2 });
    expect(doubleTeamCloneOffsets(1981, pressTick)).toEqual({ a: 4, b: -5 });
    expect(doubleTeamCloneOffsets(2000, pressTick)).toEqual({ a: -3, b: 2 });
    expect(doubleTeamCloneOffsets(2025, pressTick)).toEqual({ a: -9, b: 8 });
    expect(doubleTeamCloneOffsets(2046, pressTick)).toEqual({ a: -36, b: 35 });
    expect(doubleTeamCloneOffsets(2093, pressTick)).toEqual({ a: 19, b: -20 }); // last active render tick, right before both clones self-destroy
  });
});

describe("battleMenu: stat-change banner BG1 scroll (docs/battle-menu-notes.md §10d, RESOLVED this session) - gBattle_BG1_Y's +3/tick ramp, one-tick render lag (same convention as battleScene.ts's bg1X, NOT statsBannerEva's own no-lag convention)", () => {
  const pressTick = 1919;

  it("anchor constant places the ramp's zero point one tick past the RAM-confirmed ramp start (RAM tick 2129 -> pressTick+211=2130)", () => {
    expect(STATS_BANNER_BG1_Y_ANCHOR_DELAY).toBe(211);
  });

  it("flat 0 before the ramp, then +3/tick, matching RAM tick t-1's own gBattle_BG1_Y value exactly (dump-registers.py-class register probe, ticks 2120-2193)", () => {
    expect(statsBannerBg1Y(2130, pressTick)).toBe(0); // RAM tick 2129 (still 0)
    expect(statsBannerBg1Y(2131, pressTick)).toBe(3); // RAM tick 2130 (first +3)
    expect(statsBannerBg1Y(2132, pressTick)).toBe(6); // RAM tick 2131
    expect(statsBannerBg1Y(2140, pressTick)).toBe(30); // RAM tick 2139
    expect(statsBannerBg1Y(2150, pressTick)).toBe(60); // RAM tick 2149
    expect(statsBannerBg1Y(2160, pressTick)).toBe(90); // RAM tick 2159
    expect(statsBannerBg1Y(2190, pressTick)).toBe(180); // holds at the ramp's own max past teardown
  });
});

describe("battleMenu: ROCK_SLIDE window (docs/battle-menu-notes.md §11, slice C - #129's deferred pins plus this session's rock-vs-rock draw-order simulation)", () => {
  const pressTick = 1919; // matches this window's other tests + turn1-rockslide.json's own anchor

  it("rockSlideBg3Y: the 11-tick shake sequence (0,-7,-7,0,0,-7,-7,0,0,-7,-7), RAM-reconfirmed §11, one-tick render lag", () => {
    expect(rockSlideBg3Y(pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY + 1, pressTick)).toBe(0); // RAM tick anchor (d=0)
    expect(rockSlideBg3Y(pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY + 2, pressTick)).toBe(-7); // d=1
    expect(rockSlideBg3Y(pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY + 3, pressTick)).toBe(-7); // d=2
    expect(rockSlideBg3Y(pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY + 4, pressTick)).toBe(0); // d=3
    expect(rockSlideBg3Y(pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY + 11, pressTick)).toBe(-7); // d=10, last active
    expect(rockSlideBg3Y(pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY + 12, pressTick)).toBe(0); // d=11, past the sequence
  });

  it("rockSlideMonShakeY2: period-4 [5,5,0,0] render pattern, active 2362-2455 only (pixel-fit per §11, pinned here as a regression guard)", () => {
    expect(rockSlideMonShakeY2(2361, pressTick)).toBe(0); // one tick before the window opens
    expect(rockSlideMonShakeY2(2362, pressTick)).toBe(5);
    expect(rockSlideMonShakeY2(2363, pressTick)).toBe(5);
    expect(rockSlideMonShakeY2(2364, pressTick)).toBe(0);
    expect(rockSlideMonShakeY2(2365, pressTick)).toBe(0);
    expect(rockSlideMonShakeY2(2455, pressTick)).toBe(5); // last active render tick
    expect(rockSlideMonShakeY2(2456, pressTick)).toBe(0); // one tick after the window closes
  });

  it("rockSlideRockState: position/animNum RAM-cross-verified this session (dump-rockslide-slot-order.py) for rocks at both window edges and mid-window", () => {
    expect(rockSlideRockState(0, 2348, pressTick)).toEqual({ centerX: 171, centerY: -16, animNum: 1 }); // rock 0's own spawn tick
    expect(rockSlideRockState(4, 2400, pressTick)).toEqual({ centerX: 142, centerY: 31, animNum: 0 });
    expect(rockSlideRockState(12, 2440, pressTick)).toEqual({ centerX: 136, centerY: 44, animNum: 0 });
    expect(rockSlideRockState(19, 2470, pressTick)).toEqual({ centerX: 225, centerY: 49, animNum: 2 }); // rock 19 (last), near its own despawn
    expect(rockSlideRockState(19, 2472, pressTick)).toEqual({ centerX: 225, centerY: 51, animNum: 2 }); // n=48, last active render tick (held)
    expect(rockSlideRockState(19, 2473, pressTick)).toBeNull(); // n=49, gone
  });

  it("rockSlideDrawOrder: the real gSprites[] slot-allocation + SortSprites simulation (this session, docs/battle-menu-notes.md §11) - RAM-validated 0 mismatches (tools/probe/dump-rockslide-slot-order.py vs battle1-rockslide-dense-b.json, 143 slot-assignment ticks + 117 multi-rock order ticks) - a spot sample across the window, background-to-foreground order", () => {
    expect(rockSlideDrawOrder(2352, pressTick)).toEqual([1, 0]); // first overlap (2 rocks), no Y-tie
    expect(rockSlideDrawOrder(2367, pressTick)).toEqual([4, 3, 2, 1, 0]); // 5 rocks, still no Y-tie
    expect(rockSlideDrawOrder(2379, pressTick)).toEqual([7, 6, 5, 0, 1, 2, 4, 3]); // 8 rocks, first Y-ties resolved via sSpriteOrder history
    expect(rockSlideDrawOrder(2396, pressTick)).toEqual([12, 11, 10, 4, 3, 5, 9, 2, 6, 1, 7, 0, 8]); // 13 rocks, peak overlap
    expect(rockSlideDrawOrder(2418, pressTick)).toEqual([17, 16, 15, 9, 10, 8, 11, 7, 12, 14, 6, 13]); // slot reuse well underway
    expect(rockSlideDrawOrder(2434, pressTick)).toEqual([19, 13, 14, 12, 15, 11, 16, 18, 10, 17]);
    expect(rockSlideDrawOrder(2454, pressTick)).toEqual([18, 19, 17, 16, 15]); // winding down to the last 5
  });

  it("rockSlideDrawOrder: empty before the window opens and after every rock has despawned", () => {
    expect(rockSlideDrawOrder(pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY, pressTick)).toEqual([]);
    expect(rockSlideDrawOrder(2473, pressTick)).toEqual([]); // one past rock 19's own despawn (2472)
  });
});

describe("battleMenu: S7 slice D - HP drain + turn-end (docs/battle-menu-notes.md §12, docs/battle-turn-notes.md §9) - grid-searched against this session's own 161-frame dense oracle capture (ticks 2500-2660), 0 residual across all 15 fill-count transitions", () => {
  const pressTick = 1919; // matches this window's other tests + turn1-drain.json's own anchor
  const startHp = 143; // Grovyle before ROCK_SLIDE (battle1-turn1-ram-dump.json's before_turn.battler1.hp)
  const endHp = 101; // Grovyle after ROCK_SLIDE (after_turn.battler1.hp)

  it("ROCK_SLIDE_HP_DRAIN_START_DELAY anchors the sentinel to RAM/render tick 2516 (no extra render lag, unlike every other mechanism in this window)", () => {
    expect(pressTick + ROCK_SLIDE_HP_DRAIN_START_DELAY).toBe(2516);
  });

  it("rockSlideOpponentHp: full HP before the sentinel tick, then exactly 1 HP/tick down to endHp, settled forever after", () => {
    expect(rockSlideOpponentHp(2515, pressTick, startHp, endHp)).toBe(143);
    expect(rockSlideOpponentHp(2516, pressTick, startHp, endHp)).toBe(143); // sentinel tick itself, no visible drop yet
    expect(rockSlideOpponentHp(2517, pressTick, startHp, endHp)).toBe(142); // first drained tick (48px -> 47px)
    expect(rockSlideOpponentHp(2518, pressTick, startHp, endHp)).toBe(141);
    expect(rockSlideOpponentHp(2558, pressTick, startHp, endHp)).toBe(101); // d=42, last decrement, already at endHp
    expect(rockSlideOpponentHp(2559, pressTick, startHp, endHp)).toBe(101); // done sentinel tick, settled
    expect(rockSlideOpponentHp(2650, pressTick, startHp, endHp)).toBe(101); // stays settled indefinitely
  });

  it("rockSlideOpponentHp is value-agnostic (works for any startHp/endHp pair, not just this trace's 143/101)", () => {
    expect(rockSlideOpponentHp(2516, pressTick, 200, 180)).toBe(200);
    expect(rockSlideOpponentHp(2517, pressTick, 200, 180)).toBe(199);
    expect(rockSlideOpponentHp(2536, pressTick, 200, 180)).toBe(180); // d=20, exactly startHp-endHp
    expect(rockSlideOpponentHp(2600, pressTick, 200, 180)).toBe(180);
  });

  it("text-clear (pressTick+657=2576) then hard-cut menu-redraw (pressTick+664=2583), pixel-confirmed this session", () => {
    expect(pressTick + ROCK_SLIDE_TEXT_CLEAR_DELAY).toBe(2576);
    expect(pressTick + ROCK_SLIDE_MENU_REDRAW_DELAY).toBe(2583);
  });

  it("rockSlideResettledBounceTick: anchors the redraw tick to the same local t=MENU_IDLE_BLANK_END_TICK+1 the very first menu itself starts from", () => {
    const redrawTick = pressTick + ROCK_SLIDE_MENU_REDRAW_DELAY;
    expect(rockSlideResettledBounceTick(redrawTick, pressTick)).toBe(MENU_IDLE_BLANK_END_TICK + 1);
    expect(rockSlideResettledBounceTick(redrawTick + 1, pressTick)).toBe(MENU_IDLE_BLANK_END_TICK + 2);
    expect(rockSlideResettledBounceTick(redrawTick + 9, pressTick)).toBe(MENU_IDLE_BLANK_END_TICK + 10);
  });
});

// S7 slice I resolution (docs/battle-turn-notes.md §22): turn 4's own
// ROCK_SLIDE drain, Grovyle 41 -> 1 (a 1-HP survival, not a faint) - the
// same `rockSlideOpponentHp` formula already proven value-agnostic above,
// pinned here with turn 4's REAL numbers (`TURN4_CONFIRM_PRESS_TICK`=4925,
// a real press - `battle-turn-notes.md` §22) since this is the first turn
// whose drain crosses the healthbox's green->yellow->red HP-band
// thresholds (ISSUES #16's own "never oracle-exercised" note) - oracle-
// confirmed via `tools/compare/traces/turn4-rockslide.json` (250/250, 0
// diff) that the drain itself needs no new band-color code: `composeOpp
// onentHealthbox`'s existing band thresholds already render 41 and 1
// correctly with zero changes this session.
describe("S7 slice I resolution: rockSlideOpponentHp with turn 4's real numbers (41 -> 1)", () => {
  const pressTick = 4925;
  const startHp = 41;
  const endHp = 1;

  it("full HP before the sentinel tick, then exactly 1 HP/tick down to endHp, settled forever after", () => {
    const sentinel = pressTick + ROCK_SLIDE_HP_DRAIN_START_DELAY;
    expect(rockSlideOpponentHp(sentinel, pressTick, startHp, endHp)).toBe(41);
    expect(rockSlideOpponentHp(sentinel + 1, pressTick, startHp, endHp)).toBe(40); // first drained tick
    expect(rockSlideOpponentHp(sentinel + 40, pressTick, startHp, endHp)).toBe(1); // d=40, exactly startHp-endHp
    expect(rockSlideOpponentHp(sentinel + 41, pressTick, startHp, endHp)).toBe(1); // settled
    expect(rockSlideOpponentHp(sentinel + 200, pressTick, startHp, endHp)).toBe(1); // stays settled indefinitely
  });
});

// S7 slice J (docs/battle-turn-notes.md §13/§23): turn 5's own ENDEAVOR
// drain, Onix 88 -> 1 (HP-diff 87, the longest drain yet - the same
// `endeavorOnixHp` formula already proven value-agnostic above, pinned here
// with turn 5's REAL numbers (`TURN5_CONFIRM_PRESS_TICK`=5959, a real press)
// since this is the first turn whose drain crosses the PLAYER healthbox's
// own green->yellow->red HP-band thresholds AND lands on the 1-HP "never
// fully empty" sliver (ISSUES #16's own "never oracle-exercised on the
// player side" note, healthboxAssembly.test.ts's own new sliver pin) -
// oracle-confirmed via `tools/compare/traces/turn5-endeavor.json` (254/254,
// 0 diff) that the drain needs zero new band-color code: the existing
// compositor already renders every step of 88 -> 1 correctly.
describe("S7 slice J: endeavorOnixHp with turn 5's real numbers (88 -> 1, the first player-side green->yellow->red crossing)", () => {
  const pressTick = 5959;
  const startHp = 88;
  const endHp = 1;

  it("full HP before the sentinel tick, then exactly 1 HP/tick down to endHp, settled forever after", () => {
    const sentinel = pressTick + ENDEAVOR_HP_DRAIN_START_DELAY;
    expect(endeavorOnixHp(sentinel, pressTick, startHp, endHp)).toBe(88);
    expect(endeavorOnixHp(sentinel + 1, pressTick, startHp, endHp)).toBe(87); // first drained tick
    expect(endeavorOnixHp(sentinel + 87, pressTick, startHp, endHp)).toBe(1); // d=87, exactly startHp-endHp
    expect(endeavorOnixHp(sentinel + 88, pressTick, startHp, endHp)).toBe(1); // settled
    expect(endeavorOnixHp(sentinel + 200, pressTick, startHp, endHp)).toBe(1); // stays settled indefinitely
  });
});

describe("S7 slice E1: turn 2's FIGHT-submenu reopen - dynamic PP + ENDEAVOR kickoff (docs/battle-menu-notes.md §13)", () => {
  it("getCurrentPPToMaxPPState(9, 10) is 3 (full band) - PP 9/10 does NOT change color, verified against GetCurrentPPToMaxPPState's own source branches, not assumed", () => {
    expect(getCurrentPPToMaxPPState(9, 10)).toBe(3);
    expect(getCurrentPPToMaxPPState(10, 10)).toBe(3);
    expect(getCurrentPPToMaxPPState(20, 20)).toBe(3);
  });

  it("getCurrentPPToMaxPPState covers the other bands too (maxPP=10: exactly-half is band 0, not 3; <=1/4 low; ==0 empty)", () => {
    expect(getCurrentPPToMaxPPState(6, 10)).toBe(3); // > half
    expect(getCurrentPPToMaxPPState(5, 10)).toBe(0); // exactly half - neither <=1/4 nor >half
    expect(getCurrentPPToMaxPPState(3, 10)).toBe(0); // neither <=1/4 nor >half
    expect(getCurrentPPToMaxPPState(2, 10)).toBe(1); // <= floor(10/4)=2
    expect(getCurrentPPToMaxPPState(0, 10)).toBe(2);
  });

  it("ppRemainingGlyphCodes(9, 10) is CHAR_SPACER+'9'+'/'+'1'+'0' - oracle-pixel-confirmed byte-exact against battle1-turn2.json tick 2911 (docs/battle-menu-notes.md §13), not just source-reasoned", () => {
    expect(ppRemainingGlyphCodes(9, 10)).toEqual([CHAR_SPACER, 170, 186, 162, 161]);
  });

  it("ppRemainingGlyphCodes(10, 10) is both digits, no CHAR_SPACER - matches the harvest's own baked-in '10/10'", () => {
    expect(ppRemainingGlyphCodes(10, 10)).toEqual([162, 161, 186, 162, 161]);
  });

  it("turn2KickoffTextVisibleChars: starts 1 tick before turn 1's own formula would predict (oracle-confirmed, docs/battle-menu-notes.md §13), different total (26 vs turn 1's 29)", () => {
    const pressTick = 2945;
    expect(turnKickoffTextStartTick(pressTick)).toBe(2955); // the general (turn 1) formula's own prediction
    const start = turn2KickoffTextStartTick(pressTick);
    expect(start).toBe(2954); // oracle-confirmed: the whole message window differs at 2954, not 2953 or 2955
    expect(turn2KickoffTextVisibleChars(start - 1, pressTick)).toBe(0);
    expect(turn2KickoffTextVisibleChars(start, pressTick)).toBe(1);
    expect(turn2KickoffTextVisibleChars(start + TURN2_KICKOFF_TEXT_TOTAL - 1, pressTick)).toBe(TURN2_KICKOFF_TEXT_TOTAL);
    expect(turn2KickoffTextVisibleChars(start + TURN2_KICKOFF_TEXT_TOTAL + 50, pressTick)).toBe(TURN2_KICKOFF_TEXT_TOTAL);
  });
});

describe("S7 slice E1b: ENDEAVOR's own HP-bar drain (docs/battle-menu-notes.md §14, docs/battle-turn-notes.md §12) - Onix's own 117->101 drain, grid-searched against battle1-turn2.json's own dense captures spanning the drain (2999/3099/3103/3107/3111/3128), 0 residual", () => {
  const pressTick = 2945;
  const startHp = 117;
  const endHp = 101;

  it("endeavorOnixHp: full HP through the sentinel tick, then exactly 1 HP/tick down to endHp, settled forever after", () => {
    expect(pressTick + ENDEAVOR_HP_DRAIN_START_DELAY).toBe(3098); // the RAM sentinel tick itself
    expect(endeavorOnixHp(3097, pressTick, startHp, endHp)).toBe(117);
    expect(endeavorOnixHp(3098, pressTick, startHp, endHp)).toBe(117); // sentinel tick itself, no visible drop yet
    expect(endeavorOnixHp(3099, pressTick, startHp, endHp)).toBe(116); // first drained tick
    expect(endeavorOnixHp(3103, pressTick, startHp, endHp)).toBe(112);
    expect(endeavorOnixHp(3111, pressTick, startHp, endHp)).toBe(104);
    expect(endeavorOnixHp(3114, pressTick, startHp, endHp)).toBe(101); // d=16, last decrement, already at endHp
    expect(endeavorOnixHp(3115, pressTick, startHp, endHp)).toBe(101); // done sentinel tick, settled
    expect(endeavorOnixHp(3128, pressTick, startHp, endHp)).toBe(101); // stays settled indefinitely
  });

  it("endeavorOnixHp is value-agnostic (works for any startHp/endHp pair, not just this trace's 117/101)", () => {
    expect(endeavorOnixHp(3098, pressTick, 200, 150)).toBe(200);
    expect(endeavorOnixHp(3099, pressTick, 200, 150)).toBe(199);
    expect(endeavorOnixHp(3148, pressTick, 200, 150)).toBe(150); // d=50, exactly startHp-endHp
    expect(endeavorOnixHp(3200, pressTick, 200, 150)).toBe(150);
  });

  it("endeavorOnixHp's own anchor delay differs from ROCK_SLIDE's opponent-bar delay (a different move/animation window, not a shared constant)", () => {
    expect(ENDEAVOR_HP_DRAIN_START_DELAY).not.toBe(ROCK_SLIDE_HP_DRAIN_START_DELAY);
  });
});

describe("ISSUES #24 (docs/battle-menu-notes.md §8d): the onix-bounce two-state selection at turn 2's OWN reopen - RAM-probed ground truth at all 4 named ticks (2901/2135/3465/3721)", () => {
  const moveset = CLOSED_FIGHT_SUBMENU_STATE.activeMonMoveset;

  it("tick 2901 (turn2-endeavor-drain.json/turn2-dragonbreath.json): turn 2's OWN reopen just registered THIS tick (openElapsed===elapsed===1861) - the open-DMA-wait hold reads turn2SubmenuBounceTick, NOT plain t, landing onixY2=1 (RAM: real pixels match the y1 patch)", () => {
    // Same reachable state `core.ts` produces at trace tick 2901 (openFightSubmenu
    // just fired this tick, cursor still at its post-reopen default 0, no confirm yet).
    const sm = openFightSubmenu(1861, moveset);
    expect(sm).toEqual({ openElapsed: 1861, cursor: 0, displayCursor: 0, closeElapsed: null, confirmElapsed: null, activeMonMoveset: moveset, reopenedFromClose: false });
    expect(turn2SubmenuBounceTick(2901)).toBe(2064);
    expect(menuIdleBounce(turn2SubmenuBounceTick(2901)).onixY2).toBe(1); // FIXED: y1 state (0 or 1), matches RAM
    // The bug this closes: the naive "plain t" formula (correct for turn 1's
    // very first open, `battleScene.ts`'s own doc) computes the wrong state
    // here specifically because t=2901 happens to land on the sine table's
    // rare peak (`table[64]`, ISSUES #22/#19's own "1-in-256" state) under
    // the UNRESET absolute-t phase - a false state that RAM disproves.
    expect(menuIdleBounce(2901).onixY2).toBe(2); // what plain `t` (the old/wrong formula) would give
  });

  it("ticks 2902-2905 (rest of the same open-DMA-wait hold): plain `t` and turn2SubmenuBounceTick agree here - the fix is scoped to the one tick RAM actually disproves, not a blanket shift", () => {
    for (const t of [2902, 2903, 2904, 2905]) {
      expect(menuIdleBounce(turn2SubmenuBounceTick(t)).onixY2).toBe(menuIdleBounce(t).onixY2);
    }
  });

  it("tick 2135 (battle1-fight-submenu-idle.json, ISSUES #22): turn 1's OWN first-ever open (never resettled, turn1Resolved=false) - untouched by this fix, still the plain `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` anchor, landing onixY2=2 (RAM: real pixels match the y2 patch)", () => {
    const sm = openFightSubmenu(847, moveset);
    expect(sm.cursor).toBe(0);
    expect(menuIdleBounce(2135 - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT).onixY2).toBe(2);
  });

  it("ticks 3465/3721 (turn2-dragonbreath.json): turn 2's OWN confirm (pressTick 2945, DRAGON_BREATH) has long since redrawn the resettled turn-3 menu by these ticks - `dragonBreathResettledBounceTick`'s own anchor (battleScene.ts, unchanged by this fix) already lands the rare sine peak correctly, matching RAM", () => {
    const sm = confirmFightMove(openFightSubmenu(1861, moveset, 2), 1905);
    expect(sm).toEqual({ openElapsed: 1861, cursor: 2, displayCursor: 2, closeElapsed: null, confirmElapsed: 1905, activeMonMoveset: moveset, reopenedFromClose: false });
    // dragonBreathResettledBounceTick(t, pressTick=2945) = t - (2945+391) + (MENU_IDLE_BLANK_END_TICK+1)
    const dragonBreathResettledBounceTick = (t: number): number => t - (2945 + 391) + (MENU_IDLE_BLANK_END_TICK + 1);
    expect(dragonBreathResettledBounceTick(3465)).toBe(1877); // the same rare-peak tick already pinned in battleMenuIdle.test.ts
    expect(dragonBreathResettledBounceTick(3721)).toBe(2133);
    expect(menuIdleBounce(dragonBreathResettledBounceTick(3465)).onixY2).toBe(2);
    expect(menuIdleBounce(dragonBreathResettledBounceTick(3721)).onixY2).toBe(2);
  });
});
