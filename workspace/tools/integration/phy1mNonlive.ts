// phy1m: every Factory Lv50 move (+ Struggle) classified by its adapter case in liveMoveAnimationDuration's move switch.
// node --experimental-strip-types --no-warnings tools/integration/phy1mNonlive.ts [--all] > out.json   (--all: every move id, not only Factory Lv50 slots)
import { readFileSync } from "node:fs";
import movesJson from "../../src/data/gen/moves.json" with { type: "json" };
import monsJson from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import policyJson from "../../src/data/gen/factory-round-policy.json" with { type: "json" };
import { liveMoveAnimationDurationCaseMissing } from "../../src/engine/liveMoveAnimation.ts";
import compJson from "../../src/data/gen/battle-animation-components.json" with { type: "json" };
import { APPROX_SCRIPT_MOVE_BODY } from "../../src/animation/approxScript.ts";

const moves = (movesJson as unknown as { moves: { move: string; id: number; name: string }[] }).moves;
const entries = (monsJson as unknown as { entries: { index: number; moves: string[] }[] }).entries;
const ranges = (policyJson as unknown as { rentalSelection: { ranges: { level50: { start: number; end: number }[] } } }).rentalSelection.ranges.level50.slice(0, 7);
const slots = new Map<string, number>();
const sets = new Map<string, number>();
for (const r of ranges) {
  const inRange = entries.filter((m) => m.index >= r.start && m.index <= r.end);
  for (const m of inRange) for (const mv of m.moves) {
    slots.set(mv, (slots.get(mv) ?? 0) + 1 / inRange.length / ranges.length);
    sets.set(mv, (sets.get(mv) ?? 0) + 1);
  }
}
const total = [...slots.values()].reduce((a, b) => a + b, 0);
const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as { entries: { move: string; status: string }[] };
const covered = new Set(coverage.entries.map((e) => e.move));
const tierOf = new Map((compJson as unknown as { moves: { id: number; tier: string }[] }).moves.map((m) => [m.id, m.tier]));
const all = process.argv.includes("--all");
const out = [];
for (const m of moves) {
  const w = slots.get(m.move) ?? 0;
  if (!all && w === 0 && m.id !== 165) continue;
  const miss = [0, 1].map((side) => liveMoveAnimationDurationCaseMissing({ moveId: m.id, attacker: side as 0 | 1, target: (1 - side) as 0 | 1, turn: 1, power: 40, damage: 10, friendship: 0, multihit: 0 }));
  out.push({ id: m.id, move: m.move, name: m.name, weightPct: +(100 * w / total).toFixed(4), setsContaining: sets.get(m.move) ?? 0,
    caseMissingPlayer: miss[0], caseMissingOpponent: miss[1], tier: tierOf.get(m.id) ?? null, inCoverageCatalogue: covered.has(m.move), approxScript: APPROX_SCRIPT_MOVE_BODY[m.id] ?? null });
}
console.log(JSON.stringify(out, null, 1));
