import { describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  parseCompareCliArgs,
  withCaptureRange,
} from "../tools/compare/cli.ts";
import {
  prepareCompareOutputDirectory,
  prepareCompareRunOutputDirectory,
  resolveCompareFixturePath,
  resolveCompareTracePath,
  resolveSourceTracePath,
} from "../tools/compare/paths.ts";
import { clusterPixelIndices } from "../tools/compare/diffBounds.ts";
import { stripAppTraceMetadata } from "../tools/compare/traceMetadata.ts";

describe("compare CLI options", () => {
  it("preserves the existing positional interface", () => {
    expect(parseCompareCliArgs(["trace.json"])).toEqual({
      tracePath: "trace.json",
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

  it("resolves honest oracle fixtures relative to their compare trace", () => {
    const root = mkdtempSync(join(tmpdir(), "compare-fixture-"));
    const traces = join(root, "tools", "compare", "traces");
    const battleLab = join(root, "tools", "battle-lab");
    mkdirSync(traces, { recursive: true });
    mkdirSync(battleLab, { recursive: true });
    const trace = join(traces, "generated.json");
    const fixture = join(battleLab, "generated.json");
    writeFileSync(fixture, "{}");

    expect(resolveCompareFixturePath("../../battle-lab/generated.json", trace)).toBe(
      fixture,
    );
    expect(() =>
      resolveCompareFixturePath("../../battle-lab/missing.json", trace),
    ).toThrow("compare fixture not found");
  });

  it("allocates isolated per-run default output dirs behind a latest symlink", () => {
    const root = mkdtempSync(join(tmpdir(), "compare-run-out-"));
    const outRoot = join(root, "tools", "compare", "out");

    // Legacy layout: out/latest as a real directory from the pre-symlink era.
    mkdirSync(join(outRoot, "latest"), { recursive: true });
    writeFileSync(join(outRoot, "latest", "oracle-00001.png"), "old");

    const first = prepareCompareRunOutputDirectory(root, new Date("2026-08-01T10:00:00Z"), 111);
    const second = prepareCompareRunOutputDirectory(root, new Date("2026-08-01T10:00:01Z"), 222);

    expect(first).not.toBe(second);
    expect(readlinkSync(join(outRoot, "latest"))).toBe(basename(second));
    writeFileSync(join(root, second, "manifest.json"), "{}");
    expect(readFileSync(join(outRoot, "latest", "manifest.json"), "utf8")).toBe("{}");
    // Both concurrent-style runs keep their own directories.
    expect(statSync(join(root, first)).isDirectory()).toBe(true);
    expect(statSync(join(root, second)).isDirectory()).toBe(true);
  });

  it("prunes only the oldest run directories beyond the retention window", () => {
    const root = mkdtempSync(join(tmpdir(), "compare-run-prune-"));
    const outRoot = join(root, "tools", "compare", "out");
    mkdirSync(join(outRoot, "batch-2026-07-29-user"), { recursive: true });

    let last = "";
    for (let index = 0; index < 14; index += 1) {
      last = prepareCompareRunOutputDirectory(
        root,
        new Date(Date.UTC(2026, 7, 1, 10, 0, index)),
        1000 + index,
      );
    }
    const runDirs = readdirSync(outRoot).filter((entry) => entry.startsWith("run-")).sort();
    expect(runDirs).toHaveLength(12);
    expect(runDirs[runDirs.length - 1]).toBe(basename(last));
    // Non run-* content under out/ is never touched.
    expect(statSync(join(outRoot, "batch-2026-07-29-user")).isDirectory()).toBe(true);
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

describe("diff pixel clustering", () => {
  it("separates disconnected defect regions and sorts largest first", () => {
    // 10-wide frame: an L-shaped 8-connected blob near the origin and a
    // separate 2-pixel diagonal pair far away (diagonals connect).
    const blob = [0, 1, 10, 20, 21];
    const pair = [57, 68];
    const clusters = clusterPixelIndices([...pair, ...blob], 10);
    expect(clusters).toEqual([
      { pixelCount: 5, bounds: { minX: 0, minY: 0, maxX: 1, maxY: 2 } },
      { pixelCount: 2, bounds: { minX: 7, minY: 5, maxX: 8, maxY: 6 } },
    ]);
  });

  it("does not connect pixels across the row boundary", () => {
    // 9 and 10 are adjacent indices but opposite edges of a 10-wide frame.
    const clusters = clusterPixelIndices([9, 10], 10);
    expect(clusters.map((cluster) => cluster.pixelCount)).toEqual([1, 1]);
  });

  it("returns no clusters for an exact match", () => {
    expect(clusterPixelIndices([], 10)).toEqual([]);
  });
});

describe("app-only trace metadata", () => {
  it("strips appRoute alongside both existing app-only fields", () => {
    const trace = {
      appRoute: "generated-orchestrator" as const,
      appStage: { id: "generated", frame: 0 },
      oracleBattleLab: { scenario: "fixture.json" },
      oracleProfile: "battle-scene-off" as const,
      segments: [{ frames: 1 }],
      captureFrames: [1],
    };
    expect(stripAppTraceMetadata(trace)).toEqual({
      oracleProfile: "battle-scene-off",
      segments: [{ frames: 1 }],
      captureFrames: [1],
    });
  });
});
