// usage: POKEBENCH_LIVE_PROBE_SHARE=1 node --experimental-strip-types --no-warnings tools/integration/liveFixtureDriver.ts <summary.json> <fixture.json>...
// Runs verifyLiveAdapterFramebuffer (2 fresh probe processes) over fixtures sequentially in ONE process; with PROBE_SHARE the
// fixtures of one scenario share each fresh probe run. Prints/writes {fixture: {rows, residual[], exactRows[], expectedDuration}}.
import { writeFileSync } from "node:fs";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";

const [summary, ...paths] = process.argv.slice(2);
const out: Record<string, unknown> = {};
for (const path of paths) {
  try {
    const results = verifyLiveAdapterFramebuffer(path);
    out[path] = { rows: results[0]!.rows, expectedDuration: results[0]!.expectedDuration, residual: results.map(r => r.residualPixels),
      exactRows: results.map(r => r.exactRows), digests: results.map(r => r.digest) };
  } catch (error) { out[path] = { error: String(error).slice(0, 400) }; }
  console.log(path, JSON.stringify(out[path]));
}
writeFileSync(summary!, JSON.stringify(out, null, 1) + "\n");
