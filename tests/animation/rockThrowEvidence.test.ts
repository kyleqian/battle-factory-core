import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly oracleProfile: string;
  readonly move: string;
  readonly scenario: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly animationProfile: {
    readonly rockAnchorAge: number;
    readonly targetShakeStartAge: number;
    readonly targetShakeEndAge: number;
    readonly targetX2OffAge: number;
  };
  readonly fieldProfile: { readonly playerHp: number; readonly playerMaxHp: number; readonly opponentHp: number; readonly opponentMaxHp: number };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: string; readonly framebufferMatching: number };
}

const fixtures: Array<[string, number, number, number, number, number, number]> = [
  // player-back FRONTIER_MON_GRAVELER_1 record 166 -> opponent Onix (exact)
  ["tools/compare/fixtures/rock-throw-player-graveler-opponent-onix.json", 87, 296, 382, 148, 151, 110],
  // opponent-front FRONTIER_MON_GRAVELER_1 record 166 -> player Onix (exact)
  ["tools/compare/fixtures/rock-throw-opponent-graveler-player-onix.json", 87, 296, 382, 110, 110, 148],
];

describe("MOVE_ROCK_THROW dense evidence receipts", () => {
  it.each(fixtures)("pins a twice-fresh complete Scene-ON window: %s", (path, expectedMatching, startFrame, endFrame, playerHp, playerMaxHp, opponentHp) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("ROCK_THROW");
    expect(receipt.denseWindow.startFrame).toBe(startFrame);
    expect(receipt.denseWindow.endFrame).toBe(endFrame);
    expect(receipt.denseWindow.frameCount).toBe(endFrame - startFrame + 1);
    expect(receipt.evidenceSchema).toBe("rock-throw-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    // The measured display contract: rock anchor 3, shake lead frame at 21
    // through 57, idle x2 drop at 21.
    expect(receipt.animationProfile).toMatchObject({
      rockAnchorAge: 3,
      targetShakeStartAge: 21,
      targetShakeEndAge: 57,
      targetX2OffAge: 21,
    });
    expect(scenario.profile).toBe("battle-scene-on");
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const all = [
      ...scenario.overrides.parties.player,
      ...scenario.overrides.parties.opponent,
    ] as Array<{ moves: number[]; species: number }>;
    const graveler = all.filter((mon) => mon.species === 75);
    expect(graveler).toHaveLength(3);
    for (const mon of graveler) {
      expect(mon.moves).toEqual([88, 88, 88, 88]);
    }
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.playerMaxHp).toBe(playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
    // Both orientations reached 87/87 production identity twice fresh, so
    // both receipts are promoted: status is "exact" for each.
    expect(receipt.acceptance.status).toBe("exact");
    expect(receipt.acceptance.framebufferMatching).toBe(expectedMatching);
  });
});
