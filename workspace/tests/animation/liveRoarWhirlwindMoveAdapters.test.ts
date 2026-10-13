import { describe, expect, it } from "vitest";
import {
  FORCED_RETURN_TO_BALL_HOLD_FRAMES, FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES,
} from "../../src/engine/battleResolutionPresentation.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration,
} from "../../src/engine/liveMoveAnimation.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages, iu120Extra } from "../helpers/iu120Rows.ts";

// Roar (46) / Whirlwind (18) live bodies (docs/next-adapters-prep11.md s0.2; dense fixtures tools/integration/fixtures/prep11-live/
// roar-* / whirlwind-*, receipt tools/integration/fixtures/roar-live-receipt.json) and the Scene ON forced switch-out continuation
// (docs/forced-switch-continuation.md): body end E, hold E+1..E+4 (no target drawn), recall E+5..E+10, send-in from E+11.
const request = (moveId: number, attacker: 0 | 1) =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }) as const;
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live Roar / Whirlwind adapters + Scene ON forced switch-out", () => {
  it("registers both moves with the measured windows and row-0 shadow rows", () => {
    for (const id of [46, 18]) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(id);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
    }
    expect([liveMoveAnimationDuration(request(46, 0)), liveMoveAnimationDuration(request(46, 1))]).toEqual([99, 104]);
    expect([liveMoveAnimationDuration(request(18, 0)), liveMoveAnimationDuration(request(18, 1))]).toEqual([83, 83]);
  });

  // Ordinary-input routes (docs/next-adapters-prep11.md s3; the player's move is not the battle's first body).
  const routes = [
    { move: "ROAR 42/0 HOUNDOUR", id: 46, seed: 42, streak: 0, slot: 2 as const },
    { move: "ROAR 6/21 VAPOREON", id: 46, seed: 6, streak: 21, slot: 1 as const },
    { move: "WHIRLWIND 9/0 BUTTERFREE", id: 18, seed: 9, streak: 0, slot: 3 as const },
    { move: "WHIRLWIND 30/0 BEAUTIFLY", id: 18, seed: 30, streak: 0, slot: 3 as const },
  ];
  it.each(routes)("completes ordinary $move: live body every age, instant removal + send-in at E+11, ON/OFF parity", r => {
    const on = generatedCommandAnimationReplay(r.seed, "on", [r.slot], r.streak);
    const off = generatedCommandAnimationReplay(r.seed, "off", [r.slot], r.streak);
    const bodies = on.animations.filter(a => a.moveId === r.id && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    const duration = liveMoveAnimationDuration(request(r.id, 0))!;
    expect(bodies[0]!.ages).toEqual(iu120Ages(r.id, duration));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    // The forced continuation directly follows the body: hold (no recall animation), recall receipt, send-in.
    const index = on.commands.findIndex(c => c.type === "move-animation" && (c.command as any).animation?.moveId === r.id);
    const [body, hold, recall, sendIn] = on.commands.slice(index, index + 4);
    expect([hold!.type, recall!.type, sendIn!.type]).toEqual(["switch-out", "sprite-visibility", "switch-in"]);
    expect(hold!.command).toMatchObject({ battler: 1, skipAnimation: true });
    expect(recall!.command).toMatchObject({ battler: 1, visible: false, recall: true });
    expect([hold!.frame - body!.frame, recall!.frame - hold!.frame, sendIn!.frame - recall!.frame])
      .toEqual([duration + iu120Extra(r.id), FORCED_RETURN_TO_BALL_HOLD_FRAMES, FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES]);
    // offs152: Scene OFF takes the same forced hold (Cmd_returntoball skips the return animation in both scenes) with the target
    // drawn at rest (no body ran); tests/offs152SceneOffForcedSwitch.test.ts pins its ROM rows.
    const offHold = off.commands.find(c => c.type === "switch-out");
    expect(offHold?.command).toMatchObject({
      battler: 1, timing: { minimumFrames: FORCED_RETURN_TO_BALL_HOLD_FRAMES }, skipAnimation: true, targetAtRest: true,
    });
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
  }, 240000);
});
