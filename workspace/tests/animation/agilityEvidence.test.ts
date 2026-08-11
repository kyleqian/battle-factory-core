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

const fixtures: Array<[string, number, string]> = [
  // player-back Ledyba -> opponent Onix (exact)
  ["tools/compare/fixtures/agility-player-ledyba-opponent-onix.json", 87, "exact"],
  // opponent-front Ledyba -> player Onix (exact)
  ["tools/compare/fixtures/agility-opponent-ledyba-player-onix.json", 87, "exact"],
];

describe("MOVE_AGILITY dense evidence receipts", () => {
  it.each(fixtures)("pins the Scene-ON window: %s", (path, expectedMatching, expectedStatus) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("AGILITY");
    expect(receipt.denseWindow.frameCount).toBe(87);
    expect(receipt.evidenceSchema).toBe("agility-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    // FRONTIER_MON_LEDYBA record 40 stages all four move slots as AGILITY (97)
    // against the legal ONIX (95), both sides.
    expect(scenario.profile).toBe("battle-scene-on");
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const all = [
      ...scenario.overrides.parties.player,
      ...scenario.overrides.parties.opponent,
    ] as Array<{ moves: number[]; species: number }>;
    const ledyba = all.filter((mon) => mon.species === 165);
    expect(ledyba).toHaveLength(1);
    expect(ledyba[0]!.moves).toEqual([97, 97, 97, 97]);
    expect(receipt.acceptance.status).toBe(expectedStatus);
    expect(receipt.acceptance.framebufferMatching).toBe(expectedMatching);
  });
});
