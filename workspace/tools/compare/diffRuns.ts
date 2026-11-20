// `--summary` digest for tools/compare/run.ts: the first differing capture and the contiguous runs of differing captures.

export interface CaptureDiff {
  readonly frame: number;
  /** Differing pixels; null when the capture is missing from the app side. */
  readonly diffPixels: number | null;
}

export interface DiffRun {
  readonly start: number;
  readonly end: number;
  readonly captures: number;
  readonly maxPixels: number;
}

/** Runs of adjacent differing captures (adjacent in capture order: a matching capture ends the run). */
export function diffRuns(captures: readonly CaptureDiff[]): DiffRun[] {
  const runs: DiffRun[] = [];
  let current: { start: number; end: number; captures: number; maxPixels: number } | null = null;
  for (const capture of captures) {
    if (capture.diffPixels === 0) {
      current = null;
      continue;
    }
    const pixels = capture.diffPixels ?? 0;
    if (current === null) {
      current = { start: capture.frame, end: capture.frame, captures: 1, maxPixels: pixels };
      runs.push(current);
    } else {
      current.end = capture.frame;
      current.captures += 1;
      current.maxPixels = Math.max(current.maxPixels, pixels);
    }
  }
  return runs;
}

export function summaryDiffLines(captures: readonly CaptureDiff[], maxRuns = 10): string[] {
  const runs = diffRuns(captures);
  if (runs.length === 0) return [];
  const first = captures.find((capture) => capture.diffPixels !== 0)!;
  const differing = runs.reduce((sum, run) => sum + run.captures, 0);
  const lines = [
    `first diff: frame ${first.frame} (${first.diffPixels === null ? "MISSING from app" : `${first.diffPixels}px`})`,
    `diff runs: ${runs.length} (${differing} of ${captures.length} captures differ)`,
  ];
  for (const run of runs.slice(0, maxRuns)) {
    lines.push(`  ${run.start}..${run.end}  ${run.captures} capture${run.captures === 1 ? "" : "s"}  max ${run.maxPixels}px`);
  }
  if (runs.length > maxRuns) lines.push(`  (+${runs.length - maxRuns} more runs; full list in manifest.json)`);
  return lines;
}
