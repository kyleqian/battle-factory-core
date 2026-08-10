import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Mon {
  readonly species: number;
  readonly level: number;
  readonly nature: number;
  readonly ivs: Readonly<Record<string, number>>;
  readonly evs: Readonly<Record<string, number>>;
  readonly moves: readonly number[];
  readonly ppUps: readonly number[];
  readonly item: number;
  readonly abilitySlot: number;
  readonly friendship: number;
  readonly gender: string;
  readonly shiny: boolean;
}

describe("MOVE_HEAT_WAVE evidence checkpoint", () => {
  it("pins the complete source interval and sole lowest Level-50 carrier", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/heatWaveSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("0x082cdbc6..0x082cdc76 (0xb0 bytes)");
    expect(output).toContain("set 526 FRONTIER_MON_NINETALES_2");
    expect(output).toContain("challenge 4 range 468..563");
  });

  it("stages complete legal three-Pokemon parties in both orientations", () => {
    const paths = [
      "tools/battle-lab/mechanic-heat-wave-player-ninetales-opponent-onix.json",
      "tools/battle-lab/mechanic-heat-wave-opponent-ninetales-player-onix.json",
    ];
    let carriers = 0;
    for (const path of paths) {
      const scenario = JSON.parse(readFileSync(path, "utf8")) as {
        profile: string; challengeNum: number; playerSetIds: number[]; opponentSetIds: number[];
        overrides: { parties: { player: readonly Mon[]; opponent: readonly Mon[] } };
      };
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.challengeNum).toBe(4);
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds]).toContain(526);
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds].every((id) => id >= 468 && id <= 563)).toBe(true);
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toHaveProperty("item");
        expect(mon).toHaveProperty("abilitySlot");
        expect(mon).toHaveProperty("friendship");
        expect(mon).toHaveProperty("gender");
        expect(mon).toHaveProperty("shiny");
      }
      carriers += [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .filter((mon) => mon.species === 38 && mon.moves.every((move) => move === 257)).length;
    }
    expect(carriers).toBe(2);
  });

  it("pins bilateral dense receipts and normalized maps without claiming exact coverage", () => {
    for (const [path, window, evidence, raw, mapHash] of [
      ["tools/compare/fixtures/heat-wave-player-ninetales-opponent-onix.json",
        { startFrame: 78, endFrame: 245, frameCount: 168 },
        "0a9e7a224193ab76b1ace7cd1c1479d72076b36daa1399604dc5b3bf3e7defbd",
        "a22b496d0a8622a96e2cdc223b234976777914196d0add14a6c1a43867ef9446",
        "29c4abde8bb9fcf6852b3c65a7878236f0b12c625ed184030cf45f59a9362bf8"],
      ["tools/compare/fixtures/heat-wave-opponent-ninetales-player-onix.json",
        { startFrame: 82, endFrame: 249, frameCount: 168 },
        "71fc59d12b5971122802695cd5104be695b47b0f27ecd54a7ee537746c9e3097",
        "5050e7a3c99a44a4ddfdef57ed5442c50ebfbb4fe9aef0020b25cc9e05b92db0",
        "840d4f8b10d9419160c28db4bbf7202bf38435d1eff9ccb802f9dd832cd44ded"],
    ] as const) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.denseWindow).toEqual(window);
      expect(fixture.evidenceSha256).toBe(evidence);
      expect(fixture.secondFreshEvidenceSha256).toBe(evidence);
      expect(fixture.rawRgbSha256).toBe(raw);
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex")).toBe(mapHash);
      expect(fixture.acceptance).toEqual({ status: "evidence-only-unsupported", denseEvidenceFrames: 168 });
    }
    expect(readFileSync("ANIMATION_COVERAGE.json", "utf8")).toContain("MOVE_HEAT_WAVE remains unsupported");
  });
});
