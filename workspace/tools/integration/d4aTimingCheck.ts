// usage: node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts OUT.json fixture.json...
// D4 faithful-timing check (ANIMATION_VERIFICATION.md "CPU-load timing integration"): every fixture runs verifyLiveAdapterFramebuffer (two fresh
// probe processes, production live renderer, complete dense window from the scenario's own activation). A window measured in the policy's chosen
// phase must be pixel-exact on every row and its length must equal the live duration. A window measured in the other phase must differ ONLY on
// the documented rows (docs/animation-integration-live-status.json faithfulTimingAdapters[].alternatePhaseResidual.ages, when documented); the
// affected ages and the max differing pixels per row are recorded. Exit 1 on any violation.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";
import { liveMoveTimingParameter } from "../../src/engine/liveMoveTimingPolicy.ts";

const IDS: Record<string, number> = { MACH_PUNCH: 183, NIGHTMARE: 171 };
const [outPath, ...paths] = process.argv.slice(2);
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const documented = (id: number): number[] | null =>
  (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual?: { ages?: number[] } }[]).find((e) => e.id === id)?.alternatePhaseResidual?.ages ?? null;
const out: Record<string, unknown>[] = [];
let failed = false;
for (const path of paths) {
  const fixture = JSON.parse(readFileSync(path, "utf8")) as { move: string; timingPhase: "event" | "no-event" };
  const id = IDS[fixture.move]!;
  const parameter = liveMoveTimingParameter(id, "optional-lag-age")!;
  const results = verifyLiveAdapterFramebuffer(path);
  const runs = results.map((r) => {
    const rows = (JSON.parse(readFileSync(join(r.scratch as string, "live-comparison.json"), "utf8")).comparisons as { age: number; residualPixels: number }[]);
    const affected = rows.filter((row) => row.residualPixels > 0);
    return { rows: rows.length, exactRows: r.exactRows, residualPixels: r.residualPixels, digest: r.digest,
      affectedAges: affected.map((row) => row.age), maxPixelsPerRow: Math.max(0, ...affected.map((row) => row.residualPixels)) };
  });
  const selected = fixture.timingPhase === parameter.chosen;
  const doc = documented(id);
  const run0 = runs[0]!;
  const violations: string[] = [];
  if (runs.some((r) => r.digest !== run0.digest)) violations.push("fresh runs differ");
  if (selected) {
    if (run0.residualPixels !== 0) violations.push(`selected phase residual ${run0.residualPixels} px on ages ${run0.affectedAges.join(",")}`);
    if (results[0]!.expectedDuration !== run0.rows) violations.push(`duration ${results[0]!.expectedDuration} != window ${run0.rows}`);
  } else if (doc !== null) {
    const outside = run0.affectedAges.filter((age) => !doc.includes(age));
    if (outside.length) violations.push(`other-phase residual outside the documented rows: ages ${outside.join(",")}`);
  }
  failed ||= violations.length > 0;
  const entry = { fixture: path, move: fixture.move, measuredPhase: fixture.timingPhase, policyPhase: parameter.chosen, selectedPhase: selected,
    window: run0.rows, expectedDuration: results[0]!.expectedDuration, runs, documentedAges: selected ? null : doc, violations };
  out.push(entry);
  console.log(path, JSON.stringify({ phase: fixture.timingPhase, selected, rows: run0.rows, px: runs.map((r) => r.residualPixels), ages: run0.affectedAges.length ? `${run0.affectedAges[0]}..${run0.affectedAges.at(-1)} (${run0.affectedAges.length})` : "-", maxPxRow: run0.maxPixelsPerRow, violations }));
}
writeFileSync(outPath!, JSON.stringify(out, null, 1) + "\n");
if (failed) process.exitCode = 1;
