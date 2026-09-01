import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_DOUBLE_SLAP natural multi-hit exact acceptance", () => {
  it("stages the sole Level-50 carrier in complete bilateral parties", () => {
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/double-slap-natural-receipts.json", "utf8"));
    for (const orientation of receipt.orientations) {
      const scenario = JSON.parse(readFileSync(orientation.scenario, "utf8"));
      expect(scenario.profile).toBe("battle-scene-on");
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds]).toContain(155);
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const poliwhirl = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent].find((mon: { species: number }) => mon.species === 61);
      expect(poliwhirl.moves).toEqual([3, 3, 3, 3]);
      for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
      }
    }
  });

  it("pins both routes across every natural invocation twice fresh", () => {
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/double-slap-natural-receipts.json", "utf8"));
    expect(receipt.status).toBe("exact");
    let accepted = 0;
    for (const orientation of receipt.orientations) {
      expect(orientation.evidenceSha256).toBe(orientation.secondFreshEvidenceSha256);
      expect(orientation.windows.map((window: { moveTurn: number }) => window.moveTurn)).toEqual([0, 1, 2]);
      expect(orientation.windows.every((window: { frameCount: number }) => window.frameCount === 34)).toBe(true);
      for (const window of orientation.windows) {
        expect(createHash("sha256").update(readFileSync(window.changeMap)).digest("hex")).toBe(window.changeMapSha256);
        expect(window.acceptance).toEqual({ sourceReducerMatching: 34, typedSeamMatching: 34, componentMatching: 34, framebufferMatching: 34 });
        accepted += window.acceptance.framebufferMatching;
      }
    }
    expect(accepted).toBe(204);
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(222);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_DOUBLE_SLAP")).toMatchObject({ status: "exact" });
  });
});
