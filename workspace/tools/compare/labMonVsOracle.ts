// cln11: checks tools/compare/labMon.ts against the ROM. Usage:
//   bin/oracle lab <lab.json> -o <dir>            (any overrides.parties lab, its trace may be one frame)
//   node --experimental-strip-types tools/compare/labMonVsOracle.ts <lab.json> <dir>/manifest.json
// Builds all six mons with buildLabMon and compares each with the manifest's `state.parties` record (stats, HP, PP, ability, types, friendship, personality, item, level, moves).
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { buildLabMon, type LabMon } from "./labMon.ts";

const TYPE_ID: Readonly<Record<string, number>> = {
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4, TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14, TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
};
type Record6 = Record<string, number>;
interface RomMon { species: number; level: number; moves: number[]; pp: number[]; item: number; ability: number; types: number[]; friendship: number; personality: number; hp: number; maxHp: number; stats: Record6 }

const [labPath, manifestPath] = process.argv.slice(2);
if (labPath === undefined || manifestPath === undefined) throw new Error("usage: labMonVsOracle.ts <lab.json> <manifest.json>");
const lab = JSON.parse(readFileSync(labPath, "utf8")) as { seed: number; level?: number; overrides: { parties: Record<"player" | "opponent", LabMon[]> } };
const rom = (JSON.parse(readFileSync(manifestPath, "utf8")) as { captures: { state: { parties: Record<"player" | "opponent", RomMon[]> } }[] }).captures[0]!.state.parties;
const name = basename(labPath).replace(/\.json$/, "");

let checked = 0;
const bad: string[] = [];
for (const side of ["player", "opponent"] as const) {
  lab.overrides.parties[side].forEach((mon, index) => {
    const { config } = buildLabMon(mon, { lab: name, side, index, seed: lab.seed, defaultLevel: lab.level ?? 50 });
    const r = rom[side][index]!;
    const mine: Record<string, unknown> = {
      species: config.species, level: config.level, moves: [...config.moves!], pp: [...config.pp!], item: config.item, ability: config.ability, friendship: config.friendship,
      personality: config.personality, hp: config.hp, maxHp: config.maxHp, types: config.types!.map((t) => TYPE_ID[t]),
      stats: { attack: config.attack, defense: config.defense, speed: config.speed, spAttack: config.spAttack, spDefense: config.spDefense },
    };
    for (const [field, value] of Object.entries(mine)) {
      checked += 1;
      const romValue = (r as unknown as Record<string, unknown>)[field];
      if (JSON.stringify(value) !== JSON.stringify(romValue)) bad.push(`${side}[${index}].${field}: engine ${JSON.stringify(value)} vs ROM ${JSON.stringify(romValue)}`);
    }
  });
}
console.log(`${name}: ${checked} fields over 6 mons, ${bad.length} mismatches`);
for (const line of bad) console.log(`  ${line}`);
process.exitCode = bad.length === 0 ? 0 : 1;
