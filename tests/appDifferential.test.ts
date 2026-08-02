import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { loadCompareTrace } from "../tools/compare/traceFile.ts";

function traceDir(): string {
  return mkdtempSync(join(tmpdir(), "compare-trace-file-"));
}

function writeTrace(directory: string, name: string, body: unknown): string {
  const path = join(directory, name);
  writeFileSync(path, JSON.stringify(body));
  return path;
}

// loadCompareTrace was extracted verbatim out of tools/compare/run.ts so the
// oracle compare and the app-vs-app differential resolve traces identically.
// These pin the three shapes run.ts used to handle inline.
describe("loadCompareTrace", () => {
  it("returns a plain trace unchanged", () => {
    const directory = traceDir();
    const path = writeTrace(directory, "plain.json", {
      segments: [{ frames: 3 }],
      captureFrames: [0, 2],
      appRoute: "canonical-recorded",
    });
    expect(loadCompareTrace(path)).toEqual({
      segments: [{ frames: 3 }],
      captureFrames: [0, 2],
      appRoute: "canonical-recorded",
    });
  });

  it("expands an inclusive captureWindow without thinning it", () => {
    const directory = traceDir();
    const path = writeTrace(directory, "window.json", {
      segments: [{ frames: 10 }],
      captureWindow: { start: 4, end: 8 },
    });
    expect(loadCompareTrace(path).captureFrames).toEqual([4, 5, 6, 7, 8]);
  });

  it("splices a sourceTrace prefix and appends phase segments", () => {
    const directory = traceDir();
    writeTrace(directory, "source.json", {
      segments: [{ frames: 1 }, { frames: 2 }, { frames: 3 }],
      captureFrames: [1],
      appRoute: "generated-orchestrator",
    });
    const derived = writeTrace(directory, "derived.json", {
      sourceTrace: "source.json",
      sourceSegmentCount: 2,
      appendSegments: [{ frames: 9, buttons: ["A"] }],
      captureFrames: [12],
    });
    const trace = loadCompareTrace(derived);
    expect(trace.segments).toEqual([
      { frames: 1 },
      { frames: 2 },
      { frames: 9, buttons: ["A"] },
    ]);
    // Fields the derived file does not override are inherited from the source.
    expect(trace.appRoute).toBe("generated-orchestrator");
    expect(trace.captureFrames).toEqual([12]);
  });

  it("lets a derived captureWindow override the source's capture list", () => {
    const directory = traceDir();
    writeTrace(directory, "source.json", {
      segments: [{ frames: 5 }],
      captureFrames: [0, 1, 2],
    });
    const derived = writeTrace(directory, "derived.json", {
      sourceTrace: "source.json",
      captureWindow: { start: 2, end: 4 },
    });
    expect(loadCompareTrace(derived).captureFrames).toEqual([2, 3, 4]);
  });
});

function runDifferential(args: readonly string[]) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", "tools/compare/app-differential.ts", ...args],
    { encoding: "utf8" },
  );
}

// These all exit before any git worktree is created, so they are cheap and
// cannot leak scratch state.
describe("app-differential CLI guards", () => {
  it("requires --base", () => {
    const result = runDifferential(["turn6-menu"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--base REF is required");
  });

  it("requires at least one trace", () => {
    const result = runDifferential(["--base", "HEAD^"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("at least one trace path is required");
  });

  it("rejects an unknown option instead of treating it as a trace", () => {
    const result = runDifferential(["turn6-menu", "--base", "HEAD^", "--nope"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown option: --nope");
  });

  it("rejects a base that does not name a commit", () => {
    const result = runDifferential(["turn6-menu", "--base", "not-a-real-ref"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("does not name a commit");
  });

  it("refuses to differential HEAD against itself", () => {
    const result = runDifferential(["turn6-menu", "--base", "HEAD"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("proves nothing");
  });

  it("reports a missing trace before creating a worktree", () => {
    const result = runDifferential([
      "definitely-not-a-trace",
      "--base",
      "HEAD^",
    ]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("trace not found");
  });
});
