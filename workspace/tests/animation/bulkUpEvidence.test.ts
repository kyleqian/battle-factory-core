import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly oracleProfile: string;
  readonly move: string;
  readonly scenario: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly breathOrigin: { readonly x: number; readonly y: number };
  readonly battlerHeight: number;
  readonly fieldProfile: { readonly playerHp: number; readonly playerMaxHp: number; readonly opponentHp: number; readonly opponentMaxHp: number };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: string; readonly framebufferMatching: number };
}

const fixtures: Array<[string, number, string, number, number]> = [
  // player-back Primeape set 337 -> opponent Onix (exact)
  ["tools/compare/fixtures/bulk-up-player-primeape-opponent-onix.json", 104, "exact", 72, 175],
  // opponent-front Primeape set 337 -> player Onix (exact)
  ["tools/compare/fixtures/bulk-up-opponent-primeape-player-onix.json", 104, "exact", 76, 179],
];

describe("MOVE_BULK_UP dense evidence receipts", () => {
  it.each(fixtures)("pins the Scene-ON window: %s", (path, expectedMatching, expectedStatus, startFrame, endFrame) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("BULK_UP");
    expect(receipt.denseWindow.startFrame).toBe(startFrame);
    expect(receipt.denseWindow.endFrame).toBe(endFrame);
    expect(receipt.denseWindow.frameCount).toBe(endFrame - startFrame + 1);
    expect(receipt.evidenceSchema).toBe("bulk-up-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    // FRONTIER_MON_PRIMEAPE_2 (set 337, species 57) stages all four move slots
    // as BULK_UP (339) against the legal ONIX (95), both sides.
    expect(scenario.profile).toBe("battle-scene-on");
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const all = [
      ...scenario.overrides.parties.player,
      ...scenario.overrides.parties.opponent,
    ] as Array<{ moves: number[]; species: number }>;
    const primeape = all.filter((mon) => mon.species === 57);
    expect(primeape).toHaveLength(1);
    expect(primeape[0]!.moves).toEqual([339, 339, 339, 339]);
    // Field profile comes from fresh battler RAM, never transcribed assumptions.
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
    expect(receipt.battlerHeight).toBe(50);
    expect(receipt.acceptance.status).toBe(expectedStatus);
    expect(receipt.acceptance.framebufferMatching).toBe(expectedMatching);
  });
});
