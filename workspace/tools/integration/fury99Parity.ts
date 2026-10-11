// fury99: Scene ON vs OFF logical parity on a census route whose LATER-body Fury Cutter 210 (counter 2+) goes live in the final code
// (land75Parity.ts's controller and comparison, unchanged, as flat77Parity.ts: at every action-menu arrival the battle RNG, the rules
// context and the boundary must be equal). The receipt adds every Fury Cutter body of the Scene ON run (turn, side, order lend known,
// allocator history known), read from the orchestrator's own hosts at the body's first presented frame.
//   node --experimental-strip-types --no-warnings tools/integration/fury99Parity.ts --seed=<seed> --streak=<streak> [--out=file.json]
import { writeFileSync } from "node:fs";
import { land75Parity } from "./land75Parity.ts";

const arg = (n: string, d: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const parity = land75Parity(Number(arg("seed", "0")), Number(arg("streak", "0")));
const { bodies, ...rest } = parity;
const receipt = { ...rest, schema: "fury99-parity/v1", furyCutterBodiesOn: bodies.filter((b) => b.moveId === 210) };
const out = arg("out", "");
if (out) writeFileSync(out, `${JSON.stringify(receipt, null, 1)}\n`);
console.log(JSON.stringify(receipt));
