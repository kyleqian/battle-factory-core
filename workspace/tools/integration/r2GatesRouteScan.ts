// r2-gates: ordinary generated-route scan for bodies of given move ids (adapter active every age, prompt reached).
//   [STREAK=n] node --experimental-strip-types --no-warnings tools/integration/r2GatesRouteScan.ts <from> <to> <moveId,moveId,...> [maxHits] [seed,seed,...]
// With a seed list, only those seeds are replayed (from/to ignored).
// Seeds from..to-1, move slot pattern as bgHistoryRouteBodies.ts (seed parity), 0 streak. One line per matching body.
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
const [from, to, ids, maxHits] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]!.split(",").map(Number), Number(process.argv[5] ?? 1e9)];
const PATTERNS: (0 | 1 | 2 | 3)[][] = [[0, 1, 2, 3, 0, 1, 2, 3, 0, 1], [1, 2, 3, 0, 1, 2, 3, 0, 1, 2]];
const only = process.argv[6]?.split(",").map(Number);
let hits = 0;
for (let seed = from; seed < to && hits < maxHits; seed++) {
  if (only && !only.includes(seed)) continue;
  try {
    const on = generatedCommandAnimationReplay(seed, "on", PATTERNS[seed % 2]!.slice(0, Number(process.env.TURNS ?? 10)), Number(process.env.STREAK ?? 0), true, true);
    on.animations.forEach((a, index) => {
      if (!ids.includes(a.moveId)) return;
      const prior = on.animations.slice(0, index).map((p) => `${p.moveId}${p.attacker === 0 ? "p" : "o"}`).join(",");
      const active = a.adapterActive.every(Boolean);
      hits++;
      console.log(JSON.stringify({ seed, index, moveId: a.moveId, attacker: a.attacker, player: a.player, opponent: a.opponent, active, prior,
        prompt: on.state.battleCommandPresentation?.lifecycle.phase ?? null }));
    });
  } catch (e) { /* stalls etc. */ }
}
