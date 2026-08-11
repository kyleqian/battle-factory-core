import { describe, expect, it } from "vitest";
import type { FactoryBattleStartIntroState } from "../src/engine/factoryBattleStartIntro.ts";
import {
  generatedParticleStallLag,
  generatedSceneOffParticleAge,
  PARTICLE_STALL_LOGICAL_TICK,
} from "../src/engine/battleScene.ts";

const SPECIES_MAGNETON_ID = 82;
const SPECIES_COMBUSKEN_ID = 281;

function stallLagState(
  isCanonicalAnchorIntro: boolean,
  opponentSpeciesId: number,
): FactoryBattleStartIntroState {
  return {
    isCanonicalAnchorIntro,
    command: {
      activePartyIndexes: { opponent: 0 },
      parties: { opponent: [{ species: opponentSpeciesId }] },
    },
  } as unknown as FactoryBattleStartIntroState;
}

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

describe("ISSUES #56 closure audit — per-route particle stallLag (regression fix)", () => {
  it("keeps the canonical anchor's audited lag-1 fact regardless of species", () => {
    expect(generatedParticleStallLag(stallLagState(true, SPECIES_MAGNETON_ID))).toBe(1);
    expect(generatedParticleStallLag(stallLagState(true, SPECIES_COMBUSKEN_ID))).toBe(1);
  });

  it("gives MAGNETON's generated route stallLag 1 (frame 437's proven value)", () => {
    expect(generatedParticleStallLag(stallLagState(false, SPECIES_MAGNETON_ID))).toBe(1);
  });

  it("gives COMBUSKEN's generated route stallLag 0 (frame 444's proven value, unlike MAGNETON)", () => {
    expect(generatedParticleStallLag(stallLagState(false, SPECIES_COMBUSKEN_ID))).toBe(0);
  });
});
