// r2-gates: does an ordinary route burn a Fire Punch target (semantic status-animation / status-set burn events), and does it reach its next prompt?
//   node --experimental-strip-types --no-warnings tools/integration/r2GatesBurnCheck.ts <turns> <seed,seed,...>
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
const PATTERNS: (0 | 1 | 2 | 3)[][] = [[0, 1, 2, 3, 0, 1, 2, 3, 0, 1], [1, 2, 3, 0, 1, 2, 3, 0, 1, 2]];
for (const seed of process.argv[3]!.split(",").map(Number)) {
  const on = generatedCommandAnimationReplay(seed, "on", PATTERNS[seed % 2]!.slice(0, Number(process.argv[2])), 0, true, true);
  const burn = on.semanticEvents.filter((e) => /burn/i.test(JSON.stringify(e.event)));
  console.log(JSON.stringify({ seed, burnEvents: burn.length, kinds: [...new Set(burn.map((e) => (e.event as any).type ?? (e.event as any).kind))],
    bodies: on.animations.map((a) => `${a.moveId}${a.attacker === 0 ? "p" : "o"}${a.adapterActive.every(Boolean) ? "+" : "-"}`).join(","),
    prompt: on.state.battleCommandPresentation?.lifecycle.phase ?? null }));
}
