// Dense twice-fresh proof of the post-KO bodies through the PRODUCTION lend (docs/postko-consumer-audit.md §4): each fixture's
// recorded semantic history is replayed through liveSpriteOrderHost + the orchestrator's allocator seam (postkoHostReplay.ts)
// inside liveAdapterFramebuffer.ts liveView, and verifyLiveAdapterFramebuffer compares every row of the accepted window
// (activation + accepted offset) with two fresh direct-mGBA runs (liveAdapterFramebuffer's own CLI is a no-op under vite-node).
//   npx vite-node tools/integration/postkoLendDense.ts -- [--out <receipt.json>] [fixture.json ...]   (default: the 13 drafts)
import { writeFileSync } from "node:fs";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";
import { POSTKO_DENSE_FIXTURES } from "./postkoLendHistory.ts";

const args = process.argv.slice(2).filter(arg => arg !== "--");
const outIndex = args.indexOf("--out");
const out = outIndex >= 0 ? args[outIndex + 1] : undefined;
const paths = args.filter((arg, index) => arg !== "--out" && (outIndex < 0 || index !== outIndex + 1));
const rows = [];
for (const path of paths.length ? paths : POSTKO_DENSE_FIXTURES) {
  const runs = verifyLiveAdapterFramebuffer(path, 2);
  const row = { fixture: path, rows: runs[0]!.rows, ageOffset: runs[0]!.ageOffset, expectedDuration: runs[0]!.expectedDuration,
    exactRows: runs.map(r => r.exactRows), residualPixels: runs.map(r => r.residualPixels), digest: runs[0]!.digest,
    freshRunsIdentical: runs.every(r => r.digest === runs[0]!.digest), firstMismatches: runs[0]!.firstMismatches };
  console.log(JSON.stringify(row));
  rows.push(row);
  if (out) writeFileSync(out, JSON.stringify(rows, null, 1) + "\n");
}
if (rows.some(row => row.exactRows.some(n => n !== row.rows))) process.exitCode = 1;
