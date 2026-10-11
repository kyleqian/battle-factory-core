// sc106: the four randomRoundSoak pins' runs with their action logs (onNote), to locate the first divergence base vs final.
//   node --experimental-strip-types --no-warnings tools/integration/sc106Soak.ts > soak.json   (in each tree)
import { runSeed } from "../soak/randomRoundSoakDriver.ts";
const out: Record<string, unknown> = {};
for (const [name, seed, opts] of [
  ["full-0", 0, { maxFrames: 600_000, renderEvery: 0, policy: "full", stopAtFirstRoundDecision: true }],
  ["full-1", 1, { maxFrames: 600_000, renderEvery: 0, policy: "full", stopAtFirstRoundDecision: true }],
  ["vanilla-0", 0, { maxFrames: 600_000, renderEvery: 0, policy: "vanilla", stopAtFirstRoundDecision: true }],
  ["vanilla-1", 1, { maxFrames: 600_000, renderEvery: 0, policy: "vanilla", stopAtFirstRoundDecision: true }],
  ["full-27", 27, { maxFrames: 80_000, renderEvery: 0, stopAtFirstRoundDecision: true }],
] as const) {
  const notes: string[] = [];
  const r = runSeed(seed, { ...(opts as any), onNote: (n: any) => notes.push(typeof n === "string" ? n : JSON.stringify(n)) });
  const { log: _l, notes: _n, ...rest } = r as any;
  out[name] = { result: rest, notes };
}
process.stdout.write(JSON.stringify(out));
