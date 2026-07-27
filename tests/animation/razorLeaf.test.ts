import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RAZOR_LEAF_BODY_LAST_AGE,
  RAZOR_LEAF_CUTTER_FIRST_AGE,
  RAZOR_LEAF_SHAKE_FIRST_AGE,
  razorLeafAtAge,
} from "../../src/animation/razorLeaf.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRazorLeafView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_RAZOR_LEAF source-relative reducer", () => {
  const player = (age: number) => razorLeafAtAge(
    age, "player", { x: 72, y: 97 }, { x: 176, y: 49 },
  );
  const opponent = (age: number) => razorLeafAtAge(
    age, "opponent", { x: 176, y: 51 }, { x: 72, y: 99 },
  );

  it("ports all ten literal leaf particles and their callback phases", () => {
    expect(player(3).particles).toEqual([
      expect.objectContaining({
        spawnIndex: 0, age: 0, x: 69, y: 95,
        x2: 0, y2: 0, tileOffset: 0, callback: "step1",
      }),
    ]);
    expect(player(39).particles).toHaveLength(10);
    expect(player(13).particles[0]).toMatchObject({
      age: 10, x: 42, y: 77, callback: "transition",
    });
    expect(player(14).particles[0]).toMatchObject({
      age: 11, x2: 0, y2: 0, callback: "step2",
    });
    expect(player(43).particles[0]).toMatchObject({ x2: 24, y2: 15 });
    expect(opponent(43).particles[0]).toMatchObject({ x2: -24, y2: 15 });
    expect(player(127).particles.some((sprite) => sprite.spawnIndex === 9))
      .toBe(true);
    expect(player(128).particles.some((sprite) => sprite.spawnIndex === 9))
      .toBe(false);
  });

  it("ports both target_both TRUE singles cutters without inventing partner geometry", () => {
    expect(RAZOR_LEAF_CUTTER_FIRST_AGE).toBe(101);
    expect(player(101).cutters).toEqual([
      expect.objectContaining({
        index: 0, x: 92, y: 87, x2: 4, y2: 1,
        hFlip: false, vFlip: false,
      }),
      expect.objectContaining({
        index: 1, x: 92, y: 87, x2: 4, y2: -4,
        hFlip: false, vFlip: false,
      }),
    ]);
    expect(opponent(101).cutters).toEqual([
      expect.objectContaining({ index: 0, x: 156, y: 41, x2: -4, y2: 4 }),
      expect.objectContaining({ index: 1, x: 156, y: 41, x2: -4, y2: -1 }),
    ]);
    expect(player(103).cutters.every((sprite) => sprite.hFlip)).toBe(true);
    expect(player(135).cutters).toEqual([]);
    expect(opponent(137).cutters).toEqual([]);
  });

  it("owns both literal shake requests, sounds, alpha/monbg, and teardown", () => {
    expect(RAZOR_LEAF_SHAKE_FIRST_AGE).toBe(123);
    expect(player(123)).toMatchObject({
      targetX2: -2,
      defenderPartnerShakeRequested: true,
      defenderPartnerShakeActive: false,
      soundRestart: "SE_M_RAZOR_WIND",
    });
    expect([123, 124, 125, 126, 136, 137].map((age) => player(age).targetX2))
      .toEqual([-2, -2, 2, 2, -2, 0]);
    expect([3, 13, 24, 35, 46].map((age) => player(age).soundRestart))
      .toEqual(Array(5).fill("SE_M_POISON_POWDER"));
    expect(player(101).soundRestart).toBe("SE_M_RAZOR_WIND2");
    expect(RAZOR_LEAF_BODY_LAST_AGE).toBe(138);
    expect(player(137)).toMatchObject({
      defenderPartnerOnMonBg: true,
      alpha: { eva: 12, evb: 8 },
      active: true,
    });
    expect(player(138)).toMatchObject({
      defenderPartnerOnMonBg: false,
      alpha: null,
      active: true,
    });
    expect(player(139).active).toBe(false);
  });

  it("exposes the complete source body through the typed relative seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "RAZOR_LEAF",
      attacker: {
        species: "WEEPINBELL",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 57 },
          animationCenter: { x: 72, y: 97 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "SHUCKLE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 17 },
          animationCenter: { x: 176, y: 49 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 172, playerMaxHp: 172,
        opponentHp: 127, opponentMaxHp: 127,
      },
    });
    expect(sceneOnRazorLeafView({ ...stage, age: 101 })).toMatchObject({
      age: 101,
      attacker: { species: "WEEPINBELL" },
      target: { species: "SHUCKLE" },
      cutters: [expect.objectContaining({ x: 92 }), expect.objectContaining({ x: 92 })],
    });
  });

  it("pins challenge-0 legal schedule IDs and the real set-165 carrier", () => {
    for (const name of [
      "mechanic-razor-leaf-player-weepinbell-opponent-shuckle.json",
      "mechanic-razor-leaf-opponent-weepinbell-player-shuckle.json",
    ]) {
      const fixture = JSON.parse(readFileSync(`tools/battle-lab/${name}`, "utf8"));
      expect(fixture.challengeNum).toBe(0);
      expect([...fixture.playerSetIds, ...fixture.opponentSetIds]
        .every((id: number) => id >= 110 && id <= 199)).toBe(true);
      const parties = fixture.overrides.parties;
      const carrier = [...parties.player, ...parties.opponent]
        .find((mon) => mon.moves.every((move: number) => move === 75));
      expect(carrier).toMatchObject({ species: 70, nature: 17 });
      expect(Math.min(...fixture.playerSetIds, ...fixture.opponentSetIds)).toBe(165);
    }
  });
});
