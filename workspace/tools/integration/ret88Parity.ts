// ret88: Scene ON vs OFF logical parity on a census route with friendship-0 Returns (ReturnWeak live at the final code) -- flat77Parity.ts
// (land75Parity.ts's controller and comparison, unchanged: FIGHT + the least-used legal slot, forced replacement = the first healthy member;
// at every action-menu arrival the battle RNG, the rules context (hitMarker bit 128 masked) and the boundary must be equal). The receipt
// lists every Return 216 body of the Scene ON run (turn, side, order lend known, allocator history known) instead of Flatter's.
//   node --experimental-strip-types --no-warnings tools/integration/ret88Parity.ts --seed=<seed> --streak=<streak> [--out=file.json]
import { writeFileSync } from "node:fs";
import { land75Parity } from "./land75Parity.ts";

const arg = (n: string, d: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const parity = land75Parity(Number(arg("seed", "0")), Number(arg("streak", "0")));
const { bodies, ...rest } = parity;
const receipt = { ...rest, schema: "ret88-parity/v1", returnBodiesOn: bodies.filter((b) => b.moveId === 216) };
const out = arg("out", "");
if (out) writeFileSync(out, `${JSON.stringify(receipt, null, 1)}\n`);
console.log(JSON.stringify(receipt));
