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
  // player-back Charmander -> opponent Onix
  ["tools/compare/fixtures/metal-claw-player-charmander-opponent-onix.json", 140],
  // opponent-front Charmander -> player Onix
  ["tools/compare/fixtures/metal-claw-opponent-charmander-player-onix.json", 140],
];

describe("MOVE_METAL_CLAW dense evidence receipts", () => {
  it.each(fixtures)("pins a twice-fresh complete Scene-ON window: %s", (path, expectedMatching) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("METAL_CLAW");
    expect(receipt.denseWindow.frameCount).toBe(140);
    expect(receipt.evidenceSchema).toBe("metal-claw-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    // The sole Level-50 carrier (FRONTIER_MON_CHARMANDER, record 88) stages
    // all four move slots as METAL_CLAW against the legal ONIX, both sides.
    expect(scenario.profile).toBe("battle-scene-on");
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const all = [
      ...scenario.overrides.parties.player,
      ...scenario.overrides.parties.opponent,
    ] as Array<{ moves: number[]; species: number }>;
    const charmander = all.filter((mon) => mon.species === 4);
    expect(charmander).toHaveLength(3);
    expect(charmander[0]!.moves).toEqual([232, 232, 232, 232]);
    expect(charmander[0]!.species).toBe(4);
    // Both orientations reached 140/140 production identity twice fresh, so
    // both receipts are promoted: status is "exact" for each.
    expect(receipt.acceptance.status).toBe("exact");
    expect(receipt.acceptance.framebufferMatching).toBe(expectedMatching);
  });
});
