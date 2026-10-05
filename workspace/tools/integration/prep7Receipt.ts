/**
 * prep7 live-adapter receipt: runs the production live renderer against fresh direct-mGBA source windows (two fresh runs per
 * fixture, liveAdapterFramebuffer.ts) for every prep7 fixture and alternate-species twin and writes
 * tools/integration/fixtures/prep7-live-adapter-receipt.json. Run on a clean tree: the tested commit/tree are read from git.
 *   POKEBENCH_LIVE_EVIDENCE_DIR=.integration/validation/prep7-final node --experimental-strip-types tools/integration/prep7Receipt.ts
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";

const base = [
  "aerial-ace-player", "aerial-ace-opponent", "quick-attack-player", "quick-attack-opponent", "ice-punch-player", "ice-punch-opponent",
  "fake-tears-player", "fake-tears-opponent", "sleep-talk-player", "sleep-talk-opponent", "rock-slide-opponent",
  "fire-blast-player", "fire-blast-opponent", "dragon-dance-player", "dragon-dance-opponent",
].map((n) => `tools/integration/fixtures/prep7-${n}.json`);
const alt = [
  "ice-punch-player-gengar-opponent-onix", "ice-punch-opponent-gengar-player-onix",
  "ice-punch-player-dragonair-opponent-onix", "ice-punch-opponent-dragonair-player-onix",
  "aerial-ace-player-charizard-opponent-onix", "aerial-ace-opponent-delibird-player-onix",
  "aerial-ace-player-dragonair-opponent-onix", "aerial-ace-opponent-charizard-player-onix", "aerial-ace-opponent-dragonair-player-onix",
].map((n) => `tools/integration/fixtures/altspecies3-${n}.json`);
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const rows: unknown[] = [];
for (const path of [...base, ...alt]) {
  const results = verifyLiveAdapterFramebuffer(path, 2);
  const f = JSON.parse(readFileSync(path, "utf8"));
  rows.push({
    fixture: path, kind: path.includes("altspecies3") ? "alternate-species" : "accepted-or-lab",
    rows: results[0]!.rows, expectedDuration: results[0]!.expectedDuration, ageOffset: results[0]!.ageOffset,
    runs: results.length, exactRowsPerRun: results.map((r) => r.exactRows), residualPixelsPerRun: results.map((r) => r.residualPixels),
    digestsEqual: results.every((r) => r.digest === results[0]!.digest), digest: results[0]!.digest,
    scratch: results.map((r) => r.scratch), sourceFixture: f.sourceFixture ?? null,
  });
  console.log(path, results.map((r) => `${r.exactRows}/${r.rows} resid ${r.residualPixels}`).join(" | "));
}
writeFileSync("tools/integration/fixtures/prep7-live-adapter-receipt.json", JSON.stringify({
  schema: "prep7-live-adapter-receipt/v1",
  testedCommit: git("rev-parse", "HEAD"), testedSrcTree: git("rev-parse", "HEAD:workspace/src"),
  command: "POKEBENCH_LIVE_EVIDENCE_DIR=.integration/validation/prep7-final node --experimental-strip-types tools/integration/prep7Receipt.ts",
  evidenceDir: process.env.POKEBENCH_LIVE_EVIDENCE_DIR ?? null, results: rows,
}, null, 1) + "\n");
