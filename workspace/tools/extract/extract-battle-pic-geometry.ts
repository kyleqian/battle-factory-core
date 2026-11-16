// Derives src/assets/gen/battle-pic-geometry.json (columns, rows and first opaque pixel row of every battle pic sheet) from the
// pixel tables, so the gameplay tick path (faint timing, the Extrasensory gate) never reads sprite pixels (docs/bnd254b-pic-geometry.md).
//
//   npm run extract:battle-pic-geometry
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unpackMonPicTable, type PackedMonPicSheets } from "../../src/engine/monPicSheetCodec.ts";
import { monPicGeometry, type MonPicGeometry } from "../../src/engine/monPicGeometry.ts";

type Tileset = { columns: number; rows: number; tiles: number[][] };
type SpriteTable = Record<string, { tileset: Tileset }>;
type CastformForms = { forms: { front: { tileset: Tileset }; back: { tileset: Tileset } }[] };
type SubstituteDoll = { front: Tileset; back: Tileset };

export type BattlePicGeometryTable = {
  back: Record<string, MonPicGeometry>;
  front: Record<string, MonPicGeometry>;
  substituteDoll: { player: MonPicGeometry; opponent: MonPicGeometry };
  castform: { player: MonPicGeometry; opponent: MonPicGeometry }[];
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const readJson = <T>(path: string): T => JSON.parse(readFileSync(join(root, path), "utf8")) as T;

export function extractBattlePicGeometry(
  back: SpriteTable, front: SpriteTable, castform: CastformForms, doll: SubstituteDoll,
): BattlePicGeometryTable {
  const side = (table: SpriteTable): Record<string, MonPicGeometry> =>
    Object.fromEntries(Object.keys(table).sort().map((species) => [species, monPicGeometry(table[species]!.tileset)]));
  return {
    back: side(back),
    front: side(front),
    substituteDoll: { player: monPicGeometry(doll.back), opponent: monPicGeometry(doll.front) },
    castform: castform.forms.map((form) => ({ player: monPicGeometry(form.back.tileset), opponent: monPicGeometry(form.front.tileset) })),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = extractBattlePicGeometry(
    unpackMonPicTable(readJson<PackedMonPicSheets>("src/assets/gen/battle-back-sprite-rows.json")),
    unpackMonPicTable(readJson<PackedMonPicSheets>("src/assets/gen/battle-opponent-front-sprite-rows.json")),
    readJson("src/assets/gen/castform-forms.json"), readJson("src/animation/assets/substitute.json"),
  );
  const target = join(root, "src", "assets", "gen", "battle-pic-geometry.json");
  writeFileSync(target, `${JSON.stringify(out)}\n`);
  console.log(`wrote ${target}: ${Object.keys(out.back).length} back + ${Object.keys(out.front).length} front + ${out.castform.length} castform forms + doll`);
}
