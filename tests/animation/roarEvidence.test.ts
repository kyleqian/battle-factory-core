import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Scenario = {
  overrides: { parties: { player: Array<{ species: number; moves: number[] }>; opponent: Array<{ species: number; moves: number[] }> } };
  trace: { segments: Array<{ buttons: string[] }> };
};

describe("MOVE_ROAR dense evidence fixtures", () => {
  it("pins complete legal parties and the asymmetric real-set/controller contract", () => {
    const player = JSON.parse(readFileSync(
      "tools/battle-lab/mechanic-roar-player-houndour-opponent-onix.json", "utf8",
    )) as Scenario;
    const opponent = JSON.parse(readFileSync(
      "tools/battle-lab/mechanic-roar-opponent-houndour-player-onix.json", "utf8",
    )) as Scenario;
    for (const scenario of [player, opponent]) {
      for (const party of Object.values(scenario.overrides.parties)) {
        expect(party).toHaveLength(3);
      }
    }
    expect(player.overrides.parties.player[0]).toMatchObject({
      species: 228, moves: [242, 52, 46, 182],
    });
    expect(player.overrides.parties.opponent.some((mon) => mon.species === 228)).toBe(false);
    expect(player.trace.segments.map((segment) => segment.buttons)).toContainEqual(["DOWN"]);
    expect(opponent.overrides.parties.opponent[0]).toMatchObject({
      species: 228, moves: [46, 46, 46, 46],
    });
    expect(opponent.overrides.parties.player.some((mon) => mon.species === 228)).toBe(false);
  });

  it("pins the portable receipt hashes without promoting Roar", () => {
    for (const path of [
      "tools/compare/fixtures/roar-player-houndour-opponent-onix.json",
      "tools/compare/fixtures/roar-opponent-houndour-player-onix.json",
    ]) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.schema).toBe("roar-portable-evidence/v1");
      expect(fixture.sourceWindow.frameCount).toBeGreaterThan(90);
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
