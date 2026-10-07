// q2 batch receipt: every dense fixture through the production live renderer, twice from fresh mGBA processes (two RGB dumps per
// fixture; the per-run RGB scratch directories are deleted after the receipt).
//   node --experimental-strip-types tools/integration/r3ProfileReceipt.ts OUT.json [fixtureDir=tools/integration/fixtures/q2-live]
import { readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";

const out = process.argv[2]!;
const dir = process.argv[3] ?? "tools/integration/fixtures/q2-live";
const only = process.argv[4]; const files = readdirSync(dir).filter((n) => n.endsWith(".json") && (!only || n.startsWith(only))).sort();
const rows = files.map((name) => {
  const path = join(dir, name);
  const runs = verifyLiveAdapterFramebuffer(path, 2);
  for (const r of runs) rmSync(r.scratch as string, { recursive: true, force: true });
  const exact = runs.every((r) => r.exactRows === r.rows && r.residualPixels === 0 && r.expectedDuration === r.rows + r.ageOffset);
  console.log(name, runs.map((r) => `${r.exactRows}/${r.rows} ${r.residualPixels}px`).join(" "), exact ? "OK" : "FAIL");
  return { fixture: path, rows: runs[0]!.rows, expectedDuration: runs[0]!.expectedDuration,
    runs: runs.map((r) => ({ exactRows: r.exactRows, residualPixels: r.residualPixels, digest: r.digest })),
    freshRunsIdentical: runs[0]!.digest === runs[1]!.digest, exact };
});
const summary = { fixtures: rows.length, rows: rows.reduce((n, r) => n + r.rows, 0), allExactTwiceFresh: rows.every((r) => r.exact && r.freshRunsIdentical) };
writeFileSync(out, JSON.stringify({ schema: "q2-live-receipt/v1", summary, rows }, null, 1) + "\n");
console.log(JSON.stringify(summary));
if (!summary.allExactTwiceFresh) process.exitCode = 1;
