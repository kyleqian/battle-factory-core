/**
 * speciesAudit14: attdollLiveCheck.ts (the PRODUCTION attacker-doll check as committed: no patch) run unchanged by path on the
 * speciesAudit14SwapStage.py scenarios. attdollLiveCheck.ts reads each stem's scenario (genders only) from the prep40 scenario dir;
 * this wrapper redirects that one path to S14_SCENARIOS before importing it (node:fs named exports re-synced). Everything else
 * (window, HP, status, preceding bodies, the D3 activation value, request.damage) comes from the swapped scenario's own probe rows.
 * usage: S14_SCENARIOS=<scenario dir> node --experimental-strip-types --no-warnings tools/integration/speciesAudit14SwapCheck.ts --out=<json> <probe dir> <stem>...
 */
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

const dir = process.env.S14_SCENARIOS;
if (!dir) throw new Error("S14_SCENARIOS=<scenario dir> required");
const PREFIX = "tools/integration/fixtures/prep40/scenarios/";
const read = fs.readFileSync;
fs.readFileSync = ((path: fs.PathOrFileDescriptor, ...rest: unknown[]) =>
  (read as (...a: unknown[]) => unknown)(typeof path === "string" && path.startsWith(PREFIX) ? `${dir}/${path.slice(PREFIX.length)}` : path, ...rest)) as typeof fs.readFileSync;
syncBuiltinESMExports();
await import("./attdollLiveCheck.ts");
