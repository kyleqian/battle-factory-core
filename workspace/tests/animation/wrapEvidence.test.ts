import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly oracleProfile: string;
  readonly move: string;
  readonly scenario: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly animationProfile: { readonly ellipse: object; readonly squeeze: object; readonly squeezeStarts: number[] };
  readonly fieldProfile: { readonly playerHp: number; readonly playerMaxHp: number; readonly opponentHp: number; readonly opponentMaxHp: number };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: string; readonly framebufferMatching: number };
}

const fixtures: Array<[string, number, number, number, number]> = [
  // player-back FRONTIER_MON_TENTACOOL record 124 -> opponent Onix (exact)
  ["tools/compare/fixtures/wrap-player-tentacool-opponent-onix.json", 38, 222, 259, 35],
  // opponent-front FRONTIER_MON_TENTACOOL record 124 -> player Onix (exact)
  ["tools/compare/fixtures/wrap-opponent-tentacool-player-onix.json", 38, 78, 115, 35],
];

describe("MOVE_WRAP dense evidence receipts", () => {
  it.each(fixtures)("pins a twice-fresh complete Scene-ON window: %s", (path, expectedMatching, startFrame, endFrame, expectedMove) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("WRAP");
    expect(receipt.denseWindow.startFrame).toBe(startFrame);
    expect(receipt.denseWindow.endFrame).toBe(endFrame);
    expect(receipt.denseWindow.frameCount).toBe(endFrame - startFrame + 1);
    expect(receipt.evidenceSchema).toBe("wrap-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    // The WRAP source body is the shared BindWrap subroutine with a leading
    // AnimTask_TranslateMonEllipticalRespectSide(ANIM_ATTACKER,6,4,2,4); the
    // squeeze (AnimTask_ScaleMonAndRestore 10,-5,5) is the BIND control's own.
    expect(receipt.animationProfile.ellipse).toEqual({
      xRadius: 6,
      yRadius: 4,
      loops: 2,
      speed: 4,
    });
    expect(receipt.animationProfile.squeeze).toEqual({
      xDelta: 10,
      yDelta: -5,
      duration: 5,
    });
    expect(receipt.animationProfile.squeezeStarts).toEqual([1, 19]);
    // FRONTIER_MON_TENTACOOL record 124 (species 72) stages all four move
    // slots as WRAP (35) against the legal ONIX (95), both sides.
    expect(scenario.profile).toBe("battle-scene-on");
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const all = [
      ...scenario.overrides.parties.player,
      ...scenario.overrides.parties.opponent,
    ] as Array<{ moves: number[]; species: number }>;
    const tentacool = all.filter((mon) => mon.species === 72);
    expect(tentacool).toHaveLength(3);
    for (const mon of tentacool) {
      expect(mon.moves).toEqual([
        expectedMove,
        expectedMove,
        expectedMove,
        expectedMove,
      ]);
    }
    // Field profile comes from fresh battler RAM, never transcribed assumptions.
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
    // Both orientations reached 38/38 production identity twice fresh, so
    // both receipts are promoted: status is "exact" for each.
    expect(receipt.acceptance.status).toBe("exact");
    expect(receipt.acceptance.framebufferMatching).toBe(expectedMatching);
  });
});
