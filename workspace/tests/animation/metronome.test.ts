import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import metronomeAsset from "../../src/animation/assets/metronome.json" with { type: "json" };
import {
  METRONOME_FRAME_COUNT,
  metronomeAtAge,
  metronomeFingerMatrixAtAge,
} from "../../src/animation/metronome.ts";

describe("MOVE_METRONOME source reducer", () => {
  it("ports the grow, three wag cycles, shrink, and cleanup", () => {
    expect(metronomeFingerMatrixAtAge(15)).toEqual(
      { a: 1424, b: 0, c: 0, d: 1424 },
    );
    expect(metronomeFingerMatrixAtAge(22)).toEqual(
      { a: 256, b: 0, c: 0, d: 256 },
    );
    expect(metronomeFingerMatrixAtAge(41)).toEqual(
      { a: 254, b: -25, c: 25, d: 254 },
    );
    expect(metronomeFingerMatrixAtAge(51)).toEqual(
      { a: 120, b: -225, c: 225, d: 120 },
    );
    expect(metronomeFingerMatrixAtAge(62)).toEqual(
      { a: 256, b: 0, c: 0, d: 256 },
    );
    expect(metronomeFingerMatrixAtAge(114)).toEqual(
      { a: 4096, b: 0, c: 0, d: 4096 },
    );
    expect(metronomeFingerMatrixAtAge(117)).toBeNull();
    expect(METRONOME_FRAME_COUNT).toBe(127);
  });

  it("ports both tagged loads, bubble programs, audio, and cleanup", () => {
    const head = { x: 112, y: 87 };
    expect(metronomeAtAge(1, "player", head))
      .toMatchObject({ fingerLoaded: true, thoughtBubbleLoaded: false });
    expect(metronomeAtAge(7, "player", head)).toMatchObject({
      thoughtBubble: { frame: 0, hFlip: true, x: 112, y: 87 },
      soundRestart: "SE_M_METRONOME",
    });
    expect(metronomeAtAge(41, "player", head).soundRestart)
      .toBe("SE_M_TAIL_WHIP");
    expect(metronomeAtAge(121, "opponent", head).thoughtBubble)
      .toMatchObject({ frame: 0, hFlip: false });
    expect(metronomeAtAge(126, "player", head)).toMatchObject({
      active: false,
      fingerLoaded: false,
      thoughtBubbleLoaded: false,
      thoughtBubble: null,
      finger: null,
    });
  });

  it("regenerates Chansey, FINGER, and THOUGHT_BUBBLE byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-metronome-assets-"));
    const output = join(scratch, "metronome.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractMetronomeAssets.ts",
      "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/metronome.json"),
    );
    expect(metronomeAsset.source.finger).toContain("ANIM_TAG_FINGER");
  });
});
