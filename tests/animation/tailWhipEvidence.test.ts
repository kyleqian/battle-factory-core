import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly oracleProfile: string;
  readonly move: string;
  readonly scenario: string;
  readonly denseWindow: { readonly frameCount: number };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: string; readonly framebufferMatching: number };
}

const fixtures: Array<[string, number]> = [
  // player-back Ponyta -> opponent Onix
  ["tools/compare/fixtures/tail-whip-player-ponyta-opponent-onix.json", 77],
  // opponent-front Ponyta -> player Onix
  ["tools/compare/fixtures/tail-whip-opponent-ponyta-player-onix.json", 77],
];

describe("MOVE_TAIL_WHIP dense evidence receipts", () => {
  it.each(fixtures)("pins a twice-fresh complete Scene-ON window: %s", (path, expectedMatching) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("TAIL_WHIP");
    expect(receipt.denseWindow.frameCount).toBe(77);
    expect(receipt.evidenceSchema).toBe("tail-whip-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    // The sole Level-50 carrier (FRONTIER_MON_PONYTA_1, record 191) stages
    // all four move slots as TAIL_WHIP against the legal ONIX, both sides.
    expect(scenario.profile).toBe("battle-scene-on");
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const all = [
      ...scenario.overrides.parties.player,
      ...scenario.overrides.parties.opponent,
    ] as Array<{ moves: number[]; species: number }>;
    const ponyta = all.filter((mon) => mon.species === 77);
    expect(ponyta).toHaveLength(1);
    expect(ponyta[0]!.moves).toEqual([39, 39, 39, 39]);
    expect(ponyta[0]!.species).toBe(77);
    // Both orientations reached 77/77 production identity twice fresh, so
    // both receipts are promoted: status is "exact" for each.
    expect(receipt.acceptance.status).toBe("exact");
    expect(receipt.acceptance.framebufferMatching).toBe(expectedMatching);
  });
});
