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
  const fieldProfile = {
    playerHp: 117,
    opponentHp: 142,
    playerStatus: "none",
  } as const;
  const controllerProfile = {
    targetHpBefore: 117,
    targetHpAfter: 106,
    hitReactionFirstAge: 112,
    hpDrainFirstAge: 147,
    chargeMessageFirstAge: 62,
    strikeMoveTextFirstAge: 12,
    resultTextFirstAge: 163,
    currentMoveResetAge: 160,
  } as const;
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
    // The positive Q8.8 Y delta is coerced from odd 947 to even 946 because
    // source reserves bit 0 as the direction flag.
    expect(flyStrikeBallAtAge(22, "player", { x: 176, y: 42 }))
      .toMatchObject({ x: 207, y: 52 });
    expect(flyStrikeBallAtAge(29, "player", { x: 176, y: 42 })).toBeNull();
  });

  it("reappears the attacker after flight and reuses impact/shake timing", () => {
    expect(flyPresentationAtAge("strike", 21, "player", { x: 72, y: 97 }, { x: 176, y: 42 }))
      .toMatchObject({ targetTaskOwnsX2: false, targetShakeX2: 0 });
    expect(flyPresentationAtAge("strike", 22, "opponent", { x: 176, y: 51 }, { x: 72, y: 88 }))
      .toMatchObject({
        impactVisible: true,
        attackerInvisible: true,
        targetTaskOwnsX2: true,
        impactWinsBallOamTie: false,
      });
    expect(flyPresentationAtAge("strike", 22, "player", { x: 72, y: 97 }, { x: 176, y: 42 }))
      .toMatchObject({ impactVisible: true, impactWinsBallOamTie: true });
    expect(flyPresentationAtAge("strike", 23, "player", { x: 72, y: 97 }, { x: 176, y: 42 }))
      .toMatchObject({ impactWinsBallOamTie: false });
    expect(flyPresentationAtAge("strike", 24, "opponent", { x: 176, y: 51 }, { x: 72, y: 88 }))
      .toMatchObject({ targetTaskOwnsX2: true, targetShakeX2: 6 });
    expect(flyPresentationAtAge("strike", 30, "opponent", { x: 176, y: 51 }, { x: 72, y: 88 }))
      .toMatchObject({
        attackerInvisible: false,
        strikeBall: null,
        targetTaskOwnsX2: true,
        impactVisible: true,
      });
    expect(flyPresentationAtAge("strike", 28, "player", { x: 72, y: 97 }, { x: 176, y: 42 }))
      .toMatchObject({ attackerInvisible: true });
    expect(flyPresentationAtAge("strike", 29, "player", { x: 72, y: 97 }, { x: 176, y: 42 }))
      .toMatchObject({ attackerInvisible: false, strikeBall: null });
  });

  it("exposes both legal orientations through the shared seam", () => {
    const opponent = createSceneOnMovePresentation({
      move: "FLY",
      turn: "charge",
      ...MURKROW_TO_ONIX_FLY_PRESENTATION,
      fieldProfile,
      controllerProfile,
    });
    expect(sceneOnFlyView(opponent)).toMatchObject({
      animationAge: 0,
      attackerInvisible: true,
      attacker: { species: "MURKROW", geometry: { side: "opponent" } },
    });
    expect(sceneOnFlyView({ ...opponent, age: 62 })).toMatchObject({
      message: {
        line1: "Foe MURKROW flew",
        line2: "up high!",
        visibleChars: 1,
      },
    });
    const player = createSceneOnMovePresentation({
      move: "FLY",
      turn: "strike",
      ...PLAYER_MURKROW_TO_OPPONENT_ONIX_FLY_PRESENTATION,
      fieldProfile: {
        playerHp: 142,
        opponentHp: 117,
        playerStatus: "none",
      },
      controllerProfile,
    });
    expect(sceneOnFlyView({ ...player, age: 19 })).toMatchObject({
      attacker: { geometry: { side: "player" } },
      target: { geometry: { side: "opponent" } },
      strikeBall: { x: 175, y: 41 },
      message: { line1: "MURKROW used", line2: "FLY!" },
    });
    expect(sceneOnFlyView({ ...player, age: 147 })).toMatchObject({
      displayedTargetHp: 116,
      message: { line1: "MURKROW used" },
    });
    expect(sceneOnFlyView({ ...player, age: 163 })).toMatchObject({
      displayedTargetHp: 106,
      message: { line1: "It’s not very effective…", visibleChars: 1 },
      currentMove: null,
    });
  });
});
