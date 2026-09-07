import { describe, expect, it } from "vitest";
import {
  FOCUS_PUNCH_FIRST_INACTIVE_AGE,
  focusPunchAtAge,
} from "../../src/animation/focusPunch.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFocusPunchView,
} from "../../src/animation/sceneOnPresentation.ts";

const PLAYER_BRELOOM = {
  species: "BRELOOM" as const,
  geometry: {
    side: "player" as const,
    spriteCorner: { x: 40, y: 52 },
    animationCenter: { x: 72, y: 84 },
    battlePositionCenter: { x: 72, y: 80 },
  },
};
const OPPONENT_STARMIE = {
  species: "STARMIE" as const,
  geometry: {
    side: "opponent" as const,
    spriteCorner: { x: 144, y: 14 },
    animationCenter: { x: 176, y: 46 },
    battlePositionCenter: { x: 176, y: 40 },
  },
};
const OPPONENT_BRELOOM = {
  ...PLAYER_BRELOOM,
  geometry: {
    side: "opponent" as const,
    spriteCorner: { x: 144, y: 12 },
    animationCenter: { x: 176, y: 44 },
    battlePositionCenter: { x: 176, y: 40 },
  },
};
const PLAYER_STARMIE = {
  ...OPPONENT_STARMIE,
  geometry: {
    side: "player" as const,
    spriteCorner: { x: 40, y: 62 },
    // Starmie's player-back source coordinate is intentionally not its raw
    // OAM center; Focus Punch receives the resolved animation center.
    animationCenter: { x: 72, y: 102 },
    battlePositionCenter: { x: 72, y: 80 },
  },
};

describe("MOVE_FOCUS_PUNCH source-relative reducer", () => {
  it("keeps the two target-side cleanup and target-background branches distinct", () => {
    expect(FOCUS_PUNCH_FIRST_INACTIVE_AGE).toEqual({ opponent: 154, player: 153 });
    const opponentTarget = focusPunchAtAge(153, "opponent", { x: 176, y: 46 });
    const playerTarget = focusPunchAtAge(153, "player", { x: 72, y: 102 });
    expect(opponentTarget.active).toBe(true);
    expect(playerTarget.active).toBe(false);
    expect(opponentTarget.background.variant).toBe("opponent");
    expect(playerTarget.background.variant).toBe("player");
    expect(focusPunchAtAge(154, "opponent", { x: 176, y: 46 })).toMatchObject({
      active: false, impactLoaded: false, handsAndFeetLoaded: false,
      targetOnMonBg: false, alpha: null,
    });
  });

  it("ports both target-side fades, monbg/alpha lifecycle, and resource cleanup", () => {
    expect(focusPunchAtAge(1, "opponent", { x: 176, y: 46 })).toMatchObject({
      impactLoaded: true, handsAndFeetLoaded: false,
    });
    expect(focusPunchAtAge(4, "opponent", { x: 176, y: 46 })).toMatchObject({
      impactLoaded: true, handsAndFeetLoaded: true,
    });
    expect(focusPunchAtAge(27, "opponent", { x: 176, y: 46 }).background).toEqual({
      variant: "opponent", impact: false, bldy: 16,
    });
    expect(focusPunchAtAge(32, "opponent", { x: 176, y: 46 }).background).toEqual({
      variant: "opponent", impact: true, bldy: 15,
    });
    expect(focusPunchAtAge(49, "opponent", { x: 176, y: 46 })).toMatchObject({
      targetOnMonBg: true, alpha: null,
    });
    expect(focusPunchAtAge(52, "opponent", { x: 176, y: 46 }).alpha).toEqual({
      eva: 12, evb: 8,
    });
    expect(focusPunchAtAge(112, "opponent", { x: 176, y: 46 }).alpha).toBeNull();
    expect(focusPunchAtAge(133, "opponent", { x: 176, y: 46 }).background).toEqual({
      variant: "opponent", impact: false, bldy: 15,
    });
    expect(focusPunchAtAge(132, "player", { x: 72, y: 102 }).background).toEqual({
      variant: "player", impact: false, bldy: 15,
    });
    expect(focusPunchAtAge(150, "opponent", { x: 176, y: 46 }).targetOnMonBg).toBe(false);
    expect(focusPunchAtAge(149, "player", { x: 72, y: 102 }).targetOnMonBg).toBe(false);
  });

  it("ports fist affine/callback, four independent hitsplats, ShakeMon, and sound commands", () => {
    const center = { x: 176, y: 46 };
    expect(focusPunchAtAge(52, "opponent", center).fist).toEqual({
      x: 176, y: 46, x2: 0, matrix: { pa: 136, pb: 0, pc: 0, pd: 136 },
    });
    expect(focusPunchAtAge(59, "opponent", center).fist?.matrix).toEqual({
      pa: 256, pb: 0, pc: 0, pd: 256,
    });
    expect(focusPunchAtAge(61, "opponent", center).fist?.x2).toBe(1);
    expect(focusPunchAtAge(64, "opponent", center).fist?.x2).toBe(-2);
    expect(focusPunchAtAge(100, "opponent", center).fist?.x2).toBe(2);
    expect(focusPunchAtAge(101, "opponent", center).fist).toBeNull();
    expect(focusPunchAtAge(64, "opponent", center).hitsplats).toEqual([{
      slot: 4, x: 166, y: 38, matrix: { pa: 256, pb: 0, pc: 0, pd: 256 },
    }]);
    expect(focusPunchAtAge(74, "opponent", center).hitsplats[0]).toMatchObject({ x: 186, y: 48 });
    expect(focusPunchAtAge(84, "opponent", center).hitsplats[0]).toMatchObject({ x: 186, y: 40 });
    expect(focusPunchAtAge(94, "opponent", center).hitsplats[0]).toMatchObject({ x: 176, y: 54 });
    expect(focusPunchAtAge(103, "opponent", center).hitsplats).toEqual([]);
    expect([64, 65, 66, 67, 68, 69, 70, 71].map((age) =>
      focusPunchAtAge(age, "opponent", center).targetOffset.x2,
    )).toEqual([0, 0, 8, 8, 0, 0, 8, 8]);
    expect([52, 74, 84, 94].map((age) => focusPunchAtAge(age, "opponent", center).sound)).toEqual([
      "SE_M_SWAGGER", "SE_M_VITAL_THROW2", "SE_M_VITAL_THROW2", "SE_M_MEGA_KICK2",
    ]);
  });

  it("keeps the typed seam live-species and live-geometry driven in both orientations", () => {
    const playerStage = createSceneOnMovePresentation({
      move: "FOCUS_PUNCH",
      attacker: PLAYER_BRELOOM,
      target: OPPONENT_STARMIE,
      fieldProfile: {
        playerHp: 135, playerMaxHp: 135, opponentHp: 135, opponentMaxHp: 135,
      },
    });
    const opponentStage = createSceneOnMovePresentation({
      move: "FOCUS_PUNCH",
      attacker: OPPONENT_BRELOOM,
      target: PLAYER_STARMIE,
      fieldProfile: {
        playerHp: 135, playerMaxHp: 135, opponentHp: 135, opponentMaxHp: 135,
      },
    });
    expect(sceneOnFocusPunchView({ ...playerStage, age: 64 }).hitsplats[0]).toMatchObject({
      x: 166, y: 38,
    });
    expect(sceneOnFocusPunchView({ ...opponentStage, age: 64 }).hitsplats[0]).toMatchObject({
      x: 82, y: 94,
    });
  });
});
