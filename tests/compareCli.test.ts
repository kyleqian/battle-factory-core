import { describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_COMPARE_OUT_DIR,
  parseCompareCliArgs,
  withCaptureRange,
} from "../tools/compare/cli.ts";
import {
  prepareCompareOutputDirectory,
  resolveCompareTracePath,
  resolveSourceTracePath,
} from "../tools/compare/paths.ts";

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

describe("compare trace and output paths", () => {
  it("resolves unique trace-name shorthand with or without .json", () => {
    const root = mkdtempSync(join(tmpdir(), "compare-paths-"));
    const traces = join(root, "tools", "compare", "traces");
    mkdirSync(traces, { recursive: true });
    const trace = join(traces, "turn.json");
    writeFileSync(trace, "{}");

    expect(resolveCompareTracePath("turn", root)).toBe(trace);
    expect(resolveCompareTracePath("turn.json", root)).toBe(trace);
  });

  it("falls back to the catalogs for a temporary derived trace", () => {
    const root = mkdtempSync(join(tmpdir(), "compare-source-"));
    const traces = join(root, "tools", "compare", "traces");
    mkdirSync(traces, { recursive: true });
    const source = join(traces, "base.json");
    writeFileSync(source, "{}");
    const derived = join(root, "scratch", "derived.json");

    expect(resolveSourceTracePath("base.json", derived, root)).toBe(source);
  });

  it("clears stale generated artifacts but preserves unrelated files", () => {
    const out = mkdtempSync(join(tmpdir(), "compare-output-"));
    writeFileSync(join(out, "oracle-00001.png"), "old");
    writeFileSync(join(out, "diff-00001.png"), "old");
    writeFileSync(join(out, "manifest.json"), "{}");
    writeFileSync(join(out, "notes.txt"), "keep");

    prepareCompareOutputDirectory(out);

    expect(() => readFileSync(join(out, "oracle-00001.png"))).toThrow();
    expect(() => readFileSync(join(out, "diff-00001.png"))).toThrow();
    expect(() => readFileSync(join(out, "manifest.json"))).toThrow();
    expect(readFileSync(join(out, "notes.txt"), "utf8")).toBe("keep");
  });
});
