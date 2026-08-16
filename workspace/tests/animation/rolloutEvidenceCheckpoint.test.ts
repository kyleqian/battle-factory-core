import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import fixture from "../../tools/compare/fixtures/rollout-evidence.json" with { type: "json" };
import sourceFixture from "../fixtures/rollout-animation-source-staging.json" with { type: "json" };

const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

describe("MOVE_ROLLOUT complete natural counter lifecycle evidence", () => {
  it("replays retained full-state, RGB, and normalized change-map evidence", () => {
    const output = execFileSync("node", ["--experimental-strip-types", fixture.verifier], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    const summary = JSON.parse(output) as Record<string, any>;
    for (const [side, expected] of Object.entries(fixture.orientations)) {
      expect(sha(readFileSync(expected.scenario))).toBe(expected.scenarioSha256);
      expect(sha(readFileSync(expected.denseState))).toBe(expected.denseStateSha256);
      expect(sha(readFileSync(expected.rawRgb))).toBe(expected.rawRgbSha256);
      expect(sha(readFileSync(expected.changeMap))).toBe(expected.changeMapSha256);
      expect(summary[side]).toMatchObject({ probeJsonSha256: expected.probeJsonSha256, rawRgbSequenceSha256: expected.rawRgbSequenceSha256, changeMapSha256: expected.changeMapSha256 });
      expect(summary[side].sourceWindows.map((row: any) => [row.startFrame, row.endFrame])).toEqual(expected.sourceWindows);
    }
  });

  it.each(Object.entries(fixture.orientations))("pins all five %s bodies through inactive cleanup", (side, expected) => {
    const probe = JSON.parse(gunzipSync(readFileSync(expected.denseState)).toString("utf8")) as Record<string, any>;
    const map = JSON.parse(readFileSync(expected.changeMap, "utf8")) as Record<string, any>;
    expect(probe.completeFiveBodyLifecycle).toBe(true);
    expect(probe.bodies.map((body: any[]) => body.length)).toEqual(fixture.expected.frameCounts);
    expect(map.bodies.map((body: any) => body.counter.taskValues[0])).toEqual(fixture.expected.counters);
    expect(map.bodies.map((body: any) => body.counter.animationCopy.rolloutTimer)).toEqual(fixture.expected.remainingTimers);
    expect(map.bodies.map((body: any) => body.power.animMovePower[0])).toEqual(fixture.expected.dynamicPowers);
    expect(map.bodies.map((body: any) => body.power.dynamicBasePower[0])).toEqual(fixture.expected.dynamicPowers);
    expect(map.bodies.map((body: any) => body.power.shakeAmplitude[0])).toEqual(fixture.expected.shakeAmplitudes);
    expect(map.bodies.map((body: any) => body.particles.creations)).toEqual(fixture.expected.particleCreations);
    expect(map.bodies.every((body: any) => JSON.stringify(body.particles.affineModes) === "[0]")).toBe(true);
    expect(map.bodies.every((body: any) => body.cleanup.active === false && body.cleanup.visualTasks === 0 && body.cleanup.soundTasks === 0 && body.cleanup.particles === 0)).toBe(true);
    expect(map.bodies.every((body: any) => body.state.gameplayRngTransitions.length === 0 && body.state.partyRowsComplete)).toBe(true);
    expect(side).toMatch(/^(player-back|opponent-front)$/u);
  });

  it("pins Rollout OBJ RAM+2 and power-shake monbg RAM+1 independently", () => {
    for (const expected of Object.values(fixture.orientations)) {
      const map = JSON.parse(readFileSync(expected.changeMap, "utf8")) as Record<string, any>;
      for (const body of map.bodies) {
        const latch = body.latches;
        expect(latch.rolloutAttackerSourceAxisChanges).toEqual([13,14,15,16,17,18,19,20,21,22,43,44,45,46,47,48,49,50,51,52]);
        expect(latch.rolloutAttackerSoftwareOamAxisChanges).toEqual(latch.rolloutAttackerSourceAxisChanges.map((age: number) => age + 1));
        expect(latch.rolloutAttackerHardwareOamAxisChanges).toEqual(latch.rolloutAttackerSourceAxisChanges.map((age: number) => age + 2));
        expect(latch.shakeTargetBgRegisterChanges).toEqual(latch.targetSourceAxisChanges.map((age: number) => age + 1));
        expect(latch.hardwareOamEqualsPrecedingSoftware).toMatch(/^(144|152|160|166)\/\1$/u);
        expect(latch.hardwareMatricesEqualPrecedingSoftware).toMatch(/^(144|152|160|166)\/\1$/u);
      }
    }
  });

  it("retains exact bilateral acceptance with independent controls", () => {
    expect(fixture).toMatchObject({ move: "MOVE_ROLLOUT", status: "exact", coverageCredit: true });
    expect(fixture.repeatability).toEqual({ runsPerOrientation: 2, comparison: "byte-identical dense JSON and every raw RGB frame", allMatched: true });
    expect(sourceFixture.counterBranches.map((row) => row.defenseCurlPower)).toEqual(fixture.expected.defenseCurlPowersFromPinnedSource);
    expect(fixture.boundedRemainder).toContain("all 1,586 rows with zero residual pixels");
    expect(fixture.boundedRemainder).toContain("enemy-shadow OAM layer");
    expect(fixture.boundedRemainder).toContain("MOVE_ICE_BALL");
    expect(fixture.boundedRemainder).toContain("Defense Curl gameplay state");
  });
});
