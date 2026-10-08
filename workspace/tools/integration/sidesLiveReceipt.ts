// S10A sides: the missing attacker side of a one-sided live adapter (Double Team 104 opponent attacker). Every fixture runs
// verifyLiveAdapterFramebuffer (two fresh direct-mGBA probe processes, the PRODUCTION live renderer, the complete dense window from the
// scenario's own activation) in two independent invocations A / B; the receipt keeps both. Exit 1 unless every run is 0 px on every row
// with rows == live duration and A == B.
// usage: node --experimental-strip-types --no-warnings tools/integration/sidesLiveReceipt.ts OUT.json fixture.json...
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";

const [outPath, ...paths] = process.argv.slice(2);
const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8" }).trim();
let failed = false;
const windows = paths.map((fixture) => {
  const invocations = [0, 1].map(() => verifyLiveAdapterFramebuffer(fixture).map((r) => ({
    rows: r.rows, exactRows: r.exactRows, residualPixels: r.residualPixels, expectedDuration: r.expectedDuration, digest: r.digest,
  })));
  const runs = invocations.flat();
  const ok = runs.every((r) => r.residualPixels === 0 && r.exactRows === r.rows && r.expectedDuration === r.rows)
    && runs.every((r) => r.digest === runs[0]!.digest);
  if (!ok) failed = true;
  console.log(fixture, runs.map((r) => `${r.exactRows}/${r.rows} ${r.residualPixels}px`).join(" | "), ok ? "OK" : "FAIL");
  return { fixture, ok, invocationA: invocations[0], invocationB: invocations[1] };
});
writeFileSync(outPath!, JSON.stringify({
  schema: "sides-live-receipt/v1", testedCommit: git("rev-parse", "HEAD"), testedSrcTree: git("rev-parse", "HEAD:workspace/src"),
  dirty: git("status", "--porcelain", "--", "src").length > 0,
  command: `node --experimental-strip-types --no-warnings tools/integration/sidesLiveReceipt.ts ${outPath} ${paths.join(" ")}`,
  windows,
}, null, 1) + "\n");
if (failed) process.exitCode = 1;
