import { describe, expect, it } from "vitest";
import {
  generatedSceneOffParticleAge,
  PARTICLE_STALL_LOGICAL_TICK,
} from "../src/engine/battleScene.ts";

const PARTICLE_COUNT = 16;
const PARTICLE_MAX_AGE = 24;

function aliveParticleAges(logicalTick: number, stallLag: number): number[] {
  return Array.from(
    { length: PARTICLE_COUNT },
    (_, particleIndex) => generatedSceneOffParticleAge(
      logicalTick,
      particleIndex,
      stallLag,
    ),
  ).filter((age) => age >= 0 && age <= PARTICLE_MAX_AGE);
}

describe("ISSUES #56 generated Scene-OFF particle stall", () => {
  it("freezes logical tick 13 at the logical-12 particle state", () => {
    expect(PARTICLE_STALL_LOGICAL_TICK).toBe(13);
    expect(aliveParticleAges(PARTICLE_STALL_LOGICAL_TICK, 0)).toEqual(
      aliveParticleAges(PARTICLE_STALL_LOGICAL_TICK - 1, 0),
    );
  });

  it("converges at logical tick 14 for both call-site lag values", () => {
    expect(aliveParticleAges(PARTICLE_STALL_LOGICAL_TICK + 1, 0)).toEqual(
      aliveParticleAges(PARTICLE_STALL_LOGICAL_TICK + 1, 1),
    );
  });
});
