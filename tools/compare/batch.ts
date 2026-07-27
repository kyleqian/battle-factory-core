// Runs ordinary app-vs-oracle comparisons one at a time. The Oracle service
// is intentionally serialized; this driver prevents concurrent clients from
// racing on tools/compare/out/latest and checkpoints progress for resumption.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import {
  beginCompareBatchEntry,
  COMPARE_BATCH_USAGE,
  createCompareBatchManifest,
  defaultCompareBatchDirectoryName,
  entriesNeedingRun,
  finishCompareBatchEntry,
  parseCompareBatchCliArgs,
  parseCompareBatchManifest,
  replaceCompareBatchEntry,
  type CompareBatchEntry,
  type CompareBatchManifest,
} from "./batchState.ts";
import { resolveCompareTracePath } from "./paths.ts";

const BATCH_MANIFEST = "batch.json";
const COMPARE_SCRIPT = process.env.POKEBENCH_COMPARE_SCRIPT
  ? resolve(process.env.POKEBENCH_COMPARE_SCRIPT)
  : fileURLToPath(new URL("./run.ts", import.meta.url));

function isoNow(): string {
  return new Date().toISOString();
}

function writeManifest(root: string, manifest: CompareBatchManifest): void {
  const destination = join(root, BATCH_MANIFEST);
  const temporary = `${destination}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(temporary, destination);
}

function readManifest(root: string): CompareBatchManifest {
  const path = join(root, BATCH_MANIFEST);
  try {
    return parseCompareBatchManifest(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    throw new Error(
      `cannot resume ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function prepareNewRoot(root: string): void {
  if (existsSync(root) && readdirSync(root).length > 0) {
    throw new Error(`batch output directory is not empty: ${root}`);
  }
  mkdirSync(root, { recursive: true });
}

function runComparison(
  entry: CompareBatchEntry,
  root: string,
  compactOutput: boolean,
): Promise<number> {
  const args = [
    "--experimental-strip-types",
    COMPARE_SCRIPT,
    entry.trace,
    join(root, entry.outputDirectory),
    ...(compactOutput ? ["--summary"] : []),
  ];
  return new Promise((resolveExit) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    child.once("error", (error) => {
      console.error(`compare batch: could not start ${entry.trace}: ${error.message}`);
      resolveExit(2);
    });
    child.once("exit", (code, signal) => {
      if (signal) {
        console.error(`compare batch: ${entry.trace} ended on signal ${signal}`);
        resolveExit(128);
      } else {
        resolveExit(code ?? 2);
      }
    });
  });
}

if (process.argv.slice(2).some((argument) => argument === "--help" || argument === "-h")) {
  console.log(COMPARE_BATCH_USAGE);
  process.exit(0);
}

let cli;
try {
  cli = parseCompareBatchCliArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(COMPARE_BATCH_USAGE);
  process.exit(2);
}

let root: string;
let manifest: CompareBatchManifest;
try {
  if (cli.resumeRoot) {
    root = resolve(cli.resumeRoot);
    manifest = readManifest(root);
    if (cli.verbose && manifest.compactOutput) {
      manifest = { ...manifest, compactOutput: false, updatedAt: isoNow() };
      writeManifest(root, manifest);
    }
  } else {
    root = resolve(
      cli.outRoot
      ?? join(
        "tools",
        "compare",
        "out",
        defaultCompareBatchDirectoryName(new Date(), process.pid),
      ),
    );
    prepareNewRoot(root);
    const traces = cli.traces.map((trace) => resolveCompareTracePath(trace));
    manifest = createCompareBatchManifest(traces, isoNow(), !cli.verbose);
    writeManifest(root, manifest);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const scheduled = entriesNeedingRun(manifest);
console.log(
  `compare batch: ${scheduled.length} trace(s) to run serially -> ${root}`,
);

for (const scheduledEntry of scheduled) {
  let entry = beginCompareBatchEntry(scheduledEntry, isoNow());
  manifest = replaceCompareBatchEntry(manifest, entry, isoNow());
  writeManifest(root, manifest);
  console.log(
    `compare batch: [${entry.id}/${manifest.entries.length}] ${entry.trace} `
    + `(attempt ${entry.attempts})`,
  );

  const exitCode = await runComparison(entry, root, manifest.compactOutput);
  entry = finishCompareBatchEntry(entry, exitCode, isoNow());
  manifest = replaceCompareBatchEntry(manifest, entry, isoNow());
  writeManifest(root, manifest);
}

const passed = manifest.entries.filter((entry) => entry.status === "passed").length;
const failed = manifest.entries.filter((entry) => entry.status === "failed").length;
console.log(
  `compare batch: ${passed}/${manifest.entries.length} passed, ${failed} failed -> `
  + join(root, BATCH_MANIFEST),
);
process.exitCode = failed === 0 ? 0 : 1;
