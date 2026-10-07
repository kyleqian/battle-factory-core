/**
 * prep30: species picture metrics read from the decomp tables (class A / PD: production holds the same tables):
 * gMonFrontPicCoords / gMonBackPicCoords y_offset (GetBattlerYDeltaFromSpriteId) and gEnemyMonElevation (GetBattlerYCoordWithElevation).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const ref = resolve(import.meta.dirname, "../../reference/pokeemerald");
const read = (p: string) => readFileSync(resolve(ref, p), "utf8");
const names = new Map<number, string>();
for (const m of read("include/constants/species.h").matchAll(/#define SPECIES_(\w+) (\d+)\n/g)) if (!names.has(Number(m[2]))) names.set(Number(m[2]), m[1]!);
const table = (p: string, re: RegExp) => new Map([...read(p).matchAll(re)].map((m) => [m[1]!, Number(m[2])]));
const front = table("src/data/pokemon_graphics/front_pic_coordinates.h", /\[SPECIES_(\w+)\]\s*=\s*\{[^}]*\.y_offset\s*=\s*(\d+)/g);
const back = table("src/data/pokemon_graphics/back_pic_coordinates.h", /\[SPECIES_(\w+)\]\s*=\s*\{[^}]*\.y_offset\s*=\s*(\d+)/g);
const elevation = table("src/data/pokemon_graphics/enemy_mon_elevation.h", /\[SPECIES_(\w+)\]\s*=\s*(\d+)/g);
export const speciesName = (id: number): string => { const n = names.get(id); if (!n) throw new Error(`species ${id}`); return n; };
/** GetBattlerYDeltaFromSpriteId: back-pic y_offset for a player battler, front-pic y_offset for an opponent. */
export const yDelta = (id: number, side: "player" | "opponent"): number => (side === "player" ? back : front).get(speciesName(id)) ?? 0;
/** GetBattlerYCoordWithElevation in a single battle: sBattlerCoords y (player 80, opponent 40) minus the opponent elevation. */
export const yWithElevation = (id: number, side: "player" | "opponent"): number => (side === "player" ? 80 : 40 - (elevation.get(speciesName(id)) ?? 0));
