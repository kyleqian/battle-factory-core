// cast83 (ISSUES #143): dev-time extractor for CASTFORM's four battle forms. reference/pokeemerald builds the battle sheets by
// concatenating one 64x64 frame per form (graphics_file_rules.mk "### Castform ###": normal, sunny, rainy, snowy = CASTFORM_NORMAL,
// _FIRE, _WATER, _ICE, include/constants/battle.h:328-331) and the palette the same way (castform/normal.gbapal, decompressed into
// gBattleStruct->castformPalette[form], battle_gfx_sfx_util.c:615-620 / :678-682). sAnims_Castform (front_pic_anims.h:4201-4224)
// and gAnims_MonPic show frame `form`, picked by StartSpriteAnim(sprite, gBattleMonForms[battler]) (HandleSpeciesGfxDataChange,
// battle_gfx_sfx_util.c:945). The per-form geometry tables come from battle_anim_mons.c: gCastformFrontSpriteCoords (:55-61, the
// opponent's y_offset in GetBattlerYDelta :235-237 and GetBattlerSpriteCoordAttr's size :2252-2254), sCastformElevations
// (:63-69, GetBattlerElevation :258-259) and sCastformBackSpriteYCoords (:72-78, GetBattlerYDelta :206-208).
// Writes src/assets/gen/castform-forms.json; every existing catalog is untouched. Form 0 equals the existing CASTFORM entries of
// battle-back-sprites.json / battle-opponent-front-sprites.json (tests/cast83CastformForms.test.ts pins both).
// Run with:
//   node --experimental-strip-types tools/extract/cast83-extract-castform-forms.ts [--out-dir <dir>]
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { loadJascPal } from "./jascPal.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const CASTFORM_DIR = join(REF, "graphics", "pokemon", "castform");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDir = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDir) throw new Error("--out-dir requires a directory");
const OUTPUT_ROOT = outDir === undefined ? RUN_ROOT : isAbsolute(outDir) ? outDir : join(RUN_ROOT, outDir);
const ASSETS_GEN = join(OUTPUT_ROOT, "src", "assets", "gen");

/** graphics_file_rules.mk concatenation order == CASTFORM_NORMAL .. CASTFORM_ICE. */
const FORMS = [
  { form: 0, name: "NORMAL", dir: "normal" },
  { form: 1, name: "FIRE", dir: "sunny" },
  { form: 2, name: "WATER", dir: "rainy" },
  { form: 3, name: "ICE", dir: "snowy" },
] as const;

type Tileset = { columns: number; rows: number; tiles: number[][] };

function loadFrame(path: string): Tileset {
  const image = decodeIndexedPng(path);
  if (image.width !== 64 || image.height !== 64) throw new Error(`${path}: expected one 64x64 frame, got ${image.width}x${image.height}`);
  const { columns, rows, tiles } = sliceTiles(image);
  return { columns, rows, tiles: tiles.map((tile) => [...tile.pixels]) };
}

const animMons = readFileSync(join(REF, "src", "battle_anim_mons.c"), "utf8");

function sourceTable(name: string): string {
  const match = new RegExp(`${name}\\[NUM_CASTFORM_FORMS\\]\\s*=\\s*\\{([^}]*(?:\\}[^;]*?)*)\\};`, "s").exec(animMons);
  if (match === null) throw new Error(`battle_anim_mons.c: ${name} not found`);
  return match[1]!;
}

function formEntry(table: string, formName: string): string {
  const match = new RegExp(`\\[CASTFORM_${formName}\\]\\s*=\\s*(\\{[^}]*\\}|\\d+)`).exec(table);
  if (match === null) throw new Error(`CASTFORM_${formName} entry not found`);
  return match[1]!;
}

const frontCoordsTable = sourceTable("gCastformFrontSpriteCoords");
const elevationTable = sourceTable("sCastformElevations");
const backYTable = sourceTable("sCastformBackSpriteYCoords");

const forms = FORMS.map(({ form, name, dir }) => {
  const coords = /MON_COORDS_SIZE\((\d+),\s*(\d+)\),\s*\.y_offset\s*=\s*(\d+)/.exec(formEntry(frontCoordsTable, name));
  if (coords === null) throw new Error(`gCastformFrontSpriteCoords[CASTFORM_${name}] unparsed`);
  const palette = loadJascPal(join(CASTFORM_DIR, dir, "normal.pal"));
  const front = loadFrame(join(CASTFORM_DIR, dir, "anim_front.png"));
  return {
    form,
    name,
    // The opponent-front schema of battle-opponent-front-sprites.json: frame2 duplicates the form's frame (Castform is one of
    // HasTwoFramesAnimation's excluded species, pokemon.c:6988; each sAnims_Castform entry shows a single frame).
    front: { tileset: front, palette, frame2: { ...front, tiles: front.tiles.map((tile) => [...tile]) } },
    back: { tileset: loadFrame(join(CASTFORM_DIR, dir, "back.png")), palette },
    frontCoords: { width: Number(coords[1]), height: Number(coords[2]), yOffset: Number(coords[3]) },
    elevation: Number(formEntry(elevationTable, name)),
    backYDelta: Number(formEntry(backYTable, name)),
  };
});

mkdirSync(ASSETS_GEN, { recursive: true });
const path = join(ASSETS_GEN, "castform-forms.json");
writeFileSync(path, `${JSON.stringify({ forms })}\n`);
console.log(`wrote ${path}`);
