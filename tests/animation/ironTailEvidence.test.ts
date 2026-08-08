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
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: string; readonly framebufferMatching: number; readonly componentMatching: number };
  readonly fieldProfile: { readonly playerHp: number; readonly playerMaxHp: number; readonly opponentHp: number; readonly opponentMaxHp: number };
}

interface WindowExpect {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameCount: number;
}

const fixtures: Array<[string, string, WindowExpect, number, number, "exact" | "partial", number, number]> = [
  // player-back AZUMARILL (Factory set 297, move 231) -> opponent ONIX
  ["tools/compare/fixtures/iron-tail-player-azumarill-opponent-onix.json", "player-to-opponent", { startFrame: 216, endFrame: 350, frameCount: 135 }, 187, 142, "exact", 135, 135],
  // opponent-front AZUMARILL -> player ONIX
  ["tools/compare/fixtures/iron-tail-opponent-azumarill-player-onix.json", "opponent-to-player", { startFrame: 215, endFrame: 349, frameCount: 135 }, 142, 188, "exact", 135, 135],
];

describe("MOVE_IRON_TAIL dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp, status, framebuffer, component) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("IRON_TAIL");
    expect(receipt.probe).toBe("tools/compare/ironTailProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual(window);
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("AZUMARILL");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("iron-tail-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.acceptance).toEqual({
      status,
      framebufferMatching: framebuffer,
      componentMatching: component,
    });
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const playerParty = scenario.overrides.parties.player as Array<{ species: number; moves: number[] }>;
    const opponentParty = scenario.overrides.parties.opponent as Array<{ species: number; moves: number[] }>;
    const azuOnPlayer = playerParty.some((mon) => mon.species === 184);
    const azuParty = azuOnPlayer ? playerParty : opponentParty;
    const azu = azuParty.find((mon) => mon.species === 184);
    expect(azu).toBeDefined();
    expect(azu!.moves).toEqual([231, 231, 231, 231]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/iron-tail-player-azumarill-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "ae8c3730865985179e737659d75684090aa3ebb512a127bff6c89b8a90f2d7c9",
        secondFreshEvidenceSha256: "ae8c3730865985179e737659d75684090aa3ebb512a127bff6c89b8a90f2d7c9",
        rawRgbSha256: "952808facb59f17298b90cbbcef4000f909e64da37e9950bedeca0b74558c428",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/iron-tail-opponent-azumarill-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "63f2d609b95a4a44d31a2572dd4aa9616942cfd923128d042c3314a3cca0317f",
        secondFreshEvidenceSha256: "63f2d609b95a4a44d31a2572dd4aa9616942cfd923128d042c3314a3cca0317f",
        rawRgbSha256: "bea1745ae3fc99cbe57d543b6e27a4a88bdea379c7ecaf4760d754c665f565f5",
      });
  });
});
