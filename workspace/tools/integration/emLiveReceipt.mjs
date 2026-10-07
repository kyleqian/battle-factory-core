// S10A Extreme Speed (245) / Memento (262) live receipt: folds d4aTimingCheck.ts outputs (each = verifyLiveAdapterFramebuffer, 2 fresh direct-mGBA
// runs) of two independent invocations plus the staged byte-identity digests into tools/integration/fixtures/em-live-receipt.json.
// usage: node tools/integration/emLiveReceipt.mjs <checkDirA> <checkDirB> <stagedBase.txt> <stagedHead.txt>
import fs from "node:fs";
import cp from "node:child_process";
const [dirA, dirB, stagedBase, stagedHead] = process.argv.slice(2);
const git = (...a) => cp.execFileSync("git", a, { encoding: "utf8" }).trim();
const load = (dir) => Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"))[0]]));
const a = load(dirA), b = load(dirB);
const compact = (e) => ({ selectedPhase: e.selectedPhase, window: e.window, expectedDuration: e.expectedDuration, violations: e.violations,
  runs: e.runs.map((r) => ({ residualPixels: r.residualPixels, exactRows: r.exactRows, digest: r.digest, affectedAges: r.affectedAges })) });
const windows = Object.keys(a).map((k) => ({ fixture: a[k].fixture, move: a[k].move, invocationA: compact(a[k]), invocationB: b[k] ? compact(b[k]) : null }));
const digests = (f) => Object.fromEntries(fs.readFileSync(f, "utf8").trim().split("\n").map((l) => l.split(" ")).map(([m, o, d]) => [`${m} ${o}`, d]));
const receipt = {
  schema: "em-live-receipt/v1", testedCommit: git("rev-parse", "HEAD"), testedSrcTree: git("rev-parse", "HEAD:workspace/src"),
  dirty: git("status", "--porcelain", "--", "src").length > 0,
  commands: [
    "JOBS=16 sh tools/integration/prep22Probes.sh PROBEDIR 2 <the scenarios named by each fixture>",
    "python3 tools/integration/s10aEsMementoFixtures.py PROBEDIR",
    "node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts OUT.json tools/integration/fixtures/s10a-live/<extreme-speed|memento>-*.json (two independent invocations A / B)",
    "npx vite-node tools/integration/s10aStagedDigest.ts (at dc0283345 and at the change)",
  ],
  windows,
  stagedByteIdentity: { base: digests(stagedBase), change: digests(stagedHead) },
};
receipt.stagedByteIdentity.identical = JSON.stringify(receipt.stagedByteIdentity.base) === JSON.stringify(receipt.stagedByteIdentity.change);
fs.writeFileSync("tools/integration/fixtures/em-live-receipt.json", JSON.stringify(receipt, null, 1) + "\n");
console.log(windows.map((w) => `${w.fixture.split("/").pop()} A ${w.invocationA.runs.map((r) => r.residualPixels)} B ${w.invocationB?.runs.map((r) => r.residualPixels)}`).join("\n"));
console.log("staged identical", receipt.stagedByteIdentity.identical);
