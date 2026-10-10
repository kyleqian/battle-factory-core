// flat77: Scene ON vs OFF logical parity on a census route whose LATER-body Flatter 260 goes live under the flat77 temp patch
// (land75Parity.ts's controller and comparison, unchanged: FIGHT + the least-used legal slot, forced replacement = the first healthy
// member, the census's own controller; at every action-menu arrival the battle RNG, the rules context (hitMarker bit 128 masked) and the
// boundary must be equal). The receipt adds every Flatter body of the Scene ON run (turn, side, order lend known, allocator history known),
// read from the orchestrator's own hosts at the body's first presented frame. Run it in the PATCHED copy for the lifted route.
//   node --experimental-strip-types --no-warnings tools/integration/flat77Parity.ts --seed=<seed> --streak=<streak> [--out=file.json]
import { writeFileSync } from "node:fs";
import { land75Parity } from "./land75Parity.ts";

const arg = (n: string, d: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const parity = land75Parity(Number(arg("seed", "0")), Number(arg("streak", "0")));
const { bodies, ...rest } = parity;
const receipt = { ...rest, schema: "flat77-parity/v1", flatterBodiesOn: bodies.filter((b) => b.moveId === 260) };
const out = arg("out", "");
if (out) writeFileSync(out, `${JSON.stringify(receipt, null, 1)}\n`);
console.log(JSON.stringify(receipt));
