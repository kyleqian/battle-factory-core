import { basename, extname } from "node:path";

export const COMPARE_BATCH_USAGE =
  "usage: npm run compare:batch -- <trace> [<trace> ...] " +
  "[--out-root DIR] [--verbose]\n" +
  "       npm run compare:batch -- --resume DIR [--verbose]";

export type CompareBatchEntryStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed";

export interface CompareBatchEntry {
  readonly id: string;
  readonly trace: string;
  readonly outputDirectory: string;
  readonly status: CompareBatchEntryStatus;
  readonly attempts: number;
  readonly exitCode?: number;
  readonly startedAt?: string;
  readonly finishedAt?: string;
}

export interface CompareBatchManifest {
  readonly schemaVersion: 1;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly compactOutput: boolean;
  readonly entries: readonly CompareBatchEntry[];
}

export interface CompareBatchCliOptions {
  readonly traces: readonly string[];
  readonly outRoot?: string;
  readonly resumeRoot?: string;
  readonly verbose: boolean;
}

export function parseCompareBatchCliArgs(
  args: readonly string[],
): CompareBatchCliOptions {
  const traces: string[] = [];
  let outRoot: string | undefined;
  let resumeRoot: string | undefined;
  let verbose = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--verbose") {
      verbose = true;
      continue;
    }
    if (argument === "--out-root" || argument === "--resume") {
      const value = args[index + 1];
      if (!value) throw new Error(`${argument} needs a directory`);
      if (argument === "--out-root") outRoot = value;
      else resumeRoot = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--out-root=")) {
      outRoot = argument.slice("--out-root=".length);
      continue;
    }
    if (argument.startsWith("--resume=")) {
      resumeRoot = argument.slice("--resume=".length);
      continue;
    }
    if (argument.startsWith("-")) {
      throw new Error(`unknown option: ${argument}`);
    }
    traces.push(argument);
  }

  if (resumeRoot) {
    if (outRoot) throw new Error("--resume cannot be combined with --out-root");
    if (traces.length > 0) throw new Error("--resume reads traces from batch.json");
  } else if (traces.length === 0) {
    throw new Error("at least one trace is required");
  }

  return {
    traces,
    verbose,
    ...(outRoot ? { outRoot } : {}),
    ...(resumeRoot ? { resumeRoot } : {}),
  };
}

function traceSlug(trace: string): string {
  const filename = basename(trace);
  const stem = extname(filename)
    ? filename.slice(0, -extname(filename).length)
    : filename;
  const slug = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "trace";
}

export function createCompareBatchManifest(
  traces: readonly string[],
  now: string,
  compactOutput: boolean,
): CompareBatchManifest {
  return {
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    compactOutput,
    entries: traces.map((trace, index) => {
      const id = String(index + 1).padStart(3, "0");
      return {
        id,
        trace,
        outputDirectory: `${id}-${traceSlug(trace)}`,
        status: "pending",
        attempts: 0,
      };
    }),
  };
}

export function entriesNeedingRun(
  manifest: CompareBatchManifest,
): readonly CompareBatchEntry[] {
  return manifest.entries.filter((entry) => entry.status !== "passed");
}

export function beginCompareBatchEntry(
  entry: CompareBatchEntry,
  now: string,
): CompareBatchEntry {
  return {
    ...entry,
    status: "running",
    attempts: entry.attempts + 1,
    startedAt: now,
    finishedAt: undefined,
    exitCode: undefined,
  };
}

export function finishCompareBatchEntry(
  entry: CompareBatchEntry,
  exitCode: number,
  now: string,
): CompareBatchEntry {
  return {
    ...entry,
    status: exitCode === 0 ? "passed" : "failed",
    exitCode,
    finishedAt: now,
  };
}

export function replaceCompareBatchEntry(
  manifest: CompareBatchManifest,
  replacement: CompareBatchEntry,
  now: string,
): CompareBatchManifest {
  return {
    ...manifest,
    updatedAt: now,
    entries: manifest.entries.map((entry) =>
      entry.id === replacement.id ? replacement : entry
    ),
  };
}

export function defaultCompareBatchDirectoryName(
  now: Date,
  processId: number,
): string {
  const timestamp = now.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[:T]/g, "-");
  return `batch-${timestamp}-${processId}`;
}

export function parseCompareBatchManifest(value: unknown): CompareBatchManifest {
  if (!value || typeof value !== "object") {
    throw new Error("batch.json must contain an object");
  }
  const manifest = value as Partial<CompareBatchManifest>;
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries)) {
    throw new Error("batch.json has an unsupported schema");
  }
  for (const entry of manifest.entries) {
    if (
      !entry
      || typeof entry.id !== "string"
      || typeof entry.trace !== "string"
      || typeof entry.outputDirectory !== "string"
      || !["pending", "running", "passed", "failed"].includes(entry.status)
      || !Number.isInteger(entry.attempts)
    ) {
      throw new Error("batch.json contains an invalid entry");
    }
  }
  if (
    typeof manifest.createdAt !== "string"
    || typeof manifest.updatedAt !== "string"
    || typeof manifest.compactOutput !== "boolean"
  ) {
    throw new Error("batch.json is missing batch metadata");
  }
  return manifest as CompareBatchManifest;
}
