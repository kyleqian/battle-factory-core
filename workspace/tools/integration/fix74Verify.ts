// fix74: dense production live-renderer check of one Bulk Up fixture (tools/integration/fixtures/fix74/fixtures/<name>.json) through
// liveAdapterFramebuffer.ts's verifier: two FRESH direct-mGBA bulkUpProbe.py processes, r1 == r2 per-row digests (it throws otherwise),
// production's liveView -> renderBattleResolutionLiveView at age = row (the accepted first-grown-frame framing) vs the ROM RGB.
//   node --experimental-strip-types --no-warnings tools/integration/fix74Verify.ts <fixture.json>...   (one JSON line per fixture)
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";

for (const path of process.argv.slice(2)) {
  const results = verifyLiveAdapterFramebuffer(path);
  const r = results[0]!;
  console.log(JSON.stringify({ fixture: path.replace(/^.*\//, "").replace(/\.json$/, ""), rows: r.rows, exactRows: r.exactRows,
    px: r.residualPixels, expectedDuration: r.expectedDuration, digests: results.map((x) => x.digest.slice(0, 16)),
    r1EqR2: results.every((x) => x.digest === r.digest), firstMismatches: r.firstMismatches }));
}
