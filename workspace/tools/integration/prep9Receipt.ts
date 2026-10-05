/**
 * prep9 live-adapter receipt (Giga Drain, Sunny Day, Mega Drain, Absorb, Dream Eater + prep7 Double Team / Feather Dance): runs the
 * production live renderer against fresh direct-mGBA source windows (two fresh runs per fixture, liveAdapterFramebuffer.ts) for every
 * accepted/lab fixture and alternate-attacker twin and writes tools/integration/fixtures/prep9-live-adapter-receipt.json. Run on a
 * clean tree: the tested commit/tree are read from git.
 *   POKEBENCH_LIVE_EVIDENCE_DIR=.integration/validation/prep9-final node --experimental-strip-types tools/integration/prep9Receipt.ts
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";

const dir = "tools/integration/fixtures";
const base = [
  "giga-drain", "sunny-day", "mega-drain", "absorb", "dream-eater",
].flatMap((n) => [`${n}-player`, `${n}-opponent`]).map((n) => `${dir}/prep9-${n}.json`);
const prep7 = ["double-team-player", "feather-dance-player", "feather-dance-opponent"].map((n) => `${dir}/prep7-${n}.json`);
const alt = readdirSync(dir).filter((n) => /^prep9-alt-.*\.json$/.test(n)).sort().map((n) => `${dir}/${n}`);
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const rows: unknown[] = [];
for (const path of [...base, ...prep7, ...alt]) {
  const results = verifyLiveAdapterFramebuffer(path, 2);
  const f = JSON.parse(readFileSync(path, "utf8"));
  rows.push({
    fixture: path, kind: path.includes("prep9-alt-") ? "alternate-species" : "accepted-or-lab",
    attacker: f.attacker.species, side: f.attacker.geometry.side, window: f.denseWindow,
    rows: results[0]!.rows, expectedDuration: results[0]!.expectedDuration, ageOffset: results[0]!.ageOffset,
    runs: results.length, exactRowsPerRun: results.map((r) => r.exactRows), residualPixelsPerRun: results.map((r) => r.residualPixels),
    digestsEqual: results.every((r) => r.digest === results[0]!.digest), digest: results[0]!.digest,
    scratch: results.map((r) => r.scratch),
  });
  console.log(path, results.map((r) => `${r.exactRows}/${r.rows} resid ${r.residualPixels}`).join(" | "));
}
writeFileSync(`${dir}/prep9-live-adapter-receipt.json`, JSON.stringify({
  schema: "prep9-live-adapter-receipt/v1",
  testedCommit: git("rev-parse", "HEAD"), testedSrcTree: git("rev-parse", "HEAD:workspace/src"),
  command: "POKEBENCH_LIVE_EVIDENCE_DIR=.integration/validation/prep9-final node --experimental-strip-types tools/integration/prep9Receipt.ts",
  evidenceDir: process.env.POKEBENCH_LIVE_EVIDENCE_DIR ?? null, results: rows,
}, null, 1) + "\n");
