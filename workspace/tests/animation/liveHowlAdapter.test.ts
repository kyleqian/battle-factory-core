import { describe, expect, it } from "vitest";
import { howlAtAge } from "../../src/animation/howl.ts";
import { sceneOnHowlView, type SceneOnHowlPresentationState } from "../../src/animation/sceneOnPresentation.ts";
import { liveMoveAnimationPresentation, liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

const field = {
  player: { species: 287, name: "MIGHTYENA", level: 50, hp: 145, maxHP: 145, gender: "male", status: "none" },
  opponent: { species: 66, name: "MACHOP", level: 50, hp: 145, maxHP: 145, gender: "male", status: "none" },
} as unknown as BattleResolutionDisplayedField;
const request = (attacker: 0 | 1) => ({
  moveId: 336, attacker, target: attacker, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});

describe("live Howl battler input", () => {
  it("uses source picture height for DeepInhale and current cry identity", () => {
    const stage = liveMoveAnimationPresentation(request(0), field, 35) as SceneOnHowlPresentationState;
    expect(stage.config.battlerInput).toEqual({ pictureHeight: 56, species: "MIGHTYENA" });
    expect(stage.config.fieldProfile).not.toHaveProperty("attackerAttackStage");
    const view = sceneOnHowlView(stage);
    expect(view.attackerTransform.y2).toBe(-6);
    expect(view.cry).toEqual({ species: "MIGHTYENA", mode: "CRY_MODE_HIGH_PITCH", panSide: "player" });
    expect(howlAtAge(35, "player", { x: 72, y: 80 }).attackerTransform.y2).toBe(-5);
    const opponent = liveMoveAnimationPresentation(request(1), field, 35) as SceneOnHowlPresentationState;
    expect(opponent.config.battlerInput).toEqual({ pictureHeight: 42, species: "MACHOP" });
    expect(sceneOnHowlView(opponent).attackerTransform.y2).toBe(-4);
    expect(sceneOnHowlView(opponent).cry?.species).toBe("MACHOP");
    expect(liveMoveAnimationDuration(request(0))).toBe(102);
    expect(liveMoveAnimationDuration(request(1))).toBe(102);
  });

  it("replays two real stat-changing commands through cleanup without changing outcomes or RNG", () => {
    const on = generatedCommandAnimationReplay(8, "on", [1, 1]);
    const off = generatedCommandAnimationReplay(8, "off", [1, 1]);
    const bodies = on.animations.filter(a => a.moveId === 336 && a.attacker === 0);
    expect(bodies).toHaveLength(2);
    for (const body of bodies) {
      expect(body).toMatchObject({ player: "LOUDRED", opponent: "VOLTORB" });
      expect(body.ages).toEqual(iu120Ages(336, 102));
    }
    expect(on.boundaries).toHaveLength(3);
    expect(on.boundaries.map(b => b.rules.rulesContext.battlers[0]!.statStages[1]))
      .toEqual([6, 7, 8]);
    for (let i=0; i<on.boundaries.length; i++) {
      const a=on.boundaries[i]!, b=off.boundaries[i]!;
      expect(a.rng).toEqual(b.rng);
      const { hitMarker: _a, ...ar } = a.rules.rulesContext;
      const { hitMarker: _b, ...br } = b.rules.rulesContext;
      expect(ar).toEqual(br);
    }
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);
});
