// fnt201 (docs/fnt201-faint-timing.md): production's presentation commands for the staged faint scenarios (tools/integration/fnt201Stage.py),
// stats computed from the scenario's own party records (L50 formula), through lsd194Production.ts (real kernel + projectBattleResolutionCommands).
//   node --experimental-strip-types --no-warnings tools/integration/fnt201Production.ts <case> <on|off> [seed]
import { readFileSync } from "node:fs";
import { lsd194Production, type Mon } from "./lsd194Production.ts";
import stats from "../../src/data/gen/species-stats.json" with { type: "json" };

type Rec = { species: number; level: number; nature: number; ivs: Record<string, number>; evs: Record<string, number>; moves: number[] };
export function monOf(r: Rec): Mon {
  const b = stats.species[r.species - 1]! as any;
  const s = (base: number, k: string, hp = false) => {
    const v = Math.floor(((2 * base + (r.ivs[k] ?? 0) + Math.floor((r.evs[k] ?? 0) / 4)) * r.level) / 100);
    return hp ? v + r.level + 10 : v + 5;
  };
  const hp = r.species === 303 ? 1 : s(b.baseHp, "hp", true);
  return { name: b.name.replace("SPECIES_", ""), id: r.species, hp, attack: s(b.baseAttack, "attack"), defense: s(b.baseDefense, "defense"),
    spAttack: s(b.baseSpAttack, "spAttack"), spDefense: s(b.baseSpDefense, "spDefense"), speed: s(b.baseSpeed, "speed") };
}
export function scenario(name: string) {
  const d = JSON.parse(readFileSync(new URL(`./fixtures/fnt201/scenarios/fnt201-${name}-s11.json`, import.meta.url), "utf8"));
  const p = d.overrides.parties.player[0] as Rec, o = d.overrides.parties.opponent[0] as Rec;
  return { player: monOf(p), opponent: monOf(o), pMove: p.moves[0]!, oMove: o.moves[0]! };
}
export function production(name: string, scene: "on" | "off", seed: number) {
  const s = scenario(name);
  return lsd194Production({ scene, seed, ...s, pSelf: s.pMove === 201, lenientHp: true });
}
if (process.argv[1]?.endsWith("fnt201Production.ts")) {
  const [name, scene, seed] = [process.argv[2]!, process.argv[3]! as "on" | "off", Number(process.argv[4] ?? 1)];
  console.log(JSON.stringify(scenario(name)));
  for (const c of production(name, scene, seed).rows) console.log(c.start, c.dur, c.type, c.battler, JSON.stringify(c.lines), JSON.stringify(c.timing));
}
