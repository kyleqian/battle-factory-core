// App-only sweep: render each compare trace on the app route and write per-frame sha1 of captured frames.
// usage: node --experimental-strip-types tools/integration/elevatedOffAppSweep.ts <outDir> <trace.json>...
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { loadCompareTrace } from "../compare/traceFile.ts";
import { renderAppTrace } from "../compare/appTrace.ts";

const [outDir, ...traces] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
for (const t of traces) {
  try {
    const trace = loadCompareTrace(t);
    const caps = await renderAppTrace(trace);
    const o: Record<string, string> = {};
    for (const c of caps) o[String(c.frame)] = createHash("sha1").update(c.rgba).digest("hex").slice(0, 12);
    writeFileSync(`${outDir}/${basename(t)}.json`, JSON.stringify({ profile: trace.oracleProfile ?? "battle-scene-on", frames: o }));
  } catch (e) {
    writeFileSync(`${outDir}/${basename(t)}.json`, JSON.stringify({ error: String(e) }));
  }
}
