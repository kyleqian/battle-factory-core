import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  KARATE_CHOP_FRAME_COUNT,
  karateChopAtAge,
} from "../../src/animation/karateChop.ts";
import {
  createSceneOnMovePresentation,
  sceneOnKarateChopView,
  type SceneOnKarateChopConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const fixturePaths = [
  "tools/compare/fixtures/karate-chop-player-primeape-opponent-onix.json",
  "tools/compare/fixtures/karate-chop-opponent-primeape-player-onix.json",
] as const;

describe("MOVE_KARATE_CHOP pure source reducer and typed Scene-ON seam", () => {
  it.each(fixturePaths)("pins all 49 ages to the recorded component contract: %s", (path) => {
    const fixture = JSON.parse(readFileSync(path, "utf8")) as SceneOnKarateChopConfig & {
      componentContract: {
        scriptOffsets: number[];
        handX2: number[];
        shakeRemaining: number[];
        targetX2: number[];
      };
    };
    const stage = createSceneOnMovePresentation(fixture);
    expect(KARATE_CHOP_FRAME_COUNT).toBe(49);
    expect(fixture.componentContract.scriptOffsets).toHaveLength(49);

    for (let age = 0; age < KARATE_CHOP_FRAME_COUNT; age += 1) {
      const predicted = karateChopAtAge(
        age,
        fixture.target.geometry.side,
        fixture.target.geometry.animationCenter,
      );
      const seam = sceneOnKarateChopView({ ...stage, age });
      const { age: seamAge, attacker, target, ...seamState } = seam;
      expect(seamAge).toBe(age);
      expect(attacker).toBe(fixture.attacker);
      expect(target).toBe(fixture.target);
      expect(seamState).toEqual(predicted);

      expect(predicted.scriptOffset).toBe(fixture.componentContract.scriptOffsets[age]);
      expect(predicted.active).toBe(age < 48);
      expect(predicted.handsAndFeetLoaded).toBe(age >= 1 && age < 48);
      expect(predicted.impactLoaded).toBe(age >= 4 && age < 48);
      expect(predicted.targetOnMonBg).toBe(age >= 7 && age <= 32);
      expect(predicted.alpha).toEqual(age >= 10 && age <= 32 ? { eva: 12, evb: 8 } : null);
      expect(predicted.hand?.x2 ?? null).toBe(
        age >= 10 && age <= 20 ? fixture.componentContract.handX2[age - 10] : null,
      );
      expect(predicted.hand?.animation ?? null).toBe(age >= 10 && age <= 20 ? 3 : null);
      expect(predicted.hitsplat).toEqual(age >= 22 && age <= 31
        ? { ...fixture.target.geometry.animationCenter, matrix: 372 }
        : null);
      expect(predicted.shakeTask?.remaining ?? null).toBe(
        age >= 22 && age <= 31 ? fixture.componentContract.shakeRemaining[age - 22] : null,
      );
      expect(predicted.shakeTask?.delay ?? null).toBe(
        age >= 22 && age <= 31 ? 1 - ((age - 22) % 2) : null,
      );
      expect(predicted.targetOffset.x2).toBe(
        age >= 22 && age <= 31 ? fixture.componentContract.targetX2[age - 22] : 0,
      );
      expect(predicted.sound).toBe(age === 10
        ? "SE_M_DOUBLE_TEAM"
        : age === 22
        ? "SE_M_COMET_PUNCH"
        : null);
      expect(predicted.soundPanSide).toBe(age === 10 || age === 22
        ? fixture.target.geometry.side
        : null);
    }
  });

  it("rejects using the Karate Chop view for another move", () => {
    const fixture = JSON.parse(readFileSync(fixturePaths[0], "utf8"));
    expect(() => sceneOnKarateChopView({
      ...createSceneOnMovePresentation({ ...fixture, move: "LOW_KICK" }),
      age: 0,
    } as never)).toThrow("expected KARATE_CHOP presentation, got LOW_KICK");
  });
});
