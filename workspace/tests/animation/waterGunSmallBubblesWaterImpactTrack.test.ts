import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Json;
const representatives = [
  "MOVE_WATER_GUN",
  "MOVE_BUBBLE_BEAM",
  "MOVE_SECRET_POWER",
  "MOVE_DIVE",
  "MOVE_MIST_BALL",
  "MOVE_FAKE_TEARS",
  "MOVE_WATER_PULSE",
  "MOVE_HYDRO_PUMP",
  "MOVE_CRABHAMMER",
  "MOVE_WATER_SPOUT",
] as const;
const independentReceipt: Record<(typeof representatives)[number], string> = {
  MOVE_WATER_GUN: "tools/compare/waterGunPortable.ts",
  MOVE_BUBBLE_BEAM: "tools/compare/bubbleBeamPortable.ts",
  MOVE_SECRET_POWER: "tools/compare/secretPowerStrengthEvidence.ts",
  MOVE_DIVE: "tools/compare/diveFramebuffer.ts",
  MOVE_MIST_BALL: "tools/compare/mistBallPortable.ts",
  MOVE_FAKE_TEARS: "tools/compare/fakeTearsPortable.ts",
  MOVE_WATER_PULSE: "tools/compare/waterPulseActualCore.ts",
  MOVE_HYDRO_PUMP: "tools/compare/hydroPumpPortable.ts",
  MOVE_CRABHAMMER: "tools/compare/crabHammerPortable.ts",
  MOVE_WATER_SPOUT: "tools/compare/waterSpoutFramebuffer.ts",
};

describe("water-gun-small-bubbles-water-impact component-track ratchet", () => {
  it("retains independent exact evidence for every named representative", () => {
    for (const move of representatives) {
      const entry = coverage.entries.find((candidate: Json) => candidate.move === move);
      expect(entry, move).toMatchObject({ move, status: "exact" });
      expect(entry.evidence, move).toContain(independentReceipt[move]);
      expect(existsSync(independentReceipt[move]), independentReceipt[move]).toBe(true);
    }
  });

  it("fulfills only the named track and keeps Water Pulse's distinct body explicit", () => {
    const track = coverage.componentTracks.find((candidate: Json) =>
      candidate.id === "water-gun-small-bubbles-water-impact");
    expect(track).toMatchObject({ fulfilled: true, representatives: [...representatives] });
    expect(track.evidence).toEqual([
      "tests/animation/waterGunSmallBubblesWaterImpactTrack.test.ts",
      "tests/animation/waterPulseActualCore.test.ts",
    ]);
    const pulse = coverage.entries.find((candidate: Json) => candidate.move === "MOVE_WATER_PULSE");
    const claim = pulse.covered.join(" ");
    for (const fact of ["five bubble programs", "three affine rings", "whole-BG", "320/320", "inactive age 159"]) {
      expect(claim).toContain(fact);
    }
  });
});
