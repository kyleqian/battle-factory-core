import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";

// qak249: receipts for qak248. The live opponent Quick Attack / Aerial Ace body is not clipped at row 74
// (docs/qak247-clip-sweep.md); SLAKING Aerial Ace and RAIKOU Quick Attack left 175 / 106 px at 74.
interface Receipt extends Fixture {
  romFrameSha256: string[];
  evidenceSha256: string;
  secondFreshEvidenceSha256: string;
  qak247Residual74: { pxAt74: number; pxAt160: number };
  acceptance: { status: string; framebufferMatching: number };
}

const CASES = [
  { species: "SLAKING", move: "AERIAL_ACE", frames: 50, path: "tools/compare/fixtures/aerial-ace-opponent-slaking-player-onix.json" },
  { species: "RAIKOU", move: "QUICK_ATTACK", frames: 33, path: "tools/compare/fixtures/quick-attack-opponent-raikou-player-onix.json" },
];

for (const c of CASES) {
  const receipt = JSON.parse(readFileSync(c.path, "utf8")) as Receipt;
  describe(`opponent ${c.species} ${c.move} vs player ONIX (Scene-ON ROM receipt)`, () => {
    it("pins the recorded receipt", () => {
      expect(receipt.attacker.species).toBe(c.species);
      expect(receipt.attacker.geometry.side).toBe("opponent");
      expect(receipt.target.species).toBe("ONIX");
      expect(receipt.move).toBe(c.move);
      expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
      expect(receipt.acceptance).toEqual({ status: "exact", framebufferMatching: c.frames });
      expect(receipt.romFrameSha256).toHaveLength(c.frames);
      expect(receipt.qak247Residual74.pxAt74).toBeGreaterThan(0);
      expect(receipt.qak247Residual74.pxAt160).toBe(0);
    });

    it(`renders all ${c.frames} frames with 0 px difference from the recorded ROM frames`, () => {
      const mismatched: number[] = [];
      for (let age = 0; age < c.frames; age++) {
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
}
