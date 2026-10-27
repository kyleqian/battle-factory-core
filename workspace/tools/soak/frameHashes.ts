// Render-determinism probe for perf work on the per-frame `render(state)` path
// (perf211). Drives the soak's RandomPlayer exactly like `npm run soak` with
// `--render-every 1`, renders EVERY frame, and hashes each framebuffer. Run it
// on a base tree and on a candidate tree, then diff the two outputs: any
// optimisation of render() must leave the hash sequence byte-identical.
//
//   node --experimental-strip-types tools/soak/frameHashes.ts \
//     --scene on --policy winning --vary-rng --seeds 0:2 --frames 20000 --out on.txt
//
// Output: one line per rendered frame, `<seed> <frame> <sha1-16>`, then one
// `# seed <n> digest <sha1>` line per seed (hash of that seed's frame hashes)
// and a final `# total ms <render-ms> frames <n>` timing line (stderr too).
// Only the timing lines differ between runs of the same tree.

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

import { render, tick } from "../../src/engine/core.ts";
import {
  ActionLog,
  createStartCarryState,
  RandomPlayer,
  Rng,
  type SoakPolicy,
  type SoakScene,
} from "./randomRoundSoakDriver.ts";

const args = process.argv.slice(2);
const flag = (name: string): string | null => {
  const index = args.indexOf(name);
  return index >= 0 && index + 1 < args.length ? args[index + 1]! : null;
};

const scene = (flag("--scene") ?? "off") as SoakScene;
if (scene !== "on" && scene !== "off") throw new Error(`--scene must be on|off, got ${scene}`);
const policy = (flag("--policy") ?? "winning") as SoakPolicy;
const varyRng = args.includes("--vary-rng");
const [seedStart, seedEnd] = (flag("--seeds") ?? "0:2").split(":").map(Number) as [number, number];
const frames = Number(flag("--frames") ?? 20_000);
const outPath = flag("--out");

const lines: string[] = [];
let renderNs = 0n;
let renderedFrames = 0;
for (let seed = seedStart; seed < seedEnd; seed += 1) {
  const rng = new Rng(seed);
  const player = new RandomPlayer(rng, new ActionLog(false), policy);
  let state = createStartCarryState(0, varyRng ? seed : 0, scene);
  const seedHash = createHash("sha1");
  for (let frame = 1; frame <= frames; frame += 1) {
    state = tick(state, player.decide(state));
    const started = process.hrtime.bigint();
    const fb = render(state);
    renderNs += process.hrtime.bigint() - started;
    renderedFrames += 1;
    const hash = createHash("sha1").update(fb).digest("hex").slice(0, 16);
    seedHash.update(hash);
    lines.push(`${seed} ${frame} ${hash}`);
  }
  lines.push(`# seed ${seed} digest ${seedHash.digest("hex")}`);
}
const timing = `# total ms ${(Number(renderNs) / 1e6).toFixed(0)} frames ${renderedFrames} ms/frame ${(Number(renderNs) / 1e6 / renderedFrames).toFixed(3)}`;
lines.push(timing);
console.error(`scene ${scene} seeds ${seedStart}:${seedEnd} ${timing.slice(2)}`);
if (outPath !== null) writeFileSync(outPath, `${lines.join("\n")}\n`);
else console.log(lines.join("\n"));
