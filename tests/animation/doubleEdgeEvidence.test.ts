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

const fixtures: Array<[string, string, WindowExpect, number, number, number, "exact" | "partial", number, number]> = [
  // player-back HITMONTOP (Factory set 341, move 38) -> opponent ONIX
  ["tools/compare/fixtures/double-edge-player-hitmontop-opponent-onix.json", "player-to-opponent", { startFrame: 80, endFrame: 220, frameCount: 141 }, 157, 142, 237, "exact", 141, 141],
  // opponent-front HITMONTOP -> player ONIX (orientation shift +4; both first
  // frames are clean, no skipProbeFrames)
  ["tools/compare/fixtures/double-edge-opponent-hitmontop-player-onix.json", "opponent-to-player", { startFrame: 84, endFrame: 224, frameCount: 141 }, 142, 157, 237, "exact", 141, 141],
];

describe("MOVE_DOUBLE_EDGE dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp, species, status, framebuffer, component) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("DOUBLE_EDGE");
    expect(receipt.probe).toBe("tools/compare/doubleEdgeProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual(window);
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("HITMONTOP");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("double-edge-dense-evidence/v1");
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
    const hitmontopOnPlayer = playerParty.some((mon) => mon.species === species);
    const hitmontopParty = hitmontopOnPlayer ? playerParty : opponentParty;
    const hitmontop = hitmontopParty.find((mon) => mon.species === species);
    expect(hitmontop).toBeDefined();
    expect(hitmontop!.moves).toEqual([38, 38, 38, 38]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/double-edge-player-hitmontop-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "4a752c133a951b971045b8f521e3fc3b372a45a24ea3fd38e83e64e550d43d7b",
        secondFreshEvidenceSha256: "4a752c133a951b971045b8f521e3fc3b372a45a24ea3fd38e83e64e550d43d7b",
        rawRgbSha256: "0683e56fcffa8d09718a9252582888f66b617e0b56ec019057ab23037c4433d8",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/double-edge-opponent-hitmontop-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "30d84ed6f1e8c0e624536bb45bec5c30a07b1793095acc171558e5b8ec74b2d0",
        secondFreshEvidenceSha256: "30d84ed6f1e8c0e624536bb45bec5c30a07b1793095acc171558e5b8ec74b2d0",
        rawRgbSha256: "ef72361787f2b8f0f2554684a806db69c254bef755fef1ae4974c5d57ad2e9ce",
      });
  });
});
