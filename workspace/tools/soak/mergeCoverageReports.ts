// CLI: merge N `--coverage-json` reports from tools/soak/randomRoundSoak.ts
// into the report the equivalent single run would have produced, and print
// the SAME `=== coverage ===` block the soak prints.
//
// The merge itself is not reimplemented here: it is the soak's own exported
// `mergeCoverageReports` (tools/soak/randomRoundSoakCoverage.ts), the same
// function the `--parallel` fan-out parent uses to fold its slices, so a
// cross-run union and a cross-slice union are computed by identical code.
// This tool only reads files, calls it, and prints.
//
// Usage:
//   node --experimental-strip-types tools/soak/mergeCoverageReports.ts \
//     <a.coverage.json> [<b.coverage.json> ...] [--json out.json]
// Options:
//   --json PATH   also write the merged report as JSON (the same schema as
//                 the soak's own --coverage-json output, so a merged file is
//                 itself a valid input to this tool)
//
// Note: the reports may come from DIFFERENT policies/carries/seed ranges --
// that is the point of a union census. `mergeCoverageReports` carries the
// FIRST report's `policy` and `notes` over, so the printed policy label is
// the first input's; the per-file provenance stays with the input filenames.

import { readFileSync, writeFileSync } from "node:fs";
import {
  coverageSummaryLines,
  mergeCoverageReports,
  type SoakCoverageReport,
} from "./randomRoundSoakCoverage.ts";

const USAGE =
  "usage: node --experimental-strip-types tools/soak/mergeCoverageReports.ts"
  + " <a.coverage.json> [<b.coverage.json> ...] [--json out.json]";

function readReport(path: string): SoakCoverageReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path}: unreadable (${(error as Error).message})`);
  }
  const report = parsed as SoakCoverageReport;
  if (report?.schemaVersion !== 1) {
    throw new Error(`${path}: not a soak coverage report (schemaVersion ${String(report?.schemaVersion)})`);
  }
  return report;
}

/** `player 123 / opponent 118` distinct counts, per dimension. */
function perSideLines(report: SoakCoverageReport): string[] {
  const dimensions: readonly (readonly [string, SoakCoverageReport["moves"]])[] = [
    ["moves", report.moves],
    ["effects", report.effects],
    ["species", report.species],
    ["abilities", report.abilities],
    ["items", report.items],
  ];
  return [
    "--- per side (distinct / total observations) ---",
    ...dimensions.map(([label, dimension]) =>
      `${label.padEnd(10)}player ${String(dimension.bySide.player.distinct).padStart(4)}`
      + ` (${dimension.bySide.player.total})`
      + `   opponent ${String(dimension.bySide.opponent.distinct).padStart(4)}`
      + ` (${dimension.bySide.opponent.total})`),
  ];
}

function main(argv: readonly string[]): void {
  const inputs: string[] = [];
  let jsonPath: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      return;
    }
    if (arg === "--json") {
      const value = argv[index + 1];
      if (value === undefined) throw new Error("--json needs a path");
      jsonPath = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) throw new Error(`unknown flag ${arg}\n${USAGE}`);
    inputs.push(arg);
  }
  if (inputs.length === 0) throw new Error(`no coverage JSON given\n${USAGE}`);

  const reports = inputs.map(readReport);
  const merged = mergeCoverageReports(reports);

  console.log(`merged ${reports.length} report(s):`);
  for (const [index, path] of inputs.entries()) {
    const run = reports[index]!.run;
    console.log(
      `  ${path}  policy ${run.policy}  seeds ${run.seedCount}`
      + `  battles ${run.battles}  turns ${run.turns}  move actions ${run.executedMoveActions}`,
    );
  }
  console.log("");
  for (const line of coverageSummaryLines(merged)) console.log(line);
  console.log("");
  for (const line of perSideLines(merged)) console.log(line);

  if (jsonPath !== null) {
    writeFileSync(jsonPath, JSON.stringify(merged, null, 2));
    console.log(`\nwrote ${jsonPath}`);
  }
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`mergeCoverageReports: ${(error as Error).message}`);
  process.exitCode = 1;
}
