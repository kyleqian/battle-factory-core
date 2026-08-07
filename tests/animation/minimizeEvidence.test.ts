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
  // player-back GRIMER (Factory record, move 107) -> opponent ONIX
  ["tools/compare/fixtures/minimize-player-grimer-opponent-onix.json", "player-to-opponent", { startFrame: 210, endFrame: 362 }, 145, 142],
  // opponent-front GRIMER (Factory record, move 107) -> player ONIX
  ["tools/compare/fixtures/minimize-opponent-grimer-player-onix.json", "opponent-to-player", { startFrame: 210, endFrame: 362 }, 142, 145],
];

describe("MOVE_MINIMIZE dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("MINIMIZE");
    expect(receipt.probe).toBe("tools/compare/minimizeProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual({
      startFrame: window.startFrame,
      endFrame: window.endFrame,
      frameCount: 153,
    });
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("GRIMER");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("minimize-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.acceptance).toEqual({
      status: "partial",
      framebufferMatching: 144,
      componentMatching: 153,
    });
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const playerParty = scenario.overrides.parties.player as Array<{ species: number; moves: number[] }>;
    const opponentParty = scenario.overrides.parties.opponent as Array<{ species: number; moves: number[] }>;
    const grimerOnPlayer = playerParty.some((mon) => mon.species === 88);
    const grimerParty = grimerOnPlayer ? playerParty : opponentParty;
    const grimer = grimerParty.find((mon) => mon.species === 88);
    expect(grimer).toBeDefined();
    expect(grimer!.moves).toEqual([107, 107, 107, 107]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/minimize-player-grimer-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "c044f61de3cfbb0cc7a1ec4bda64148c52e28be62e0eb2c23c01c404691fb4e6",
        secondFreshEvidenceSha256: "c044f61de3cfbb0cc7a1ec4bda64148c52e28be62e0eb2c23c01c404691fb4e6",
        rawRgbSha256: "54dfaf4058dfa44f4e8264f7850197b50f15748abb7cbb0f7396b8e843bb0d2e",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/minimize-opponent-grimer-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "060ee54d0061daa6296017c1f224e9a25f555433828ab74856d9a8a8e440a9d9",
        secondFreshEvidenceSha256: "060ee54d0061daa6296017c1f224e9a25f555433828ab74856d9a8a8e440a9d9",
        rawRgbSha256: "da319b662e471c81985441b007dca58ec8db552407c8c01d443352a4ad27affc",
      });
  });
});
