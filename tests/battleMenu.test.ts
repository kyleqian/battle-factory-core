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
  turn2KickoffBounceTick,
  turn2SubmenuBounceTickFromPresentationEpochAge,
  menuIdleBounce,
  FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
  turn6StatFallEva,
  turn6StatFallBg1Y,
  TURN6_STATFALL_TARGET_BLEND,
  TURN6_STATFALL_BG1_X,
  turn6AtkFellTextStartTick,
  turn6AtkFellTextVisibleChars,
  TURN6_ATKFELL_LINE1,
  TURN6_ATKFELL_LINE2,
  TURN6_ATKFELL_TEXT_TOTAL,
  TURN6_ROCKSLIDE_PRESS_TICK,
  TURN6_SUPER_EFFECTIVE_LINE,
  turn6SuperEffectiveTextStartTick,
  turn6SuperEffectiveTextVisibleChars,
  TURN6_ROCKSLIDE_TEXT_CLEAR_DELAY,
  TURN6_ROCKSLIDE_MENU_REDRAW_DELAY,
  turn6RockSlideResettledBounceTick,
  TURN6_ROCKSLIDE_REOPEN_GATE_DELAY,
  TURN7_ROCKSLIDE_PRESS_TICK,
  TURN7_SUPER_EFFECTIVE_TEXT_DELAY,
  turn7SuperEffectiveTextStartTick,
  turn7SuperEffectiveTextVisibleChars,
  TURN7_ROCKSLIDE_TEXT_CLEAR_DELAY,
  TURN7_ROCKSLIDE_MENU_REDRAW_DELAY,
  turn7RockSlideResettledBounceTick,
  TURN7_ROCKSLIDE_REOPEN_GATE_DELAY,
  currentPPForActiveMon,
  currentPPForActiveMonFromLatest,
  rockSlideTextStartTick,
  moveFightCursor,
} from "../src/engine/battleMenu.ts";
import {
  isTurn1NextCommandHandoffReady,
  resolveTurn1CompletedResolutionNextCommandHandoff,
  turn1PresentationEpochElapsedSinceReset,
} from "../src/engine/turn1ResolutionAdapter.ts";
import { resolveTurn2CompletedResolutionNextCommandHandoff } from "../src/engine/turn2ResolutionAdapter.ts";
import { resolveTurn3CompletedResolutionNextCommandHandoff } from "../src/engine/turn3ResolutionAdapter.ts";
import { resolveTurn4CompletedResolutionNextCommandHandoff } from "../src/engine/turn4ResolutionAdapter.ts";
import { resolveTurn5CompletedResolutionNextCommandHandoff, resolveTurn5LatestCompletedCommandHandoff } from "../src/engine/turn5ResolutionAdapter.ts";
import { resolveTurn6CompletedResolutionNextCommandHandoff, resolveTurn6LatestCompletedCommandHandoff } from "../src/engine/turn6ResolutionAdapter.ts";
import { resolveTurn7CompletedResolutionNextCommandHandoff, resolveTurn7LatestCompletedCommandHandoff } from "../src/engine/turn7ResolutionAdapter.ts";
import { resolveTurn8CompletedResolutionNextCommandHandoff, resolveTurn8LatestCompletedCommandHandoff } from "../src/engine/turn8ResolutionAdapter.ts";
import { resolveTurn9CompletedResolutionNextCommandHandoff, resolveTurn9LatestCompletedCommandHandoff } from "../src/engine/turn9ResolutionAdapter.ts";
import { resolveTurn10CompletedResolutionNextCommandHandoff, resolveTurn10LatestCompletedCommandHandoff } from "../src/engine/turn10ResolutionAdapter.ts";
import { resolveTurn11CompletedResolutionNextCommandHandoff, resolveTurn11LatestCompletedCommandHandoff } from "../src/engine/turn11ResolutionAdapter.ts";
import { resolveTurn12CompletedResolutionNextCommandHandoff, resolveTurn12LatestCompletedCommandHandoff } from "../src/engine/turn12ResolutionAdapter.ts";
import {
  renderBattleScene,
  TICK0,
  TURN8_BIND_LINE1,
  TURN8_BIND_LINE2,
  TURN8_BIND_TEXT_TOTAL,
  TURN8_BIND_TEXT_DELAY,
  turn8BindTextStartTick,
  turn8BindTextVisibleChars,
  TURN8_MISS_LINE1,
  TURN8_MISS_LINE2,
  TURN8_MISS_TEXT_TOTAL,
  TURN8_MISS_TEXT_DELAY,
  turn8MissTextStartTick,
  turn8MissTextVisibleChars,
  TURN8_TEXT_CLEAR_DELAY,
  TURN8_MENU_REDRAW_DELAY,
  turn8ResettledBounceTick,
  TURN8_BIND_PRESS_TICK,
  TURN9_QUICKATTACK_LINE1,
  TURN9_QUICKATTACK_LINE2,
  TURN9_QUICKATTACK_TEXT_TOTAL,
  TURN9_QUICKATTACK_TEXT_DELAY,
  turn9QuickAttackTextStartTick,
  turn9QuickAttackTextVisibleChars,
  TURN9_QUICKATTACK_PRESS_TICK,
  TURN9_MENU_REDRAW_DELAY,
  turn9ResettledBounceTick,
  TURN10_AERIALACE_LINE1,
  TURN10_AERIALACE_LINE2,
  TURN10_AERIALACE_TEXT_TOTAL,
  TURN10_AERIALACE_TEXT_DELAY,
  turn10AerialAceTextStartTick,
  turn10AerialAceTextVisibleChars,
} from "../src/engine/battleScene.ts";

const TURN1_HANDOFF = resolveTurn1CompletedResolutionNextCommandHandoff(1308);
const TURN2_HANDOFF = resolveTurn2CompletedResolutionNextCommandHandoff(2197);
const TURN3_HANDOFF = resolveTurn3CompletedResolutionNextCommandHandoff(3172);
const TURN4_HANDOFF = resolveTurn4CompletedResolutionNextCommandHandoff(4312);

/** Same rig as tests/battleScene.test.ts's `pixelAtSentOut` - send-out A-press already registered at trace tick 1420 (sendOutPressElapsed=380), the fixed script every committed trace in this window shares. */
function pixelAtSentOut(t: number, x: number, y: number): [number, number, number] {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1NextCommandHandoff: null, turn3NextCommandHandoff: null, turn4NextCommandHandoff: null, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8NextCommandHandoff: null, turn9NextCommandHandoff: null, turn10NextCommandHandoff: null, turn11NextCommandHandoff: null, turn12NextCommandHandoff: null, latestCompletedCommandHandoff: null, opponentFaintPresentationOwner: null, turn13NextCommandHandoff: null });
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
    renderBattleScene(fb1, { elapsed: 1565 - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1NextCommandHandoff: null, turn3NextCommandHandoff: null, turn4NextCommandHandoff: null, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8NextCommandHandoff: null, turn9NextCommandHandoff: null, turn10NextCommandHandoff: null, turn11NextCommandHandoff: null, turn12NextCommandHandoff: null, latestCompletedCommandHandoff: null, opponentFaintPresentationOwner: null, turn13NextCommandHandoff: null });
    renderBattleScene(fb2, { elapsed: 1566 - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1NextCommandHandoff: null, turn3NextCommandHandoff: null, turn4NextCommandHandoff: null, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8NextCommandHandoff: null, turn9NextCommandHandoff: null, turn10NextCommandHandoff: null, turn11NextCommandHandoff: null, turn12NextCommandHandoff: null, latestCompletedCommandHandoff: null, opponentFaintPresentationOwner: null, turn13NextCommandHandoff: null });
    expect(fb2).toEqual(fb1);
  });

  it("renders byte-identical frames once static (1571 -> 1572)", () => {
    const fb1 = new Uint8Array(240 * 160 * 4);
    const fb2 = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fb1, { elapsed: 1571 - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1NextCommandHandoff: null, turn3NextCommandHandoff: null, turn4NextCommandHandoff: null, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8NextCommandHandoff: null, turn9NextCommandHandoff: null, turn10NextCommandHandoff: null, turn11NextCommandHandoff: null, turn12NextCommandHandoff: null, latestCompletedCommandHandoff: null, opponentFaintPresentationOwner: null, turn13NextCommandHandoff: null });
    renderBattleScene(fb2, { elapsed: 1572 - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1NextCommandHandoff: null, turn3NextCommandHandoff: null, turn4NextCommandHandoff: null, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8NextCommandHandoff: null, turn9NextCommandHandoff: null, turn10NextCommandHandoff: null, turn11NextCommandHandoff: null, turn12NextCommandHandoff: null, latestCompletedCommandHandoff: null, opponentFaintPresentationOwner: null, turn13NextCommandHandoff: null });
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
    expect(statsBannerBg1Y(2130, pressTick, STATS_BANNER_BG1_Y_ANCHOR_DELAY)).toBe(0); // RAM tick 2129 (still 0)
    expect(statsBannerBg1Y(2131, pressTick, STATS_BANNER_BG1_Y_ANCHOR_DELAY)).toBe(3); // RAM tick 2130 (first +3)
    expect(statsBannerBg1Y(2132, pressTick, STATS_BANNER_BG1_Y_ANCHOR_DELAY)).toBe(6); // RAM tick 2131
    expect(statsBannerBg1Y(2140, pressTick, STATS_BANNER_BG1_Y_ANCHOR_DELAY)).toBe(30); // RAM tick 2139
    expect(statsBannerBg1Y(2150, pressTick, STATS_BANNER_BG1_Y_ANCHOR_DELAY)).toBe(60); // RAM tick 2149
    expect(statsBannerBg1Y(2160, pressTick, STATS_BANNER_BG1_Y_ANCHOR_DELAY)).toBe(90); // RAM tick 2159
    expect(statsBannerBg1Y(2190, pressTick, STATS_BANNER_BG1_Y_ANCHOR_DELAY)).toBe(180); // holds at the ramp's own max past teardown
  });
});

describe("battleMenu: turn 6's stat-fall banner (docs/turn6-notes.md §6, battle-turn-notes.md §29's 'OTHER thing found' - S7 slice N-4 rung (a)) - the SAME StatsChangeAnimation banner as above, parameterized for FEATHER_DANCE's ATK-FALL on ONIX (decrease, sharply)", () => {
  const pressTick = 7345; // turn 6's own real FEATHER_DANCE-move-confirm press tick (docs/turn6-notes.md §5)

  it("target blend is 13 (the 'sharply' case, vs. DOUBLE_TEAM's mild-rise 10)", () => {
    expect(TURN6_STATFALL_TARGET_BLEND).toBe(13);
  });

  it("eva: null before the ramp and after full fade-out, then +1/2-ticks up to 13, held, then -1/2-ticks back to 0 - RAM-exact against a fresh BLDALPHA register probe (ticks 7555-7700)", () => {
    expect(turn6StatFallEva(pressTick + 228, pressTick)).toBeNull(); // RAM 7573, still BLDALPHA_BLEND(0,16)
    expect(turn6StatFallEva(pressTick + 229, pressTick)).toBe(1); // RAM 7574, first nonzero eva
    expect(turn6StatFallEva(pressTick + 230, pressTick)).toBe(1); // RAM 7575, same eva (every-2-tick cadence)
    expect(turn6StatFallEva(pressTick + 253, pressTick)).toBe(13); // RAM 7598, target reached
    expect(turn6StatFallEva(pressTick + 284, pressTick)).toBe(13); // RAM 7629, last held tick
    expect(turn6StatFallEva(pressTick + 285, pressTick)).toBe(12); // RAM 7630, first post-hold tick
    expect(turn6StatFallEva(pressTick + 308, pressTick)).toBe(1); // RAM 7653
    expect(turn6StatFallEva(pressTick + 309, pressTick)).toBe(0); // RAM 7654, back to 0
    expect(turn6StatFallEva(pressTick + 310, pressTick)).toBeNull(); // RAM 7655, outside the active window
  });

  it("bg1Y: -3/tick continuous scroll (a DECREASE's own tVelocity, vs. the increase case's +3), one-tick render lag matching statsBannerBg1Y's own convention, clamped at its own teardown value", () => {
    expect(turn6StatFallBg1Y(pressTick + 227, pressTick)).toBe(0); // RAM tick 7571 (t-1), still 0
    expect(turn6StatFallBg1Y(pressTick + 228, pressTick)).toBe(-3); // RAM tick 7572 (t-1)
    expect(turn6StatFallBg1Y(pressTick + 254, pressTick)).toBe(-81); // RAM tick 7598 (t-1)
    expect(turn6StatFallBg1Y(pressTick + 309, pressTick)).toBe(-246); // RAM tick 7653 (t-1)
    expect(turn6StatFallBg1Y(pressTick + 310, pressTick)).toBe(-246); // RAM tick 7654 (t-1), holds at the ramp's own max
  });

  it("bg1X is a flat constant 64 for the whole decrease window (RAM-confirmed, never itself scrolling)", () => {
    expect(TURN6_STATFALL_BG1_X).toBe(64);
  });
});

describe("battleMenu: turn 6's ATK-fall flavor text (docs/turn6-notes.md §5, corrected by turn7-notes.md §5 - S7 slice N-4 rung (a)) - 'ONIX’s ATTACK\\nharshly fell!', the SAME 1-tick/char mechanism as every other kickoff message", () => {
  const pressTick = 7345;

  it("text content and total char count", () => {
    expect(TURN6_ATKFELL_LINE1).toBe("ONIX’s ATTACK");
    expect(TURN6_ATKFELL_LINE2).toBe("harshly fell!");
    expect(TURN6_ATKFELL_TEXT_TOTAL).toBe(26);
  });

  it("starts at pressTick+314 (7659, pixel-confirmed: the held FEATHERDANCE kickoff sha stays flat through 7658, first changing tick is 7659 already showing 1 glyph) and settles on the last glyph's own tick (7684)", () => {
    expect(turn6AtkFellTextStartTick(pressTick)).toBe(7659);
    expect(turn6AtkFellTextVisibleChars(7658, pressTick)).toBe(0);
    expect(turn6AtkFellTextVisibleChars(7659, pressTick)).toBe(1);
    expect(turn6AtkFellTextVisibleChars(7660, pressTick)).toBe(2);
    expect(turn6AtkFellTextVisibleChars(7684, pressTick)).toBe(26);
    expect(turn6AtkFellTextVisibleChars(7700, pressTick)).toBe(26); // clamped, holds past settle
  });
});

describe("battleMenu: turn 6's own ROCK_SLIDE (Onix vs. Pidgeotto, docs/battle-turn-notes.md §31 - S7 slice N-4 rung (b)) - a pure parameterization of the existing ROCK_SLIDE mechanisms plus the turn's own new 'It's super effective!' message, both pinned against a fresh dense oracle capture (0 diff, `turn6-rockslide-{a,b}.json`)", () => {
  it("TURN6_ROCKSLIDE_PRESS_TICK is the synthetic anchor landing rockSlideTextStartTick on 7765 (fresh capture: first tick of the kickoff-text transition)", () => {
    expect(rockSlideTextStartTick(TURN6_ROCKSLIDE_PRESS_TICK)).toBe(7765);
  });

  it("'It's super effective!' text content, single line (line 2 blank), 21 chars", () => {
    expect(TURN6_SUPER_EFFECTIVE_LINE).toBe("It’s super effective!");
    expect(TURN6_SUPER_EFFECTIVE_LINE.length).toBe(21);
  });

  it("super-effective text starts at pressTick+646 (8018, fresh capture's own first tick of the swap from the held ROCK_SLIDE kickoff text) and settles on the last glyph's own tick (8038)", () => {
    const pressTick = TURN6_ROCKSLIDE_PRESS_TICK;
    expect(turn6SuperEffectiveTextStartTick(pressTick)).toBe(8018);
    expect(turn6SuperEffectiveTextVisibleChars(8017, pressTick)).toBe(0);
    expect(turn6SuperEffectiveTextVisibleChars(8018, pressTick)).toBe(1);
    expect(turn6SuperEffectiveTextVisibleChars(8019, pressTick)).toBe(2);
    expect(turn6SuperEffectiveTextVisibleChars(8038, pressTick)).toBe(21);
    expect(turn6SuperEffectiveTextVisibleChars(8060, pressTick)).toBe(21); // clamped, holds past settle
  });

  it("text-clear (743 -> 8115) then hard-cut to the resettled menu (750 -> 8122), the same 7-tick clear-to-redraw gap ROCK_SLIDE_TEXT_CLEAR_DELAY->ROCK_SLIDE_MENU_REDRAW_DELAY established for turn 1, freshly fit this turn", () => {
    expect(TURN6_ROCKSLIDE_PRESS_TICK + TURN6_ROCKSLIDE_TEXT_CLEAR_DELAY).toBe(8115);
    expect(TURN6_ROCKSLIDE_PRESS_TICK + TURN6_ROCKSLIDE_MENU_REDRAW_DELAY).toBe(8122);
    expect(TURN6_ROCKSLIDE_MENU_REDRAW_DELAY - TURN6_ROCKSLIDE_TEXT_CLEAR_DELAY).toBe(7);
  });

  it("turn6RockSlideResettledBounceTick re-initializes the bounce cycle fresh at the redraw tick, same shape as rockSlideResettledBounceTick/turn3RockSlideResettledBounceTick", () => {
    const pressTick = TURN6_ROCKSLIDE_PRESS_TICK;
    const redrawTick = pressTick + TURN6_ROCKSLIDE_MENU_REDRAW_DELAY;
    expect(turn6RockSlideResettledBounceTick(redrawTick, pressTick)).toBe(MENU_IDLE_BLANK_END_TICK + 1);
    expect(turn6RockSlideResettledBounceTick(redrawTick + 5, pressTick)).toBe(MENU_IDLE_BLANK_END_TICK + 6);
  });

  it("rockSlideOpponentHp reused UNCHANGED for Pidgeotto's own 156-max-HP bar (156->113, docs/turn6-notes.md §4): value-agnostic, no new HP-drain formula needed", () => {
    const pressTick = TURN6_ROCKSLIDE_PRESS_TICK;
    const drainStart = pressTick + ROCK_SLIDE_HP_DRAIN_START_DELAY;
    expect(rockSlideOpponentHp(drainStart, pressTick, 156, 113)).toBe(156); // d=0, still full
    expect(rockSlideOpponentHp(drainStart + 1, pressTick, 156, 113)).toBe(155); // d=1, fresh capture's own first drain-visible tick
    expect(rockSlideOpponentHp(drainStart + 43, pressTick, 156, 113)).toBe(113); // d=43, settled (matches the fresh capture's own settle tick 8012)
    expect(rockSlideOpponentHp(drainStart + 60, pressTick, 156, 113)).toBe(113); // clamped, holds past settle
  });
});

describe("battleMenu: S7 slice O - turn 7's own FEATHER_DANCE/ROCK_SLIDE (Onix vs. Pidgeotto again, docs/turn7-notes.md, docs/battle-turn-notes.md §32) - a pure parameterization of turn 6's own N-4 rungs, every constant oracle-confirmed against a fresh dense sweep (captureFrames 8346-9380, 0 diff on turn7-menu.json/turn7-rockslide-{a,b,c,d}.json)", () => {
  it("TURN6_ROCKSLIDE_REOPEN_GATE_DELAY opens the turn-6-to-7 reopen gate at the settled turn-6 menu's own redraw tick (8122 = TURN6_ROCKSLIDE_PRESS_TICK+750), safely before the real reopen press (8346)", () => {
    expect(TURN6_ROCKSLIDE_PRESS_TICK + TURN6_ROCKSLIDE_MENU_REDRAW_DELAY - TURN6_ROCKSLIDE_REOPEN_GATE_DELAY).toBe(7345); // turn 6's own real confirm tick
  });

  it("TURN7_ROCKSLIDE_PRESS_TICK is the synthetic anchor landing rockSlideTextStartTick on 8799 (fresh sweep: first tick of the ROCK_SLIDE kickoff-text transition, settling e8811187b452 - byte-identical to turn 6's own settle sha for this fixed-content text)", () => {
    expect(rockSlideTextStartTick(TURN7_ROCKSLIDE_PRESS_TICK)).toBe(8799);
  });

  it("super-effective text starts at TURN7_ROCKSLIDE_PRESS_TICK+634 (9040, fresh sweep's own first tick of the swap) and settles on the last glyph's own tick (9060, byte-identical to turn7-notes.md §5's own cited sha)", () => {
    const pressTick = TURN7_ROCKSLIDE_PRESS_TICK;
    expect(turn7SuperEffectiveTextStartTick(pressTick)).toBe(9040);
    expect(TURN7_SUPER_EFFECTIVE_TEXT_DELAY).not.toBe(646); // turn-specific, NOT transferable from turn 6's own delay
    expect(turn7SuperEffectiveTextVisibleChars(9039, pressTick)).toBe(0);
    expect(turn7SuperEffectiveTextVisibleChars(9040, pressTick)).toBe(1);
    expect(turn7SuperEffectiveTextVisibleChars(9060, pressTick)).toBe(21);
    expect(turn7SuperEffectiveTextVisibleChars(9080, pressTick)).toBe(21); // clamped, holds past settle
  });

  it("text-clear (731 -> 9137) then hard-cut to the resettled menu (738 -> 9144), the same 7-tick clear-to-redraw gap every prior turn's own ROCK_SLIDE pair establishes, freshly fit this turn", () => {
    expect(TURN7_ROCKSLIDE_PRESS_TICK + TURN7_ROCKSLIDE_TEXT_CLEAR_DELAY).toBe(9137);
    expect(TURN7_ROCKSLIDE_PRESS_TICK + TURN7_ROCKSLIDE_MENU_REDRAW_DELAY).toBe(9144);
    expect(TURN7_ROCKSLIDE_MENU_REDRAW_DELAY - TURN7_ROCKSLIDE_TEXT_CLEAR_DELAY).toBe(7);
  });

  it("turn7RockSlideResettledBounceTick re-initializes the bounce cycle fresh at the redraw tick, same shape as turn6RockSlideResettledBounceTick", () => {
    const pressTick = TURN7_ROCKSLIDE_PRESS_TICK;
    const redrawTick = pressTick + TURN7_ROCKSLIDE_MENU_REDRAW_DELAY;
    expect(turn7RockSlideResettledBounceTick(redrawTick, pressTick)).toBe(MENU_IDLE_BLANK_END_TICK + 1);
    expect(turn7RockSlideResettledBounceTick(redrawTick + 5, pressTick)).toBe(MENU_IDLE_BLANK_END_TICK + 6);
  });

  it("rockSlideOpponentHp reused UNCHANGED for Pidgeotto's own post-turn-6 HP (113->82, turn7-notes.md §4): value-agnostic, no new HP-drain formula needed", () => {
    const pressTick = TURN7_ROCKSLIDE_PRESS_TICK;
    const drainStart = pressTick + ROCK_SLIDE_HP_DRAIN_START_DELAY;
    expect(rockSlideOpponentHp(drainStart, pressTick, 113, 82)).toBe(113); // d=0, still at turn-6's-end HP
    expect(rockSlideOpponentHp(drainStart + 1, pressTick, 113, 82)).toBe(112); // d=1
    expect(rockSlideOpponentHp(drainStart + 31, pressTick, 113, 82)).toBe(82); // d=31, settled
    expect(rockSlideOpponentHp(drainStart + 60, pressTick, 113, 82)).toBe(82); // clamped, holds past settle
  });

  it("currentPPForActiveMon: ROCK_SLIDE (slot 0) reads 5/10 from the completed turn-6 handoff, matching turn7-notes.md's own PP ledger", () => {
    const moveset = { moveIds: [157, 349, 288, 201], maxPP: [10, 15, 20, 10] } as const;
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff())).toEqual([5, 15, 19, 10]);
  });

  it("S7 slice P: TURN7_ROCKSLIDE_REOPEN_GATE_DELAY opens the turn-7-to-8 reopen gate at the settled turn-7 menu's own redraw tick (9144 = TURN7_ROCKSLIDE_PRESS_TICK+738), safely before the real reopen press (9381)", () => {
    expect(TURN7_ROCKSLIDE_PRESS_TICK + TURN7_ROCKSLIDE_MENU_REDRAW_DELAY - TURN7_ROCKSLIDE_REOPEN_GATE_DELAY).toBe(8379); // turn 7's own real confirm tick
  });

  it("completed turn-7 handoff supplies 4/10 (uses 1, 3, 4, 5, 6, and 7) while BIND remains fresh", () => {
    const moveset = { moveIds: [157, 20, 288, 201], maxPP: [10, 20, 20, 10] } as const;
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), resolveTurn7CompletedResolutionNextCommandHandoff())).toEqual([4, 20, 19, 10]);
    // Sanity: the completed turn-6 receipt alone (pre-turn-8) still reads 5/10.
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), null)[0]).toBe(5);
  });

  it("S7 slice P: moveFightCursor's existing cursor^1 grid arithmetic moves RIGHT from ROCK_SLIDE (0) onto BIND (1) - the winning line's own divergence turn, no new nav code needed", () => {
    expect(moveFightCursor(0, "RIGHT")).toBe(1);
    expect(moveFightCursor(1, "LEFT")).toBe(0);
  });

  it("completed turn-8 handoff reads BIND 19/20 (a miss still decrements PP) - matches turn9-notes.md §4's own 'BIND(20) 19/20 (unchanged)' ledger; ROCK_SLIDE (slot 0) stays frozen at 4/10, independent of this slot-1 receipt", () => {
    const moveset = { moveIds: [157, 20, 288, 201], maxPP: [10, 20, 20, 10] } as const;
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), resolveTurn7CompletedResolutionNextCommandHandoff(), resolveTurn8CompletedResolutionNextCommandHandoff())).toEqual([4, 19, 19, 10]);
    // Sanity: the completed turn-7 receipt alone (pre-turn-9) keeps BIND at full 20/20.
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), resolveTurn7CompletedResolutionNextCommandHandoff(), null)[1]).toBe(20);
  });

  it("S7 slice R: TURN8_MENU_REDRAW_DELAY doubles as the turn-8-to-9 reopen gate delay (directly usable, same 'no synthetic anchor needed' reason TURN4_ROCKSLIDE_MENU_REDRAW_DELAY already established) - opens at turn 8's own real redraw tick (9997 = TURN8_BIND_PRESS_TICK+572)", () => {
    expect(TURN8_BIND_PRESS_TICK + TURN8_MENU_REDRAW_DELAY).toBe(9997);
  });

  it("S7 slice R: 'Foe PIDGEOTTO used\\nQUICK ATTACK!' (TURN9_QUICKATTACK_LINE1/2) starts at pressTick+11 and settles on the last glyph's own tick", () => {
    const pressTick = 10871;
    expect(TURN9_QUICKATTACK_TEXT_DELAY).toBe(11);
    expect(turn9QuickAttackTextStartTick(pressTick)).toBe(10882);
    expect(turn9QuickAttackTextVisibleChars(10881, pressTick)).toBe(0);
    expect(turn9QuickAttackTextVisibleChars(10882, pressTick)).toBe(1);
    expect(turn9QuickAttackTextVisibleChars(10886, pressTick)).toBe(5); // "Foe P", PNG-confirmed (docs/turn9-notes.md §5)
    expect(turn9QuickAttackTextVisibleChars(10898, pressTick)).toBe(17); // "Foe PIDGEOTTO use", PNG-confirmed
    const total = TURN9_QUICKATTACK_LINE1.length + TURN9_QUICKATTACK_LINE2.length;
    expect(total).toBe(TURN9_QUICKATTACK_TEXT_TOTAL);
    expect(turn9QuickAttackTextVisibleChars(pressTick + 11 + total, pressTick)).toBe(total);
    expect(turn9QuickAttackTextVisibleChars(pressTick + 11 + total + 5, pressTick)).toBe(total); // clamped, settled
  });

  it("S7 slice P: BIND's own kickoff text ('ONIX used\\nBIND!', 14 chars) starts at pressTick+421 (9846, docs/turn8-notes.md §5) and settles on the last glyph's own tick", () => {
    const pressTick = 9425; // this turn's own real confirm tick (A held 9424-9425)
    expect(TURN8_BIND_LINE1).toBe("ONIX used");
    expect(TURN8_BIND_LINE2).toBe("BIND!");
    expect(TURN8_BIND_TEXT_TOTAL).toBe(14);
    expect(TURN8_BIND_TEXT_DELAY).toBe(421);
    expect(turn8BindTextStartTick(pressTick)).toBe(9846);
    expect(turn8BindTextVisibleChars(9845, pressTick)).toBe(0);
    expect(turn8BindTextVisibleChars(9846, pressTick)).toBe(1);
    expect(turn8BindTextVisibleChars(9859, pressTick)).toBe(14); // settled, matches docs/turn8-notes.md §5's own "holds 9859-9895"
    expect(turn8BindTextVisibleChars(9895, pressTick)).toBe(14); // clamped, holds past settle
  });

  it("S7 slice P: the miss message ('ONIX’s\\nattack missed!', 20 chars, matches sText_AttackMissed exactly) starts at pressTick+471 (9896) and settles at 9915 - the FIRST miss this engine ever renders, no move animation plays", () => {
    const pressTick = 9425;
    expect(TURN8_MISS_LINE1).toBe("ONIX’s");
    expect(TURN8_MISS_LINE2).toBe("attack missed!");
    expect(TURN8_MISS_TEXT_TOTAL).toBe(20);
    expect(TURN8_MISS_TEXT_DELAY).toBe(471);
    expect(turn8MissTextStartTick(pressTick)).toBe(9896);
    expect(turn8MissTextVisibleChars(9895, pressTick)).toBe(0);
    expect(turn8MissTextVisibleChars(9896, pressTick)).toBe(1);
    expect(turn8MissTextVisibleChars(9915, pressTick)).toBe(20); // settled, matches docs/turn8-notes.md §5's own "holds 9915-9990"
    expect(turn8MissTextVisibleChars(9990, pressTick)).toBe(20); // clamped, holds past settle
  });

  it("S7 slice P: turn-end - the held miss text clears at pressTick+566 (9991) then hard-cuts to the resettled menu at pressTick+572 (9997), a 6-tick gap (one shorter than every prior turn's own 7-tick gap, freshly fit not assumed transferable)", () => {
    const pressTick = 9425;
    expect(pressTick + TURN8_TEXT_CLEAR_DELAY).toBe(9991);
    expect(pressTick + TURN8_MENU_REDRAW_DELAY).toBe(9997);
    expect(TURN8_MENU_REDRAW_DELAY - TURN8_TEXT_CLEAR_DELAY).toBe(6);
  });

  it("turn8ResettledBounceTick re-initializes the bounce cycle fresh at the redraw tick, same shape as turn7RockSlideResettledBounceTick", () => {
    const pressTick = 9425;
    const redrawTick = pressTick + TURN8_MENU_REDRAW_DELAY;
    expect(turn8ResettledBounceTick(redrawTick, pressTick)).toBe(MENU_IDLE_BLANK_END_TICK + 1);
    expect(turn8ResettledBounceTick(redrawTick + 5, pressTick)).toBe(MENU_IDLE_BLANK_END_TICK + 6);
  });

  it("S7 slice R rung (a): currentPPForActiveMon reads ROCK_SLIDE 3/10 once the completed turn-9 handoff is present (turn 9's own confirmed ROCK_SLIDE is a 7th slot-0 use) - matches turn10-notes.md §4's own 'ROCK_SLIDE(157) 3/10' ledger; BIND (slot 1) stays frozen at 19/20, independent of this new slot-0 decrement", () => {
    const moveset = { moveIds: [157, 20, 288, 201], maxPP: [10, 20, 20, 10] } as const;
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), resolveTurn7CompletedResolutionNextCommandHandoff(), resolveTurn8CompletedResolutionNextCommandHandoff(), resolveTurn9CompletedResolutionNextCommandHandoff())).toEqual([3, 19, 19, 10]);
    // Sanity: the completed turn-8 receipt alone (pre-turn-10) still reads ROCK_SLIDE at 4/10.
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), resolveTurn7CompletedResolutionNextCommandHandoff(), resolveTurn8CompletedResolutionNextCommandHandoff(), null)[0]).toBe(4);
  });

  it("S7 slice R rung 1: currentPPForActiveMon reads ROCK_SLIDE 2/10 once the completed turn-10 handoff is present (turn 10's own confirmed ROCK_SLIDE is an 8th slot-0 use) - matches turn11-notes.md §4's own 'ROCK_SLIDE(157) 2/10' ledger; BIND (slot 1) stays frozen at 19/20, independent of this new slot-0 decrement", () => {
    const moveset = { moveIds: [157, 20, 288, 201], maxPP: [10, 20, 20, 10] } as const;
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), resolveTurn7CompletedResolutionNextCommandHandoff(), resolveTurn8CompletedResolutionNextCommandHandoff(), resolveTurn9CompletedResolutionNextCommandHandoff(), resolveTurn10CompletedResolutionNextCommandHandoff())).toEqual([2, 19, 19, 10]);
    // Sanity: the completed turn-9 handoff alone (pre-turn-11) still reads ROCK_SLIDE at 3/10.
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), resolveTurn7CompletedResolutionNextCommandHandoff(), resolveTurn8CompletedResolutionNextCommandHandoff(), resolveTurn9CompletedResolutionNextCommandHandoff())[0]).toBe(3);
  });

  it("S7/S8: currentPPForActiveMon reads ROCK_SLIDE 1/10 once the completed turn-11 handoff is present (turn 11's own confirmed ROCK_SLIDE is a 9th slot-0 use) - matches turn12-notes.md §4's own 'ROCK_SLIDE(157) 1/10' entering-turn-12 ledger; BIND (slot 1) stays frozen at 19/20, independent of this new slot-0 decrement", () => {
    const moveset = { moveIds: [157, 20, 288, 201], maxPP: [10, 20, 20, 10] } as const;
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), resolveTurn7CompletedResolutionNextCommandHandoff(), resolveTurn8CompletedResolutionNextCommandHandoff(), resolveTurn9CompletedResolutionNextCommandHandoff(), resolveTurn10CompletedResolutionNextCommandHandoff(), resolveTurn11CompletedResolutionNextCommandHandoff())).toEqual([1, 19, 19, 10]);
    // Sanity: the completed turn-10 handoff alone (pre-turn-12) still reads ROCK_SLIDE at 2/10.
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), resolveTurn7CompletedResolutionNextCommandHandoff(), resolveTurn8CompletedResolutionNextCommandHandoff(), resolveTurn9CompletedResolutionNextCommandHandoff(), resolveTurn10CompletedResolutionNextCommandHandoff(), null)[0]).toBe(2);
  });

  it("S7/S8: currentPPForActiveMon reads ROCK_SLIDE 0/10 (exhausted) once the completed turn-12 handoff is present (turn 12's own confirmed ROCK_SLIDE miss is a 10th slot-0 use) - matches turn13-notes.md §3's own 'ROCK_SLIDE 0/10 (exhausted, confirmed)' entering-turn-13 ledger; BIND (slot 1, 19/20) and DRAGON_BREATH (slot 2, 19/20) stay at their own already-used PP, independent of this new slot-0 receipt", () => {
    const moveset = { moveIds: [157, 20, 225, 201], maxPP: [10, 20, 20, 10] } as const;
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), resolveTurn7CompletedResolutionNextCommandHandoff(), resolveTurn8CompletedResolutionNextCommandHandoff(), resolveTurn9CompletedResolutionNextCommandHandoff(), resolveTurn10CompletedResolutionNextCommandHandoff(), resolveTurn11CompletedResolutionNextCommandHandoff(), resolveTurn12CompletedResolutionNextCommandHandoff())).toEqual([0, 19, 19, 10]);
    // Sanity: the completed turn-11 handoff alone (pre-turn-13) still reads ROCK_SLIDE at 1/10.
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, resolveTurn5CompletedResolutionNextCommandHandoff(), resolveTurn6CompletedResolutionNextCommandHandoff(), resolveTurn7CompletedResolutionNextCommandHandoff(), resolveTurn8CompletedResolutionNextCommandHandoff(), resolveTurn9CompletedResolutionNextCommandHandoff(), resolveTurn10CompletedResolutionNextCommandHandoff(), resolveTurn11CompletedResolutionNextCommandHandoff(), null)[0]).toBe(1);
  });

  it("dispatcher slice 2: generic latest PP is identical to the legacy reconstruction at every turn 5-12 fixture", () => {
    const moveset = { moveIds: [157, 20, 225, 201], maxPP: [10, 20, 20, 10] } as const;
    const turn5 = resolveTurn5CompletedResolutionNextCommandHandoff();
    const turn6 = resolveTurn6CompletedResolutionNextCommandHandoff();
    const turn7 = resolveTurn7CompletedResolutionNextCommandHandoff();
    const turn8 = resolveTurn8CompletedResolutionNextCommandHandoff();
    const turn9 = resolveTurn9CompletedResolutionNextCommandHandoff();
    const turn10 = resolveTurn10CompletedResolutionNextCommandHandoff();
    const turn11 = resolveTurn11CompletedResolutionNextCommandHandoff();
    const turn12 = resolveTurn12CompletedResolutionNextCommandHandoff();
    const legacy = [
      currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, turn5),
      currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, turn5, turn6),
      currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, turn5, turn6, turn7),
      currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, turn5, turn6, turn7, turn8),
      currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, turn5, turn6, turn7, turn8, turn9),
      currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, turn5, turn6, turn7, turn8, turn9, turn10),
      currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, turn5, turn6, turn7, turn8, turn9, turn10, turn11),
      currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, turn5, turn6, turn7, turn8, turn9, turn10, turn11, turn12),
    ];
    const generic = [
      resolveTurn5LatestCompletedCommandHandoff(),
      resolveTurn6LatestCompletedCommandHandoff(),
      resolveTurn7LatestCompletedCommandHandoff(),
      resolveTurn8LatestCompletedCommandHandoff(),
      resolveTurn9LatestCompletedCommandHandoff(),
      resolveTurn10LatestCompletedCommandHandoff(),
      resolveTurn11LatestCompletedCommandHandoff(),
      resolveTurn12LatestCompletedCommandHandoff(),
    ].map((latest) => currentPPForActiveMonFromLatest(moveset, latest));

    expect(generic).toEqual(legacy);
  });

  it("S7/S8 (docs/turn13-notes.md §3): moveFightCursor's own 2x2-grid DOWN press moves ROCK_SLIDE (0, top-left) onto DRAGON_BREATH (2, bottom-left) - the double-decrement the dossier root-caused as a plain row move, no new nav code needed", () => {
    expect(moveFightCursor(0, "DOWN")).toBe(2);
    expect(moveFightCursor(2, "UP")).toBe(0);
  });

  it("ISSUES #39 rank-5 slice 1: TURN9_QUICKATTACK_PRESS_TICK+TURN9_MENU_REDRAW_DELAY is the turn-9-to-10 bounce-reset anchor, re-anchored to Scene OFF (465, oracle-bisected against turn9-rockslide-off.json's own settled turn-10-menu content at render 11336 - see the constant's own doc)", () => {
    expect(TURN9_QUICKATTACK_PRESS_TICK).toBe(10871);
    expect(TURN9_QUICKATTACK_PRESS_TICK + TURN9_MENU_REDRAW_DELAY).toBe(11336);
  });

  it("turn9ResettledBounceTick re-initializes the bounce cycle fresh at the redraw tick, same shape as turn8ResettledBounceTick", () => {
    const pressTick = TURN9_QUICKATTACK_PRESS_TICK;
    const redrawTick = pressTick + TURN9_MENU_REDRAW_DELAY;
    expect(turn9ResettledBounceTick(redrawTick, pressTick)).toBe(MENU_IDLE_BLANK_END_TICK + 1);
    expect(turn9ResettledBounceTick(redrawTick + 5, pressTick)).toBe(MENU_IDLE_BLANK_END_TICK + 6);
  });

  it("S7 slice R rung (a): 'Foe PIDGEOTTO used\\nAERIAL ACE!' (TURN10_AERIALACE_LINE1/2) starts at pressTick+11 and settles on the last glyph's own tick - fit directly against a fresh turn10-menu.json capture (12316 first types, 12344 fully settled)", () => {
    const pressTick = 12305; // this turn's own real confirm tick (A held 12304-12305)
    expect(TURN10_AERIALACE_TEXT_DELAY).toBe(11);
    expect(turn10AerialAceTextStartTick(pressTick)).toBe(12316);
    expect(turn10AerialAceTextVisibleChars(12315, pressTick)).toBe(0);
    expect(turn10AerialAceTextVisibleChars(12316, pressTick)).toBe(1);
    const total = TURN10_AERIALACE_LINE1.length + TURN10_AERIALACE_LINE2.length;
    expect(total).toBe(TURN10_AERIALACE_TEXT_TOTAL);
    expect(turn10AerialAceTextVisibleChars(pressTick + 11 + total - 1, pressTick)).toBe(total); // 12344, PNG-confirmed settled
    expect(turn10AerialAceTextVisibleChars(pressTick + 11 + total + 10, pressTick)).toBe(total); // clamped, holds past settle
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

  it("pins the turn-1 receipt tuple through the turn-2 open, live confirm, and frozen kickoff boundary", () => {
    const handoff = resolveTurn1CompletedResolutionNextCommandHandoff(1308);
    const tuples = [
      { frame: 2901, open: 1861, current: 1861, family: "turn2-submenu", pseudo: 2299, bounce: { onixY2: 0, healthboxY2: 0 } },
      { frame: 2906, open: 1861, current: 1866, family: "turn2-submenu", pseudo: 2304, bounce: { onixY2: 0, healthboxY2: 0 } },
      { frame: 2945, open: 1861, current: 1905, family: "turn2-kickoff-live", pseudo: 2343, bounce: { onixY2: 0, healthboxY2: 0 } },
      { frame: 2947, open: 1861, current: 1907, family: "turn2-kickoff-live", pseudo: 2345, bounce: { onixY2: 1, healthboxY2: 0 } },
      { frame: 2948, open: 1861, current: 1908, family: "turn2-kickoff-frozen", pseudo: 2119, bounce: { onixY2: 0, healthboxY2: 0 } },
    ] as const;

    expect(isTurn1NextCommandHandoffReady(handoff)).toBe(true);
    for (const tuple of tuples) {
      const age = turn1PresentationEpochElapsedSinceReset(handoff, tuple.current);
      const pseudo = tuple.family === "turn2-submenu"
        ? turn2SubmenuBounceTickFromPresentationEpochAge(age)
        : turn2KickoffBounceTick(tuple.current, 1905, age);
      expect({
        ready: isTurn1NextCommandHandoffReady(handoff),
        epoch: handoff.presentationEpoch.elapsed,
        open: tuple.open,
        current: tuple.current,
        family: tuple.family,
        pseudo,
        bounce: menuIdleBounce(pseudo),
      }).toEqual({
        ready: true,
        epoch: 1308,
        open: tuple.open,
        current: tuple.current,
        family: tuple.family,
        pseudo: tuple.pseudo,
        bounce: tuple.bounce,
      });
    }
  });

  it("tick 2901 (turn2-endeavor-off.json): turn 2's OWN reopen just registered THIS tick (openElapsed===elapsed===1861) - the open-DMA-wait hold continues the receipt epoch", () => {
    // Same reachable state `core.ts` produces at trace tick 2901 (openFightSubmenu
    // just fired this tick, cursor still at its post-reopen default 0, no confirm yet).
    const sm = openFightSubmenu(1861, moveset);
    expect(sm).toEqual({ openElapsed: 1861, cursor: 0, displayCursor: 0, closeElapsed: null, confirmElapsed: null, activeMonMoveset: moveset, reopenedFromClose: false });
    const handoff = resolveTurn1CompletedResolutionNextCommandHandoff(1308);
    const pseudo = turn2SubmenuBounceTickFromPresentationEpochAge(
      turn1PresentationEpochElapsedSinceReset(handoff, 1861),
    );
    expect(pseudo).toBe(2299);
    expect(menuIdleBounce(pseudo).onixY2).toBe(0);
  });

  it("ticks 2902-2905 continue the same immutable epoch rather than reopening it", () => {
    const handoff = resolveTurn1CompletedResolutionNextCommandHandoff(1308);
    for (const current of [1862, 1863, 1864, 1865]) {
      expect(turn2SubmenuBounceTickFromPresentationEpochAge(
        turn1PresentationEpochElapsedSinceReset(handoff, current),
      )).toBe(1748 + (current - 1308) - 2);
    }
  });

  it("tick 2135 (battle1-fight-submenu-idle.json, ISSUES #22): turn 1's OWN first-ever open has no completed-turn receipt and stays on the plain anchor", () => {
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
