import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { verifySkyUppercutEvidence } from "../../tools/compare/skyUppercutEvidence.ts";

type Json = Record<string, any>;

describe("MOVE_SKY_UPPERCUT complete bilateral dense evidence", () => {
  it("replays both retained fresh Scene-ON receipts and normalized maps", () => {
    const first = verifySkyUppercutEvidence();
    expect(verifySkyUppercutEvidence()).toEqual(first);
    expect(first).toMatchObject({ schema: "sky-uppercut-bilateral-evidence/v1", status: "unsupported-evidence", coverageCredit: false,
      orientations: {
        "player-back": { sourceWindow: { startFrame: 82, endFrame: 269, frameCount: 188, sourceFrameCount: 188 }, rows: 188, rawRgbRows: 188, rawRgbSequenceSha256: "09641d0d60590a8b99e5d14c5e0fd1f336099c9476f9c10825bcc6de28d39e20", changedRows: 170, cleanup: { age: 187, frame: 269, active: false, scriptOffset: 248 } },
        "opponent-front": { sourceWindow: { startFrame: 86, endFrame: 273, frameCount: 188, sourceFrameCount: 188 }, rows: 188, rawRgbRows: 188, rawRgbSequenceSha256: "8735dbb452a9fe588bee7880175a1ba2b0a6618501d03a3bcef6a2565b4a904f", changedRows: 170, cleanup: { age: 187, frame: 273, active: false, scriptOffset: 248 } },
      },
    });
  });

  it("retains orientation-banked source, resource, transfer, and cleanup maps", () => {
    for (const side of ["player", "opponent"] as const) {
      const map = JSON.parse(readFileSync(`tools/compare/evidence/sky-uppercut-changemap-${side}.json`, "utf8")) as Json;
      expect(map).toMatchObject({ schema: "sky-uppercut-normalized-change-map/v1", sourceWindow: { frameCount: 188 }, source: { rows: { length: 188 }, ownerCounts: { Move_SKY_UPPERCUT: 188 } }, rgb: { rows: { length: 188 }, changedRows: 170 }, cleanup: { age: 187, active: false, scriptOffset: 248, tasks: 0, sprites: 0, impactTag: false, scanlineState: 0 } });
      expect(map.transfers).toMatchObject({ oam: { matches: "187/187", exceptions: [] }, matrices: { matches: "187/187", exceptions: [] }, palette: { matches: "186/187", exceptions: [4] } });
      expect(map.background.scanline.banks).toHaveLength(188);
    }
  });
});
