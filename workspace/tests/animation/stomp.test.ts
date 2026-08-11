import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { stompAtAge, STOMP_FRAME_COUNT } from "../../src/animation/stomp.ts";
import {
  createSceneOnMovePresentation,
  sceneOnStompView,
} from "../../src/animation/sceneOnPresentation.ts";

const target = { x: 176, y: 42 };

describe("MOVE_STOMP source reducer", () => {
  it("keeps the unique foot wait, six-step descent, tail, and cleanup source-relative", () => {
    expect(STOMP_FRAME_COUNT).toBe(67);
    expect(stompAtAge(9, "opponent", target).foot).toBeNull();
    expect(stompAtAge(10, "opponent", target).foot).toEqual({ x: 176, y: 10, y2: 0 });
    expect([26, 27, 28, 29, 30, 31].map((age) => stompAtAge(age, "opponent", target).foot?.y2))
      .toEqual([5, 10, 15, 21, 26, 31]);
    expect(stompAtAge(49, "opponent", target).foot?.y2).toBe(31);
    expect(stompAtAge(50, "opponent", target).foot).toBeNull();
    expect(stompAtAge(66, "opponent", target).active).toBe(false);
  });

  it("keeps target-relative hit, ShakeMon scanout receipt, alpha, and audio explicit", () => {
    expect(stompAtAge(31, "opponent", target)).toMatchObject({
      hitsplat: { x: 176, y: 34, matrix: 303 },
      sound: "SE_M_MEGA_KICK2", soundPanSide: "opponent",
    });
    expect([31, 32, 33, 34, 35, 36, 37, 38, 39, 40].map(
      (age) => stompAtAge(age, "opponent", target).targetOffset.y2,
    )).toEqual([0, 0, 4, 4, 0, 0, 4, 4, 0, 0]);
    expect(stompAtAge(10, "player", target).sound).toBe("SE_M_DOUBLE_TEAM");
    expect(stompAtAge(10, "player", target).alpha).toEqual({ eva: 12, evb: 8 });
    expect(stompAtAge(51, "player", target).alpha).toBeNull();
  });

  it("crosses the typed Scene-ON seam without owning Stomp's damage/flinch/RNG", () => {
    const stage = createSceneOnMovePresentation({
      move: "STOMP" as const,
      attacker: { species: "LOUDRED", geometry: { side: "player" as const, spriteCorner: { x: 40, y: 57 }, animationCenter: { x: 72, y: 89 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent" as const, spriteCorner: { x: 144, y: 10 }, animationCenter: target, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 164, playerMaxHp: 177, opponentHp: 117, opponentMaxHp: 117 },
    });
    const view = sceneOnStompView({ ...stage, age: 31 });
    expect(view.hitsplat).toEqual({ x: 176, y: 34, matrix: 303 });
    expect(Object.keys(stage.config.fieldProfile)).not.toContain("flinch");
  });

  it("pins the source body and unique callback rather than treating Mega Kick as Stomp", () => {
    const output = execFileSync("node", ["--experimental-strip-types", "tools/compare/stompSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("unique gStompFootSpriteTemplate");
  });
});
