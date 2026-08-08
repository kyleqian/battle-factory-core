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
  // player-back YANMA (Factory set 161, move 197) -> opponent ONIX
  ["tools/compare/fixtures/detect-player-yanma-opponent-onix.json", "player-to-opponent", { startFrame: 64, endFrame: 173, frameCount: 110 }, 161, 142, "exact", 110, 110],
  // opponent-front YANMA (Factory set 161, move 197) -> player ONIX; the
  // window starts at frame 69 (one later than the player side) because the
  // outgoing animation's OAM teardown (the enemy shadow) shows one display
  // behind the script-pointer boundary on the window's first frame.
  ["tools/compare/fixtures/detect-opponent-yanma-player-onix.json", "opponent-to-player", { startFrame: 69, endFrame: 177, frameCount: 109, skipProbeFrames: 1, ageOffset: 1 }, 142, 161, "exact", 109, 109],
];

describe("MOVE_DETECT dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp, status, framebuffer, component) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("DETECT");
    expect(receipt.probe).toBe("tools/compare/detectProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual(window);
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("YANMA");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("detect-dense-evidence/v1");
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
    const yanmaOnPlayer = playerParty.some((mon) => mon.species === 193);
    const yanmaParty = yanmaOnPlayer ? playerParty : opponentParty;
    const yanma = yanmaParty.find((mon) => mon.species === 193);
    expect(yanma).toBeDefined();
    expect(yanma!.moves).toEqual([197, 197, 197, 197]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/detect-player-yanma-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "52f1db13183e66f6a48e2ae0d08992280bb3153be5b1db19e6663a06e175ae0f",
        secondFreshEvidenceSha256: "52f1db13183e66f6a48e2ae0d08992280bb3153be5b1db19e6663a06e175ae0f",
        rawRgbSha256: "274b00b5e15634a4d19eb03c9cc62d8552dd02dffa4348efb927bab545ed5cb0",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/detect-opponent-yanma-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "0506c00b85c97197b62933d1579621d45770a47ad8d2e953d73f72f1c175d737",
        secondFreshEvidenceSha256: "0506c00b85c97197b62933d1579621d45770a47ad8d2e953d73f72f1c175d737",
        rawRgbSha256: "2086c05aac41c72e0f82c265d658c7d27cee9e8cf3f7ce6d93498f0eb4c39549",
      });
  });
});
