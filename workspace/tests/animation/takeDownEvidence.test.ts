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
    readonly skipProbeFrames?: number;
    readonly ageOffset?: number;
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
  readonly skipProbeFrames?: number;
  readonly ageOffset?: number;
}

const fixtures: Array<[string, string, WindowExpect, number, number, "exact" | "partial", number, number]> = [
  // player-back SWABLU (Factory set 93, move 36) -> opponent ONIX
  ["tools/compare/fixtures/take-down-player-swablu-opponent-onix.json", "player-to-opponent", { startFrame: 214, endFrame: 311, frameCount: 98 }, 131, 142, "exact", 98, 98],
  // opponent-front SWABLU -> player ONIX (raw frame 214 is the DETECT-class
  // enemy-shadow teardown, dropped with skipProbeFrames 1 / ageOffset 1)
  ["tools/compare/fixtures/take-down-opponent-swablu-player-onix.json", "opponent-to-player", { startFrame: 215, endFrame: 311, frameCount: 97, skipProbeFrames: 1, ageOffset: 1 }, 142, 131, "exact", 97, 97],
];

describe("MOVE_TAKE_DOWN dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp, status, framebuffer, component) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("TAKE_DOWN");
    expect(receipt.probe).toBe("tools/compare/takeDownProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual(window);
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("SWABLU");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("take-down-dense-evidence/v1");
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
    const swabluOnPlayer = playerParty.some((mon) => mon.species === 358);
    const swabluParty = swabluOnPlayer ? playerParty : opponentParty;
    const swablu = swabluParty.find((mon) => mon.species === 358);
    expect(swablu).toBeDefined();
    expect(swablu!.moves).toEqual([36, 36, 36, 36]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/take-down-player-swablu-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "5dcaff8f76177ee668523d83ad99aa24fc804f032ad59a73dc2bc34c99417f05",
        secondFreshEvidenceSha256: "5dcaff8f76177ee668523d83ad99aa24fc804f032ad59a73dc2bc34c99417f05",
        rawRgbSha256: "ebe70e6ca26b328700539e81c79d23dfcac79399b35d21687e07c4e00e553feb",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/take-down-opponent-swablu-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "798075401f91ce58bcf7b355866635fecc1173c34a8899a0804aba122ecab662",
        secondFreshEvidenceSha256: "798075401f91ce58bcf7b355866635fecc1173c34a8899a0804aba122ecab662",
        rawRgbSha256: "ad9b74ed4382262bdf94ae43749ead2a723e390898967ead811e3e06986095f7",
      });
  });
});
