import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { describe, expect, it } from "vitest";
import { createInitialState, tick, render } from "../src/engine/core.ts";
import { playableAnimationReplay } from "../tools/integration/playableAnimationReplay.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";

describe("ordinary playable animation queue", () => {
  it("plays damaging and no-hit moves from draft input, resumes commands, and preserves rules/RNG", () => {
    const on = playableAnimationReplay("on");
    const off = playableAnimationReplay("off");
    expect(on.boundaries).toHaveLength(4);
    expect(off.boundaries).toHaveLength(4);
    for (let index = 0; index < on.boundaries.length; index++) {
      const a = on.boundaries[index]!.factoryRoundBattleOrchestrator!.battle!;
      const b = off.boundaries[index]!.factoryRoundBattleOrchestrator!.battle!;
      expect(a.rng).toEqual(b.rng);
      const { hitMarker: am, ...ar } = a.rules.rulesContext;
      const { hitMarker: bm, ...br } = b.rules.rulesContext;
      expect(ar).toEqual(br);
      expect(am ^ bm).toBe(0x80); // HITMARKER_NO_ANIMATIONS is the sole rule input difference.
      expect(a.boundary).toEqual(b.boundary);
      expect(on.boundaries[index]!.sceneOnPresentation).toBeNull();
    }
    const damaging = on.observations.find(o => o.moveId === 325)!;
    const status = on.observations.find(o => o.moveId === 109)!;
    expect(damaging).toMatchObject({ player: "HAUNTER", opponent: "GROVYLE", attacker: 0 });
    expect(status).toMatchObject({ player: "HAUNTER", opponent: "GROVYLE", attacker: 0 });
    for (const observed of [damaging, status]) {
      expect(observed.samples.map(s => s.age)).toEqual([0, Math.floor(observed.duration! / 2), observed.duration! - 1]);
      expect(new Set(observed.samples.map(s => s.sha256)).size).toBeGreaterThan(1);
    }
    expect(on.trace.battleScene).toBe("on");
    let replay = createInitialState({ battleScene: on.trace.battleScene });
    for (const segment of on.trace.segments) {
      for (let i=0; i<segment.frames; i++) replay = tick(replay, new Set(segment.buttons));
    }
    expect(replay.factoryRoundBattleOrchestrator).toEqual(on.state.factoryRoundBattleOrchestrator);
    expect(render(replay)).toEqual(render(on.state));
  }, 60000);

  it("renders both opponent damaging and no-hit moves from generated command input through cleanup", () => {
    for (const slots of [[3, 3, 3, 3], [0, 1]] as const) {
      const on = generatedCommandAnimationReplay(54, "on", slots);
      const off = generatedCommandAnimationReplay(54, "off", slots);
      expect(on.boundaries).toHaveLength(slots.length + 1);
      for (let i = 0; i < on.boundaries.length; i++) {
        const a = on.boundaries[i]!, b = off.boundaries[i]!;
        expect(a.rng).toEqual(b.rng);
        const { hitMarker: _am, ...ar } = a.rules.rulesContext;
        const { hitMarker: _bm, ...br } = b.rules.rulesContext;
        expect(ar).toEqual(br);
      }
      const expectedMove = slots.length === 4 ? 325 : 109;
      const animation = on.animations.find(a => a.moveId === expectedMove && a.attacker === 1)!;
      expect(animation).toMatchObject({ player: "WAILMER", opponent: "HAUNTER" });
      expect(animation.ages).toEqual(Array.from({ length: expectedMove === 325 ? 105 : 270 }, (_, i) => i));
      expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    }
  }, 60000);

  it("keeps target, two-turn and multi-hit selectors in the typed controller request", () => {
    expect(battleMoveAnimationRequest(1, 0, ["29", "1", "70", "-31", "200", "3"])).toEqual({
      moveId: 29, attacker: 1, target: 0, turn: 1, power: 70, damage: -31, friendship: 200, multihit: 3,
    });
    expect(() => battleMoveAnimationRequest(0, 1, [])).toThrow("six integer");
    expect(liveMoveAnimationDuration(battleMoveAnimationRequest(0, 1, ["210","0","10","1","0","0"]))).toBeNull();
  });
});
