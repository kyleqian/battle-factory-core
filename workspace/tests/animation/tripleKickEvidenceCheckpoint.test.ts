import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_TRIPLE_KICK bilateral exact acceptance", () => {
  it("stages the sole Factory carrier in complete legal three-Pokemon parties", () => {
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/triple-kick-branch-receipts.json", "utf8"));
    for (const orientation of receipt.orientations) {
      const scenario = JSON.parse(readFileSync(orientation.scenario, "utf8"));
      expect(scenario.profile).toBe("battle-scene-on");
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds]).toContain(236);
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const hitmontop = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .find((mon: { species: number }) => mon.species === 237);
      expect(hitmontop.moves).toEqual([167, 167, 167, 167]);
      for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
      }
    }
  });

  it("pins twice-fresh complete moveTurn 0/1/2 windows, maps, and all-frame acceptance", () => {
    const bytes = readFileSync("tools/compare/fixtures/triple-kick-branch-receipts.json");
    const receipt = JSON.parse(bytes.toString("utf8"));
    expect(createHash("sha256").update(bytes).digest("hex")).toHaveLength(64);
    expect(receipt.status).toBe("exact");
    let acceptedFrames = 0;
    for (const orientation of receipt.orientations) {
      expect(orientation.evidenceSha256).toBe(orientation.secondFreshEvidenceSha256);
      expect(orientation.windows.map((window: { moveTurn: number }) => window.moveTurn)).toEqual([0, 1, 2]);
      expect(orientation.windows.every((window: { frameCount: number }) => window.frameCount === 37)).toBe(true);
      expect(orientation.branchRawRgbSha256).toHaveLength(3);
      for (const window of orientation.windows) {
        expect(createHash("sha256").update(readFileSync(window.changeMap)).digest("hex"))
          .toBe(window.changeMapSha256);
        expect(window.acceptance).toEqual({
          sourceReducerMatching: 37,
          typedSeamMatching: 37,
          componentMatching: 37,
          framebufferMatching: 37,
        });
        acceptedFrames += window.acceptance.framebufferMatching;
      }
    }
    expect(acceptedFrames).toBe(222);
    expect(receipt.latches).toMatchObject({
      softwareOamAndMatricesToHardware: "RAM+1",
      wideFootHitsplatAndShakeMon: "RAM+1",
    });
    expect(receipt.latches.continuationMessage).toContain("blank window chrome");
    expect(receipt.latches.continuationTargetX2).toContain("prior ShakeMon overwrite");
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(218);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_TRIPLE_KICK"))
      .toMatchObject({ status: "exact" });
  });
});
