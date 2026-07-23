import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPARE_OUT_DIR,
  parseCompareCliArgs,
  withCaptureRange,
} from "../tools/compare/cli.ts";

describe("compare CLI options", () => {
  it("preserves the existing positional interface", () => {
    expect(parseCompareCliArgs(["trace.json"])).toEqual({
      tracePath: "trace.json",
      outDir: DEFAULT_COMPARE_OUT_DIR,
      summary: false,
    });
    expect(parseCompareCliArgs(["trace.json", "/tmp/out"])).toEqual({
      tracePath: "trace.json",
      outDir: "/tmp/out",
      summary: false,
    });
  });

  it("accepts compact output and an inclusive dense capture range", () => {
    expect(
      parseCompareCliArgs([
        "--summary",
        "trace.json",
        "--capture-range=41:43",
      ]),
    ).toEqual({
      tracePath: "trace.json",
      outDir: DEFAULT_COMPARE_OUT_DIR,
      summary: true,
      captureRange: [41, 43],
    });
  });

  it("keeps --quiet as a summary alias", () => {
    expect(parseCompareCliArgs(["trace.json", "--quiet"]).summary).toBe(true);
  });

  it("rejects malformed, reversed, and oversized ranges", () => {
    expect(() => parseCompareCliArgs(["trace.json", "--capture-range", "x"])).toThrow(
      "expected START:END",
    );
    expect(() => parseCompareCliArgs(["trace.json", "--capture-range", "9:8"])).toThrow(
      "END must be >= START",
    );
    expect(() => parseCompareCliArgs(["trace.json", "--capture-range", "0:256"])).toThrow(
      "256-capture limit",
    );
  });

  it("replaces rather than appends the trace capture list", () => {
    const trace = {
      segments: [{ frames: 10 }],
      captureFrames: [1, 9],
      oracleProfile: "battle-scene-off" as const,
    };
    expect(withCaptureRange(trace, [4, 6])).toEqual({
      ...trace,
      captureFrames: [4, 5, 6],
    });
  });
});
