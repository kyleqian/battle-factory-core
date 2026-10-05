// CLI of postkoModelCheck.ts: npx vite-node tools/integration/postkoModelCheckRun.ts -- <scenario-key> <probe.json> [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { modelCheck } from "./postkoModelCheck.ts";

const args = process.argv.slice(2).filter(x => x !== "--" && x !== "--write");
const [key, path] = args;
const result = modelCheck(key!, JSON.parse(readFileSync(path!, "utf8")));
for (const e of result.edges) console.log(e.label, e.riseFrame, "known", e.known, "mismatches", e.mismatches, JSON.stringify(e.checks));
console.log(JSON.stringify({ edges: result.edgeCount, mismatchedEdges: result.mismatchedEdges, romActivations: result.romActivations, invalidReason: result.invalidReason }));
if (process.argv.includes("--write")) {
  writeFileSync(new URL(`./fixtures/postko/model-check-${key}.json`, import.meta.url), JSON.stringify(result, null, 1) + "\n");
}
