// S10A sides: the missing attacker side of a one-sided live adapter (Double Team 104 / Faint Attack 185 opponent attacker, Rock Slide 157
// player attacker). Every fixture runs verifyLiveAdapterFramebuffer (two fresh direct-mGBA probe processes, the PRODUCTION live renderer,
// the complete dense window from the scenario's own activation) in two independent invocations A / B. A window is ok when all four runs
// share one digest and every row is 0 px with rows == live duration; a DOCUMENTED window (below) is ok when all four runs share one digest
// and every differing row is one of its documented ages. Windows are merged into the receipt by fixture path (each records the commit /
// src tree it was measured at). Exit 1 on any violation.
// usage: node --experimental-strip-types --no-warnings tools/integration/sidesLiveReceipt.ts OUT.json fixture.json...
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";

// Faint Attack's restore-fade tail in a battle-lab context: the body runs one frame shorter (activation 82 .. 306, 225 frames vs the
// accepted-style pair's 226), so the BG_DARK restore fade is one frame earlier on ages 203..218 (the player-side MURKROW alternate
// shows the same 16 rows, docs/animation-integration-live-status.json 185 liveEvidence).
const DOCUMENTED: Record<string, { ages: number[]; reason: string }> = {
  "tools/integration/fixtures/s10a-live/faint-attack-alt-opponent-delcatty-player-golem.json": {
    ages: Array.from({ length: 16 }, (_, i) => 203 + i),
    reason: "restore-fade tail one frame earlier (body 225 frames vs 226): the known battle-lab restore-fade phase of Faint Attack",
  },
};
const [outPath, ...paths] = process.argv.slice(2);
const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8" }).trim();
const testedCommit = git("rev-parse", "HEAD"), testedSrcTree = git("rev-parse", "HEAD:workspace/src");
const dirty = git("status", "--porcelain", "--", "src").length > 0;
let failed = false;
const measured = paths.map((fixture) => {
  const invocations = [0, 1].map(() => verifyLiveAdapterFramebuffer(fixture).map((r) => {
    const comparisons = (JSON.parse(readFileSync(`${r.scratch}/live-comparison.json`, "utf8")) as { comparisons: { age: number; residualPixels: number }[] }).comparisons;
    return { rows: r.rows, exactRows: r.exactRows, residualPixels: r.residualPixels, expectedDuration: r.expectedDuration, digest: r.digest,
      affectedAges: comparisons.filter((c) => c.residualPixels > 0).map((c) => c.age) };
  }));
  const runs = invocations.flat();
  const doc = DOCUMENTED[fixture];
  const sameDigest = runs.every((r) => r.digest === runs[0]!.digest);
  const ok = sameDigest && runs.every((r) => r.expectedDuration === r.rows
    && (doc ? r.affectedAges.every((a) => doc.ages.includes(a)) : r.residualPixels === 0 && r.exactRows === r.rows));
  if (!ok) failed = true;
  console.log(fixture, runs.map((r) => `${r.exactRows}/${r.rows} ${r.residualPixels}px`).join(" | "), ok ? (doc ? "OK (documented)" : "OK") : "FAIL");
  return { fixture, ok, testedCommit, testedSrcTree, dirty, ...(doc ? { documented: doc } : {}), invocationA: invocations[0], invocationB: invocations[1] };
});
const previous = existsSync(outPath!) ? (JSON.parse(readFileSync(outPath!, "utf8")) as { windows: { fixture: string }[] }).windows : [];
const windows = [...previous.filter((w) => !paths.includes(w.fixture)), ...measured].sort((a, b) => a.fixture.localeCompare(b.fixture));
writeFileSync(outPath!, JSON.stringify({
  schema: "sides-live-receipt/v2", lastRun: { testedCommit, testedSrcTree, dirty },
  command: "node --experimental-strip-types --no-warnings tools/integration/sidesLiveReceipt.ts tools/integration/fixtures/sides-live-receipt.json <fixtures>",
  probes: "JOBS=6 sh tools/integration/prep22Probes.sh PROBEDIR 2 <tools/battle-lab/s10aside-*.json keys> (fixture windows from the agreeing runs)",
  windows,
}, null, 1) + "\n");
if (failed) process.exitCode = 1;
