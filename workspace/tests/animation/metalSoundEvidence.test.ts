import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scenarios = [
  "tools/battle-lab/mechanic-metal-sound-player-aron-opponent-onix.json",
  "tools/battle-lab/mechanic-metal-sound-opponent-aron-player-onix.json",
];
const receipt = JSON.parse(
  readFileSync("tools/compare/fixtures/metal-sound-evidence-checkpoint.json", "utf8"),
);

describe("MOVE_METAL_SOUND bilateral Scene-ON evidence checkpoint", () => {
  it("stages complete legal parties and natural controller selection", () => {
    for (const path of scenarios) {
      const scenario = JSON.parse(readFileSync(path, "utf8"));
      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.trace.segments).toEqual([
        { frames: 2, buttons: ["A"] },
        { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] },
        { frames: 900, buttons: [] },
      ]);
      const carrier = [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ].find((mon: { species: number }) => mon.species === 382);
      expect(carrier).toMatchObject({
        level: 50,
        moves: [319, 319, 319, 319],
        ppUps: [0, 0, 0, 0],
      });
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
      }
    }
  });

  it("banks complete pointer-bounded bilateral windows twice fresh", () => {
    expect(receipt).toMatchObject({
      schema: "metal-sound-evidence-checkpoint/v1",
      oracleProfile: "battle-scene-on",
      move: "METAL_SOUND",
      status: "exact",
      sourceBounds: {
        start: "0x082d59b7",
        endExclusive: "0x082d5a07",
        bytes: "0x50",
      },
      carrier: "set 122 FRONTIER_MON_ARON / SPECIES_ARON / MOVE_METAL_SOUND",
      probe: "tools/compare/metalSoundProbe.py",
      orientationShift: { opponentFrontMinusPlayerBack: 0, measured: true },
    });
    expect(receipt.orientations.map((entry: {
      orientation: string;
      sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
      freshRuns: number;
      byteStable: boolean;
    }) => [
      entry.orientation,
      entry.sourceWindow.startFrame,
      entry.sourceWindow.endFrame,
      entry.sourceWindow.frameCount,
      entry.freshRuns,
      entry.byteStable,
    ])).toEqual([
      ["player-back", 291, 376, 86, 2, true],
      ["opponent-front", 291, 375, 85, 2, true],
    ]);
    for (const entry of receipt.orientations) {
      const map = readFileSync(entry.changeMap, "utf8");
      expect(createHash("sha256").update(map).digest("hex")).toBe(entry.changeMapSha256);
      expect(map).toContain("source-relative ages");
      expect(map).toContain("  static 1-7");
      expect(map).toContain("8 ");
      expect(map).toContain("  static 52-");
      expect(entry.pointerBound.firstInBoundsFrame).toBe(entry.sourceWindow.startFrame);
      expect(entry.pointerBound.firstInactiveCleanupFrame).toBe(entry.sourceWindow.endFrame);
      expect(entry.waveLifecycle).toMatchObject({
        spawnAges: [7, 11, 15, 19],
        lastActiveAge: 49,
        cleanupAge: 50,
        lastRgbChangeAge: 51,
      });
      expect(entry.latchChecks).toMatchObject({
        plainWaveOam: "RAM+1 visible motion",
        freshAffineMatrix: expect.stringContaining("reducer age-1"),
        shakeMon2: expect.stringContaining("positive creation write"),
        palettes: expect.stringContaining("RAM+1"),
      });
    }
    expect(receipt.evidenceScope.productionFramebuffer).toContain("86/86");
    expect(receipt.evidenceScope.productionFramebuffer).toContain("85/85");
    expect(receipt.promotion.status).toBe("exact");
  });

  it("keeps the bilateral exact Supersonic control receipts", () => {
    expect(receipt.control).toMatchObject({ move: "SUPERSONIC", status: "exact" });
    expect(receipt.control.portableRuns).toEqual({
      "player-back": {
        freshRuns: 2,
        frameCount: 51,
        componentMatches: [51, 51],
        framebufferMatches: [51, 51],
      },
      "opponent-front": {
        freshRuns: 2,
        frameCount: 51,
        componentMatches: [51, 51],
        framebufferMatches: [51, 51],
      },
    });
  });
});
