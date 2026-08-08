import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly move: string;
  readonly orientation: string;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSequenceSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: {
    readonly status: string;
    readonly componentMatching: number;
    readonly framebufferMatching: number;
  };
}

function receipt(name: string): Receipt {
  return JSON.parse(readFileSync(`tools/compare/fixtures/${name}`, "utf8")) as Receipt;
}

describe("MOVE_MAGICAL_LEAF exact portable evidence", () => {
  it("pins both twice-fresh complete Scene-ON receipts through first inactive cleanup", () => {
    const player = receipt("magical-leaf-player-roselia-opponent-onix.json");
    const opponent = receipt("magical-leaf-opponent-roselia-player-onix.json");
    expect(player).toMatchObject({
      schema: "scene-on-portable-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MAGICAL_LEAF",
      orientation: "player-back",
      denseWindow: { startFrame: 77, endFrame: 258, frameCount: 182 },
      evidenceSchema: "magical-leaf-dense-evidence/v1",
      evidenceSha256: "d8250aaed208f7305154855b6d44a76d2e349ee56e7f516b922aa7386b0741f9",
      rawRgbSequenceSha256: "f45745676e1c6383a01619d009f6e7f2e3e553417e39a2267fc81c85b6380f52",
      acceptance: { status: "exact", componentMatching: 182, framebufferMatching: 182 },
    });
    expect(opponent).toMatchObject({
      schema: "scene-on-portable-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MAGICAL_LEAF",
      orientation: "opponent-front",
      denseWindow: { startFrame: 81, endFrame: 262, frameCount: 182 },
      evidenceSchema: "magical-leaf-dense-evidence/v1",
      evidenceSha256: "cc7fd4818a30ef6e0d38f6a3391e7a24d572d23a52fc3611e0b8267a2ca3a8d3",
      rawRgbSequenceSha256: "1e7008151f3308e6e397640ef3e16789a0862f3ca1c5b729b1e847e74beff81f",
      acceptance: { status: "exact", componentMatching: 182, framebufferMatching: 182 },
    });
    for (const item of [player, opponent]) {
      expect(item.secondFreshEvidenceSha256).toBe(item.evidenceSha256);
      expect(createHash("sha256").update(readFileSync(item.changeMap)).digest("hex"))
        .toBe(item.changeMapSha256);
    }
  });
});
