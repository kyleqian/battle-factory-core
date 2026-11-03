import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";

// agi245: the opponent-attacker Agility body must not be clipped at the
// LEDYBA-calibrated corner.y + 55 on the live path (AIPOM's corner row is 11).
const path = "tools/compare/fixtures/agility-opponent-aipom-player-onix.json";
const receipt = JSON.parse(readFileSync(path, "utf8")) as Fixture & {
  romFrameSha256: string[];
  evidenceSha256: string;
  secondFreshEvidenceSha256: string;
  acceptance: { status: string; framebufferMatching: number };
};

describe("opponent AIPOM Agility vs player ONIX (Scene-ON ROM receipt)", () => {
  it("pins the recorded receipt", () => {
    expect(receipt.attacker.species).toBe("AIPOM");
    expect(receipt.attacker.geometry.side).toBe("opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.acceptance).toEqual({ status: "exact", framebufferMatching: 87 });
    expect(receipt.romFrameSha256).toHaveLength(87);
  });

  it("renders all 87 frames with 0 px difference from the recorded ROM frames", () => {
    const mismatched: number[] = [];
    for (let age = 0; age < 87; age++) {
      const rgba = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(rgba, liveView(receipt, age));
      const rgb = Buffer.alloc(240 * 160 * 3);
      for (let p = 0; p < 240 * 160; p++) {
        rgb[p * 3] = rgba[p * 4]!;
        rgb[p * 3 + 1] = rgba[p * 4 + 1]!;
        rgb[p * 3 + 2] = rgba[p * 4 + 2]!;
      }
      if (createHash("sha256").update(rgb).digest("hex") !== receipt.romFrameSha256[age]) mismatched.push(age);
    }
    expect(mismatched).toEqual([]);
  });
});
