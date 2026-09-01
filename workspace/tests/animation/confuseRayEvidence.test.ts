import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type EvidenceFrame = {
  gAnimScriptActive: number;
  visualTaskCount: number;
  softwareOam: string[];
  hardwareOam: string[];
  softwareMatrices: number[][];
  hardwareMatrices: number[][];
  fadedPalette: number[];
  hardwarePalette: number[];
  sprites: Array<{
    template: { symbol: string | null };
    callback: { symbol: string | null };
  }>;
};

type DenseProbe = {
  schema: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  frames: EvidenceFrame[];
};

const sha256 = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");
const receipt = JSON.parse(readFileSync(
  "tools/compare/fixtures/confuse-ray-source-staging-checkpoint.json",
  "utf8",
));

const cases = [
  {
    orientation: "player-back",
    artifact: "tools/compare/evidence/confuse-ray-player-full-state.json.gz",
    rawArtifact: "tools/compare/evidence/confuse-ray-player-source-rgb.tar.gz",
    map: "tools/compare/evidence/confuse-ray-changemap-player.txt",
    window: { startFrame: 76, endFrame: 345, frameCount: 270 },
  },
  {
    orientation: "opponent-front",
    artifact: "tools/compare/evidence/confuse-ray-opponent-full-state.json.gz",
    rawArtifact: "tools/compare/evidence/confuse-ray-opponent-source-rgb.tar.gz",
    map: "tools/compare/evidence/confuse-ray-changemap-opponent.txt",
    window: { startFrame: 80, endFrame: 349, frameCount: 270 },
  },
] as const;

describe("MOVE_CONFUSE_RAY dense unsupported checkpoint", () => {
  it.each(cases)("retains twice-fresh complete $orientation state and raw RGB", (fixture) => {
    const row = receipt.denseEvidence.orientations.find(
      (candidate: { orientation: string }) => candidate.orientation === fixture.orientation,
    );
    const compressed = readFileSync(fixture.artifact);
    const decoded = gunzipSync(compressed);
    const probe = JSON.parse(decoded.toString("utf8")) as DenseProbe;

    expect(probe.schema).toBe("confuse-ray-dense-evidence/v1");
    expect(probe.sourceWindow).toEqual(fixture.window);
    expect(probe.frames).toHaveLength(270);
    expect(sha256(compressed)).toBe(row.retained.fullStateGzipSha256);
    expect(sha256(decoded)).toBe(row.fullStateSha256Runs[0]);
    expect(row.fullStateSha256Runs[1]).toBe(row.fullStateSha256Runs[0]);
    expect(row.rawRgbSha256Runs[1]).toBe(row.rawRgbSha256Runs[0]);
    expect(sha256(readFileSync(fixture.rawArtifact))).toBe(row.retained.rawRgbArchiveSha256);
    expect(sha256(readFileSync(fixture.map))).toBe(row.retained.changeMapSha256);
    expect(probe.frames.at(-1)).toMatchObject({ gAnimScriptActive: 0, visualTaskCount: 0 });

    for (let age = 1; age < probe.frames.length; age += 1) {
      expect(probe.frames[age]!.hardwareOam).toEqual(probe.frames[age - 1]!.softwareOam);
      expect(probe.frames[age]!.hardwareMatrices).toEqual(probe.frames[age - 1]!.softwareMatrices);
    }
    expect(probe.frames.flatMap((frame, age) => (
      age > 0 && frame.hardwarePalette.toString() !== probe.frames[age - 1]!.fadedPalette.toString()
        ? [age]
        : []
    ))).toEqual([4]);

    const effectAt = (age: number) => probe.frames[age]!.sprites.find(
      (sprite) => sprite.template.symbol?.includes("ConfuseRayBall"),
    );
    expect(effectAt(46)?.template.symbol).toBe("gConfuseRayBallBounceSpriteTemplate");
    expect(effectAt(120)?.callback.symbol).toBe("DestroyAnimSpriteAndDisableBlend");
    expect(effectAt(121)).toBeUndefined();
    expect(effectAt(166)?.template.symbol).toBe("gConfuseRayBallSpiralSpriteTemplate");
    expect(effectAt(224)?.callback.symbol).toBe("AnimConfuseRayBallSpiral_Step");
    expect(effectAt(225)).toBeUndefined();

    const changeMap = readFileSync(fixture.map, "utf8");
    expect(changeMap).toContain("270 frames, 240x160");
    expect(changeMap).toContain("static 122-166");
    expect(changeMap).toContain("static 268-269");
  });

  it("records orientation-specific panning without promoting Will-O-Wisp", () => {
    expect(receipt.status).toBe("unsupported");
    expect(receipt.denseEvidence.twiceFresh).toBe(true);
    expect(receipt.denseEvidence.orientationDifferences).toMatchObject({ absoluteFrameShift: 4 });
    expect(receipt.denseEvidence.orientationDifferences.soundTask).toContain("-64 toward +63");
    expect(receipt.denseEvidence.orientationDifferences.soundTask).toContain("+63 toward -63");
    expect(receipt.siblingAudit).toMatchObject({ move: "MOVE_WILL_O_WISP", promoted: false });
  });

  it("promotes only Confuse Ray after complete bilateral production equality", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status?: string }) => entry.status === "exact"))
      .toHaveLength(223);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_CONFUSE_RAY"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_WILL_O_WISP"))
      .toBeUndefined();
  });
});
