/** speciesAudit5: FRESH=1 POKEBENCH_LIVE_EVIDENCE_DIR=<dir> npx vite-node speciesAudit5Run.ts <fixture.json> (retains rgb frames for speciesAudit5Diff.ts / speciesAudit3LagShift.ts) */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";
const rs = verifyLiveAdapterFramebuffer(process.argv[2]!, 1);
console.log(rs[0]!.scratch);
const c = JSON.parse(readFileSync(join(rs[0]!.scratch as string, "live-comparison.json"), "utf8"));
console.log(JSON.stringify(c.comparisons.find((r: any) => r.age === 90)).slice(0, 1500));
