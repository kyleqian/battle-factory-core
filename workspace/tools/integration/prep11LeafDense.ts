/** Part A wrapper: run verifyLiveAdapterFramebuffer (its CLI is a no-op under vite-node) and print per-age residuals + colors. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";
const out: Record<string, unknown> = {};
for (const path of process.argv.slice(2)) {
  const results = verifyLiveAdapterFramebuffer(path, Number(process.env.FRESH ?? 2));
  const cmp = JSON.parse(readFileSync(join(results[0]!.scratch as string, "live-comparison.json"), "utf8"));
  const perAge = cmp.comparisons.map((r: { age: number; frame: number; residualPixels: number }) => [r.age, r.frame, r.residualPixels]);
  out[path] = { rows: results[0]!.rows, exactRows: results[0]!.exactRows, residualPixels: results[0]!.residualPixels, expectedDuration: results[0]!.expectedDuration,
    digestsEqual: results.every(r => r.digest === results[0]!.digest), scratch: results.map(r => r.scratch), perAge };
  console.log(path, results[0]!.exactRows, "/", results[0]!.rows, "px", results[0]!.residualPixels, "dur", results[0]!.expectedDuration, "identical", results.every(r => r.digest === results[0]!.digest));
}
writeFileSync(process.env.OUT ?? "/tmp/prep11-leaf-dense.json", JSON.stringify(out));
