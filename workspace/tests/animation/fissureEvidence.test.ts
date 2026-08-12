import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type EvidenceFrame = {
  gAnimScriptActive: number;
  visualTaskCount: number;
  soundTaskCount: number;
  softwareOam: string[];
  hardwareOam: string[];
  softwareMatrices: number[][];
  hardwareMatrices: number[][];
  fadedPalette: number[];
  hardwarePalette: number[];
  immutableState: Record<string, unknown>;
  tasks: Array<{ func: { symbol: string | null } }>;
  sprites: Array<{
    slot: number;
    x: number;
    y: number;
    template: { symbol: string | null };
  }>;
  registers: Record<string, number>;
  se1: { rawInfo: string };
  se2: { rawInfo: string };
};

type DenseProbe = {
  schema: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  frames: EvidenceFrame[];
};

const sha256 = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");
const receipt = JSON.parse(readFileSync(
  "tools/compare/fixtures/fissure-source-staging-checkpoint.json",
  "utf8",
));

const cases = [
  {
    orientation: "player-back",
    artifact: "tools/compare/evidence/fissure-player-full-state.json.gz",
    rawArtifact: "tools/compare/evidence/fissure-player-source-rgb.tar.gz",
    map: "tools/compare/evidence/fissure-changemap-player.txt",
    window: { startFrame: 72, endFrame: 325, frameCount: 254 },
    dirtCenters: [[200, 70], [152, 70]],
    bgScroll: [368, 22],
  },
  {
    orientation: "opponent-front",
    artifact: "tools/compare/evidence/fissure-opponent-full-state.json.gz",
    rawArtifact: "tools/compare/evidence/fissure-opponent-source-rgb.tar.gz",
    map: "tools/compare/evidence/fissure-changemap-opponent.txt",
    window: { startFrame: 76, endFrame: 329, frameCount: 254 },
    dirtCenters: [[96, 110], [48, 110]],
    bgScroll: [472, 232],
  },
] as const;

const activeAges = (frames: EvidenceFrame[], symbol: string): number[] => frames.flatMap(
  (frame, age) => frame.tasks.some((task) => task.func.symbol === symbol) ? [age] : [],
);

describe("MOVE_FISSURE dense unsupported checkpoint", () => {
  it.each(cases)("retains twice-fresh complete $orientation state and raw RGB", (fixture) => {
    const row = receipt.denseEvidence.orientations.find(
      (candidate: { orientation: string }) => candidate.orientation === fixture.orientation,
    );
    const compressed = readFileSync(fixture.artifact);
    const decoded = gunzipSync(compressed);
    const probe = JSON.parse(decoded.toString("utf8")) as DenseProbe;
    const frames = probe.frames;

    expect(probe.schema).toBe("fissure-dense-evidence/v1");
    expect(probe.sourceWindow).toEqual(fixture.window);
    expect(frames).toHaveLength(254);
    expect(sha256(compressed)).toBe(row.retained.fullStateGzipSha256);
    expect(sha256(decoded)).toBe(row.fullStateSha256Runs[0]);
    expect(row.fullStateSha256Runs[1]).toBe(row.fullStateSha256Runs[0]);
    expect(row.rawRgbSha256Runs[1]).toBe(row.rawRgbSha256Runs[0]);
    expect(sha256(readFileSync(fixture.rawArtifact))).toBe(row.retained.rawRgbArchiveSha256);
    expect(sha256(readFileSync(fixture.map))).toBe(row.retained.changeMapSha256);
    expect(frames.at(-1)).toMatchObject({ gAnimScriptActive: 0, visualTaskCount: 0, soundTaskCount: 0 });

    for (let age = 1; age < frames.length; age += 1) {
      expect(frames[age]!.hardwareOam).toEqual(frames[age - 1]!.softwareOam);
      expect(frames[age]!.hardwareMatrices).toEqual(frames[age - 1]!.softwareMatrices);
      expect(frames[age]!.hardwarePalette).toEqual(frames[age - 1]!.fadedPalette);
    }

    expect(activeAges(frames, "AnimTask_ShakePlatforms")).toEqual(
      Array.from({ length: 196 }, (_, index) => index + 4),
    );
    expect(activeAges(frames, "AnimTask_ShakeBattlers")).toEqual(
      Array.from({ length: 196 }, (_, index) => index + 4),
    );
    expect(activeAges(frames, "WaitForFissureCompletion")).toEqual(
      Array.from({ length: 80 }, (_, index) => index + 153),
    );

    for (const [start, end] of [[14, 37], [48, 71], [82, 105]]) {
      for (let age = start; age <= end; age += 1) {
        expect(frames[age]!.sprites.filter(
          (sprite) => sprite.template.symbol === "gDirtPlumeSpriteTemplate",
        )).toHaveLength(4);
      }
    }
    const firstPlumes = frames[14]!.sprites.filter(
      (sprite) => sprite.template.symbol === "gDirtPlumeSpriteTemplate",
    );
    expect([...new Set(firstPlumes.map(({ x, y }) => `${x},${y}`))].sort()).toEqual(
      fixture.dirtCenters.map(([x, y]) => `${x},${y}`).sort(),
    );
    expect(frames[38]!.sprites.some(
      (sprite) => sprite.template.symbol === "gDirtPlumeSpriteTemplate",
    )).toBe(false);

    expect(frames[135]!.registers.bldcnt).toBe(232);
    expect(frames[136]!.registers.bldy).toBe(1);
    expect(frames[151]!.registers.bldy).toBe(16);
    expect(frames[169]!.registers.bldy).toBe(1);
    expect(frames[170]!.registers.bldy).toBe(0);
    expect([frames[154]!.registers.bg3hofs, frames[154]!.registers.bg3vofs]).toEqual(fixture.bgScroll);
    expect([frames[233]!.registers.bg3hofs, frames[233]!.registers.bg3vofs]).toEqual(fixture.bgScroll);
    expect([frames[234]!.registers.bg3hofs, frames[234]!.registers.bg3vofs]).toEqual([0, 0]);
    expect(frames[216]!.registers.bldy).toBe(1);
    expect(frames[231]!.registers.bldy).toBe(16);
    expect(frames[250]!.registers.bldy).toBe(1);
    expect(frames[251]!.registers.bldy).toBe(0);

    expect(new Set(frames.map((frame) => JSON.stringify(frame.immutableState))).size).toBe(1);
    expect(frames.every((frame) => frame.se1.rawInfo.length > 0 && frame.se2.rawInfo.length > 0)).toBe(true);
    const changeMap = readFileSync(fixture.map, "utf8");
    expect(changeMap).toContain("254 frames, 240x160");
    expect(changeMap).toContain("static 202-215");
    expect(changeMap).toContain("static 252-253");
  });

  it("records natural bilateral execution while keeping Dig independent", () => {
    expect(receipt.status).toBe("unsupported");
    expect(receipt.denseEvidence.twiceFresh).toBe(true);
    expect(receipt.denseEvidence.naturalExecution.playerBack).toContain("0x12345678");
    expect(receipt.denseEvidence.naturalExecution.opponentFront).toContain("0x12345679");
    expect(receipt.denseEvidence.orientationDifferences).toMatchObject({ absoluteFrameShift: 4 });
    expect(receipt.siblingAudit).toMatchObject({ move: "MOVE_DIG", promoted: false });
  });
});
