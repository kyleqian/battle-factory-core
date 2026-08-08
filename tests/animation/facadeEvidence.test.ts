import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly move: string;
  readonly appStage: { readonly presentationAge: number };
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: string; readonly framebufferMatching: number; readonly componentMatching: number };
  readonly fieldProfile: { readonly playerHp: number; readonly playerMaxHp: number; readonly opponentHp: number; readonly opponentMaxHp: number };
}

const fixtures: Array<[string, string, { startFrame: number; endFrame: number }, number, number]> = [
  // player-back AZUMARILL (Factory record 90, move 263) -> opponent ONIX
  ["tools/compare/fixtures/facade-player-azumarill-opponent-onix.json", "player-to-opponent", { startFrame: 212, endFrame: 292 }, 167, 142],
  // opponent-front AZUMARILL (Factory record 90, move 263) -> player ONIX
  ["tools/compare/fixtures/facade-opponent-azumarill-player-onix.json", "opponent-to-player", { startFrame: 212, endFrame: 292 }, 142, 167],
];

describe("MOVE_FACADE dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("FACADE");
    expect(receipt.probe).toBe("tools/compare/facadeProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual({
      startFrame: window.startFrame,
      endFrame: window.endFrame,
      frameCount: 81,
    });
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("AZUMARILL");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("facade-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.acceptance).toEqual({
      status: "exact",
      framebufferMatching: 81,
      componentMatching: 81,
    });
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const playerParty = scenario.overrides.parties.player as Array<{ species: number; moves: number[] }>;
    const opponentParty = scenario.overrides.parties.opponent as Array<{ species: number; moves: number[] }>;
    const azumarillOnPlayer = playerParty.some((mon) => mon.species === 184);
    const azumarillParty = azumarillOnPlayer ? playerParty : opponentParty;
    const azumarill = azumarillParty.find((mon) => mon.species === 184);
    expect(azumarill).toBeDefined();
    expect(azumarill!.moves).toEqual([263, 263, 263, 263]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/facade-player-azumarill-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "0c0069cd1f25034cfda871536fb070e3c0119666acfce947a91f81d4a5c5395a",
        secondFreshEvidenceSha256: "0c0069cd1f25034cfda871536fb070e3c0119666acfce947a91f81d4a5c5395a",
        rawRgbSha256: "f053995ab27f48282c47e9d65466011cd93840222ffdeefb00f83777bbb2097a",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/facade-opponent-azumarill-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "0b6d6e52e8b38f101a9ee123f192e5ca4b6eee222980b8c30c0f4f089c6031d2",
        secondFreshEvidenceSha256: "0b6d6e52e8b38f101a9ee123f192e5ca4b6eee222980b8c30c0f4f089c6031d2",
        rawRgbSha256: "2c20c276ea3ba49466ce1c072588244273706b4e85e23bc0e47d4ec9b346ccc2",
      });
  });
});
