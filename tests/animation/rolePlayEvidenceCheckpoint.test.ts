import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixtures = [
  "tools/compare/fixtures/role-play-player-kadabra-opponent-onix.json",
  "tools/compare/fixtures/role-play-opponent-kadabra-player-onix.json",
] as const;

describe("MOVE_ROLE_PLAY dense evidence checkpoint", () => {
  it.each(fixtures)("pins a complete twice-fresh pointer-bounded receipt: %s", (path) => {
    const fixture = JSON.parse(readFileSync(path, "utf8"));
    expect(fixture).toMatchObject({
      schema: "role-play-portable-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "ROLE_PLAY",
      moveId: 272,
      sourceWindow: { frameCount: 147 },
      sourceBounds: { start: "0x082d4fae", endExclusive: "0x082d500a" },
      acceptance: { status: "exact", componentMatching: 147, framebufferMatching: 147 },
    });
    expect(fixture.sourceWindow.endFrame - fixture.sourceWindow.startFrame + 1).toBe(147);
    for (const digest of [fixture.probeJsonSha256, fixture.rawRgbSha256, fixture.changeMapSha256]) {
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
    }
    const map = readFileSync(fixture.changeMap, "utf8");
    expect(createHash("sha256").update(map).digest("hex")).toBe(fixture.changeMapSha256);
    expect(map).toContain("147 frames, 240x160");
  });

  it("pins bilateral source-derived identity and geometry without promoting", () => {
    const [player, opponent] = fixtures.map((path) => JSON.parse(readFileSync(path, "utf8")));
    expect(player).toMatchObject({ orientation: "player-back", sourceWindow: { startFrame: 70, endFrame: 216 }, attacker: { side: "player", animationCenter: { x: 72, y: 80 } }, target: { art: "back", personality: 1793700000, otId: 416049562 } });
    expect(opponent).toMatchObject({ orientation: "opponent-front", sourceWindow: { startFrame: 74, endFrame: 220 }, attacker: { side: "opponent", animationCenter: { x: 176, y: 42 } }, target: { art: "front", personality: 2349019075, otId: 416049562 } });
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status?: string }) => entry.status === "exact")).toHaveLength(152);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_ROLE_PLAY")?.status).toBe("exact");
  });
});
