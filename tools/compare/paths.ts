import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";

const TRACE_DIRS = [
  "tools/compare/traces",
  "tools/compare/traces-groundtruth",
] as const;

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

/** Resolve a path first, then a unique filename from the two trace catalogs. */
export function resolveCompareTracePath(input: string, cwd = process.cwd()): string {
  const direct = resolve(cwd, input);
  if (isFile(direct)) return direct;

  const filename = extname(input) ? basename(input) : `${basename(input)}.json`;
  const matches = TRACE_DIRS
    .map((directory) => resolve(cwd, directory, filename))
    .filter(isFile);
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) {
    throw new Error(
      `ambiguous trace ${JSON.stringify(input)}; use one of: ${matches.join(", ")}`,
    );
  }
  throw new Error(
    `trace not found: ${input} (also searched ${TRACE_DIRS.join(" and ")})`,
  );
}

/** Resolve derived-trace sources locally, with the trace catalogs as fallback. */
export function resolveSourceTracePath(
  sourceTrace: string,
  derivedTracePath: string,
  cwd = process.cwd(),
): string {
  const besideDerived = resolve(dirname(derivedTracePath), sourceTrace);
  if (isFile(besideDerived)) return besideDerived;
  return resolveCompareTracePath(sourceTrace, cwd);
}

/** Remove only artifacts produced by this tool, preserving unrelated files. */
export function prepareCompareOutputDirectory(outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  const generated = /^(?:oracle|app|diff)-\d+\.png$/;
  for (const entry of readdirSync(outDir)) {
    if (entry === "manifest.json" || generated.test(entry)) {
      unlinkSync(join(outDir, entry));
    }
  }
}
