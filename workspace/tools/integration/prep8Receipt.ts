/**
 * prep8 live-adapter receipt (ten allocator-plan-v2 moves): runs the production live renderer against fresh direct-mGBA source windows (two fresh runs per
 * fixture, liveAdapterFramebuffer.ts) for every prep8 fixture and alternate-species twin and writes
 * tools/integration/fixtures/prep8-live-adapter-receipt.json. Run on a clean tree: the tested commit/tree are read from git.
 *   POKEBENCH_LIVE_EVIDENCE_DIR=.integration/validation/prep8-final node --experimental-strip-types tools/integration/prep8Receipt.ts
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";

const base = [
  "swift", "trick", "frustration", "seismic-toss", "horn-drill", "aurora-beam", "uproar", "thunderbolt", "stockpile", "zap-cannon",
].flatMap((n) => [`${n}-player`, `${n}-opponent`]).map((n) => `tools/integration/fixtures/prep8-${n}.json`);
const alt = [
  "swift-player-elekid-opponent-onix", "swift-opponent-elekid-player-onix",
  "thunderbolt-player-minun-opponent-shuckle", "thunderbolt-opponent-minun-player-shuckle",
].map((n) => `tools/integration/fixtures/altspecies11-${n}.json`);
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const rows: unknown[] = [];
for (const path of [...base, ...alt]) {
  const results = verifyLiveAdapterFramebuffer(path, 2);
  const f = JSON.parse(readFileSync(path, "utf8"));
  rows.push({
    fixture: path, kind: path.includes("altspecies11") ? "alternate-species" : "accepted-or-lab",
    rows: results[0]!.rows, expectedDuration: results[0]!.expectedDuration, ageOffset: results[0]!.ageOffset,
    runs: results.length, exactRowsPerRun: results.map((r) => r.exactRows), residualPixelsPerRun: results.map((r) => r.residualPixels),
    digestsEqual: results.every((r) => r.digest === results[0]!.digest), digest: results[0]!.digest,
    scratch: results.map((r) => r.scratch), sourceFixture: f.sourceFixture ?? null,
  });
  console.log(path, results.map((r) => `${r.exactRows}/${r.rows} resid ${r.residualPixels}`).join(" | "));
}
writeFileSync("tools/integration/fixtures/prep8-live-adapter-receipt.json", JSON.stringify({
  schema: "prep8-live-adapter-receipt/v1",
  testedCommit: git("rev-parse", "HEAD"), testedSrcTree: git("rev-parse", "HEAD:workspace/src"),
  command: "POKEBENCH_LIVE_EVIDENCE_DIR=.integration/validation/prep8-final node --experimental-strip-types tools/integration/prep8Receipt.ts",
  evidenceDir: process.env.POKEBENCH_LIVE_EVIDENCE_DIR ?? null, results: rows,
}, null, 1) + "\n");
