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
  // player-back GROVYLE (Factory set 293, move 306) -> opponent ONIX
  ["tools/compare/fixtures/crush-claw-player-grovyle-opponent-onix.json", "player-to-opponent", { startFrame: 77, endFrame: 145, frameCount: 69 }, 146, 142, "exact", 69, 69],
  // opponent-front GROVYLE -> player ONIX
  ["tools/compare/fixtures/crush-claw-opponent-grovyle-player-onix.json", "opponent-to-player", { startFrame: 81, endFrame: 149, frameCount: 69 }, 142, 146, "exact", 69, 69],
];

describe("MOVE_CRUSH_CLAW dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp, status, framebuffer, component) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("CRUSH_CLAW");
    expect(receipt.probe).toBe("tools/compare/crushClawProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual(window);
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("GROVYLE");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("crush-claw-dense-evidence/v1");
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
    const grovyleOnPlayer = playerParty.some((mon) => mon.species === 278);
    const grovyleParty = grovyleOnPlayer ? playerParty : opponentParty;
    const grovyle = grovyleParty.find((mon) => mon.species === 278);
    expect(grovyle).toBeDefined();
    expect(grovyle!.moves).toEqual([306, 306, 306, 306]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/crush-claw-player-grovyle-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "515abad038862c35a86d480f333560459f83bc103687837187f9448e1b7c6f06",
        secondFreshEvidenceSha256: "515abad038862c35a86d480f333560459f83bc103687837187f9448e1b7c6f06",
        rawRgbSha256: "9e2c28d1edc910be89d157035334f10c234b92f4c3b3a72e240bfe922dd52508",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/crush-claw-opponent-grovyle-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "639bdc9ad5a4809e603582a9de27b328f5c8d119707411aee4b41526411ab229",
        secondFreshEvidenceSha256: "639bdc9ad5a4809e603582a9de27b328f5c8d119707411aee4b41526411ab229",
        rawRgbSha256: "b61b5eb2e20bd83c44016e40b389553ca2fa068526450911b010bea110407f69",
      });
  });
});
