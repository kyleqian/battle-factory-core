import { deepStrictEqual, strictEqual } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);

function auditAsset(
  sourceName: string,
  generatedName: string,
  expectedShape: { columns: number; rows: number; affine: boolean },
): string {
  const sourcePath = resolve(
    root,
    "reference/pokeemerald/graphics/battle_anims/sprites",
    sourceName,
  );
  const generatedPath = resolve(root, "src/assets/gen", generatedName);
  const source = decodeIndexedPng(sourcePath);
  const sliced = sliceTiles(source);
  const generated = JSON.parse(readFileSync(generatedPath, "utf8")) as {
    tileset: { columns: number; rows: number; tiles: number[][] };
    palette: Array<{ r: number; g: number; b: number }>;
    oam: { shape: string; size: string; affine: boolean };
    frameSizeTiles?: number;
  };

  strictEqual(sliced.columns, expectedShape.columns);
  strictEqual(sliced.rows, expectedShape.rows);
  deepStrictEqual(generated.tileset, {
    columns: sliced.columns,
    rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]),
  });
  deepStrictEqual(generated.palette, source.palette);
  deepStrictEqual(generated.oam, {
    shape: "32x32",
    size: "32x32",
    affine: expectedShape.affine,
  });
  strictEqual(generated.frameSizeTiles ?? 16, 16);

  return createHash("sha256")
    .update(readFileSync(sourcePath))
    .update(readFileSync(generatedPath))
    .digest("hex");
}

const hands = auditAsset("hands_and_feet.png", "battle-anim-hands-and-feet.json", {
  columns: 4,
  rows: 16,
  affine: false,
});
const impact = auditAsset("impact.png", "battle-anim-hitsplat.json", {
  columns: 4,
  rows: 4,
  affine: true,
});

console.log(
  `MOVE_DOUBLE_KICK deterministic asset audit exact: HANDS_AND_FEET ${hands}; IMPACT ${impact}`,
);
