import { describe, expect, it } from "vitest";
import {
  FLY_CHARGE_BALL,
  flyPresentationAtAge,
  flyStrikeBallAtAge,
} from "../src/engine/fly.ts";
import {
  createSceneOnMovePresentation,
  MURKROW_TO_ONIX_FLY_PRESENTATION,
  PLAYER_MURKROW_TO_OPPONENT_ONIX_FLY_PRESENTATION,
  sceneOnFlyView,
} from "../src/engine/sceneOnPresentation.ts";

describe("portable two-turn FLY presentation", () => {
  it("preserves the source charge affine program and disappearance", () => {
    expect(FLY_CHARGE_BALL).toHaveLength(26);
    expect(flyPresentationAtAge("charge", -1, "opponent", { x: 176, y: 51 }, { x: 72, y: 88 }))
      .toMatchObject({ attackerInvisible: false, chargeBall: null });
    expect(flyPresentationAtAge("charge", 0, "opponent", { x: 176, y: 51 }, { x: 72, y: 88 }))
      .toMatchObject({
        attackerInvisible: true,
        chargeBall: { a: 1170, d: 256, y2: 0 },
      });
    expect(flyPresentationAtAge("charge", 25, "player", { x: 72, y: 97 }, { x: 176, y: 42 }))
      .toMatchObject({ chargeBall: { a: 682, d: 157, y2: -113 } });
    expect(flyPresentationAtAge("charge", 23, "opponent", { x: 176, y: 51 }, { x: 72, y: 88 }))
      .toMatchObject({ chargeBall: { a: 682, d: 157, y2: -81 } });
    expect(flyPresentationAtAge("charge", 24, "opponent", { x: 176, y: 51 }, { x: 72, y: 88 }))
      .toMatchObject({ attackerInvisible: true, chargeBall: null });
  });

  it("derives the canonical opponent strike from target-relative Q8.8 motion", () => {
    expect(flyStrikeBallAtAge(0, "opponent", { x: 72, y: 88 }))
      .toMatchObject({ x: 262, y: -26, pb: 212, pc: -212 });
    expect(flyStrikeBallAtAge(19, "opponent", { x: 72, y: 88 }))
      .toMatchObject({ x: 72, y: 88 });
    expect(flyStrikeBallAtAge(29, "opponent", { x: 72, y: 88 }))
      .toMatchObject({ x: -28, y: 148 });
  });

  it("mirrors the offscreen origin and rotation for the player attacker", () => {
    expect(flyStrikeBallAtAge(0, "player", { x: 176, y: 42 }))
      .toMatchObject({ x: -22, y: -29, pa: 86, pb: -241, pc: 241 });
    expect(flyStrikeBallAtAge(19, "player", { x: 176, y: 42 }))
      .toMatchObject({ x: 175, y: 41 });
  });

  it("reappears the attacker after flight and reuses impact/shake timing", () => {
    expect(flyPresentationAtAge("strike", 22, "opponent", { x: 176, y: 51 }, { x: 72, y: 88 }))
      .toMatchObject({ impactVisible: true, attackerInvisible: true });
    expect(flyPresentationAtAge("strike", 24, "opponent", { x: 176, y: 51 }, { x: 72, y: 88 }))
      .toMatchObject({ targetShakeX2: 6 });
    expect(flyPresentationAtAge("strike", 30, "opponent", { x: 176, y: 51 }, { x: 72, y: 88 }))
      .toMatchObject({
        attackerInvisible: false,
        strikeBall: null,
        impactVisible: true,
      });
  });

  it("exposes both legal orientations through the shared seam", () => {
    const opponent = createSceneOnMovePresentation({
      move: "FLY",
      turn: "charge",
      ...MURKROW_TO_ONIX_FLY_PRESENTATION,
    });
    expect(sceneOnFlyView(opponent)).toMatchObject({
      animationAge: 0,
      attackerInvisible: true,
      attacker: { species: "MURKROW", geometry: { side: "opponent" } },
    });
    const player = createSceneOnMovePresentation({
      move: "FLY",
      turn: "strike",
      ...PLAYER_MURKROW_TO_OPPONENT_ONIX_FLY_PRESENTATION,
    });
    expect(sceneOnFlyView({ ...player, age: 19 })).toMatchObject({
      attacker: { geometry: { side: "player" } },
      target: { geometry: { side: "opponent" } },
      strikeBall: { x: 175, y: 41 },
    });
  });
});
