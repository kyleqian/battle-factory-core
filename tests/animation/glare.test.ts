import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GLARE_CLEANUP_AGE,
  GLARE_DOT_PAIR_COUNT,
  GLARE_DOT_LIFETIME,
  GLARE_SOURCE_FRAME_COUNT,
  glareAtAge,
  glareFramesToWaitAtAge,
  glareSourceOffsetAtAge,
  type GlareGeometry,
  GLARE_DISPLAYED_TARGET_X2_AGES_118_140,
} from "../../src/animation/glare.ts";
import {
  createSceneOnMovePresentation,
  sceneOnGlareView,
} from "../../src/animation/sceneOnPresentation.ts";

const geometries: readonly GlareGeometry[] = [
  {
    attackerSide: "player", targetSide: "opponent",
    attackerEyeCenter: { x: 72, y: 95 }, eyeDotStart: { x: 82, y: 93 },
    eyeDotEnd: { x: 176, y: 49 },
  },
  {
    attackerSide: "opponent", targetSide: "player",
    attackerEyeCenter: { x: 176, y: 49 }, eyeDotStart: { x: 168, y: 49 },
    eyeDotEnd: { x: 72, y: 99 },
  },
];

function expectedVisualTaskCount(age: number): number {
  if (age < 7 || age === 95 || age === 111 || age === 195 || age >= 211) return 0;
  if ((age >= 7 && age <= 94) || (age >= 96 && age <= 110)
    || (age >= 136 && age <= 194) || (age >= 196 && age <= 210)) return 1;
  if (age <= 113) return 2;
  if (age <= 117) return 3;
  if (age <= 133) return 4;
  if (age <= 135) return 2;
  return 1;
}

function q8Coordinate(start: number, end: number, pair: number): number {
  if (pair === 0) return start;
  if (pair === 12) return end;
  return ((start << 8) + pair * Math.trunc(((end - start) << 8) / 11)) >> 8;
}

describe("MOVE_GLARE source-relative reducer", () => {
  it("covers the complete 213-frame source window in both orientations", () => {
    for (const geometry of geometries) {
      for (let age = 0; age < GLARE_SOURCE_FRAME_COUNT; age += 1) {
        const state = glareAtAge(age, geometry);
        expect(state.active).toBe(age < GLARE_CLEANUP_AGE);
        expect(state.clean).toBe(age >= GLARE_CLEANUP_AGE);
        expect(state.sourceOffset).toBe(glareSourceOffsetAtAge(age));
        expect(state.framesToWait).toBe(glareFramesToWaitAtAge(age));
        expect(state.visualTaskCount).toBe(expectedVisualTaskCount(age));
        expect(state.soundTaskCount).toBe(0);
        expect(state.palette.selector).toBe("F_PAL_BG");
        expect(state.palette.color).toBe("RGB_BLACK");
        expect(state.registers).toMatchObject({
          dispcnt: 48960, bg1hofs: 0, bg1vofs: 0, bldy: 0,
        });

        const expectedPairs = Math.max(0, Math.min(GLARE_DOT_PAIR_COUNT,
          age < 10 ? 0 : 1 + Math.floor((age - 10) / 4)));
        const expectedDots = Array.from({ length: GLARE_DOT_PAIR_COUNT }, (_, pair) => {
          const timer = age - 10 - pair * 4;
          return timer >= 0 && timer < GLARE_DOT_LIFETIME ? pair : null;
        }).filter((pair): pair is number => pair !== null);
        expect(state.dots).toHaveLength(expectedDots.length * 2);
        expect(new Set(state.dots.map((dot) => dot.pair))).toEqual(new Set(expectedDots));
        expect(state.dots.every((dot) => dot.timer >= 0 && dot.timer < GLARE_DOT_LIFETIME
          && dot.x === q8Coordinate(geometry.eyeDotStart.x, geometry.eyeDotEnd.x, dot.pair)
          && dot.y === q8Coordinate(geometry.eyeDotStart.y, geometry.eyeDotEnd.y, dot.pair)
          && dot.data[0] === dot.timer && dot.data[2] === 10)).toBe(true);
        if (age >= 7 && age <= 94) {
          expect(state.tasks.some((task) => task.function === "AnimTask_GlareEyeDots_Step"
            && task.data[2] === expectedPairs)).toBe(true);
        }

        const expectedSparkles = age >= 112 && age <= 133;
        expect(state.sparkles).toHaveLength(expectedSparkles ? 2 : 0);
        if (expectedSparkles) {
          const frame = Math.min(4, Math.max(0, Math.floor((age - 113) / 4)));
          expect(state.sparkles.map((sprite) => [sprite.x, sprite.y, sprite.tileFrame]))
            .toEqual(geometry.attackerSide === "player"
              ? [[56, 95, frame], [88, 95, frame]]
              : [[192, 49, frame], [160, 49, frame]]);
        }

        expect(state.audio).toEqual({
          psybeam2: age >= 8 && age < 57,
          leer: age >= 115 && age < 176,
        });
        expect(state.soundRestart).toBe(age === 7 ? "SE_M_PSYBEAM2"
          : age === 114 ? "SE_M_LEER" : null);
        expect(state.shakeTask === null).toBe(!(age >= 118 && age <= 135));
        if (age >= 118 && age <= 135) {
          expect(state.shakeTask?.logicalTargetOffset.x2).toBe(
            [-1, 0, 1, 0, -1, 1, 0, -1, 0, 1][(age - 116) % 10],
          );
          expect(state.shakeTask?.hardwareTargetOffset.x2)
            .toBe(GLARE_DISPLAYED_TARGET_X2_AGES_118_140[age - 118] ?? 0);
        }
      }
      expect(glareAtAge(212, geometry)).toMatchObject({ active: false, clean: true,
        dots: [], sparkles: [], tasks: [], scaryFace: null, shakeTask: null });
    }
  });

  it("keeps the source script and callback ownership visible", () => {
    const script = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const glare = script.slice(script.indexOf("Move_GLARE:"), script.indexOf("Move_BARRAGE:"));
    expect(glare).toContain("createvisualtask AnimTask_GlareEyeDots, 5, 0");
    expect(glare).toContain("createvisualtask AnimTask_ScaryFace, 5");
    expect(glare).toContain("createvisualtask AnimTask_ShakeTargetInPattern, 3, 20, 1, FALSE");
    expect(glare).toContain("F_PAL_BG, 0, 0, 16, RGB_BLACK");
    expect(glare).toContain("F_PAL_BG, 0, 16, 0, RGB_BLACK");
    const effects = readFileSync("reference/pokeemerald/src/battle_anim_effects_3.c", "utf8");
    expect(effects).toContain("const struct SpriteTemplate gGlareEyeDotSpriteTemplate");
    expect(effects).toContain("task->tPairMax = 12");
  });

  it("is load-bearing through the typed Scene-ON seam", () => {
    const config = {
      move: "GLARE" as const,
      attacker: {
        species: "DUNSPARCE" as const,
        geometry: {
          side: "player" as const, spriteCorner: { x: 40, y: 63 },
          animationCenter: { x: 72, y: 95 }, battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "SHUCKLE" as const,
        geometry: {
          side: "opponent" as const, spriteCorner: { x: 144, y: 17 },
          animationCenter: { x: 176, y: 49 }, battlePositionCenter: { x: 176, y: 40 },
        },
      },
      attackerEyeCenter: { x: 72, y: 95 },
      eyeDotStart: { x: 82, y: 93 }, eyeDotEnd: { x: 176, y: 49 },
      fieldProfile: {
        playerHp: 177, playerMaxHp: 177, opponentHp: 95, opponentMaxHp: 95,
      },
    };
    const stage = createSceneOnMovePresentation(config);
    for (const age of [0, 10, 96, 112, 118, 133, 196, 212]) {
      expect(sceneOnGlareView({ ...stage, age })).toMatchObject(glareAtAge(age, geometries[0]!));
    }
  });
});
