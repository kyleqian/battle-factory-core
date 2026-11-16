// Derives src/assets/gen/battle-sprite-palettes.json (species -> 16-colour
// palette, both sides) from the full battle sprite tables, so the gameplay-side
// palette compositor (src/engine/liveMovePaletteComposite.ts) can import the
// 60 KB of palettes without dragging the 10 MB of pixel data into the headless
// library entry (src/headless.ts). Re-run after re-extracting either table:
//
//   npm run extract:battle-sprite-palettes
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unpackMonPicTable, type PackedMonPicSheets } from "../../src/engine/monPicSheetCodec.ts";

type Rgb = { r: number; g: number; b: number };
type SpriteTable = Record<string, { palette: Rgb[] }>;

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (name: string): SpriteTable =>
  unpackMonPicTable(JSON.parse(readFileSync(join(root, "src", "assets", "gen", name), "utf8")) as PackedMonPicSheets);

export function extractBattleSpritePalettes(back: SpriteTable, front: SpriteTable): { back: Record<string, Rgb[]>; front: Record<string, Rgb[]> } {
  const palettes = (table: SpriteTable): Record<string, Rgb[]> =>
    Object.fromEntries(
      Object.keys(table)
        .sort()
        .map((species) => [species, table[species]!.palette.map(({ r, g, b }) => ({ r, g, b }))]),
    );
  return { back: palettes(back), front: palettes(front) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = extractBattleSpritePalettes(read("battle-back-sprite-rows.json"), read("battle-opponent-front-sprite-rows.json"));
  const target = join(root, "src", "assets", "gen", "battle-sprite-palettes.json");
  writeFileSync(target, `${JSON.stringify(out)}\n`);
  console.log(`wrote ${target}: ${Object.keys(out.back).length} back + ${Object.keys(out.front).length} front palettes`);
}
