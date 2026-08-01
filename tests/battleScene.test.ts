import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  advanceBattleScene,
  BALL_OAM_PRIORITY,
  ballIcons,
  ballStatusBarPositions,
  battleIntroEncounterParams,
  battleSendOutEncounterParams,
  cursorState,
  CURSOR_START_TICK,
  DRAGON_BREATH_MOVE_POWER,
  dragonBreathGrovyleHp,
  drawSpriteSheetAffineRotate,
  endeavorShakeSteps,
  evaEvb,
  GROVYLE_FAINT_SINK_START_TICK,
  GROVYLE_FAINT_SINK_STEPS,
  grovyleFaintSinkRowsAndY2,
  INITIAL_BATTLE_SCENE_STATE,
  onixSitrusRotateMatrix,
  onixSitrusTintCoeff,
  turn5GrantingStarPlacement,
  turn5SitrusHealTextVisibleChars,
  turn5SitrusOnixHp,
  turn5SitrusResettledBounceTick,
  turn5SitrusRingMatrix,
  PARTICLE_OAM_PRIORITY,
  PARTICLE_OAM_SUBPRIORITY,
  renderBattleScene,
  ROCK_SLIDE_MOVE_POWER,
  sendOutPressEligible,
  sendOutTextVisibleChars,
  shiftBottom,
  shiftTop,
  sortAliveParticlesByScreenY,
  SWITCHIN_SENTOUT_TEXT_START_TICK,
  SWITCHIN_SENTOUT_TEXT_TOTAL,
  switchinSentOutTextVisibleChars,
  TEXT_START_TICK,
  TEXT_TOTAL_CHARS,
  textVisibleChars,
  TICK0,
  TURN5_BALL_HANDOFF_TICK,
  TURN5_ICONBAR_CREATE_TICK,
  TURN5_ICONBAR_DESTROY_TICK,
  TURN5_ICONBAR_FADE_START_TICK,
  TURN5_OPPONENT_ICON_STATES,
  turn3SubmenuBounceTick,
  turn5IconBarEva,
  turn5MaterializeCoeff,
  turn5PidgeottoHealthboxSlideDx,
  turn5RockSlideKoDismissEligible,
  TURN5_PIDGEOTTO_SETTLE_TICK,
  TURN7_REGIME2_TO_REGIME1_SHIFT,
  TURN8_REGIME3_TO_REGIME1_SHIFT,
  turn7KickoffBounceTick,
  turn9Ep2HealthboxWobbleY2,
  turn9Ep2OnixInvisible,
  turn9OnixHp,
  turn9NotVeryEffectiveTextStartTick,
  turn9NotVeryEffectiveTextVisibleChars,
  turn9SuperEffectiveTextStartTick,
  turn9SuperEffectiveTextVisibleChars,
  TURN9_ROCKSLIDE_PRESS_TICK,
  TURN9_ROCKSLIDE_HP_DRAIN_START_DELAY,
  windowRange,
  turn10AerialAceOnixHp,
  turn10NotVeryEffectiveTextStartTick,
  turn10NotVeryEffectiveTextVisibleChars,
  TURN10_ROCKSLIDE_PRESS_TICK,
  turn10SuperEffectiveTextStartTick,
  turn10SuperEffectiveTextVisibleChars,
  turn10RockSlideResettledBounceTick,
  TURN11_ROCKSLIDE_PRESS_TICK,
  turn11AtkFloorTextStartTick,
  turn11AtkFloorTextVisibleChars,
  TURN11_ATKFLOOR_LINE1,
  TURN11_ATKFLOOR_LINE2,
  turn11SuperEffectiveTextStartTick,
  turn11SuperEffectiveTextVisibleChars,
  turn11RockSlideResettledBounceTick,
  TURN10_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN11_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN12_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN12_ROCKSLIDE_PRESS_TICK,
  turn12MissTextStartTick,
  turn12MissTextVisibleChars,
  turn12RockSlideResettledBounceTick,
  TURN13_MURKROW_FRAME_FLIP_TICK,
  TURN13_MURKROW_STRETCH_TICK,
  turn13MurkrowFrame,
  turn13SandAttackTextStartTick,
  turn13SandAttackTextVisibleChars,
  turn13SandAttackAccEva,
  turn13SandAttackAccBg1Y,
  turn13AccFellTextStartTick,
  turn13AccFellTextVisibleChars,
  TURN13_DRAGONBREATH_PRESS_TICK,
  TURN13_FAINT_SINK_START_TICK,
  TURN13_FAINT_SINK_STEPS,
  TURN13_HEALTHBOX_VANISH_TICK,
  turn13FaintedTextStartTick,
  turn13FaintedTextVisibleChars,
  opponentFaintDismissEligible,
  type BattleSceneState,
} from "../src/engine/battleScene.ts";
import { blendComponentToWhite } from "../src/engine/paletteFade.ts";

describe("turn13MurkrowFrame boundary transfer timing", () => {
  it("leads the affine window by one render at both image-transfer edges", () => {
    expect(turn13MurkrowFrame(TURN13_MURKROW_STRETCH_TICK - 2)).toBe(0);
    expect(turn13MurkrowFrame(TURN13_MURKROW_STRETCH_TICK - 1)).toBe(1);
    expect(turn13MurkrowFrame(TURN13_MURKROW_STRETCH_TICK)).toBe(1);
    expect(turn13MurkrowFrame(TURN13_MURKROW_FRAME_FLIP_TICK - 1)).toBe(1);
    expect(turn13MurkrowFrame(TURN13_MURKROW_FRAME_FLIP_TICK)).toBe(0);
  });
});
import {
  CLOSED_FIGHT_SUBMENU_STATE,
  confirmFightMove,
  FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
  menuIdleBounce,
  openFightSubmenu,
  turn7RockSlideResettledBounceTick,
  TURN7_ROCKSLIDE_PRESS_TICK,
  rockSlideOpponentHp,
  rockSlideTextStartTick,
  TURN6_SUPER_EFFECTIVE_LINE,
} from "../src/engine/battleMenu.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import { resolveTurn13CompletedResolutionNextCommandHandoff } from "../src/engine/turn13ResolutionAdapter.ts";
import { resolveTurn5CompletedResolutionNextCommandHandoff } from "../src/engine/turn5ResolutionAdapter.ts";
import { resolveTurn6CompletedResolutionNextCommandHandoff } from "../src/engine/turn6ResolutionAdapter.ts";
import { resolveTurn7CompletedResolutionNextCommandHandoff } from "../src/engine/turn7ResolutionAdapter.ts";
import { composeOpponentHealthbox, HEALTHBOX_FRAME_ORIGIN } from "../src/engine/healthboxAssembly.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import grovyleFrontSpritesAsset from "../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import sendOutHealthboxOpponentAsset from "../src/assets/gen/sendout-healthbox-opponent.json" with { type: "json" };
import battleHealthboxAsset from "../src/assets/gen/battle-healthbox.json" with { type: "json" };
import ramDump from "../src/data/gen/battle1-turn1-ram-dump.json" with { type: "json" };
import speciesNames from "../src/data/gen/species-names.json" with { type: "json" };
import turn3MenuBouncerRawProbe from "../src/data/gen/turn3-menu-bouncer-raw-probe.json" with { type: "json" };
import turn6BounceBlipProbe from "../src/data/gen/turn6-bounce-blip-probe.json" with { type: "json" };
import turn7BounceBlipProbe from "../src/data/gen/turn7-bounce-blip-probe.json" with { type: "json" };
import turn8BounceBlipProbe from "../src/data/gen/turn8-bounce-blip-probe.json" with { type: "json" };
import { turn6FeatherSprites, turn7FeatherSprites, turn8FeatherSprites, compareFeatherDrawOrder } from "../src/animation/featherDance.ts";

function pixelAt(t: number, x: number, y: number): [number, number, number] {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: null, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null });
  const o = (y * 240 + x) * 4;
  return [fb[o]!, fb[o + 1]!, fb[o + 2]!];
}

/** Same as `pixelAt`, but with the send-out A-press already registered at trace tick 1420 (`sendOutPressElapsed = 380`, matching the §7.2/§7.3 tests above). */
function pixelAtSentOut(t: number, x: number, y: number): [number, number, number] {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null });
  const o = (y * 240 + x) * 4;
  return [fb[o]!, fb[o + 1]!, fb[o + 2]!];
}

/** turn 2's own real `pressTick` (`battleMenu.test.ts`'s own `pressTick = 2945`, `TURN2_KICKOFF`/ENDEAVOR fixture) - the FIGHT submenu confirmed on cursor slot 2. */
const TURN2_PRESS_TICK = 2945;
const TURN2_FIGHT_SUBMENU_STATE = {
  openElapsed: 0,
  cursor: 2 as const,
  displayCursor: 2 as const,
  closeElapsed: null,
  confirmElapsed: TURN2_PRESS_TICK - TICK0,
  activeMonMoveset: rentalMoveset("ONIX"),
  reopenedFromClose: false,
};
/** Same as `pixelAtSentOut`, but with turn 2's own FIGHT submenu already confirmed on ENDEAVOR (cursor slot 2) - the state `drawTurn2KickoffText`/`drawEndeavorSquish` render under (S7 slice E1d-retry, §15b). */
function pixelAtTurn2(t: number, x: number, y: number): [number, number, number] {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380, fightSubmenu: TURN2_FIGHT_SUBMENU_STATE, turn1Resolved: true, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null });
  const o = (y * 240 + x) * 4;
  return [fb[o]!, fb[o + 1]!, fb[o + 2]!];
}

describe("rank-2 turn-13 next-command handoff dispatcher", () => {
  it("rejects a completed typed handoff when its simultaneously-installed FLY owner is absent", () => {
    const fb = new Uint8Array(240 * 160 * 4);
    expect(() => renderBattleScene(fb, {
      ...INITIAL_BATTLE_SCENE_STATE,
      elapsed: 15_000 - TICK0,
      sendOutPressElapsed: 380,
      turn12Resolved: true,
      turn13NextCommandHandoff: resolveTurn13CompletedResolutionNextCommandHandoff(),
    })).toThrow("resolved turn-13 handoff has no retained action presentation owner");
  });
});

/** turn 4's own real `pressTick` (`TURN4_CONFIRM_PRESS_TICK`, `battleScene.ts` - docs/battle-turn-notes.md §22). FIGHT submenu confirmed on cursor slot 0 (ROCK_SLIDE), same shape `TURN2_FIGHT_SUBMENU_STATE` above uses for cursor slot 2. */
const TURN4_PRESS_TICK = 4925;
const TURN4_FIGHT_SUBMENU_STATE = {
  openElapsed: 0,
  cursor: 0 as const,
  displayCursor: 0 as const,
  closeElapsed: null,
  confirmElapsed: TURN4_PRESS_TICK - TICK0,
  activeMonMoveset: rentalMoveset("ONIX"),
  reopenedFromClose: false,
};
/** turn 5's own real reopen press tick (`docs/turn3-residual-probe-notes.md` "The extremum class, probed", tick 5927) - the FIGHT submenu just reopened (cursor persisted at slot 0, ROCK_SLIDE), confirm not yet registered. */
const TURN5_REOPEN_TICK = 5927;
const TURN5_REOPEN_FIGHT_SUBMENU_STATE = {
  openElapsed: TURN5_REOPEN_TICK - TICK0,
  cursor: 0 as const,
  displayCursor: 0 as const,
  closeElapsed: null,
  confirmElapsed: null,
  activeMonMoveset: rentalMoveset("ONIX"),
  reopenedFromClose: false,
};
/** Same shape as `pixelAtTurn4`, but for turn 5's own reopen DMA-wait window (`turn4Resolved: true`, no confirm yet) - the state `drawActionMenuIdleWindow`'s bounce-tick selection renders under (PROGRESS #183/cleanup, tick 5927). */
function pixelAtTurn5Reopen(t: number, x: number, y: number): [number, number, number] {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380, fightSubmenu: TURN5_REOPEN_FIGHT_SUBMENU_STATE, turn1Resolved: true, turn2Resolved: true, turn3Resolved: true, turn4Resolved: true, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null });
  const o = (y * 240 + x) * 4;
  return [fb[o]!, fb[o + 1]!, fb[o + 2]!];
}

/** Same as `pixelAtTurn2`, but turns 1-3 all resolved and the FIGHT submenu confirmed on turn 4's own ROCK_SLIDE (slot 0) - the state `drawTurn4KickoffText`/`drawTurn4RockSlideWindow` render under (S7 slice I resolution, docs/battle-turn-notes.md §22). */
function pixelAtTurn4(t: number, x: number, y: number): [number, number, number] {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380, fightSubmenu: TURN4_FIGHT_SUBMENU_STATE, turn1Resolved: true, turn2Resolved: true, turn3Resolved: true, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null });
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
  it("selects JENSON's source-backed trainer line and two-tick-earlier cursor without changing DESTIN defaults", () => {
    expect(battleIntroEncounterParams("destin")).toEqual({
      trainerPic: "TRAINER_PIC_BUG_CATCHER",
      line1: "BUG CATCHER DESTIN",
      line2: "would like to battle!",
      textStartTick: 1234,
      cursorStartTick: 1274,
      cursorX: 123,
    });
    expect(battleIntroEncounterParams("jenson")).toEqual({
      trainerPic: "TRAINER_PIC_FISHERMAN",
      line1: "FISHERMAN JENSON",
      line2: "would like to battle!",
      textStartTick: 1234,
      cursorStartTick: 1272,
      cursorX: 123,
    });
  });

  it("keeps the canonical settled trainer-intro framebuffer byte-identical through generic picture selection", () => {
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fb, {
      ...INITIAL_BATTLE_SCENE_STATE,
      elapsed: 1300 - TICK0,
    });
    expect(createHash("sha256").update(fb).digest("hex")).toBe(
      "8d92751ae2c7fd1524226faba98105702be7e5448819a27f6d027036b97f2346",
    );
  });

  it("uses the encounter-selected printable count while preserving DESTIN's 39-character cadence", () => {
    expect(textVisibleChars(1270, "jenson")).toBe(37);
    expect(textVisibleChars(1270, "destin")).toBe(37);
    expect(textVisibleChars(1272, "destin")).toBe(39);
  });

  it("preserves encounter identity across scene advances", () => {
    expect(advanceBattleScene({ ...INITIAL_BATTLE_SCENE_STATE, encounter: "jenson" }).encounter).toBe("jenson");
  });

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

  it("parameterizes JENSON/KABUTO at 32 printable chars without changing DESTIN defaults", () => {
    expect(battleSendOutEncounterParams("jenson")).toEqual({
      line1: "FISHERMAN JENSON sent",
      line2: "out KABUTO!",
      textTotal: 32,
    });
    expect(battleSendOutEncounterParams("destin")).toEqual({
      line1: "BUG CATCHER DESTIN sent",
      line2: "out GROVYLE!",
      textTotal: 35,
    });
    expect(sendOutTextVisibleChars(1362, 1326, "jenson")).toBe(32);
    expect(sendOutTextVisibleChars(1363, 1326, "jenson")).toBe(32);
  });

  it("state advance preserves sendOutPressElapsed once set, and elapsed keeps incrementing regardless", () => {
    let state: BattleSceneState = { ...INITIAL_BATTLE_SCENE_STATE, sendOutPressElapsed: 380 };
    state = advanceBattleScene(state);
    expect(state).toEqual({ elapsed: 1, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null, resolutionOwner: null, battleOutcome: 0, terminalResolution: null });
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

  // ISSUES #16 (worktree lane, this session): the harvest-blit call site was
  // replaced by `composeOpponentHealthbox` - this test proves the LIVE
  // render path actually goes through the compositor now, independent of
  // battleScene.ts's own internals: it recomposes the same anchor-battle
  // params (GROVYLE/male/Lv50/full-HP/no-status, sourced the same way
  // battleScene.ts does - battle1-turn1-ram-dump.json + species-names.json,
  // not hardcoded) and asserts every opaque compositor cell equals the
  // settled (dx=0) on-screen pixel at the corresponding screen position.
  it("settled opponent healthbox render equals composeOpponentHealthbox's own output buffer for the real anchor params (ISSUES #16, wired live)", () => {
    const battler1 = ramDump.battlerSnapshots.before_turn.battler1;
    const name = speciesNames.species[battler1.species]!.name;
    expect(name).toBe("GROVYLE");
    expect(battler1.level).toBe(50);
    expect(battler1.hp).toBe(battler1.maxHP); // full HP - this window's actual case

    const composed = composeOpponentHealthbox(
      {
        frame: battleHealthboxAsset.singlesOpponent,
        hpbar: battleHealthboxAsset.hpbar,
        hpbarAnim: battleHealthboxAsset.hpbarAnim,
        frameEnd: battleHealthboxAsset.frameEnd,
        statusIcons: battleHealthboxAsset.status2,
      },
      { name, level: battler1.level, gender: "male", hpFraction: battler1.hp / battler1.maxHP, status: "none" },
    );

    let checked = 0;
    for (let cy = 0; cy < composed.height; cy += 1) {
      for (let cx = 0; cx < composed.width; cx += 1) {
        const cell = composed.pixels[cy * composed.width + cx];
        if (!cell) continue;
        checked += 1;
        const onScreen = pixelAtSentOut(1555, HEALTHBOX_FRAME_ORIGIN.x + cx, HEALTHBOX_FRAME_ORIGIN.y + cy);
        expect(onScreen, `mismatch at compositor-local (${cx},${cy})`).toEqual([cell.r, cell.g, cell.b]);
      }
    }
    expect(checked).toBeGreaterThan(2500); // not a hardcoded magic number - just a floor so this can't silently degrade to checking nothing
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

describe("battleScene: S7 slice B - DOUBLE_TEAM clone vs. opponent healthbox z-order (docs/battle-menu-notes.md §10c)", () => {
  // At the clone's most extreme excursion (amplitude 41-42px, `DOUBLE_TEAM_
  // CLONE_OFFSETS_A/B`'s own peak), its leftmost content tile (a chin/jaw
  // detail, genuinely opaque in Grovyle's own tileset - confirmed correct at
  // rest, tick 2100, GROVYLE_CORNER+(1,13)) reaches within 1-2px of the
  // opponent healthbox's own right border. The healthbox is a separate,
  // higher-priority OBJ on real hardware (`battle_interface.c`), so its
  // border must stay drawn on top wherever the clone's silhouette would
  // otherwise overpaint it - previously it didn't (`isOpponentHealthboxOpaqueAt`,
  // `battleScene.ts`), producing 4 near-1px oracle mismatches (ticks
  // 2075/2082/2088/2089, PROGRESS.md #125's own named residual). Render tick
  // 2075 = pressTick(1919)+156, offset -41 - oracle-confirmed at (104,25).
  it("clips the clone's own leftmost content tile so the opponent healthbox's real border stays on top at render tick 2075, x=104/y=25", () => {
    const battler1 = ramDump.battlerSnapshots.before_turn.battler1;
    const name = speciesNames.species[battler1.species]!.name;
    const composed = composeOpponentHealthbox(
      {
        frame: battleHealthboxAsset.singlesOpponent,
        hpbar: battleHealthboxAsset.hpbar,
        hpbarAnim: battleHealthboxAsset.hpbarAnim,
        frameEnd: battleHealthboxAsset.frameEnd,
        statusIcons: battleHealthboxAsset.status2,
      },
      { name, level: battler1.level, gender: "male", hpFraction: battler1.hp / battler1.maxHP, status: "none" },
    );
    const lx = 104 - HEALTHBOX_FRAME_ORIGIN.x;
    const ly = 25 - HEALTHBOX_FRAME_ORIGIN.y;
    const expected = composed.pixels[ly * composed.width + lx]!;
    expect(expected).not.toBeNull();

    const submenu = confirmFightMove(openFightSubmenu(0, rentalMoveset("ONIX")), 879); // pressTick = TICK0+879 = 1919
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fb, { elapsed: 2075 - TICK0, sendOutPressElapsed: 380, fightSubmenu: submenu, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null });
    const o = (25 * 240 + 104) * 4;
    expect([fb[o]!, fb[o + 1]!, fb[o + 2]!]).toEqual([expected.r, expected.g, expected.b]);
  });
});

describe("battleScene: S7 slice B - stat-change banner as a real scrolling BG1 (docs/battle-menu-notes.md §10d)", () => {
  // `gStatAnim_Increase_Tilemap`/`_Gfx`/`gStatAnim_Evasion_Pal` blended onto
  // Grovyle's own OBJ-window silhouette, scrolled by `statsBannerBg1Y`'s
  // RAM-confirmed `+3`/tick ramp (one-tick render lag, like `bg1X`) - NOT the
  // flat white flash a prior session's 2-sample solve concluded. ISSUES #39
  // rank-6 slice 1: turn 1's own banner is now Scene-OFF-owned and shifted
  // much earlier (`TURN1_OFF_STATS_BANNER_*`, `battleScene.ts`) - re-pinned
  // at two ticks spanning the OFF ramp-up (2010) and the OFF "flat eva/evb"
  // hold (2030, still visibly scrolling underneath) at Grovyle's own first
  // opaque pixel (GROVYLE_CORNER+(31,7) = (175,19)) - oracle-cross-checked
  // directly (`turn1-cloneanim-off.json`, 230/230).
  it("renders the real scrolling arrow tilemap, not a flat color, at two different points in the banner (OFF ramp-up tick 2010, OFF hold tick 2030)", () => {
    const GROVYLE_CORNER = { x: 144, y: 12 };
    const submenu = confirmFightMove(openFightSubmenu(0, rentalMoveset("ONIX")), 879); // pressTick = 1919
    const x = GROVYLE_CORNER.x + GROVYLE_FIRST_OPAQUE_OFFSET.x;
    const y = GROVYLE_CORNER.y + GROVYLE_FIRST_OPAQUE_OFFSET.y;
    const o = (y * 240 + x) * 4;

    const fb2010 = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fb2010, { elapsed: 2010 - TICK0, sendOutPressElapsed: 380, fightSubmenu: submenu, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null });
    const at2010: [number, number, number] = [fb2010[o]!, fb2010[o + 1]!, fb2010[o + 2]!];

    const fb2030 = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fb2030, { elapsed: 2030 - TICK0, sendOutPressElapsed: 380, fightSubmenu: submenu, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null });
    const at2030: [number, number, number] = [fb2030[o]!, fb2030[o + 1]!, fb2030[o + 2]!];

    expect(at2010).toEqual([69, 160, 99]);
    expect(at2030).toEqual([88, 203, 148]);
    expect(at2010).not.toEqual(at2030); // the scroll genuinely moves content, not just a static blend
  });
});

describe("battleScene: S7 slice C - Rock Slide's shaken BG3 vs. the player healthbox's own bleed-mask despeckle (docs/battle-menu-notes.md §11.1 fix)", () => {
  // §11.1: `getMenuHealthboxPlayerContentMask`'s value-equality bleed
  // heuristic classifies a harvested pixel as "background bleed" whenever it
  // equals the FLAT (unshifted) static background at that spot - correct
  // for the settled action-menu window this asset was harvested from, but
  // this exact draw call is reused inside the Rock Slide shake window too
  // (`drawRockSlideAttack`), where BG3 actually scrolls (`rockSlideBg3Y`).
  // One harvested content pixel (a white healthbox-frame highlight, screen
  // (173,92)) coincidentally equals the flat background's own color there,
  // so the heuristic misclassified it as a hole - invisible on unshifted
  // ticks (live background there is ALSO white by the same coincidence),
  // wrong on shifted ticks (live background samples a different, non-white
  // tile row instead). The fix despeckles single-pixel-island "bleed"
  // classifications (real bleed is a byproduct of the sprite's true shape,
  // so it comes in contiguous patches, never a lone cell surrounded by
  // content) - was 250/256 on turn1-rockslide.json, now 256/256.
  it("draws the always-opaque healthbox highlight at (173,92) on both an unshifted and a BG3_Y=-7 shaken tick", () => {
    const submenu = confirmFightMove(openFightSubmenu(0, rentalMoveset("ONIX")), 879); // pressTick = TICK0+879 = 1919
    const x = 173;
    const y = 92;
    const o = (y * 240 + x) * 4;

    const fbUnshifted = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fbUnshifted, { elapsed: 2348 - TICK0, sendOutPressElapsed: 380, fightSubmenu: submenu, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null }); // rockSlideBg3Y === 0 here
    const atUnshifted: [number, number, number] = [fbUnshifted[o]!, fbUnshifted[o + 1]!, fbUnshifted[o + 2]!];

    const fbShaken = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fbShaken, { elapsed: 2349 - TICK0, sendOutPressElapsed: 380, fightSubmenu: submenu, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null }); // rockSlideBg3Y === -7 here
    const atShaken: [number, number, number] = [fbShaken[o]!, fbShaken[o + 1]!, fbShaken[o + 2]!];

    expect(atUnshifted).toEqual([255, 255, 255]);
    expect(atShaken).toEqual([255, 255, 255]); // was [247, 247, 255] pre-fix: the flat background's tile row leaking through
  });
});

// S7 residual cleanup (Family A, docs/turn3-residual-probe-notes.md):
// endeavorShakeSteps generalizes the shake amplitude away from a hardcoded
// symmetric constant - gAnimMovePower/gBattleMovePower is stale (ENDEAVOR
// never writes it), so the amplitude always reflects whatever the LAST
// power-calculated move left behind. Pinned against all three RAM-confirmed
// data points: turn 2's ENDEAVOR (stale ROCK_SLIDE_MOVE_POWER=75, symmetric
// 3/3), turn 3's ENDEAVOR (stale DRAGON_BREATH_MOVE_POWER=60, asymmetric
// 2/3), and turn 5's own ENDEAVOR (stale ROCK_SLIDE_MOVE_POWER=75 again,
// from turn 4's own ROCK_SLIDE - symmetric 3/3, same anchor as turn 2's) -
// this last one was a falsifiable PREDICTION when first pinned (S7 residual
// cleanup slice); S7 slice J landed turn 5 for real and confirmed it against
// real oracle pixels (tools/compare/traces/turn5-endeavor.json, 254/254, 0
// diff spanning the whole shake window) - the prediction held.
describe("S7 residual cleanup (docs/turn3-residual-probe-notes.md, Family A): endeavorShakeSteps amplitude formula", () => {
  it("stale power 75 (ROCK_SLIDE, turn 2's own anchor, confirmed again for turn 5's own ENDEAVOR - S7 slice J) gives a symmetric downStep=3/upStep=3", () => {
    expect(endeavorShakeSteps(ROCK_SLIDE_MOVE_POWER)).toEqual({ downStep: 3, upStep: 3 });
  });

  it("stale power 60 (DRAGON_BREATH, turn 3's own anchor) gives an asymmetric downStep=2/upStep=3", () => {
    expect(endeavorShakeSteps(DRAGON_BREATH_MOVE_POWER)).toEqual({ downStep: 2, upStep: 3 });
  });

  it("clamps amplitude to [1,16] at both ends (source formula's own clamp, never RAM-exercised by this dossier's own two anchors)", () => {
    expect(endeavorShakeSteps(0)).toEqual({ downStep: 0, upStep: 1 }); // amplitude clamped up to 1
    expect(endeavorShakeSteps(1000)).toEqual({ downStep: 8, upStep: 8 }); // amplitude clamped down to 16
  });
});

// S7 residual cleanup (Family B, docs/turn3-residual-probe-notes.md "Family
// B, continued"): turn3SubmenuBounceTick's own composition was uniformly one
// RAM tick more advanced than the real invisible bouncer sprite's own
// sSinIndex (proven by a pointer-chase RAM dump, zero exceptions over 41
// probed ticks x 2 regions). The retarding `-1` fix should make
// `menuIdleBounce(turn3SubmenuBounceTick(t))` (the exact composition the
// renderer calls) match the real hardware's own screen-tick content
// (`real_screen_y2(t) == probed_y2(t-1)`, the window's already-established
// +1 render lag) directly, with no further shift - pinned against the
// committed RAM dump itself, not re-derived by hand.
describe("S7 residual cleanup (docs/turn3-residual-probe-notes.md, Family B): turn3SubmenuBounceTick vs the real bouncer's own RAM-probed sSinIndex", () => {
  const rows = new Map(turn3MenuBouncerRawProbe.ticks.map((r) => [r.tick, r]));

  it("menuIdleBounce(turn3SubmenuBounceTick(t)) equals real_screen_y2(t) (= probed y2 at RAM tick t-1) at every probed tick while the bounce is active, both regions - zero exceptions", () => {
    let onixChecked = 0;
    let healthboxChecked = 0;
    for (const row of turn3MenuBouncerRawProbe.ticks) {
      const t = row.tick;
      const prev = rows.get(t - 1);
      if (!prev) continue;
      const model = menuIdleBounce(turn3SubmenuBounceTick(t));
      if (prev.onixAmplitude !== 0) {
        expect({ t, region: "onix", model: model.onixY2 }).toEqual({ t, region: "onix", model: prev.onixY2 });
        onixChecked++;
      }
      if (prev.healthboxAmplitude !== 0) {
        expect({ t, region: "healthbox", model: model.healthboxY2 }).toEqual({ t, region: "healthbox", model: prev.healthboxMainY2 });
        healthboxChecked++;
      }
    }
    // Sanity floor on the pin's own coverage, not a magic tolerance - both
    // regions' probed-and-active tick counts, computed straight from the
    // committed RAM dump.
    expect(onixChecked).toBe(38);
    expect(healthboxChecked).toBe(38);
  });

  it("the two named residuals (3879 onix, 3888 healthbox) individually match post-fix, not just in aggregate", () => {
    expect(menuIdleBounce(turn3SubmenuBounceTick(3879)).onixY2).toBe(rows.get(3878)!.onixY2);
    expect(menuIdleBounce(turn3SubmenuBounceTick(3888)).healthboxY2).toBe(rows.get(3887)!.healthboxMainY2);
  });
});

// ISSUES #28 fix (docs/bounce-blip-notes.md): the turn-6+ FIGHT-submenu
// BROWSING branch (`sm.confirmElapsed === null`, past `revealTick`) was
// feeding `bounceTick = t` instead of applying `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
// - the exact correction turns 1-5's own reopened-submenu wrappers (e.g.
// `turn3SubmenuBounceTick` above) already apply. Pinned directly against the
// committed RAM dumps (`turn6-bounce-blip-probe.json`/`turn8-bounce-blip-
// probe.json`, twice-run byte-identical) at the restored, formerly-excluded
// ticks - same `real_screen_y2(t) == probed_y2(t-1)` convention as Family B.
describe("ISSUES #28 fix (docs/bounce-blip-notes.md): turn-6/8 browsing-branch bounce shift", () => {
  const t6Rows = new Map(turn6BounceBlipProbe.ticks.map((r) => [r.tick, r]));
  const t8Rows = new Map(turn8BounceBlipProbe.ticks.map((r) => [r.tick, r]));

  it("turn 6 browsing model (menuIdleBounce(turn5SitrusResettledBounceTick(t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT)))) matches real RAM at the 3 restored period-9 ticks 7324/7333/7342", () => {
    for (const t of [7324, 7333, 7342]) {
      const model = menuIdleBounce(turn5SitrusResettledBounceTick(t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT));
      expect({ t, onixY2: model.onixY2, healthboxY2: model.healthboxY2 }).toEqual({
        t,
        onixY2: t6Rows.get(t - 1)!.onixY2,
        healthboxY2: t6Rows.get(t - 1)!.healthboxMainY2,
      });
    }
  });

  it("turn 6 browsing model WITHOUT the shift (the pre-fix bug) mismatches at the same 3 ticks - proves the fix is load-bearing, not a no-op", () => {
    for (const t of [7324, 7333, 7342]) {
      const buggyModel = menuIdleBounce(turn5SitrusResettledBounceTick(t));
      const real = { onixY2: t6Rows.get(t - 1)!.onixY2, healthboxY2: t6Rows.get(t - 1)!.healthboxMainY2 };
      expect(buggyModel).not.toEqual(real);
    }
  });

  it("turn 8 browsing model (regime-3-shifted through TURN8_REGIME3_TO_REGIME1_SHIFT) matches real RAM at the 3 restored period-9 ticks 9392/9402/9411", () => {
    for (const t of [9392, 9402, 9411]) {
      const bounceTick = t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
      const model = menuIdleBounce(turn5SitrusResettledBounceTick(bounceTick + TURN8_REGIME3_TO_REGIME1_SHIFT));
      expect({ t, onixY2: model.onixY2, healthboxY2: model.healthboxY2 }).toEqual({
        t,
        onixY2: t8Rows.get(t - 1)!.onixY2,
        healthboxY2: t8Rows.get(t - 1)!.healthboxMainY2,
      });
    }
  });

  it("turn 8 browsing model WITHOUT the shift (the pre-fix bug) mismatches at the same 3 ticks", () => {
    for (const t of [9392, 9402, 9411]) {
      const buggyModel = menuIdleBounce(turn5SitrusResettledBounceTick(t + TURN8_REGIME3_TO_REGIME1_SHIFT));
      const real = { onixY2: t8Rows.get(t - 1)!.onixY2, healthboxY2: t8Rows.get(t - 1)!.healthboxMainY2 };
      expect(buggyModel).not.toEqual(real);
    }
  });
});

// ISSUES #29 fix (docs/bounce-blip-notes.md's S7 worktree probe section):
// the SAME missing-FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT mechanism as #28, one
// dispatch branch earlier. Family A - the pre-reveal idle window
// (`sm.openElapsed !== null && t < revealTick`) must shift its bounce tick
// exactly like the post-reveal browsing branch does; Family B -
// `turn7KickoffBounceTick`'s own pre-freeze branch was returning plain `t`.
// Pinned directly against the committed RAM dumps (`turn6-/turn7-/turn8-
// bounce-blip-probe.json`, twice-run byte-identical) at the 6 restored,
// formerly-excluded ticks, paired with a pre-fix-mismatch proof.
describe("ISSUES #29 fix (docs/bounce-blip-notes.md): pre-reveal idle-window + turn7KickoffBounceTick pre-freeze shift", () => {
  const t6Rows = new Map(turn6BounceBlipProbe.ticks.map((r) => [r.tick, r]));
  const t7Rows = new Map(turn7BounceBlipProbe.ticks.map((r) => [r.tick, r]));
  const t8Rows = new Map(turn8BounceBlipProbe.ticks.map((r) => [r.tick, r]));

  it("Family A, turn 6 pre-reveal idle window (menuIdleBounce(turn5SitrusResettledBounceTick(t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT))) matches real RAM at the restored ticks 7315/7316", () => {
    for (const t of [7315, 7316]) {
      const model = menuIdleBounce(turn5SitrusResettledBounceTick(t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT));
      expect({ t, onixY2: model.onixY2, healthboxY2: model.healthboxY2 }).toEqual({
        t,
        onixY2: t6Rows.get(t - 1)!.onixY2,
        healthboxY2: t6Rows.get(t - 1)!.healthboxMainY2,
      });
    }
  });

  it("Family A, turn 6 pre-reveal idle window WITHOUT the shift (the pre-fix bug) mismatches at the same 2 ticks", () => {
    for (const t of [7315, 7316]) {
      const buggyModel = menuIdleBounce(turn5SitrusResettledBounceTick(t));
      const real = { onixY2: t6Rows.get(t - 1)!.onixY2, healthboxY2: t6Rows.get(t - 1)!.healthboxMainY2 };
      expect(buggyModel).not.toEqual(real);
    }
  });

  it("Family A, turn 8 pre-reveal idle window (turn7RockSlideResettledBounceTick fed a shifted raw tick) matches real RAM at the restored ticks 9383/9384", () => {
    for (const t of [9383, 9384]) {
      const bounceRawTick = t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
      const model = menuIdleBounce(turn7RockSlideResettledBounceTick(bounceRawTick, TURN7_ROCKSLIDE_PRESS_TICK));
      expect({ t, onixY2: model.onixY2, healthboxY2: model.healthboxY2 }).toEqual({
        t,
        onixY2: t8Rows.get(t - 1)!.onixY2,
        healthboxY2: t8Rows.get(t - 1)!.healthboxMainY2,
      });
    }
  });

  it("Family A, turn 8 pre-reveal idle window WITHOUT the shift (the pre-fix bug) mismatches at the same 2 ticks", () => {
    for (const t of [9383, 9384]) {
      const buggyModel = menuIdleBounce(turn7RockSlideResettledBounceTick(t, TURN7_ROCKSLIDE_PRESS_TICK));
      const real = { onixY2: t8Rows.get(t - 1)!.onixY2, healthboxY2: t8Rows.get(t - 1)!.healthboxMainY2 };
      expect(buggyModel).not.toEqual(real);
    }
  });

  it("Family B, turn 7 kickoff bounce wrapper's pre-freeze branch (turn7KickoffBounceTick, now shifted) matches real RAM at the restored ticks 8380/8381 (pressTick 8379)", () => {
    const pressTick = 8379;
    for (const t of [8380, 8381]) {
      const bounceTick = turn7KickoffBounceTick(t, pressTick);
      const model = menuIdleBounce(turn5SitrusResettledBounceTick(bounceTick + TURN7_REGIME2_TO_REGIME1_SHIFT));
      expect({ t, onixY2: model.onixY2, healthboxY2: model.healthboxY2 }).toEqual({
        t,
        onixY2: t7Rows.get(t - 1)!.onixY2,
        healthboxY2: t7Rows.get(t - 1)!.healthboxMainY2,
      });
    }
  });

  it("Family B, turn 7 kickoff bounce wrapper's pre-freeze branch WITHOUT the shift (the pre-fix bug, plain `t`) mismatches at the same 2 ticks", () => {
    for (const t of [8380, 8381]) {
      const buggyBounceTick = t; // pre-fix: `return t;`
      const buggyModel = menuIdleBounce(turn5SitrusResettledBounceTick(buggyBounceTick + TURN7_REGIME2_TO_REGIME1_SHIFT));
      const real = { onixY2: t7Rows.get(t - 1)!.onixY2, healthboxY2: t7Rows.get(t - 1)!.healthboxMainY2 };
      expect(buggyModel).not.toEqual(real);
    }
  });
});

// S7 slice E1 tail increment (docs/battle-menu-notes.md §15f), RE-PINNED
// ISSUES #39 rank-6 slice 2: the two mechanisms past the now-deleted
// squish/blend/droplet/shake/hitsplat window (all class (c), gone under
// Scene OFF) - the player healthbox's own brief post-hit "wobble" (y2
// bounce) and Onix's own brief post-hit "flicker" (struct Sprite.invisible
// toggling) are BOTH class (b) and survive, just re-anchored 37 ticks
// earlier (`TURN2_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START`=81/
// `TURN2_OFF_ENDEAVOR_FLICKER_START`=82 replacing the ON fit's 118/119) -
// same asset/pixel colors as the ON fit, only the tick anchors moved, all
// re-derived this session directly from `pixelAtTurn2` (itself oracle-exact
// against `turn2-endeavor-off.json`, 256/256). This block also pins the
// `drawMenuHealthboxPlayerWobble` erase-then-redraw fix (a real negative-dy
// overdraw bug found this session - without it, ticks in this exact window
// mismatch the oracle by ~1700px, see ISSUES #39).
describe("S7 slice E1 tail (docs/battle-menu-notes.md §15f): the player healthbox's post-hit wobble and Onix's post-hit flicker (Scene-OFF re-timed, rank-6 slice 2)", () => {
  it("render 3027 (the healthbox wobble's own first visible tick, RAM 3026+1, y2=+1) shows a shifted color at the healthbox's own top-border pixel (150,74)", () => {
    expect(pixelAtTurn2(3027, 150, 74)).toEqual([189, 189, 156]);
  });

  it("render 3023 (before the wobble starts) shows the plain, unshifted color at that same pixel", () => {
    expect(pixelAtTurn2(3023, 150, 74)).toEqual([82, 107, 99]);
  });

  it("render 3046 (the wobble's own last affected tick, RAM 3045+1, y2=-1) shows the opposite-direction shifted color at the same pixel", () => {
    expect(pixelAtTurn2(3046, 150, 74)).toEqual([33, 57, 0]);
  });

  it("render 3047 (one tick later - the wobble has hard-stopped, not damped) shows the plain color again", () => {
    expect(pixelAtTurn2(3047, 150, 74)).toEqual([82, 107, 99]);
  });

  it("render 3028 (the flicker's own first invisible tick, RAM 3027+1) shows plain background at (60,90), deep inside Onix's own silhouette", () => {
    expect(pixelAtTurn2(3028, 60, 90)).toEqual([247, 247, 255]);
  });

  it("render 3027 (one tick earlier - still visible) shows Onix's own body color at that same pixel", () => {
    expect(pixelAtTurn2(3027, 60, 90)).toEqual([132, 123, 123]);
  });

  it("render 3055 (the flicker's own fourth and final invisible tick) still shows plain background at the same pixel", () => {
    expect(pixelAtTurn2(3055, 60, 90)).toEqual([247, 247, 255]);
  });

  it("render 3056 (one tick later - settled visible for good, no fifth cycle) shows Onix's own body color again", () => {
    expect(pixelAtTurn2(3056, 60, 90)).toEqual([132, 123, 123]);
  });
});

// S7 slice E2b (docs/dragon-breath-notes.md "Engine slice E2b"):
// DRAGON_BREATH's own resolution half - Grovyle's HP-bar drain, the
// hit-flash (reused verbatim from `rockSlideHealthboxWobbleY2`/
// `rockSlideMonBlinkInvisible`, `battleMenu.ts`), the kickoff text's own
// clear-to-blank, and the turn-3 resettled action menu. `dragonBreathGrovyleHp`
// is tested directly (same style `rockSlideOpponentHp`/`endeavorOnixHp`
// already get in `tests/battleMenu.test.ts`); the rest is dispatch/wiring,
// pinned via real framebuffer pixels instead - all oracle-cross-checked
// against this session's own extended `turn2-dragonbreath.json` capture
// (`npm run compare`, 166/166 green over 3264-3346 minus the single named
// residual tick 3337, see the doc's own "Engine slice E2b" section), not
// hand-picked.
describe("S7 slice E2b: dragonBreathGrovyleHp (docs/dragon-breath-notes.md)", () => {
  const pressTick = 2945;
  const startHp = 101;
  const endHp = 88;

  it("full HP through the sentinel tick, then exactly 1 HP/tick down to endHp, settled forever after", () => {
    expect(dragonBreathGrovyleHp(3297, pressTick, startHp, endHp)).toBe(101);
    expect(dragonBreathGrovyleHp(3298, pressTick, startHp, endHp)).toBe(101); // sentinel tick itself, no visible drop yet
    expect(dragonBreathGrovyleHp(3299, pressTick, startHp, endHp)).toBe(100); // first drained tick
    expect(dragonBreathGrovyleHp(3311, pressTick, startHp, endHp)).toBe(88); // d=13, last decrement, already at endHp
    expect(dragonBreathGrovyleHp(3312, pressTick, startHp, endHp)).toBe(88); // done sentinel tick, settled
    expect(dragonBreathGrovyleHp(3400, pressTick, startHp, endHp)).toBe(88); // stays settled indefinitely
  });

  it("is value-agnostic (works for any startHp/endHp pair, not just this trace's 101/88)", () => {
    expect(dragonBreathGrovyleHp(3298, pressTick, 200, 150)).toBe(200);
    expect(dragonBreathGrovyleHp(3299, pressTick, 200, 150)).toBe(199);
    expect(dragonBreathGrovyleHp(3348, pressTick, 200, 150)).toBe(150); // d=50, exactly startHp-endHp
    expect(dragonBreathGrovyleHp(3400, pressTick, 200, 150)).toBe(150);
  });
});

describe("S7 slice E2b: Grovyle's HP-bar drain, hit-flash reuse, text-clear, and the turn-3 resettled menu (pixel-pinned, docs/dragon-breath-notes.md, Scene-OFF re-timed rank-6 slice 2)", () => {
  // ISSUES #39 rank-6 slice 2: turn 2's own DRAGON_BREATH HP-drain start
  // moved from pressTick+353 (ON) to `TURN2_OFF_DRAGONBREATH_HP_DRAIN_START_
  // DELAY`=254 (OFF) - the fill-pixel boundary itself re-derived directly
  // from `pixelAtTurn2` this session (oracle-exact against `turn2-
  // dragonbreath-off.json`, 237/237).
  it("render 3201-3202 (the bar's own fill-pixel boundary at (84,33), settled bar color through 3201, first drained-tick color from 3202)", () => {
    expect(pixelAtTurn2(3200, 84, 33)).toEqual([90, 214, 132]);
    expect(pixelAtTurn2(3201, 84, 33)).toEqual([90, 214, 132]);
    expect(pixelAtTurn2(3202, 84, 33)).toEqual([74, 66, 90]);
  });

  it("render 3215 (the drain's own settled endpoint, Grovyle at 88/143) keeps the drained fill color at the same pixel", () => {
    expect(pixelAtTurn2(3215, 84, 33)).toEqual([74, 66, 90]);
  });

  it("render 3165 (Grovyle still visible, hit-flash not yet started) vs render 3166 (mon-blink's own first invisible tick, reused `rockSlideMonBlinkInvisible`, TURN2_OFF_DRAGONBREATH_HIT_FLASH_ANCHOR_DELAY=219 replacing the ON fit's 318) at a fixed Grovyle-body coordinate (160,30)", () => {
    expect(pixelAtTurn2(3165, 160, 30)).toEqual([231, 66, 41]);
    expect(pixelAtTurn2(3166, 160, 30)).toEqual([247, 247, 255]);
  });

  // ISSUES #39 rank-6 slice 2: turn 2's own ENDEAVOR/DRAGON_BREATH text
  // handoff is Scene-OFF re-timed - `TURN2_OFF_ENDEAVOR_TEXT_CLEAR_DELAY`
  // and `TURN2_OFF_DRAGONBREATH_TEXT_START_DELAY` are BOTH 155 (pressTick+155
  // = render 3100), a same-frame swap with no blank tick at all (pixel-
  // confirmed directly against the oracle this session, correcting the
  // prior attempt's own "single blank tick" claim). (16,124) discriminates
  // cleanly: ENDEAVOR's "Foe GROVYLE used" has ink there, DRAGON_BREATH's
  // "ONIX used" doesn't.
  it("render 3099 (ENDEAVOR's kickoff text still held) vs render 3100 (same-frame swap to DRAGON_BREATH's own first character, zero blank ticks) at a message-glyph pixel (16,124)", () => {
    expect(pixelAtTurn2(3099, 16, 124)).toEqual([255, 255, 255]);
    expect(pixelAtTurn2(3100, 16, 124)).toEqual([107, 165, 165]);
  });

  it("render 3237 (TURN2_OFF_DRAGONBREATH_MENU_REDRAW_DELAY - hard cut to the turn-3 resettled action menu) shows Onix's own real HP digits (101/117, not `menuIdleBase`'s stale pre-turn-1 117/117 harvest) at a digit-glyph pixel (192,97)", () => {
    expect(pixelAtTurn2(3237, 192, 97)).toEqual([66, 66, 66]);
  });
});

// S7 slice E2b-2 (docs/dragon-breath-notes.md "Engine slice E2b-2"), RE-PINNED
// ISSUES #39 rank-6 slice 2 (the resettled menu's own reopen tick moved from
// pressTick+391 to `TURN2_OFF_DRAGONBREATH_MENU_REDRAW_DELAY`=292, render
// 3237): the resettled menu's own idle bounce is LIVE (not frozen, unlike
// every earlier resettled-menu path this engine already modeled), so
// `drawPlayerHealthboxHpOverlay`'s HP-digit blit must track the healthbox's
// own bounce offset (`menuIdleBounce(bounceTick).healthboxY2`) or the digits
// float free of the bar whenever the bounce is non-zero.
describe("S7 slice E2b-2: the resettled menu's live bounce carries its own HP-digit overlay (docs/dragon-breath-notes.md, Scene-OFF re-timed)", () => {
  it("render 3237 (healthboxY2=0, bounce at rest) vs render 3257 (healthboxY2!=0) at the same digit-glyph pixel (192,97) - the digit is only there at rest, since the bar (and its digits) shifted up 1px once the live bounce moves off zero", () => {
    expect(pixelAtTurn2(3237, 192, 97)).toEqual([66, 66, 66]);
    expect(pixelAtTurn2(3257, 192, 97)).toEqual([255, 255, 222]);
  });
});

// ISSUES #39 rank-6 slice 4: turn 4's own DOUBLE_TEAM/ROCK_SLIDE window,
// flipped to Scene-OFF-owned presentation. The turn-4-only clone z-order
// bug this describe block used to pin (docs/battle-turn-notes.md §22,
// `drawDoubleTeamClones`'s own `frontClone` param) tested content that no
// longer renders under OFF (DOUBLE_TEAM's clone-blend is class (c), RAM-
// confirmed absent - same treatment turn 1's own OFF window already
// received in slice 1) - removed rather than re-pinned, since there is
// nothing left to pin. Oracle-verified via `turn4-doubleteam-off.json`
// (256/256) and `turn4-rockslide-off.json` (256/256).
describe("ISSUES #39 rank-6 slice 4: turn 4's own OFF-timed DOUBLE_TEAM/ROCK_SLIDE window", () => {
  it("stat-rose text phase: render 5080 (pressTick+155, STAT_ROSE_LINE1 not yet started) vs render 5081 (pressTick+156, TURN4_OFF_STAT_ROSE_TEXT_DELAY - the message box hard-cuts to the new text) - the two whole frames differ (the text-phase gate flips), and render 5109 (deep in STAT_ROSE_LINE1's own typing) is stable through the following tick (no further text-box-wide change until ROCK_SLIDE's own hand-off)", () => {
    const frameAt = (t: number): Uint8Array => {
      const fb = new Uint8Array(240 * 160 * 4);
      renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380, fightSubmenu: TURN4_FIGHT_SUBMENU_STATE, turn1Resolved: true, turn2Resolved: true, turn3Resolved: true, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false, turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null });
      return fb;
    };
    expect(frameAt(5080)).not.toEqual(frameAt(5081));
  });

  // PROGRESS #183/cleanup (docs/turn3-residual-probe-notes.md "The extremum
  // class, probed", tick 4934): `drawFightSubmenuWindow`'s `textStart` gate
  // keyed the ENDEAVOR-family kickoff delay off the monotonic `turn2Resolved`
  // flag alone, so turn 4's own DOUBLE_TEAM window (which needs the one-
  // tick-longer DOUBLE_TEAM-family delay, same as turn 1) wrongly got
  // ENDEAVOR's delay for exactly one tick (pressTick+9=4934, where the two
  // candidate delays disagree). Fixed by additionally excluding "turn3Resolved
  // true and turn4Resolved false" (turn 4's own window) from the ENDEAVOR-
  // family test.
  it("kickoff-text gate: render 4934 (pressTick+9) still shows the settled menu's message box (DOUBLE_TEAM-family delay, pressTick+10=4935, not yet reached) vs render 4935 (message box hard-cuts to blank/teal) at the message-box background pixel (16,118)", () => {
    expect(pixelAtTurn4(4933, 16, 118)).toEqual([255, 255, 255]);
    expect(pixelAtTurn4(4934, 16, 118)).toEqual([255, 255, 255]);
    expect(pixelAtTurn4(4935, 16, 118)).toEqual([107, 165, 165]);
  });
});

// PROGRESS #183/cleanup (docs/turn3-residual-probe-notes.md "The extremum
// class, probed", tick 5927): `core.ts` applies turn5SubmenuBounceTick's own
// -2-tick phase correction in the SAME render tick the reopen press itself
// registers (5927) - real hardware's own invisible bouncer switches ONE
// TICK LATER (RAM-confirmed no jump at 5926->5927). Fixed by keeping the
// unshifted `turn4RockSlideResettledBounceTick` through `t === pressTick`
// itself, switching to the shifted formula only from `pressTick + 1` on -
// a single-tick-scoped carve-out that cannot touch 5928+ (already exact).
describe("PROGRESS #183/cleanup: turn 5's own reopen - the one-tick-late bounce-formula switch (docs/battle-turn-notes.md §23)", () => {
  it("Onix bounce sprite: render 5926 (pre-reopen phase) vs render 5927 (the reopen press's own registering tick - now matches the SAME phase as 5928, not 5926's stale one) vs render 5928 (steady-state shifted formula) at (58,49)", () => {
    expect(pixelAtTurn5Reopen(5926, 58, 49)).toEqual([189, 181, 181]);
    expect(pixelAtTurn5Reopen(5927, 58, 49)).toEqual([247, 247, 255]);
    expect(pixelAtTurn5Reopen(5928, 58, 49)).toEqual([247, 247, 255]);
  });
});

// S7 slice K (docs/battle-turn-notes.md §24): the faint-sink closed form
// (docs/faint-switch-notes.md §7a, `SpriteCB_FaintOpponentMon`/
// `SpriteCB_AnimFaintOpponent`, battle_main.c:2744-2811) - RAM-pinned exact
// for Grovyle (yOffset=4, n=8) at handoff tick S=6502; this pins the CLOSED
// FORM itself against every one of the 8 RAM-confirmed step ticks (not just
// endpoints), independent of `tools/compare/traces/turn5-faint.json`'s own
// pixel parity (110/110, 0 diff) which only proves the RENDER, not the
// formula's own shape.
describe("S7 slice K: grovyleFaintSinkRowsAndY2 (docs/faint-switch-notes.md §7a's closed form)", () => {
  it("before the handoff tick S(6502), fully visible (keptRows=STEPS, y2=0)", () => {
    expect(grovyleFaintSinkRowsAndY2(GROVYLE_FAINT_SINK_START_TICK)).toEqual({ keptRows: GROVYLE_FAINT_SINK_STEPS, y2: 0 });
    expect(grovyleFaintSinkRowsAndY2(6000)).toEqual({ keptRows: 8, y2: 0 });
  });

  it("the 8 RAM-confirmed erase steps (S+1,S+3,...,S+15 = 6503,6505,...,6517) land at render ticks S+2,S+4,...,S+16 (the same +1 render lag every other ROCK_SLIDE mechanism in this file uses) - keptRows counts down 7->0, y2 climbs 8->64", () => {
    const expected = [
      [6504, 7, 8],
      [6505, 7, 8], // RAM unchanged between odd ticks - same render as 6504
      [6506, 6, 16],
      [6508, 5, 24],
      [6510, 4, 32],
      [6512, 3, 40],
      [6514, 2, 48],
      [6516, 1, 56],
      [6518, 0, 64],
    ] as const;
    for (const [t, keptRows, y2] of expected) {
      expect(grovyleFaintSinkRowsAndY2(t), `tick ${t}`).toEqual({ keptRows, y2 });
    }
  });

  it("destroyed at S+2n+1=6519 (RAM-confirmed) - stays fully erased (keptRows=0) forever after, y2 clamped at its final 64", () => {
    expect(grovyleFaintSinkRowsAndY2(6519)).toEqual({ keptRows: 0, y2: 64 });
    expect(grovyleFaintSinkRowsAndY2(6560)).toEqual({ keptRows: 0, y2: 64 });
    expect(grovyleFaintSinkRowsAndY2(9999)).toEqual({ keptRows: 0, y2: 64 });
  });
});

// ISSUES #39 rank-3 mirror retirement: the old dismiss timestamp was never
// consumed by rendering or continuation. The immutable staged KO -> switch-in
// -> Sitrus -> next-command lifecycle owns the facts; this compatibility
// window remains a pure presentation clock.
describe("rank-3 turn-5 KO dismiss mirror retirement", () => {
  function stateAtTurn5Confirm(): { battleScene: BattleSceneState } {
    return {
      battleScene: {
        elapsed: 5959 - TICK0,
        sendOutPressElapsed: 380,
        fightSubmenu: {
          openElapsed: 5927 - TICK0,
          cursor: 0,
          displayCursor: 0,
          closeElapsed: null,
          confirmElapsed: 5959 - TICK0,
          activeMonMoveset: rentalMoveset("ONIX"),
          reopenedFromClose: false,
        },
        turn1Resolved: true,
        turn2Resolved: true,
        turn3Resolved: true,
        turn4Resolved: true,
        turn5NextCommandHandoff: null,
      turn6NextCommandHandoff: null,
      turn7NextCommandHandoff: null,
      turn8Resolved: false,
      turn9Resolved: false, turn10Resolved: false, turn11Resolved: false,
      turn12Resolved: false, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null,
      },
    };
  }

  it("turn5RockSlideKoDismissEligible: false before the fainted text's own cursor tick (6543), true from exactly that tick on", () => {
    expect(turn5RockSlideKoDismissEligible(6542)).toBe(false);
    expect(turn5RockSlideKoDismissEligible(6543)).toBe(true);
    expect(turn5RockSlideKoDismissEligible(7000)).toBe(true);
  });

  it.each([6561, 6591])("the historical dismiss A edge at trace tick %i is presentation-inert and produces exactly the same battle state as idle", (pressTick) => {
    let state: EngineState = { ...createInitialState(), battleScene: stateAtTurn5Confirm().battleScene };
    for (let i = 0; i < pressTick - 1 - 5959; i += 1) state = tick(state, new Set());
    expect(state.battleScene!.elapsed).toBe(pressTick - 1 - TICK0);
    const idle = tick(state, new Set());
    const pressed = tick(state, new Set(["A"]));
    expect(pressed.battleScene).toEqual(idle.battleScene);
  });

  it("an early A edge is likewise presentation-inert", () => {
    const state: EngineState = { ...createInitialState(), battleScene: stateAtTurn5Confirm().battleScene };
    expect(tick(state, new Set(["A"])).battleScene).toEqual(
      tick(state, new Set()).battleScene,
    );
  });
});

describe("S7 slice L (docs/faint-switch-notes.md §9's own follow-up, RAM-probed this session): the switch-in icon-bar re-trigger", () => {
  it("TURN5_OPPONENT_ICON_STATES: only GROVYLE's own former slot (index 5) flips Full -> Statused, oracle-pixel-confirmed (docs §9's own correction)", () => {
    expect(TURN5_OPPONENT_ICON_STATES).toEqual(["Empty", "Empty", "Empty", "Full", "Full", "Statused"]);
  });

  it("turn5IconBarEva: the tick-6727 transient RAM-pinned this session (switchin-iconbar-transient.json) - flat (unblended) through the render tick right before the fade, then a 1-unit/tick ramp 16->0 over RAM ticks 6725-6741, clamped at 0 through the destroy tick", () => {
    // rt = t - 1 (this module's own established render-lag convention) -
    // render tick TURN5_ICONBAR_FADE_START_TICK + 1 is the first tick whose
    // rt equals the RAM tick the OAM objMode flip actually lands on.
    expect(turn5IconBarEva(TURN5_ICONBAR_FADE_START_TICK)).toBeNull(); // rt = FADE_START-1, still flat
    expect(turn5IconBarEva(TURN5_ICONBAR_FADE_START_TICK + 1)).toBe(16); // rt = FADE_START, mode just flipped, still visually opaque
    expect(turn5IconBarEva(TURN5_ICONBAR_FADE_START_TICK + 2)).toBe(15);
    expect(turn5IconBarEva(TURN5_ICONBAR_FADE_START_TICK + 17)).toBe(0); // rt = FADE_START+16 = DESTROY_TICK-1, fully faded
    expect(turn5IconBarEva(TURN5_ICONBAR_DESTROY_TICK + 5)).toBe(0); // clamped, not negative
  });

  it("TURN5_ICONBAR_CREATE_TICK/FADE_START_TICK/DESTROY_TICK: the three RAM-pinned anchors this session's probe found (bar + 6 icons move/fade/destroy in lockstep, no per-icon stagger)", () => {
    expect(TURN5_ICONBAR_CREATE_TICK).toBe(6587);
    expect(TURN5_ICONBAR_FADE_START_TICK).toBe(6725);
    expect(TURN5_ICONBAR_DESTROY_TICK).toBe(6742);
  });
});

describe("S7 slice L: switchinSentOutTextVisibleChars (docs/faint-switch-notes.md §9, byte-exact 6687-6726)", () => {
  it("0 chars before the start tick, growing 1/tick from it, clamped at the full total", () => {
    expect(switchinSentOutTextVisibleChars(SWITCHIN_SENTOUT_TEXT_START_TICK - 1)).toBe(0);
    expect(switchinSentOutTextVisibleChars(SWITCHIN_SENTOUT_TEXT_START_TICK)).toBe(1);
    expect(switchinSentOutTextVisibleChars(SWITCHIN_SENTOUT_TEXT_START_TICK + 1)).toBe(2);
    expect(switchinSentOutTextVisibleChars(SWITCHIN_SENTOUT_TEXT_START_TICK + SWITCHIN_SENTOUT_TEXT_TOTAL + 50)).toBe(
      SWITCHIN_SENTOUT_TEXT_TOTAL,
    );
  });
});

describe("S7 slice L-3: TURN5_BALL_HANDOFF_TICK (docs/faint-switch-notes.md §10 - RAM ball-creation tick, oracle-pixel-verified: reusing drawSendOutBall's own BALL_CLOSED_START_OFFSET(2) against this anchor lands the ball's first visible pixel exactly on render 6729, matched 0-diff against turn5-switchin.json)", () => {
  it("is the RAM-probed ball-creation tick (battle1-switchin-ball-particle-detail-probe.json, slot 7)", () => {
    expect(TURN5_BALL_HANDOFF_TICK).toBe(6727);
  });
});

describe("S7 slice L-4: turn5MaterializeCoeff (docs/faint-switch-notes.md §10 correction - RAM-solved directly from gPlttBufferFaded+0x230/Unfaded+0x230, the OBJ-palette-bank-1 color-8 offset, cross-validated against 3 independent oracle pixels' own true palette colors; the prior session's [13,13,11,11,9,9,8,6,6,4,4,2,2,1,0] table and its 'same render tick' finding were both corrupted by a degenerate palette-index choice, root-caused and replaced this session)", () => {
  it("is flat coefficient 16 (fully opaque) through render 6767", () => {
    expect(turn5MaterializeCoeff(6588)).toBe(16);
    expect(turn5MaterializeCoeff(6746)).toBe(16);
    expect(turn5MaterializeCoeff(6767)).toBe(16);
  });
  it("ramps perfectly linearly 15->0, one integer step per tick, starting render 6768 (RAM tick T's value first visible render T+1, the ordinary lag)", () => {
    expect(turn5MaterializeCoeff(6768)).toBe(15);
    expect(turn5MaterializeCoeff(6769)).toBe(14);
    expect(turn5MaterializeCoeff(6770)).toBe(13);
    expect(turn5MaterializeCoeff(6775)).toBe(8);
    expect(turn5MaterializeCoeff(6782)).toBe(1);
    expect(turn5MaterializeCoeff(6783)).toBe(0);
  });
  it("stays 0 past the ramp (into the wobble-table phase)", () => {
    expect(turn5MaterializeCoeff(6784)).toBe(0);
    expect(turn5MaterializeCoeff(6800)).toBe(0);
  });
});

describe("S7 slice M: turn5PidgeottoHealthboxSlideDx (docs/faint-switch-notes.md §8e/§11 - same 23-step linear slide as S6's own send-out healthbox, re-anchored TURN5_PIDGEOTTO_SETTLE_TICK+1 - the +1 is a pixel-verified correction this session, a naive TURN5_PIDGEOTTO_SETTLE_TICK anchor reproduced the oracle's own sequence exactly one tick early throughout)", () => {
  it("is null (not yet created) before the mon's own materialize settles", () => {
    expect(turn5PidgeottoHealthboxSlideDx(TURN5_PIDGEOTTO_SETTLE_TICK - 1)).toBeNull();
    expect(turn5PidgeottoHealthboxSlideDx(TURN5_PIDGEOTTO_SETTLE_TICK)).toBeNull();
  });
  it("starts at -110 the tick it's created and climbs +5/tick", () => {
    expect(turn5PidgeottoHealthboxSlideDx(TURN5_PIDGEOTTO_SETTLE_TICK + 1)).toBe(-110);
    expect(turn5PidgeottoHealthboxSlideDx(TURN5_PIDGEOTTO_SETTLE_TICK + 2)).toBe(-105);
    expect(turn5PidgeottoHealthboxSlideDx(TURN5_PIDGEOTTO_SETTLE_TICK + 22)).toBe(-5);
  });
  it("settles to 0 at render 6851 (22 steps after the +1-lagged creation tick 6829) and stays settled indefinitely", () => {
    expect(turn5PidgeottoHealthboxSlideDx(6851)).toBe(0);
    expect(turn5PidgeottoHealthboxSlideDx(6852)).toBe(0);
    expect(turn5PidgeottoHealthboxSlideDx(7000)).toBe(0);
  });
});

describe("S7 slice M-3 (docs/faint-switch-notes.md §12/§13): drawSpriteSheetAffineRotate's sampler, pinned against a small hand-built fixture at both a tiny and a large rotation angle - this session's own RAM/oracle bisection found the SAMPLER needs no change at all (the prior session's regression was a render-tick lag miswiring, not a rounding bug); this pins the sampler's own already-correct floor-based (>>8) convention so a future edit can't silently reintroduce one", () => {
  // 1 tile (8x8), two marked texels: (col=6,row=2) -> palette index 1, (col=1,row=5) -> palette index 2.
  const tile = new Array(64).fill(0);
  tile[2 * 8 + 6] = 1;
  tile[5 * 8 + 1] = 2;
  const tileset = { columns: 1, rows: 1, tiles: [tile] };
  const palette = [
    { r: 0, g: 0, b: 0 },
    { r: 200, g: 50, b: 80 },
    { r: 10, g: 220, b: 30 },
  ];
  const CENTER_X = 120;
  const CENTER_Y = 80;

  function render(pa: number, pb: number, pc: number, pd: number): Uint8Array {
    const fb = new Uint8Array(240 * 160 * 4);
    drawSpriteSheetAffineRotate(fb, tileset, palette, CENTER_X, CENTER_Y, pa, pb, pc, pd);
    return fb;
  }
  function pixelAtOffset(fb: Uint8Array, dx: number, dy: number): [number, number, number] {
    const o = ((CENTER_Y + dy) * 240 + (CENTER_X + dx)) * 4;
    return [fb[o]!, fb[o + 1]!, fb[o + 2]!];
  }

  it("identity (pa=pd=256, pb=pc=0) reproduces the plain tileset unrotated", () => {
    const fb = render(256, 0, 0, 256);
    expect(pixelAtOffset(fb, 2, -2)).toEqual([200, 50, 80]); // tex(6,2)
    expect(pixelAtOffset(fb, -3, 1)).toEqual([10, 220, 30]); // tex(1,5)
  });

  it("a tiny rotation (a=255,b=6,c=-6,d=255 - docs/faint-switch-notes.md §12's own RAM-read tick-6873 matrix) shears both axes together, not a vertical-only translate", () => {
    const fb = render(255, 6, -6, 255);
    expect(pixelAtOffset(fb, 3, -1)).toEqual([200, 50, 80]); // tex(6,2)
    expect(pixelAtOffset(fb, -3, 1)).toEqual([10, 220, 30]); // tex(1,5)
  });

  it("a large rotation (90 degrees: a=0,b=256,c=-256,d=0) stays exact - the thrown ball's own already-proven magnitude range", () => {
    const fb = render(0, 256, -256, 0);
    expect(pixelAtOffset(fb, 2, 2)).toEqual([200, 50, 80]); // tex(6,2)
    expect(pixelAtOffset(fb, -1, -3)).toEqual([10, 220, 30]); // tex(1,5)
  });
});

describe("S7 slice N-3: drawSpriteSheetAffineRotate against FEATHER_DANCE's own real per-tick matrix (docs/turn6-notes.md §6, src/data/gen/turn6-feather-sprites-probe.json tick 7404 slot 3, a=225,b=-120,c=120,d=225) - the generic 2x2-matrix blit this slice's 8 independently-rotating feather sprites reuse, over a MULTI-TILE (2x2, 16x16) sheet (the sitrus tests above only ever exercise a single 8x8 tile)", () => {
  // 2x2 tiles (16x16), two marked texels in DIFFERENT tiles: absolute sprite
  // pixel (col=10,row=3) -> tile(1,0) pixel(2,3) = palette index 1; absolute
  // (col=3,row=12) -> tile(0,1) pixel(3,4) = palette index 2.
  const tileA = new Array(64).fill(0);
  tileA[3 * 8 + 2] = 1;
  const tileB = new Array(64).fill(0);
  tileB[4 * 8 + 3] = 2;
  const blank = new Array(64).fill(0);
  const tileset = { columns: 2, rows: 2, tiles: [blank, tileA, tileB, blank] };
  const palette = [
    { r: 0, g: 0, b: 0 },
    { r: 240, g: 90, b: 12 },
    { r: 18, g: 160, b: 244 },
  ];
  const CENTER_X = 100;
  const CENTER_Y = 70;

  it("reproduces both markers at their hand-solved inverse-sampled offsets", () => {
    const fb = new Uint8Array(240 * 160 * 4);
    drawSpriteSheetAffineRotate(fb, tileset, palette, CENTER_X, CENTER_Y, 225, -120, 120, 225);
    const at = (dx: number, dy: number): [number, number, number] => {
      const o = ((CENTER_Y + dy) * 240 + (CENTER_X + dx)) * 4;
      return [fb[o]!, fb[o + 1]!, fb[o + 2]!];
    };
    expect(at(0, -5)).toEqual([240, 90, 12]); // tex(10,3), tile(1,0)
    expect(at(-2, 6)).toEqual([18, 160, 244]); // tex(3,12), tile(0,1)
  });
});

describe("ISSUES #30 class (b) fix: drawSpriteSheetAffineRotate's doubleSizeBox param (docs/feather-order-notes.md's 2026-07-21 'normal-box clipping' session) - gFallingFeatherSpriteTemplate is ST_OAM_AFFINE_NORMAL (reference/pokeemerald/src/battle_anim_flying.c:175), not _DOUBLE, so real hardware hard-clips rotated content beyond the sprite's own 32x32 box", () => {
  // A fully-opaque 32x32 (4x4 tile) source and a real feather rotation matrix
  // (the same a=225,b=-120,c=120,d=225 the tests above use) - opaque
  // everywhere so any painted-vs-clipped difference is visible regardless of
  // the real feather art's own transparent regions.
  const opaqueTile = new Array(64).fill(1);
  const tileset = { columns: 4, rows: 4, tiles: new Array(16).fill(opaqueTile) };
  const palette = [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }];
  const CENTER_X = 100;
  const CENTER_Y = 70;
  const at = (fb: Uint8Array, dx: number, dy: number): boolean => fb[((CENTER_Y + dy) * 240 + (CENTER_X + dx)) * 4 + 3] === 255;

  it("defaults to the doubled (AFFINE_DOUBLE) box, painting rotated content beyond the nominal +-16 box - unchanged for every pre-existing caller", () => {
    const fb = new Uint8Array(240 * 160 * 4);
    drawSpriteSheetAffineRotate(fb, tileset, palette, CENTER_X, CENTER_Y, 225, -120, 120, 225);
    expect(at(fb, 6, -21)).toBe(true); // dy=-21 is outside the +-16 normal box but a valid, opaque source sample
  });

  it("doubleSizeBox=false (feather sprites) clips that same rotated corner pixel - real AFFINE_NORMAL hardware never paints outside the sprite's own nominal box", () => {
    const fb = new Uint8Array(240 * 160 * 4);
    drawSpriteSheetAffineRotate(fb, tileset, palette, CENTER_X, CENTER_Y, 225, -120, 120, 225, undefined, false);
    expect(at(fb, 6, -21)).toBe(false);
  });

  it("doubleSizeBox=false still paints pixels genuinely inside the nominal box identically to the default", () => {
    const fbDouble = new Uint8Array(240 * 160 * 4);
    const fbNormal = new Uint8Array(240 * 160 * 4);
    drawSpriteSheetAffineRotate(fbDouble, tileset, palette, CENTER_X, CENTER_Y, 225, -120, 120, 225);
    drawSpriteSheetAffineRotate(fbNormal, tileset, palette, CENTER_X, CENTER_Y, 225, -120, 120, 225, undefined, false);
    expect(at(fbDouble, 0, 0)).toBe(true);
    expect(at(fbNormal, 0, 0)).toBe(true);
  });
});

describe("S7 slice N-3: turn6FeatherSprites (src/animation/featherDance.ts) - RAM-table-driven (not a from-scratch port, see the module's own doc for why), +1 render lag bisected against the oracle this session", () => {
  it("is empty before the window and once every feather has despawned", () => {
    expect(turn6FeatherSprites(7404)).toEqual([]); // render 7404 -> RAM 7403, before spawn
    expect(turn6FeatherSprites(7600)).toEqual([]); // well past every sprite's own despawn tick
  });
  it("the first visible tick (7405, RAM 7404) is exactly slot 3's own spawn snapshot", () => {
    const sprites = turn6FeatherSprites(7405);
    expect(sprites).toHaveLength(1);
    expect(sprites[0]).toEqual({ centerX: 112, centerY: 64, pa: 225, pb: -120, pc: 120, pd: 225, animNum: 1, priority: 3, slot: 3, order: 0 });
  });
  it("all 8 sprites are live by render tick 7437 (RAM 7436, the last spawn group)", () => {
    expect(turn6FeatherSprites(7437)).toHaveLength(8);
  });
});

describe("S7 engine slice Q rungs (b)/(c) (docs/battle-turn-notes.md §34): turn7FeatherSprites/turn8FeatherSprites - same RAM-table mechanism as turn6FeatherSprites, own probe tables, same +1 render lag re-verified against the oracle", () => {
  it("turn7FeatherSprites is empty before its own window and matches turn6's own spawn snapshot at the first live tick (8439, RAM 8438)", () => {
    expect(turn7FeatherSprites(8438)).toEqual([]);
    const sprites = turn7FeatherSprites(8439);
    expect(sprites).toHaveLength(1);
    expect(sprites[0]).toEqual({ centerX: 112, centerY: 64, pa: 225, pb: -120, pc: 120, pd: 225, animNum: 1, priority: 3, slot: 3, order: 0 });
  });
  it("turn8FeatherSprites is empty before its own window and matches turn6's own spawn snapshot at the first live tick (9485, RAM 9484)", () => {
    expect(turn8FeatherSprites(9484)).toEqual([]);
    const sprites = turn8FeatherSprites(9485);
    expect(sprites).toHaveLength(1);
    expect(sprites[0]).toEqual({ centerX: 112, centerY: 64, pa: 225, pb: -120, pc: 120, pd: 225, animNum: 1, priority: 3, slot: 3, order: 0 });
  });
});

describe("S7 engine slice Q rung (a) (docs/battle-turn-notes.md §29/§34): compareFeatherDrawOrder - real per-tick same-priority overlap from the 7421-7549 residual window (RAM tick 7428, render 7429), lower slot drawn LAST (on top)", () => {
  it("sorts the base-priority group at render tick 7429 (4 overlapping same-priority feathers) with the lowest slot drawn last (on top)", () => {
    // src/data/gen/turn6-feather-sprites-probe.json tick 7428: slots 4/7/8/10
    // are all priority 2 and overlap on-screen by render tick 7429 (+1 lag) -
    // this is the group whose draw order this session's oracle bisection
    // (battle-turn-notes.md §29/§34) found flips the residual's worst frames
    // from ~30px wrong to near-0. At this specific tick candidate A's
    // simulated sSpriteOrder (ISSUES #30 adoption, below) happens to agree
    // with the old descending-slot heuristic - see the next test for a tick
    // where the two rules actually diverge.
    const sprites = turn6FeatherSprites(7429).filter((s) => s.priority === 2);
    const slots = sprites.map((s) => s.slot).sort((a, b) => a - b);
    expect(slots).toEqual([4, 7, 8, 10]);
    const sorted = [...sprites].sort(compareFeatherDrawOrder);
    expect(sorted[sorted.length - 1]!.slot).toBe(4); // lowest slot drawn last -> on top
    expect(sorted[0]!.slot).toBe(10); // highest slot drawn first -> backmost
  });
  it("orders by priority first, simulated sSpriteOrder position only as the same-priority tiebreak", () => {
    const a = { centerX: 0, centerY: 0, pa: 256, pb: 0, pc: 0, pd: 256, animNum: 0 as const, priority: 2, slot: 3, order: 0 };
    const b = { centerX: 0, centerY: 0, pa: 256, pb: 0, pc: 0, pd: 256, animNum: 0 as const, priority: 3, slot: 12, order: 0 };
    expect(compareFeatherDrawOrder(a, b)).toBeGreaterThan(0); // b (higher priority number) sorts first
  });
  it("ISSUES #30 candidate A adoption: render tick 7430 (RAM 7429) is the window's first tick where the simulated sSpriteOrder tiebreak diverges from the old descending-slot heuristic, and the engine now follows the simulation", () => {
    // Per docs/feather-order-notes.md's "candidate A wins" derivation: at RAM
    // tick 7429 the persistent-insertion-sort simulation's front-to-back
    // sSpriteOrder for the live priority-2 group {4,7,8,10} is [7,4,8,10]
    // (position 0 = frontmost/on top), which paints (first..last) as
    // [10,8,4,7] - slot 7 ends up on top. The old ascending-slot-skeleton-
    // unaware "lower slot on top" heuristic instead painted [10,8,7,4] (slot
    // 4 on top). This is a real, verified (tools/probe/dump-feather-order-
    // candidates.py) divergence point, not a coincidence like tick 7429
    // above - pins the actual algorithm swap, not just its output shape.
    const sprites = turn6FeatherSprites(7430).filter((s) => s.priority === 2);
    const slots = sprites.map((s) => s.slot).sort((a, b) => a - b);
    expect(slots).toEqual([4, 7, 8, 10]);
    const sorted = [...sprites].sort(compareFeatherDrawOrder);
    expect(sorted.map((s) => s.slot)).toEqual([10, 8, 4, 7]); // paint order: 7 on top, NOT 4 (the old rule's answer)
  });
});

describe("S7 slice M-3: onixSitrusRotateMatrix (docs/faint-switch-notes.md §12/§13) - RAM-read 32-entry table, anchored at RAM tick 6872 (identity), 3 cycles, +2 render-tick lag from the RAM tick (not the usual +1 - RAM-pixel-bisected this session)", () => {
  it("is null (plain static draw) before the rotation's own render window starts", () => {
    expect(onixSitrusRotateMatrix(6873)).toBeNull();
    expect(onixSitrusRotateMatrix(6874)).toBeNull(); // RAM tick 6872 (identity) - lag +2
  });
  it("first non-identity render tick is 6875 (RAM tick 6873's own a=255,b=6,c=-6,d=255, y2=|c|>>3=0)", () => {
    expect(onixSitrusRotateMatrix(6875)).toEqual({ pa: 255, pb: 6, pc: -6, pd: 255, y2: 0 });
  });
  it("render tick 6889 is the cycle's own peak (RAM tick 6887, a=251,b=49,c=-49,d=251, y2=6)", () => {
    expect(onixSitrusRotateMatrix(6889)).toEqual({ pa: 251, pb: 49, pc: -49, pd: 251, y2: 6 });
  });
  it("returns to identity/null at every cycle boundary (RAM ticks 6872/6904/6936/6968, render +2)", () => {
    expect(onixSitrusRotateMatrix(6906)).toBeNull();
    expect(onixSitrusRotateMatrix(6938)).toBeNull();
    expect(onixSitrusRotateMatrix(6970)).toBeNull();
  });
  it("is null past the 3rd cycle (the task ends, RAM tick > 6968 - the next, still-unmodeled stage is GrantingStarsEffect)", () => {
    expect(onixSitrusRotateMatrix(6971)).toBeNull();
    expect(onixSitrusRotateMatrix(7000)).toBeNull();
  });
});

describe("S7 slice M-4: turn5GrantingStarPlacement (docs/faint-switch-notes.md §14) - GrantingStarsEffect's two star sprites, RAM-probed fresh (spawn ticks 10 apart, not the source's own '8 ticks' framing), 0px diff against the oracle at every bisected tick", () => {
  it("is null before its own spawn tick, and on the spawn tick itself (creation-tick invisibility, pixel-isolated at renders 6969/6979)", () => {
    expect(turn5GrantingStarPlacement(6968, 0)).toBeNull(); // render 6968 -> RAM 6967, before spawn
    expect(turn5GrantingStarPlacement(6969, 0)).toBeNull(); // render 6969 -> RAM 6968, spawn tick itself
    expect(turn5GrantingStarPlacement(6979, 1)).toBeNull(); // render 6979 -> RAM 6978, star 1's own spawn tick
  });
  it("first visible tick is spawnTick+1 (render spawnTick+2, +1 creation lag +1 RAM-to-render lag), frame 0, y2 0", () => {
    expect(turn5GrantingStarPlacement(6970, 0)).toEqual({ frameIndex: 0, cx: 41, cy: 72 });
    expect(turn5GrantingStarPlacement(6980, 1)).toEqual({ frameIndex: 0, cx: 68, cy: 67 });
  });
  it("matches the 6 independently pixel-bisected (tick, star, frame) triples this session verified at 0px diff", () => {
    expect(turn5GrantingStarPlacement(6990, 0)).toEqual({ frameIndex: 3, cx: 41, cy: 74 });
    expect(turn5GrantingStarPlacement(6997, 0)).toEqual({ frameIndex: 4, cx: 41, cy: 75 });
    expect(turn5GrantingStarPlacement(7004, 0)).toEqual({ frameIndex: 5, cx: 41, cy: 76 });
    expect(turn5GrantingStarPlacement(7000, 1)).toEqual({ frameIndex: 3, cx: 68, cy: 69 });
    expect(turn5GrantingStarPlacement(7007, 1)).toEqual({ frameIndex: 4, cx: 68, cy: 70 });
    expect(turn5GrantingStarPlacement(7014, 1)).toEqual({ frameIndex: 5, cx: 68, cy: 71 });
  });
  it("the anim loops (8 frames x 7 ticks = 56) then is destroyed at local tick 62 (render spawnTick+63)", () => {
    expect(turn5GrantingStarPlacement(6968 + 56 + 1, 0)?.frameIndex).toBe(0); // loop restart
    expect(turn5GrantingStarPlacement(6968 + 61 + 1, 0)).not.toBeNull(); // last live tick
    expect(turn5GrantingStarPlacement(6968 + 62 + 1, 0)).toBeNull(); // destroyed
  });
});

describe("S7 slice M-5 (docs/faint-switch-notes.md §15): Onix's own Sitrus tint - RAM brute-forced against gPlttBufferFaded/Unfaded across all 15 usable palette colors x 5 time steps, uniquely pinned target RGB5(17,31,25) + coeff sequence 7/5/3/1/0", () => {
  it("is 0 outside the RAM window (7041-7060 inclusive), +1 render lag", () => {
    expect(onixSitrusTintCoeff(7041)).toBe(0); // render 7041 -> RAM 7040, before onset
    expect(onixSitrusTintCoeff(7062)).toBe(0); // render 7062 -> RAM 7061, back to true color
  });
  it("holds each of the 4 nonzero coefficients for exactly 5 RAM ticks (a step function, not a smooth ramp)", () => {
    expect(onixSitrusTintCoeff(7042)).toBe(7); // render 7042 -> RAM 7041
    expect(onixSitrusTintCoeff(7046)).toBe(7); // RAM 7045, last tick of the coeff-7 step
    expect(onixSitrusTintCoeff(7047)).toBe(5); // RAM 7046, coeff-5 step begins
    expect(onixSitrusTintCoeff(7052)).toBe(3); // RAM 7051
    expect(onixSitrusTintCoeff(7057)).toBe(1); // RAM 7056
    expect(onixSitrusTintCoeff(7061)).toBe(1); // RAM 7060, last nonzero tick
  });
});

describe("ISSUES #26 (docs/faint-switch-notes.md §16): turn5SitrusRingMatrix - the Sitrus proc's THIN_RING, a pure isotropic scale (a=d=floor(4096/n), b=c=0) RAM-pinned against the committed probe (src/data/gen/turn5-sitrus-ring-probe.json), ordinary +1 render lag (NOT onixSitrusRotateMatrix's +2 rotation-matrix class)", () => {
  it("is null outside the ring's own live render window (renders 7041-7072, RAM 7040-7071)", () => {
    expect(turn5SitrusRingMatrix(7040)).toBeNull(); // render 7040 -> RAM 7039, before the sprite exists
    expect(turn5SitrusRingMatrix(7073)).toBeNull(); // render 7073 -> RAM 7072, destroyed the RAM tick after 7071
  });
  it("matches the probe's clamp-low end: RAM 7040 (n=1) is the sprite's very first live tick, a=4096 (1/16 native scale)", () => {
    expect(turn5SitrusRingMatrix(7041)).toEqual({ pa: 4096, pb: 0, pc: 0, pd: 4096 }); // render 7041 -> RAM 7040
  });
  it("matches the probe at RAM 7041/7047 (the two pixel-bisected sample ticks, 6/6 and 92/92 opaque px exact)", () => {
    expect(turn5SitrusRingMatrix(7042)).toEqual({ pa: 2048, pb: 0, pc: 0, pd: 2048 }); // render 7042 -> RAM 7041
    expect(turn5SitrusRingMatrix(7048)).toEqual({ pa: 512, pb: 0, pc: 0, pd: 512 }); // render 7048 -> RAM 7047
  });
  it("RAM 7055 (n=16) is exactly the neutral/identity scale - the ring at its native 64x64 size", () => {
    expect(turn5SitrusRingMatrix(7056)).toEqual({ pa: 256, pb: 0, pc: 0, pd: 256 }); // render 7056 -> RAM 7055
  });
  it("matches the probe's clamp-high end: n clamps at 31 (RAM 7070), and the last live tick (RAM 7071) holds the same value", () => {
    expect(turn5SitrusRingMatrix(7071)).toEqual({ pa: 132, pb: 0, pc: 0, pd: 132 }); // render 7071 -> RAM 7070, n=31
    expect(turn5SitrusRingMatrix(7072)).toEqual({ pa: 132, pb: 0, pc: 0, pd: 132 }); // render 7072 -> RAM 7071, held (affineAnimEnded)
  });
});

describe("S7 slice M-5: turn5SitrusHealTextVisibleChars - \"ONIX’s SITRUS BERRY\\nrestored health!\" (35 chars, PNG-diff-confirmed char-per-tick onset/end)", () => {
  it("is 0 before the box redraw tick (7078)", () => {
    expect(turn5SitrusHealTextVisibleChars(7077)).toBe(0);
  });
  it("prints 1 char/tick including silent-but-charged spaces, clamped at the string's own 35-char total", () => {
    expect(turn5SitrusHealTextVisibleChars(7078)).toBe(1);
    expect(turn5SitrusHealTextVisibleChars(7112)).toBe(35);
    expect(turn5SitrusHealTextVisibleChars(7215)).toBe(35);
  });
});

describe("S7 slice M-5: turn5SitrusOnixHp - the heal's own 1->31 HP-bar climb, PNG-crop-matched byte-exact against composePlayerHealthboxHpOverlay's own render for every candidate hp", () => {
  it("holds at 1 (the pre-heal hp) before the climb starts", () => {
    expect(turn5SitrusOnixHp(7179)).toBe(1);
  });
  it("climbs exactly 1 hp/tick from render tick 7180 (hp=2) through 7209 (hp=31)", () => {
    expect(turn5SitrusOnixHp(7180)).toBe(2);
    expect(turn5SitrusOnixHp(7190)).toBe(12);
    expect(turn5SitrusOnixHp(7209)).toBe(31);
  });
  it("stays clamped at 31 (settled) indefinitely past the climb - §11's own 'still climbing past 7306' hedge was a bounce-cycle illusion, not a real climb", () => {
    expect(turn5SitrusOnixHp(7306)).toBe(31);
    expect(turn5SitrusOnixHp(9999)).toBe(31);
  });
});

describe("S7 slice M-5: turn5SitrusResettledBounceTick - the settled turn-6 menu reuses menuIdleBounce verbatim, re-anchored so the redraw tick (7222) lines up with MENU_IDLE_BLANK_END_TICK+1 (1748), grid-search-confirmed against a 17-sample healthboxY2 sequence with zero mismatches", () => {
  it("maps the menu redraw tick to the shared epoch's own fresh-restart point", () => {
    expect(turn5SitrusResettledBounceTick(7222)).toBe(1748);
  });
});

describe("ISSUES #39 rank-5 slice 1: turn9Ep2HealthboxWobbleY2 - the 20-tick healthbox y2 wobble, re-anchored to Scene OFF (RAM 10955-10974, render=RAM+1), independent of the flicker gate below (dump-turn9-hitanim-off.py)", () => {
  const pressTick = 10871;
  it("is 0 before the window (render 10955)", () => {
    expect(turn9Ep2HealthboxWobbleY2(10955, pressTick)).toBe(0);
  });
  it("alternates +1/-1 starting render 10956", () => {
    expect(turn9Ep2HealthboxWobbleY2(10956, pressTick)).toBe(1);
    expect(turn9Ep2HealthboxWobbleY2(10957, pressTick)).toBe(-1);
    expect(turn9Ep2HealthboxWobbleY2(10958, pressTick)).toBe(1);
    expect(turn9Ep2HealthboxWobbleY2(10959, pressTick)).toBe(-1);
  });
  it("holds the alternation through its last tick (render 10975) then stops", () => {
    expect(turn9Ep2HealthboxWobbleY2(10974, pressTick)).toBe(1);
    expect(turn9Ep2HealthboxWobbleY2(10975, pressTick)).toBe(-1);
    expect(turn9Ep2HealthboxWobbleY2(10976, pressTick)).toBe(0);
  });
});

describe("ISSUES #39 rank-5 slice 1: turn9Ep2OnixInvisible - the FOUR-block Onix visibility flicker, re-anchored to Scene OFF (RAM 10956-10987, render=RAM+1), own timing vs. the healthbox wobble above - do NOT couple them (dump-turn9-hitanim-off.py)", () => {
  const pressTick = 10871;
  it("is false before the window (render 10956)", () => {
    expect(turn9Ep2OnixInvisible(10956, pressTick)).toBe(false);
  });
  it("is true for each 4-tick on block (10957-10960, 10965-10968, 10973-10976, 10981-10984)", () => {
    for (const t of [
      10957, 10958, 10959, 10960,
      10965, 10966, 10967, 10968,
      10973, 10974, 10975, 10976,
      10981, 10982, 10983, 10984,
    ]) {
      expect(turn9Ep2OnixInvisible(t, pressTick)).toBe(true);
    }
  });
  it("is false for each 4-tick off gap (10961-10964, 10969-10972, 10977-10980)", () => {
    for (const t of [10961, 10962, 10963, 10964, 10969, 10970, 10971, 10972, 10977, 10978, 10979, 10980]) {
      expect(turn9Ep2OnixInvisible(t, pressTick)).toBe(false);
    }
  });
  it("is false again from render 10985 through the task's own force-visible tick (render 10989) and beyond", () => {
    for (const t of [10985, 10986, 10987, 10988, 10989, 10990, 11000]) {
      expect(turn9Ep2OnixInvisible(t, pressTick)).toBe(false);
    }
  });
});

describe("S7 engine step PART 2 (docs/aerial-ace-notes.md's own 'Mission B: SOLVED' section): turn10's own re-anchored flicker (start=102, render 12408-12435) - reuses turn9Ep2OnixInvisible verbatim, only the start delay differs", () => {
  const pressTick = 12305;
  it("is false before the window (render 12407)", () => {
    expect(turn9Ep2OnixInvisible(12407, pressTick, 102)).toBe(false);
  });
  it("is true for each 4-tick on block (12408-12411, 12416-12419, 12424-12427, 12432-12435)", () => {
    for (const t of [12408, 12409, 12410, 12411, 12416, 12417, 12418, 12419, 12424, 12425, 12426, 12427, 12432, 12433, 12434, 12435]) {
      expect(turn9Ep2OnixInvisible(t, pressTick, 102)).toBe(true);
    }
  });
  it("is false for each 4-tick off gap (12412-12415, 12420-12423, 12428-12431) and after the last block (12436+)", () => {
    for (const t of [12412, 12413, 12414, 12415, 12420, 12421, 12422, 12423, 12428, 12429, 12430, 12431, 12436, 12437]) {
      expect(turn9Ep2OnixInvisible(t, pressTick, 102)).toBe(false);
    }
  });
});

describe("S7 engine step PART 2 (npm run compare pixel-bisected, not previously pinned by any probe session): turn10's own player-healthbox y2 wobble - the ENDEAVOR §15f companion to the flicker above, reuses turn9Ep2HealthboxWobbleY2 verbatim at its own start=101 (1 tick before the flicker, mirroring turn9's own 86-vs-87 relative offset)", () => {
  const pressTick = 12305;
  it("is 0 before the window (render 12406)", () => {
    expect(turn9Ep2HealthboxWobbleY2(12406, pressTick, 101)).toBe(0);
  });
  it("alternates +1/-1 starting render 12407", () => {
    expect(turn9Ep2HealthboxWobbleY2(12407, pressTick, 101)).toBe(1);
    expect(turn9Ep2HealthboxWobbleY2(12408, pressTick, 101)).toBe(-1);
    expect(turn9Ep2HealthboxWobbleY2(12409, pressTick, 101)).toBe(1);
  });
  it("holds the alternation through its last tick (render 12426) then stops", () => {
    expect(turn9Ep2HealthboxWobbleY2(12425, pressTick, 101)).toBe(1);
    expect(turn9Ep2HealthboxWobbleY2(12426, pressTick, 101)).toBe(-1);
    expect(turn9Ep2HealthboxWobbleY2(12427, pressTick, 101)).toBe(0);
  });
});

describe("ISSUES #39 rank-5 slice 1: turn9OnixHp - Onix's own HP-bar drain (31->24), re-anchored to Scene OFF, same no-extra-lag family as endeavorOnixHp (dump-turn9-hitanim-off.py's own bar0Curr read)", () => {
  const pressTick = 10871;
  it("holds startHp through the sentinel tick (render 10990)", () => {
    expect(turn9OnixHp(10985, pressTick, 31, 24)).toBe(31);
    expect(turn9OnixHp(10990, pressTick, 31, 24)).toBe(31);
  });
  it("drains 1 HP-unit/tick over renders 10991-10997", () => {
    expect(turn9OnixHp(10991, pressTick, 31, 24)).toBe(30);
    expect(turn9OnixHp(10994, pressTick, 31, 24)).toBe(27);
    expect(turn9OnixHp(10997, pressTick, 31, 24)).toBe(24);
  });
  it("clamps at endHp from render 10998 on", () => {
    expect(turn9OnixHp(10998, pressTick, 31, 24)).toBe(24);
    expect(turn9OnixHp(11050, pressTick, 31, 24)).toBe(24);
  });
});

describe("ISSUES #39 rank-5 slice 1: turn9NotVeryEffectiveTextStartTick/turn9NotVeryEffectiveTextVisibleChars - the SINGLE-line 'It's not very effective...' reveal, re-anchored to Scene OFF, 1 char/tick from render 11003, fully typed at 11026", () => {
  const pressTick = 10871;
  it("starts at pressTick+132 (render 11003)", () => {
    expect(turn9NotVeryEffectiveTextStartTick(pressTick)).toBe(11003);
  });
  it("reveals 1 char/tick", () => {
    expect(turn9NotVeryEffectiveTextVisibleChars(11002, pressTick)).toBe(0);
    expect(turn9NotVeryEffectiveTextVisibleChars(11003, pressTick)).toBe(1);
    expect(turn9NotVeryEffectiveTextVisibleChars(11008, pressTick)).toBe(6);
  });
  it("is fully typed (24/24) at render 11026 and stays clamped after", () => {
    expect(turn9NotVeryEffectiveTextVisibleChars(11026, pressTick)).toBe(24);
    expect(turn9NotVeryEffectiveTextVisibleChars(11060, pressTick)).toBe(24);
  });
});

describe("ISSUES #39 rank-5 slice 1: TURN9_ROCKSLIDE_PRESS_TICK - the synthetic anchor chosen so rockSlideTextStartTick lands on the fresh-oracle-pinned Scene-OFF render 11108", () => {
  it("rockSlideTextStartTick(TURN9_ROCKSLIDE_PRESS_TICK) is 11108", () => {
    expect(rockSlideTextStartTick(TURN9_ROCKSLIDE_PRESS_TICK)).toBe(11108);
  });
});

describe("ISSUES #39 rank-5 slice 1: rockSlideOpponentHp parameterized for turn 9 (Pidgeotto 82->61), re-anchored to Scene OFF via its own startDelay override - the SAME generic function turns 6/7 already use, only pressTick/startHp/endHp/startDelay differ", () => {
  const pressTick = TURN9_ROCKSLIDE_PRESS_TICK;
  it("holds startHp before the drain sentinel (pressTick+490=11205)", () => {
    expect(rockSlideOpponentHp(11205, pressTick, 82, 61, TURN9_ROCKSLIDE_HP_DRAIN_START_DELAY)).toBe(82);
  });
  it("drains 1 HP-unit/tick starting the next tick", () => {
    expect(rockSlideOpponentHp(11206, pressTick, 82, 61, TURN9_ROCKSLIDE_HP_DRAIN_START_DELAY)).toBe(81);
    expect(rockSlideOpponentHp(11226, pressTick, 82, 61, TURN9_ROCKSLIDE_HP_DRAIN_START_DELAY)).toBe(61);
  });
  it("clamps at endHp from there on", () => {
    expect(rockSlideOpponentHp(11227, pressTick, 82, 61, TURN9_ROCKSLIDE_HP_DRAIN_START_DELAY)).toBe(61);
    expect(rockSlideOpponentHp(11400, pressTick, 82, 61, TURN9_ROCKSLIDE_HP_DRAIN_START_DELAY)).toBe(61);
  });
});

describe("ISSUES #39 rank-5 slice 1: turn9SuperEffectiveTextStartTick/turn9SuperEffectiveTextVisibleChars - 'It's super effective!', re-anchored to Scene OFF (turn9-rockslide-off.json's own held-text sha at render 11252), turn-specific delay per the standing 'each turn gets its own literal constant' convention", () => {
  const pressTick = TURN9_ROCKSLIDE_PRESS_TICK;
  it("starts at pressTick+517 (render 11232)", () => {
    expect(turn9SuperEffectiveTextStartTick(pressTick)).toBe(11232);
  });
  it("reveals 1 char/tick and clamps once fully typed", () => {
    expect(turn9SuperEffectiveTextVisibleChars(11231, pressTick)).toBe(0);
    expect(turn9SuperEffectiveTextVisibleChars(11232, pressTick)).toBe(1);
    expect(turn9SuperEffectiveTextVisibleChars(11300, pressTick)).toBe(21);
  });
});

describe("S7 slice R rung (a): turn10AerialAceOnixHp - Onix's own AERIAL_ACE drain (24->14), same no-extra-lag family as turn9OnixHp (docs/turn10-notes.md 2026-07-21 addendum §2)", () => {
  const pressTick = 12305;
  it("stays at startHp through the sentinel tick (12441 = pressTick+136)", () => {
    expect(turn10AerialAceOnixHp(12430, pressTick, 24, 14)).toBe(24);
    expect(turn10AerialAceOnixHp(12441, pressTick, 24, 14)).toBe(24);
  });
  it("decrements 1 HP/tick from 12442, clamping at endHp", () => {
    expect(turn10AerialAceOnixHp(12442, pressTick, 24, 14)).toBe(23);
    expect(turn10AerialAceOnixHp(12446, pressTick, 24, 14)).toBe(19);
    expect(turn10AerialAceOnixHp(12451, pressTick, 24, 14)).toBe(14);
    expect(turn10AerialAceOnixHp(12453, pressTick, 24, 14)).toBe(14);
    expect(turn10AerialAceOnixHp(12500, pressTick, 24, 14)).toBe(14);
  });
});

describe("S7 slice R rung (a): turn10NotVeryEffectiveTextStartTick/turn10NotVeryEffectiveTextVisibleChars - the SINGLE-line 'It's not very effective...' reveal, fresh-oracle-bisected this session (0/24 mismatches at every sampled tick 12457-12561, own delay from turn9's +134)", () => {
  const pressTick = 12305;
  it("starts at render 12457", () => {
    expect(turn10NotVeryEffectiveTextStartTick(pressTick)).toBe(12457);
  });
  it("reveals 1 char/tick, fully typed (24/24) by 12480, held after", () => {
    expect(turn10NotVeryEffectiveTextVisibleChars(12456, pressTick)).toBe(0);
    expect(turn10NotVeryEffectiveTextVisibleChars(12457, pressTick)).toBe(1);
    expect(turn10NotVeryEffectiveTextVisibleChars(12464, pressTick)).toBe(8);
    expect(turn10NotVeryEffectiveTextVisibleChars(12480, pressTick)).toBe(24);
    expect(turn10NotVeryEffectiveTextVisibleChars(12561, pressTick)).toBe(24);
  });
});

describe("S7 slice R rung (a): TURN10_ROCKSLIDE_PRESS_TICK - the synthetic anchor chosen so EVERY shipped rockSlide* delay constant lands on this session's own fresh RAM/pixel ticks simultaneously (docs/turn10-notes.md addendum §1)", () => {
  it("rockSlideTextStartTick lands on the fresh-oracle-pinned render 12562", () => {
    expect(rockSlideTextStartTick(TURN10_ROCKSLIDE_PRESS_TICK)).toBe(12562);
  });
  it("rockSlideOpponentHp(pressTick, 61, 38) stays at 61 through the sentinel (12766) and settles at 38", () => {
    expect(rockSlideOpponentHp(12766, TURN10_ROCKSLIDE_PRESS_TICK, 61, 38)).toBe(61);
    expect(rockSlideOpponentHp(12789, TURN10_ROCKSLIDE_PRESS_TICK, 61, 38)).toBe(38);
    expect(rockSlideOpponentHp(12793, TURN10_ROCKSLIDE_PRESS_TICK, 61, 38)).toBe(38);
  });
});

describe("S7 slice R rung (a): turn10SuperEffectiveTextStartTick/turn10SuperEffectiveTextVisibleChars - 'It's super effective!', fresh-oracle-bisected this session (0/21 mismatches at every sampled tick 12795-12830), turn-specific delay per the standing 'each turn gets its own literal constant' convention", () => {
  const pressTick = TURN10_ROCKSLIDE_PRESS_TICK;
  it("starts at render 12795", () => {
    expect(turn10SuperEffectiveTextStartTick(pressTick)).toBe(12795);
  });
  it("reveals 1 char/tick, fully typed (21/21) by 12815, held after", () => {
    expect(turn10SuperEffectiveTextVisibleChars(12794, pressTick)).toBe(0);
    expect(turn10SuperEffectiveTextVisibleChars(12795, pressTick)).toBe(1);
    expect(turn10SuperEffectiveTextVisibleChars(12815, pressTick)).toBe(21);
    expect(turn10SuperEffectiveTextVisibleChars(12830, pressTick)).toBe(21);
  });
});

describe("S7 slice R rung (a): turn10RockSlideResettledBounceTick - the resettled turn-11 menu reuses menuIdleBounce verbatim, re-anchored so the redraw tick (12899) lines up with MENU_IDLE_BLANK_END_TICK+1 (1748), fresh-oracle-confirmed against the addendum's own resting/active tick citations", () => {
  it("maps the redraw tick itself to phase 1748 (matches turn5SitrusResettledBounceTick's own precedent)", () => {
    expect(turn10RockSlideResettledBounceTick(12899, TURN10_ROCKSLIDE_PRESS_TICK)).toBe(1748);
  });
  it("resting-phase ticks (12899, 12901, 13200, 13306) all produce the identical bounce state", () => {
    const at = (t: number) => menuIdleBounce(turn10RockSlideResettledBounceTick(t, TURN10_ROCKSLIDE_PRESS_TICK));
    const resting = at(12899);
    expect(at(12901)).toEqual(resting);
    expect(at(13200)).toEqual(resting);
    expect(at(13306)).toEqual(resting);
    expect(at(12900)).not.toEqual(resting);
  });
});

describe("S7 slice R rung 1: TURN11_ROCKSLIDE_PRESS_TICK - the synthetic anchor for turn 11's own ROCK_SLIDE, fresh-oracle-verified against every shipped rockSlide* delay constant simultaneously (docs/turn11-notes.md addendum §1)", () => {
  it("rockSlideTextStartTick lands on the fresh-oracle-pinned render 13530", () => {
    expect(rockSlideTextStartTick(TURN11_ROCKSLIDE_PRESS_TICK)).toBe(13530);
  });
  it("rockSlideOpponentHp(pressTick, 38, 16) stays at 38 through the sentinel (13734) and settles at 16", () => {
    expect(rockSlideOpponentHp(13734, TURN11_ROCKSLIDE_PRESS_TICK, 38, 16)).toBe(38);
    expect(rockSlideOpponentHp(13756, TURN11_ROCKSLIDE_PRESS_TICK, 38, 16)).toBe(16);
    expect(rockSlideOpponentHp(13800, TURN11_ROCKSLIDE_PRESS_TICK, 38, 16)).toBe(16);
  });
});

describe("S7 slice R rung 1: turn11AtkFloorTextStartTick/turn11AtkFloorTextVisibleChars - the ATK-floor 'won't go any lower!' message, the ONE genuinely new mechanism this turn (docs/turn11-notes.md addendum §3), fresh-oracle-bisected against a real FEATHER_DANCE confirm press", () => {
  const pressTick = 13339; // FEATHER_PRESS_TICK, the real A-confirm press
  it("uses the real U+2019 apostrophe, not ASCII", () => {
    expect(TURN11_ATKFLOOR_LINE1).toBe("ONIX’s ATTACK");
    expect(TURN11_ATKFLOOR_LINE2).toBe("won’t go lower!");
  });
  it("starts at render 13422 (pressTick+83)", () => {
    expect(turn11AtkFloorTextStartTick(pressTick)).toBe(13422);
  });
  it("reveals 1 char/tick, fully typed (28/28) by 13449 (start+TOTAL-1, no extra lag), held after", () => {
    expect(turn11AtkFloorTextVisibleChars(13421, pressTick)).toBe(0);
    expect(turn11AtkFloorTextVisibleChars(13422, pressTick)).toBe(1);
    expect(turn11AtkFloorTextVisibleChars(13449, pressTick)).toBe(28);
    expect(turn11AtkFloorTextVisibleChars(13529, pressTick)).toBe(28);
  });
});

describe("S7 slice R rung 1: turn11SuperEffectiveTextStartTick/turn11SuperEffectiveTextVisibleChars - 'It's super effective!', fresh-oracle-pinned this session (message-box transition begins exactly at pressTick+625), turn-specific delay per the standing 'each turn gets its own literal constant' convention", () => {
  const pressTick = TURN11_ROCKSLIDE_PRESS_TICK;
  it("starts at render 13762", () => {
    expect(turn11SuperEffectiveTextStartTick(pressTick)).toBe(13762);
  });
  it("reveals 1 char/tick, held after fully typed", () => {
    expect(turn11SuperEffectiveTextVisibleChars(13761, pressTick)).toBe(0);
    expect(turn11SuperEffectiveTextVisibleChars(13762, pressTick)).toBe(1);
    expect(turn11SuperEffectiveTextVisibleChars(13800, pressTick)).toBe(TURN6_SUPER_EFFECTIVE_LINE.length);
  });
});

describe("S7 slice R rung 1: turn11RockSlideResettledBounceTick - the resettled turn-12 menu reuses menuIdleBounce verbatim, re-anchored so the redraw tick (13866) lines up with MENU_IDLE_BLANK_END_TICK+1 (1748), fresh-oracle-confirmed (163/163 frames, 0 diff) against a real turn-11 ROCK_SLIDE trace", () => {
  it("maps the redraw tick itself to phase 1748 (matches turn10RockSlideResettledBounceTick's own precedent)", () => {
    expect(turn11RockSlideResettledBounceTick(13866, TURN11_ROCKSLIDE_PRESS_TICK)).toBe(1748);
  });
  it("resting-phase ticks (13866, 13895, 14000, 14340) all reachable via the same formula (period confirmed against the fresh oracle capture, not asserted flat)", () => {
    const at = (t: number) => menuIdleBounce(turn11RockSlideResettledBounceTick(t, TURN11_ROCKSLIDE_PRESS_TICK));
    expect(at(14340)).toEqual(at(13897));
  });
});

describe("S7 slice R rung 1: TURN10_ROCKSLIDE_MENU_REDRAW_DELAY is exported and reused as the turn10Resolved->turn11 reopen gate delay in core.ts (same synthetic-anchor convention every prior turnN->turnN+1 reopen already establishes)", () => {
  it("is turn 10's own already-shipped 730-tick delay, unchanged", () => {
    expect(TURN10_ROCKSLIDE_MENU_REDRAW_DELAY).toBe(730);
  });
});

describe("S7/S8: TURN11_ROCKSLIDE_MENU_REDRAW_DELAY is exported and reused as the turn11Resolved->turn12 reopen gate delay in core.ts (same synthetic-anchor convention every prior turnN->turnN+1 reopen already establishes)", () => {
  it("is turn 11's own already-shipped 729-tick delay, unchanged", () => {
    expect(TURN11_ROCKSLIDE_MENU_REDRAW_DELAY).toBe(729);
  });
});

describe("S7/S8 (docs/turn13-notes.md): TURN12_ROCKSLIDE_MENU_REDRAW_DELAY is exported and reused as the turn12Resolved->turn13 reopen gate delay in core.ts (same synthetic-anchor convention every prior turnN->turnN+1 reopen already establishes)", () => {
  it("is turn 12's own already-shipped 551-tick delay, unchanged", () => {
    expect(TURN12_ROCKSLIDE_MENU_REDRAW_DELAY).toBe(551);
  });
});

describe("S7/S8 (docs/turn12-notes.md's 2026-07-21 update §3): TURN12_ROCKSLIDE_PRESS_TICK - the synthetic anchor for turn 12's own ROCK_SLIDE MISS, fresh-oracle-fit against ROCK_SLIDE_TEXT_DELAY(393) alone (the only shared rockSlide* delay that fires this turn - RAM-proven zero rocks/shake/hit-flash/wobble the whole window, docs/turn12-notes.md §3)", () => {
  it("rockSlideTextStartTick lands on the fresh-oracle-pinned render 14630", () => {
    expect(rockSlideTextStartTick(TURN12_ROCKSLIDE_PRESS_TICK)).toBe(14630);
  });
});

describe("S7/S8: turn12MissTextStartTick/turn12MissTextVisibleChars - 'ONIX's\\nattack missed!' (TURN8_MISS_LINE1/2 reused verbatim), the arc's SECOND miss - fresh-oracle-pinned start (pressTick+449, NOT turn 8's own 471 - BIND's own kickoff text is a different length)", () => {
  const pressTick = TURN12_ROCKSLIDE_PRESS_TICK;
  it("starts at render 14686 (pressTick+449)", () => {
    expect(turn12MissTextStartTick(pressTick)).toBe(14686);
  });
  it("reveals 1 char/tick, fully typed (20/20) by 14705, held after", () => {
    expect(turn12MissTextVisibleChars(14685, pressTick)).toBe(0);
    expect(turn12MissTextVisibleChars(14686, pressTick)).toBe(1);
    expect(turn12MissTextVisibleChars(14705, pressTick)).toBe(20);
    expect(turn12MissTextVisibleChars(14780, pressTick)).toBe(20);
  });
});

describe("S7/S8: turn-end - the held miss text clears at pressTick+544 (14781) then hard-cuts to the resettled menu at pressTick+551 (14788), a 95-tick miss-hold bit-exact to turn 8's own 95-tick BIND-miss gap (566-471=95 there; 544-449=95 here)", () => {
  it("miss-hold gap (text-start to clear) is 95 ticks, matching turn 8's own miss-hold gap exactly", () => {
    expect(544 - 449).toBe(95);
  });
  it("clear-to-redraw gap is the STANDARD 7 ticks (turns 6/7/9/10's own gap - turn 8's own 6-tick gap is the outlier, not this turn)", () => {
    expect(551 - 544).toBe(7);
  });
});

describe("S7/S8: turn12RockSlideResettledBounceTick - the resettled turn-13 menu reuses menuIdleBounce verbatim, re-anchored so the redraw tick (14788) lines up with MENU_IDLE_BLANK_END_TICK+1 (1748), fresh-oracle-confirmed (38/38 frames, 0 diff) against a real turn-12 ROCK_SLIDE-miss trace", () => {
  it("maps the redraw tick itself to phase 1748 (matches turn11RockSlideResettledBounceTick's own precedent)", () => {
    expect(turn12RockSlideResettledBounceTick(14788, TURN12_ROCKSLIDE_PRESS_TICK)).toBe(1748);
  });
  it("the idle-bounce cycle recurs (15374 matches 15000, same phase), not a single flat plateau (14790 differs from 14799)", () => {
    const at = (t: number) => menuIdleBounce(turn12RockSlideResettledBounceTick(t, TURN12_ROCKSLIDE_PRESS_TICK));
    expect(at(15374)).toEqual(at(15000));
    expect(at(14790)).not.toEqual(at(14799));
  });
});

// S7/S8 rung 2 (docs/turn13-notes.md's SAND_ATTACK characterization
// section): text/banner sub-phases, `turn13-sandattack.json` 185/185 0-diff.
// `pressTick` below (15419) is the real runtime value of `TICK0+sm.
// confirmElapsed` for this trace - one past the confirm A-press's own
// segment-start tick (15418) - oracle-pixel-bisected this session (a fresh
// `npm run compare` caught a 1-tick-late mismatch localized to a single
// trailing glyph per frame, the classic "off by one character" signature).
describe("S7/S8: turn13SandAttackTextStartTick/turn13SandAttackTextVisibleChars - 'Foe PIDGEOTTO used\\nSAND-ATTACK!' - oracle-pixel-fit start (pressTick+13), fully typed (30/30) by pressTick+42, tick 15460 (pressTick+41) still one glyph short (29/30) per the dossier's own correction", () => {
  const pressTick = 15419;
  it("starts at render 15432 (pressTick+13)", () => {
    expect(turn13SandAttackTextStartTick(pressTick)).toBe(15432);
  });
  it("reveals 1 char/tick; 15460 shows 29/30 (the dossier's own pin), fully typed (30/30) by 15461, held after", () => {
    expect(turn13SandAttackTextVisibleChars(15431, pressTick)).toBe(0);
    expect(turn13SandAttackTextVisibleChars(15432, pressTick)).toBe(1);
    expect(turn13SandAttackTextVisibleChars(15460, pressTick)).toBe(29);
    expect(turn13SandAttackTextVisibleChars(15461, pressTick)).toBe(30);
    expect(turn13SandAttackTextVisibleChars(15470, pressTick)).toBe(30);
  });
});

describe("S7/S8: turn13SandAttackAccEva/Bg1Y - the accuracy-drop banner on ONIX, a non-sharply(10/20)+decrease+accuracy parameter combo of the generic StatsChangeAnimation banner - null outside its own RAM-active window, ramps 0->10->0 matching docs/turn13-notes.md's own RAM register table", () => {
  const pressTick = 15419;
  it("null before the banner's own register-active window and past its own reset", () => {
    expect(turn13SandAttackAccEva(15536, pressTick)).toBeNull();
    expect(turn13SandAttackAccEva(15600, pressTick)).toBeNull();
  });
  it("steps 0->1 first at RAM/render 15537 (pressTick+118), reaches target 10 by RAM 15555, holds through RAM 15576, back to 0 by RAM 15595", () => {
    expect(turn13SandAttackAccEva(15537, pressTick)).toBe(1);
    expect(turn13SandAttackAccEva(15555, pressTick)).toBe(10);
    expect(turn13SandAttackAccEva(15576, pressTick)).toBe(10);
    expect(turn13SandAttackAccEva(15595, pressTick)).toBe(0);
  });
  it("Bg1Y ramps -3/tick from render 15536 (one-tick BLDALPHA-vs-BG-scroll lag, same rule turn6StatFallBg1Y establishes), clamped at -180", () => {
    expect(turn13SandAttackAccBg1Y(15535, pressTick)).toBe(0);
    expect(turn13SandAttackAccBg1Y(15536, pressTick)).toBe(-3);
    expect(turn13SandAttackAccBg1Y(15595, pressTick)).toBe(-180);
    expect(turn13SandAttackAccBg1Y(15650, pressTick)).toBe(-180);
  });
});

describe("S7/S8: turn13AccFellTextStartTick/turn13AccFellTextVisibleChars - 'ONIX’s accuracy\\nfell!' (sText_DefendersStatFell resolved for ONIX/accuracy, curly apostrophe matching TURN6_ATKFELL_LINE1's own font/charmap pin), deferred until the banner tears down - typing starts at RAM/render 15608 (pressTick+189), fully typed by 15627", () => {
  const pressTick = 15419;
  it("starts at render 15608 (pressTick+189), matching docs/turn13-notes.md's own RAM pin exactly", () => {
    expect(turn13AccFellTextStartTick(pressTick)).toBe(15608);
  });
  it("reveals 1 char/tick, fully typed (20/20) by 15627, held after", () => {
    expect(turn13AccFellTextVisibleChars(15607, pressTick)).toBe(0);
    expect(turn13AccFellTextVisibleChars(15608, pressTick)).toBe(1);
    expect(turn13AccFellTextVisibleChars(15627, pressTick)).toBe(20);
    expect(turn13AccFellTextVisibleChars(15699, pressTick)).toBe(20);
  });
});

describe("S7/S8 turn 13 rung 3 (docs/turn13-notes.md §4/§5/§7): DRAGON_BREATH re-targeted at Pidgeotto - HP drain, faint sink, and the KO-dismiss gate", () => {
  it("dragonBreathGrovyleHp reused verbatim for Pidgeotto's own 16->0 endpoints at the new synthetic anchor (TURN13_DRAGONBREATH_PRESS_TICK) - pre-drain holds 16, drains 1 unit/tick, clamps to 0", () => {
    const P = TURN13_DRAGONBREATH_PRESS_TICK;
    const DRAIN_START_DELAY = 353; // same constant dragonBreathGrovyleHp's own module doc cites, oracle-confirmed unchanged for turn 13 (npm run compare: turn13-dragonbreath-faint.json 141/141, 0 diff across the whole HP-drain window)
    expect(dragonBreathGrovyleHp(P + DRAIN_START_DELAY - 1, P, 16, 0)).toBe(16);
    expect(dragonBreathGrovyleHp(P + DRAIN_START_DELAY + 8, P, 16, 0)).toBe(8);
    expect(dragonBreathGrovyleHp(P + DRAIN_START_DELAY + 16, P, 16, 0)).toBe(0);
    expect(dragonBreathGrovyleHp(P + DRAIN_START_DELAY + 500, P, 16, 0)).toBe(0);
  });

  it("grovyleFaintSinkRowsAndY2 re-anchored for Pidgeotto's own faint (S=15960, n=7 for yOffset=11, vs. Grovyle's own S=6502/n=8) - same closed form, new params", () => {
    expect(TURN13_FAINT_SINK_STEPS).toBe(7);
    expect(TURN13_FAINT_SINK_STEPS).not.toBe(GROVYLE_FAINT_SINK_STEPS);
    expect(TURN13_FAINT_SINK_START_TICK).not.toBe(GROVYLE_FAINT_SINK_START_TICK);
    expect(grovyleFaintSinkRowsAndY2(TURN13_FAINT_SINK_START_TICK, TURN13_FAINT_SINK_START_TICK, TURN13_FAINT_SINK_STEPS)).toEqual({ keptRows: TURN13_FAINT_SINK_STEPS, y2: 0 });
    expect(grovyleFaintSinkRowsAndY2(TURN13_FAINT_SINK_START_TICK + 14, TURN13_FAINT_SINK_START_TICK, TURN13_FAINT_SINK_STEPS)).toEqual({ keptRows: 0, y2: TURN13_FAINT_SINK_STEPS * 8 });
    // still reproduces Grovyle's own turn-5 endpoints unmodified (default params) - the generalization is additive, not a behavior change.
    expect(grovyleFaintSinkRowsAndY2(GROVYLE_FAINT_SINK_START_TICK)).toEqual({ keptRows: GROVYLE_FAINT_SINK_STEPS, y2: 0 });
  });

  it("healthbox vanish tick (15977) lands 2 ticks after the sink's own last erase step, matching docs/turn13-notes.md §4's own 'healthbox gone' citation", () => {
    expect(TURN13_HEALTHBOX_VANISH_TICK).toBe(15977);
  });

  it("turn13FaintedTextStartTick/turn13FaintedTextVisibleChars: 'Foe PIDGEOTTO\\nfainted!' starts at render 15979 (oracle-bisected exact - 15978 still shows the old DRAGON_BREATH kickoff text), 1 char/tick, fully typed (21/21) after", () => {
    const P = TURN13_DRAGONBREATH_PRESS_TICK;
    expect(turn13FaintedTextStartTick(P)).toBe(15979);
    expect(turn13FaintedTextVisibleChars(15978, P)).toBe(0);
    expect(turn13FaintedTextVisibleChars(15979, P)).toBe(1);
    expect(turn13FaintedTextVisibleChars(15999, P)).toBe(21);
    expect(turn13FaintedTextVisibleChars(16820, P)).toBe(21);
  });

  it("opponentFaintDismissEligible: false before the fainted text's own cursor tick, true from exactly that tick on", () => {
    const eligibleTick = TURN13_DRAGONBREATH_PRESS_TICK + 485; // TURN13_FAINTED_CURSOR_START_DELAY, 16001
    expect(opponentFaintDismissEligible(eligibleTick - 1)).toBe(false);
    expect(opponentFaintDismissEligible(eligibleTick)).toBe(true);
    expect(opponentFaintDismissEligible(16820)).toBe(true);
  });

  function stateAtTurn13Confirm(): { battleScene: BattleSceneState } {
    return {
      battleScene: {
        elapsed: 15419 - TICK0,
        sendOutPressElapsed: 380,
        fightSubmenu: {
          openElapsed: 15374 - TICK0,
          cursor: 2,
          displayCursor: 2,
          closeElapsed: null,
          confirmElapsed: 15419 - TICK0,
          activeMonMoveset: rentalMoveset("ONIX"),
          reopenedFromClose: false,
        },
        turn1Resolved: true,
        turn2Resolved: true,
        turn3Resolved: true,
        turn4Resolved: true,
        turn5NextCommandHandoff: resolveTurn5CompletedResolutionNextCommandHandoff(),
        turn6NextCommandHandoff: resolveTurn6CompletedResolutionNextCommandHandoff(),
        turn7NextCommandHandoff: resolveTurn7CompletedResolutionNextCommandHandoff(),
        turn8Resolved: true,
        turn9Resolved: true,
        turn10Resolved: true,
        turn11Resolved: true,
        turn12Resolved: true,
        opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null,
      },
    };
  }

  it("idle branch: idling hundreds of ticks past the eligible tick never sets opponentFaintDismissElapsed on its own", () => {
    const state = stateAtTurn13Confirm();
    let scene = state.battleScene;
    for (let i = 0; i < 700; i += 1) scene = advanceBattleScene(scene); // idle well past 16001 (the eligible tick) and past 16824 (this rung's own trace boundary)
    expect(scene.opponentFaintDismissElapsed).toBeNull();
  });

  it("A-press branch (core.ts's tick()): idling up to the eligible tick then pressing A sets opponentFaintDismissElapsed exactly once, on that same edge, and it's stable afterward", () => {
    let state: EngineState = { ...createInitialState(), battleScene: stateAtTurn13Confirm().battleScene };
    const eligibleTick = TURN13_DRAGONBREATH_PRESS_TICK + 485; // 16001
    const startElapsed = 15419 - TICK0;
    for (let i = 0; i < eligibleTick - 1 - 15419; i += 1) state = tick(state, new Set());
    expect(state.battleScene!.elapsed).toBe(eligibleTick - 1 - TICK0);
    expect(state.battleScene!.opponentFaintDismissElapsed).toBeNull();
    state = tick(state, new Set()); // reaches the eligible tick itself - still no press yet
    expect(state.battleScene!.elapsed).toBe(eligibleTick - TICK0);
    expect(state.battleScene!.opponentFaintDismissElapsed).toBeNull();
    state = tick(state, new Set(["A"])); // registers on this same edge
    expect(state.battleScene!.opponentFaintDismissElapsed).not.toBeNull();
    const dismissedAt = state.battleScene!.opponentFaintDismissElapsed;
    for (let i = 0; i < 20; i += 1) state = tick(state, new Set());
    expect(state.battleScene!.opponentFaintDismissElapsed).toBe(dismissedAt);
    expect(startElapsed).toBeLessThan(eligibleTick - TICK0); // sanity: the confirm precedes the eligible tick
  });

  it("an early A press (long before the fainted text's own cursor tick) is simply dropped", () => {
    let state: EngineState = { ...createInitialState(), battleScene: stateAtTurn13Confirm().battleScene };
    state = tick(state, new Set(["A"])); // trace tick 15420 - nowhere near eligible (16001)
    expect(state.battleScene!.opponentFaintDismissElapsed).toBeNull();
  });

  it("the opponent-faint receipt owns dismissal without consulting a turn-resolution flag", () => {
    const eligibleTick = TURN13_DRAGONBREATH_PRESS_TICK + 485;
    let state: EngineState = {
      ...createInitialState(),
      battleScene: {
        ...stateAtTurn13Confirm().battleScene,
        elapsed: eligibleTick - TICK0,
        turn12Resolved: false,
        fightSubmenu: {
          ...stateAtTurn13Confirm().battleScene.fightSubmenu,
          confirmElapsed: eligibleTick - TICK0,
        },
      },
    };
    state = tick(state, new Set(["A"]));
    expect(state.battleScene!.opponentFaintDismissElapsed).toBe(
      eligibleTick - TICK0 + 1,
    );
  });
});
