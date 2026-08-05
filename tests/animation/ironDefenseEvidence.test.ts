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
  // player-back Clamperl -> opponent Onix
  ["tools/compare/fixtures/iron-defense-player-clamperl-opponent-onix.json", 101],
  // opponent-front Clamperl -> player Onix
  ["tools/compare/fixtures/iron-defense-opponent-clamperl-player-onix.json", 101],
];

describe("MOVE_IRON_DEFENSE dense evidence receipts", () => {
  it.each(fixtures)("pins a twice-fresh complete Scene-ON window: %s", (path, expectedMatching) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("IRON_DEFENSE");
    expect(receipt.denseWindow.frameCount).toBe(101);
    expect(receipt.evidenceSchema).toBe("iron-defense-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    // The sole Level-50 carrier (FRONTIER_MON_CLAMPERL, record 134) stages
    // all four move slots as IRON_DEFENSE against the legal ONIX, both sides.
    expect(scenario.profile).toBe("battle-scene-on");
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const all = [
      ...scenario.overrides.parties.player,
      ...scenario.overrides.parties.opponent,
    ] as Array<{ moves: number[]; species: number }>;
    // The carrier fills its whole side (harden-style staging), so the
    // CLAMPERL side has all three slots as IRON_DEFENSE.
    const clamperl = all.filter((mon) => mon.species === 373);
    expect(clamperl).toHaveLength(3);
    expect(clamperl[0]!.moves).toEqual([334, 334, 334, 334]);
    expect(clamperl[0]!.species).toBe(373);
    // Both orientations reached 101/101 production identity twice fresh, so
    // both receipts are promoted: status is "exact" for each.
    expect(receipt.acceptance.status).toBe("exact");
    expect(receipt.acceptance.framebufferMatching).toBe(expectedMatching);
  });
});
