// pfb229 (docs/pfb228-faint-replacement-emerge.md): the Scene ON player faint-replacement send-in draws the path-A composition (species-keyed
// ball arc, ball-derived particle origin, bso225 back animation at B + 66); Scene OFF draws the same send-in without the back animation (pic7).
import { describe, expect, it } from "vitest";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants";
import { SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../src/engine/battleResolutionPresentation";
import {
  MID_BATTLE_SWITCH_BALL_MON_Y, MID_BATTLE_SWITCH_BALL_THROW_TABLE, createBattleResolutionPresentationRenderView, midBattleSwitchBallTable,
  midBattleSwitchInAt, midBattleSwitchSendInParticleY, midBattleSwitchSendInParticlesAt, playerFaintReplacementSendOutTimingOfSegment, playerSendOutBallArc,
} from "../src/engine/battleResolutionPresentationRender";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt";
import { renderBattleResolutionForcedPartySelect } from "../src/engine/battleScene";

// pfb228Ball.py --arc 84 (SKARMORY's mon sprite y; ROM-validated, 0 mismatching ticks).
const ARC_84: [number, number][] = [[1, -3], [3, -5], [5, -6], [7, -8], [9, -9], [11, -10], [13, -10], [14, -10], [14, -11], [15, -10], [15, -11], [16, -11], [17, -11], [17, -11], [18, -10], [19, -10], [19, -10], [20, -10], [20, -10], [21, -9], [22, -8], [22, -8], [23, -7], [24, -6], [24, -6], [25, -5], [26, -4], [26, -4], [27, -3], [27, -3], [28, -1], [29, 0], [29, 1], [31, 4], [33, 8], [35, 13], [37, 18], [39, 23], [41, 28], [43, 33], [45, 39], [46, 44], [48, 50]];

describe("pfb229: species-keyed player send-out ball arc", () => {
  it("monY 93 reproduces today's voluntary-switch table (x2, y2 and the rotation entries)", () => {
    expect(MID_BATTLE_SWITCH_BALL_MON_Y).toBe(93);
    const arc = playerSendOutBallArc(93);
    expect(arc).toHaveLength(MID_BATTLE_SWITCH_BALL_THROW_TABLE.length + 1);
    MID_BATTLE_SWITCH_BALL_THROW_TABLE.forEach((entry, t) => {
      if (t > 0) expect([arc[t - 1]!.x2, arc[t - 1]!.y2], `tick ${t}`).toEqual([entry.x2, entry.y2]);
    });
    expect(midBattleSwitchBallTable(93)).toEqual(MID_BATTLE_SWITCH_BALL_THROW_TABLE);
    expect(arc.at(-1)).toEqual({ x2: 48, y2: 60 });
    expect(midBattleSwitchSendInParticleY(93)).toBe(119);
  });

  it("monY 84 (SKARMORY) follows the ROM arc; the rotation entries do not depend on monY", () => {
    expect(playerSendOutBallArc(84).map((p) => [p.x2, p.y2])).toEqual(ARC_84);
    expect(midBattleSwitchSendInParticleY(84)).toBe(109);
    const table = midBattleSwitchBallTable(84);
    expect(table[0]).toEqual(MID_BATTLE_SWITCH_BALL_THROW_TABLE[0]);
    table.forEach((entry, t) => {
      const base = MID_BATTLE_SWITCH_BALL_THROW_TABLE[t]!;
      expect([entry.pa, entry.pb, entry.pc, entry.pd]).toEqual([base.pa, base.pb, base.pc, base.pd]);
      if (t > 0) expect([entry.x2, entry.y2]).toEqual(ARC_84[t - 1]);
    });
  });

  it("midBattleSwitchInAt / the particles take the key; omitted = the fitted 93", () => {
    for (const e of [3, 20, 44]) {
      expect(midBattleSwitchInAt(e, 0, undefined, undefined, undefined, 93)).toEqual(midBattleSwitchInAt(e, 0));
    }
    expect(midBattleSwitchInAt(44, 0, undefined, undefined, undefined, 84).ballPosition).toEqual({ x: 24 + 45, y: 68 + 39 });
    expect(midBattleSwitchInAt(44, 0).ballPosition).toEqual({ x: 24 + 45, y: 68 + 47 });
    expect(midBattleSwitchSendInParticlesAt(70, 0)!.originY).toBeUndefined();
    expect(midBattleSwitchSendInParticlesAt(70, 0, 84)!.originY).toBe(109);
    expect(midBattleSwitchSendInParticlesAt(70, 0, 93)!.originY).toBe(119);
  });
});

const mon = (side: "player" | "trainer", battler: 0 | 1, species: number, name: string, partyIndex: number, personality: number) => Object.freeze({
  species, name, side, battler, partyIndex, level: 50, hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const,
  personality, moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
});
const opponent = mon("trainer", 1, 244, "ENTEI", 0, 0);

function forcedSegment(incoming: ReturnType<typeof mon>, sceneOn: boolean) {
  const field = Object.freeze({ player: incoming, opponent });
  const states = Object.freeze(["fainted", "healthy", "healthy", "empty", "empty", "empty"]);
  const commands = [
    Object.freeze({ type: "party-summary", eventSequence: 1, battler: 0, visible: true, states, timing: { minimumFrames: 7 } }),
    Object.freeze({ type: "message", eventSequence: 2, lines: [`Go! ${incoming.name}!`], advance: "automatic", noCursor: false, timing: { minimumFrames: 13, holdFrames: 0 } }),
    Object.freeze({ type: "party-summary", eventSequence: 3, battler: 0, visible: false, states }),
    Object.freeze({ type: "switch-in", eventSequence: 4, battler: 0, fromPartyIndex: 0, toPartyIndex: 1, incoming, incomingStatus1: 0,
      timing: switchInTiming(0, incoming.species, sceneOn, incoming.name, false, incoming.personality), settleHoldFrames: SWITCH_IN_WAITSTATE_HOLD_FRAMES, sceneOn }),
    Object.freeze({ type: "turn-end", timing: { minimumFrames: 8 } }),
  ];
  const segment = { field, beforeRules: { rulesContext: { hitMarker: sceneOn ? 0 : BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } }, afterRules: null, events: [], commands } as never;
  const resolution = (phaseElapsed: number) => ({
    field, segments: [segment], segmentIndex: 0, commandIndex: 0, lifecycle: { phase: "presenting-switch-in", phaseElapsed },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
  } as never);
  const timing = playerFaintReplacementSendOutTimingOfSegment(segment)!;
  return { timing, view: (e: number) => createBattleResolutionPresentationRenderView(resolution(e)) };
}

describe("pfb229: the faint-replacement view carries the path-A send-in on Scene ON", () => {
  const skarmory = mon("player", 0, 227, "SKARMORY", 1, 6);
  const B = 91 + skarmory.name.length;

  it("path-A elapsed = e - B; the back animation starts at e = B + 66; nothing before B", () => {
    const { view, timing } = forcedSegment(skarmory, true);
    expect(timing.ballShift + 96).toBe(B);
    expect(view(B - 1).midBattleSwitchIn).toBeNull();
    expect(view(B).midBattleSwitchIn!.elapsed).toBe(0);
    expect(view(B + 3).midBattleSwitchIn!.ballVisible).toBe(true);
    expect(view(B + 20).midBattleSwitchIn!.elapsed).toBe(20);
    expect(view(B + 65).midBattleSwitchIn!.backAnim).toBeNull();
    expect(view(B + 66).midBattleSwitchIn!.backAnim).not.toBeNull();
    // the ball arc is keyed on the mon sprite y (SKARMORY 84), not the fitted 93
    const monY = createBattleCommandFieldArtView(view(B).field).player.origin.y + 32;
    expect(monY).toBe(84);
    expect(view(B + 44).midBattleSwitchIn!.ballPosition).toEqual({ x: 24 + 45, y: 68 + 39 });
    expect(view(B + 70).midBattleSwitchParticles?.originY).toBe(109);
  });

  it("CASTFORM's post-spawn timeline runs one frame late (releaseExtra)", () => {
    const castform = mon("player", 0, 385, "CASTFORM", 1, 6);
    const { view, timing } = forcedSegment(castform, true);
    expect(timing.releaseExtra).toBe(1);
    const cB = timing.ballShift + 96;
    expect(view(cB + 20).midBattleSwitchIn!.elapsed).toBe(19);
  });

  it("Scene OFF takes path A without the back animation (pic7); a live MAGBY takes path A like every species (pic1)", () => {
    // pic7: ROM lab pic7-player-faint-send-in-off: the Scene OFF send-in equals the Scene ON path-A frames until the back animation.
    const off = forcedSegment(skarmory, false);
    const offB = off.timing.ballShift + 96;
    expect(off.view(offB - 1).midBattleSwitchIn).toBeNull();
    expect(off.view(offB).midBattleSwitchIn!.elapsed).toBe(0);
    for (let e = offB; e < offB + 120; e += 1) expect(off.view(e).midBattleSwitchIn!.backAnim, `off ${e}`).toBeNull();
    expect(off.view(offB + 44).midBattleSwitchIn!.ballPosition).toEqual({ x: 24 + 45, y: 68 + 39 });
    // pic1 (2026-11-20 playtest): a name test used to give any MAGBY the canonical sample battle's window (no path-A view).
    const magby = forcedSegment(mon("player", 0, 240, "MAGBY", 1, 6), true);
    const mB = magby.timing.ballShift + 96;
    expect(mB).toBe(91 + "MAGBY".length);
    expect(magby.view(mB - 1).midBattleSwitchIn).toBeNull();
    expect(magby.view(mB).midBattleSwitchIn!.elapsed).toBe(0);
    expect(magby.view(mB + 66).midBattleSwitchIn!.backAnim).not.toBeNull();
  });

  it("the forced selector draws the path-A frames (the ball flies and the back animation moves the mon)", () => {
    const on = forcedSegment(skarmory, true);
    const frame = (e: number) => {
      const fb = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionForcedPartySelect(fb, on.view(e), { sendOutElapsed: e, elapsed: 400 + e, sendOutTiming: on.timing } as never);
      return Buffer.from(fb);
    };
    expect(frame(B + 20).equals(frame(B + 21))).toBe(false);
    // SKARMORY's JOLT_RIGHT body moves the sprite once the animation starts (x2 -1 at B + 66, -5 at B + 70)
    expect(frame(B + 66).equals(frame(B + 70))).toBe(false);
  });
});
