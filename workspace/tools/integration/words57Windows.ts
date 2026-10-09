// usage: node --experimental-strip-types --no-warnings tools/integration/words57Windows.ts OUT.json fixture.json...
// words57 dense consumer windows (S10A; docs/next-adapters-words57.md: consumers after a words unit + a battle unit): each fixture through verifyLiveAdapterFramebuffer (two fresh direct-mGBA
// probe processes, the PRODUCTION live renderer, the complete window from the consumer's activation). The consumer's order lend is the production
// host's deferred marker after a Random2-words unit, resolved at the render seam with the units' RAM-read words pinned into the presentation host
// (liveAdapterFramebuffer.ts wordsChain). Exit 1 unless every run is pixel-exact on every row and both runs' digests are identical.
// POKEBENCH_LIVE_WORDS_CHAIN=entry-lend runs the words-free negative control (expected to differ).
import { writeFileSync } from "node:fs";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";

const [outPath, ...paths] = process.argv.slice(2);
const control = process.env.POKEBENCH_LIVE_WORDS_CHAIN === "entry-lend";
let failed = false;
const windows = paths.map((path) => {
  const runs = verifyLiveAdapterFramebuffer(path).map((r) => ({ rows: r.rows, exactRows: r.exactRows, residualPixels: r.residualPixels, digest: r.digest }));
  const exact = runs.every((r) => r.residualPixels === 0 && r.exactRows === r.rows);
  const identical = runs.every((r) => r.digest === runs[0]!.digest);
  if (!identical || exact === control) failed = true;
  const row = { fixture: path, runs, exact, identicalRuns: identical };
  console.log(JSON.stringify(row));
  return row;
});
writeFileSync(outPath!, `${JSON.stringify({ schema: "words57-windows/v1", control: control ? "entry-lend" : null, windows }, null, 1)}\n`);
process.exit(failed ? 1 : 0);
