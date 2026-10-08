// usage: node --experimental-strip-types --no-warnings tools/integration/prep41TimingCheck.ts OUT.json fixture.json...
// prep41 D4 widening check (tools/integration/d4aTimingCheck.ts rules; the documented other-phase rows come from
// tools/integration/fixtures/prep41/documented-residual.json because the moves are not yet faithful-timing entries in the live status).
// Each fixture runs verifyLiveAdapterFramebuffer (two fresh probe processes, production live renderer, the scenario's own dense window).
// A window in the policy's chosen phase must be 0 px on every row with window length == the live duration; a window in the other
// phase may differ only on the documented ages. Records the affected ages and px per affected row. Exit 1 on any violation.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";
import { LIVE_MOVE_TIMING_POLICY, type LiveMoveTimingPhase } from "../../src/engine/liveMoveTimingPolicy.ts";

const IDS: Record<string, number> = { PURSUIT: 228, HIDDEN_POWER: 237, CURSE: 174 };
const [outPath, ...paths] = process.argv.slice(2);
const documented = JSON.parse(readFileSync("tools/integration/fixtures/prep41/documented-residual.json", "utf8")) as
  Record<string, { ages: [number, number] }>;
const out: Record<string, unknown>[] = [];
let failed = false;
for (const path of paths) {
  const wrapper = JSON.parse(readFileSync(path, "utf8")) as { sourceFixture?: string; timingPhase: LiveMoveTimingPhase };
  const fixture = { ...(wrapper.sourceFixture ? JSON.parse(readFileSync(wrapper.sourceFixture, "utf8")) : {}), ...wrapper } as
    { move: string; timingPhase: LiveMoveTimingPhase };
  const id = IDS[fixture.move]!;
  const parameter = LIVE_MOVE_TIMING_POLICY[id]?.parameters.find((p) => p.kind === "optional-lag-age") ?? null;
  const results = verifyLiveAdapterFramebuffer(path);
  const runs = results.map((r) => {
    const rows = (JSON.parse(readFileSync(join(r.scratch as string, "live-comparison.json"), "utf8")).comparisons as { age: number; residualPixels: number }[]);
    const affected = rows.filter((row) => row.residualPixels > 0);
    return { rows: rows.length, exactRows: r.exactRows, residualPixels: r.residualPixels, digest: r.digest,
      affected: affected.map((row) => [row.age, row.residualPixels]), maxPixelsPerRow: Math.max(0, ...affected.map((row) => row.residualPixels)) };
  });
  const run0 = runs[0]!;
  const violations: string[] = [];
  if (parameter === null) violations.push(`no optional-lag-age policy parameter for ${fixture.move} (apply the prep41 patch)`);
  if (fixture.timingPhase !== "event" && fixture.timingPhase !== "no-event") violations.push("missing measured phase label");
  if (runs.some((r) => r.digest !== run0.digest)) violations.push("fresh runs differ");
  const selected = parameter !== null && fixture.timingPhase === parameter.chosen;
  const [lo, hi] = documented[String(id)]?.ages ?? [1, 0];
  if (selected) {
    if (run0.residualPixels !== 0) violations.push(`selected phase residual ${run0.residualPixels} px on ${run0.affected.length} rows`);
    if (results[0]!.expectedDuration !== run0.rows) violations.push(`duration ${results[0]!.expectedDuration} != window ${run0.rows}`);
  } else {
    const outside = run0.affected.filter(([age]) => age! < lo || age! > hi).map(([age]) => age);
    if (outside.length) violations.push(`other-phase residual outside the documented ages ${lo}..${hi}: ${outside.join(",")}`);
  }
  failed ||= violations.length > 0;
  out.push({ fixture: path, move: fixture.move, measuredPhase: fixture.timingPhase, policyPhase: parameter?.chosen ?? null, selectedPhase: selected,
    window: run0.rows, expectedDuration: results[0]!.expectedDuration, documentedAges: selected ? null : [lo, hi], runs, violations });
  const ages = run0.affected.map(([age]) => age);
  console.log(path, JSON.stringify({ phase: fixture.timingPhase, selected, rows: run0.rows, dur: results[0]!.expectedDuration,
    px: runs.map((r) => r.residualPixels), ages: ages.length ? `${ages[0]}..${ages.at(-1)} (${ages.length})` : "-", maxPxRow: run0.maxPixelsPerRow, violations }));
}
writeFileSync(outPath!, JSON.stringify(out, null, 1) + "\n");
if (failed) process.exitCode = 1;
