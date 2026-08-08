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
  // player-back MURKROW_1 (Factory record, move 259) -> opponent ONIX
  ["tools/compare/fixtures/torment-player-murkrow-opponent-onix.json", "player-to-opponent", { startFrame: 68, endFrame: 244 }, 156, 142],
  // opponent-front MURKROW_1 (Factory record, move 259) -> player ONIX
  ["tools/compare/fixtures/torment-opponent-murkrow-player-onix.json", "opponent-to-player", { startFrame: 72, endFrame: 248 }, 142, 156],
];

describe("MOVE_TORMENT dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("TORMENT");
    expect(receipt.probe).toBe("tools/compare/tormentProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual({
      startFrame: window.startFrame,
      endFrame: window.endFrame,
      frameCount: 177,
    });
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("MURKROW");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("torment-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.acceptance).toEqual({
      status: "exact",
      framebufferMatching: 177,
      componentMatching: 177,
    });
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const playerParty = scenario.overrides.parties.player as Array<{ species: number; moves: number[] }>;
    const opponentParty = scenario.overrides.parties.opponent as Array<{ species: number; moves: number[] }>;
    const murkrowOnPlayer = playerParty.some((mon) => mon.species === 198);
    const murkrowParty = murkrowOnPlayer ? playerParty : opponentParty;
    const murkrow = murkrowParty.find((mon) => mon.species === 198);
    expect(murkrow).toBeDefined();
    expect(murkrow!.moves).toEqual([259, 259, 259, 259]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/torment-player-murkrow-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "7d0bb71dd247c76d20df02f70742f0fa8fa590f352b1ca8b1a9599860a0d87de",
        secondFreshEvidenceSha256: "7d0bb71dd247c76d20df02f70742f0fa8fa590f352b1ca8b1a9599860a0d87de",
        rawRgbSha256: "805da7f5651230a3fbf2fee1b8f65bda039c79aa49e1e42679efde60ef5f816a",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/torment-opponent-murkrow-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "0116cb14698bb95f5b5912d0fdd0cbdef76dc0a056edc5d56b3a0720a50c3153",
        secondFreshEvidenceSha256: "0116cb14698bb95f5b5912d0fdd0cbdef76dc0a056edc5d56b3a0720a50c3153",
        rawRgbSha256: "82f08073ddf3f4b97e6b7d46b44d4a06f0c1e2b4a786eddc63048081b8bc0612",
      });
  });
});
