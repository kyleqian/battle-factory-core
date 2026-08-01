export const COMPARE_USAGE =
  "usage: npm run compare -- <trace.json> [outDir] " +
  "[--capture-range START:END] [--summary]\n" +
  "(default outDir: a fresh tools/compare/out/run-* directory per invocation; " +
  "tools/compare/out/latest symlinks to the newest run)";

export interface CompareCliOptions {
  readonly tracePath: string;
  /** Explicit output directory; when absent the caller allocates a per-run one. */
  readonly outDir?: string;
  readonly summary: boolean;
  readonly captureRange?: readonly [start: number, end: number];
}

function parseCaptureRange(value: string): readonly [number, number] {
  const match = /^(\d+):(\d+)$/.exec(value);
  if (!match) {
    throw new Error(`invalid capture range ${JSON.stringify(value)}; expected START:END`);
  }
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end < start) {
    throw new Error(`invalid capture range ${value}; END must be >= START`);
  }
  if (end - start + 1 > 256) {
    throw new Error(`capture range ${value} exceeds the oracle's 256-capture limit`);
  }
  return [start, end];
}

export function parseCompareCliArgs(args: readonly string[]): CompareCliOptions {
  const positional: string[] = [];
  let summary = false;
  let captureRange: readonly [number, number] | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--summary" || argument === "--quiet") {
      summary = true;
      continue;
    }
    if (argument === "--capture-range") {
      const value = args[index + 1];
      if (!value) throw new Error("--capture-range needs START:END");
      captureRange = parseCaptureRange(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--capture-range=")) {
      captureRange = parseCaptureRange(argument.slice("--capture-range=".length));
      continue;
    }
    if (argument.startsWith("-")) {
      throw new Error(`unknown option: ${argument}`);
    }
    positional.push(argument);
  }

  if (positional.length === 0) throw new Error("trace path is required");
  if (positional.length > 2) throw new Error(`unexpected argument: ${positional[2]}`);
  return {
    tracePath: positional[0]!,
    ...(positional[1] ? { outDir: positional[1] } : {}),
    summary,
    ...(captureRange ? { captureRange } : {}),
  };
}

export function withCaptureRange<T extends { readonly captureFrames?: readonly number[] }>(
  trace: T,
  range: readonly [start: number, end: number] | undefined,
): T {
  if (!range) return trace;
  const [start, end] = range;
  return {
    ...trace,
    captureFrames: Array.from({ length: end - start + 1 }, (_, index) => start + index),
  } as T;
}
