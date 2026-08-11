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
  // player-back MAREEP (Factory record 49, move 148) -> opponent ONIX
  ["tools/compare/fixtures/flash-player-mareep-opponent-onix.json", "player-to-opponent", { startFrame: 213, endFrame: 276 }, 147, 142],
  // opponent-front MAREEP (Factory record 49, move 148) -> player ONIX
  ["tools/compare/fixtures/flash-opponent-mareep-player-onix.json", "opponent-to-player", { startFrame: 279, endFrame: 342 }, 142, 130],
];

describe("MOVE_FLASH dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("FLASH");
    expect(receipt.probe).toBe("tools/compare/flashProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual({
      startFrame: window.startFrame,
      endFrame: window.endFrame,
      frameCount: 64,
    });
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("MAREEP");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("flash-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.acceptance).toEqual({
      status: "exact",
      framebufferMatching: 64,
      componentMatching: 64,
    });
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const playerParty = scenario.overrides.parties.player as Array<{ species: number; moves: number[] }>;
    const opponentParty = scenario.overrides.parties.opponent as Array<{ species: number; moves: number[] }>;
    const mareepOnPlayer = playerParty.some((mon) => mon.species === 179);
    const mareepParty = mareepOnPlayer ? playerParty : opponentParty;
    const mareep = mareepParty.find((mon) => mon.species === 179);
    expect(mareep).toBeDefined();
    expect(mareep!.moves).toEqual([148, 148, 148, 148]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/flash-player-mareep-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "5479cd1b0d362af916997d618c440766867e277dabd70c310ef21c1e165ef2ec",
        secondFreshEvidenceSha256: "5479cd1b0d362af916997d618c440766867e277dabd70c310ef21c1e165ef2ec",
        rawRgbSha256: "465432973f5f94de56b6106681cc541fed5e73748bfa498fefa6ca0933b38a7f",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/flash-opponent-mareep-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "7969b083de96a38920a4a8071ae13c5f16a76f21cb616df204f455aff6b81465",
        secondFreshEvidenceSha256: "7969b083de96a38920a4a8071ae13c5f16a76f21cb616df204f455aff6b81465",
        rawRgbSha256: "d6c65c11c53e5e5eea8f41518099a338113feaa0f4a18ed0717100806f8e8722",
      });
  });
});
