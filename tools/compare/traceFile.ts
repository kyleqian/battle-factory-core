// Shared compare-trace file loading: derived-trace resolution and capture
// window expansion, factored out of run.ts so every consumer (oracle-vs-app
// compare, app-vs-app differential) resolves a trace file identically.

import { readFileSync } from "node:fs";
import type { Trace } from "./traceTypes.ts";
import { resolveSourceTracePath } from "./paths.ts";

export interface CompareTraceFile extends Partial<Trace> {
  readonly sourceTrace?: string;
  /** Reuse an exact committed prefix without copying a long canonical script. */
  readonly sourceSegmentCount?: number;
  /** Phase-specific controls appended after sourceSegmentCount. */
  readonly appendSegments?: Trace["segments"];
  /** Inclusive dense capture window, expanded without thinning before replay. */
  readonly captureWindow?: Readonly<{ start: number; end: number }>;
}

function expandCaptureWindow(
  window: Readonly<{ start: number; end: number }>,
): number[] {
  return Array.from(
    { length: window.end - window.start + 1 },
    (_, index) => window.start + index,
  );
}

/**
 * Read a compare-trace file and resolve it to a plain `Trace`: any
 * `sourceTrace` prefix is spliced in and any `captureWindow` is expanded to an
 * explicit frame list. The result is self-contained — it names no other file —
 * so it can be handed to a replay running in a different worktree.
 */
export function loadCompareTrace(tracePath: string): Trace {
  const traceFile = JSON.parse(
    readFileSync(tracePath, "utf8"),
  ) as CompareTraceFile;

  if (!traceFile.sourceTrace) {
    const { captureWindow, ...plainTrace } = traceFile;
    return {
      ...plainTrace,
      captureFrames: captureWindow === undefined
        ? plainTrace.captureFrames
        : expandCaptureWindow(captureWindow),
    } as Trace;
  }

  const sourcePath = resolveSourceTracePath(traceFile.sourceTrace, tracePath);
  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as Trace;
  const {
    sourceTrace: _sourceTrace,
    sourceSegmentCount,
    appendSegments,
    captureWindow,
    ...overrides
  } = traceFile;
  const sourceSegments = sourceSegmentCount === undefined
    ? source.segments
    : source.segments.slice(0, sourceSegmentCount);
  return {
    ...source,
    ...overrides,
    segments: [...sourceSegments, ...(appendSegments ?? [])],
    captureFrames: captureWindow === undefined
      ? overrides.captureFrames ?? source.captureFrames
      : expandCaptureWindow(captureWindow),
  };
}
