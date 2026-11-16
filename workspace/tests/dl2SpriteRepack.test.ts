// dl2: the battle sprite sheets ship as packed rows (src/engine/monPicSheetCodec.ts, docs/dl2-sprite-repack.md). The decoded tables must equal
// the former tile JSON for all 376 species; that JSON (battle-back-sprites.json / battle-opponent-front-sprites.json) is no longer in the tree,
// so its bytes are pinned here by sha256 (the old extractor wrote JSON.stringify(table) + "\n").
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import backRows from "../src/assets/gen/battle-back-sprite-rows.json" with { type: "json" };
import frontRows from "../src/assets/gen/battle-opponent-front-sprite-rows.json" with { type: "json" };
import { bundledMonPicTables } from "../src/engine/monPicPixelsInstall.ts";
import { decodeMonPicSheet, encodeMonPicSheet, lazyUnpackMonPicTable, unpackMonPicTable } from "../src/engine/monPicSheetCodec.ts";

const OLD_BACK_SHA256 = "10b3dfbf447cbdebc3d08fd858ef0f5bcd91b9b536cac17cd15b18a08b2dd12e";
const OLD_FRONT_SHA256 = "2ceccd1018fb8812de17ef5e4d0c7182388193f27f1aadfc6c3641b198b566cf";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

describe("dl2 packed sprite sheets", () => {
  it("decode to exactly the old back sheet JSON (376 species)", () => {
    expect(Object.keys(backRows)).toHaveLength(376);
    expect(sha(`${JSON.stringify(unpackMonPicTable(backRows))}\n`)).toBe(OLD_BACK_SHA256);
  });

  it("decode to exactly the old front sheet JSON (376 species, two frames each)", () => {
    expect(Object.keys(frontRows)).toHaveLength(376);
    expect(sha(`${JSON.stringify(unpackMonPicTable(frontRows))}\n`)).toBe(OLD_FRONT_SHA256);
  });

  it("the runtime lazy tables decode to the same JSON as the eager unpack", () => {
    const { back, front } = bundledMonPicTables();
    expect(sha(`${JSON.stringify(back)}\n`)).toBe(OLD_BACK_SHA256);
    expect(sha(`${JSON.stringify(front)}\n`)).toBe(OLD_FRONT_SHA256);
  });

  it("encode inverts decode for every species and the files hold only hex pixel and base-32 palette digits", () => {
    for (const rows of [backRows, frontRows] as Record<string, string>[]) {
      for (const [species, text] of Object.entries(rows)) {
        expect(encodeMonPicSheet(decodeMonPicSheet(text)), species).toBe(text);
        expect(text, species).toMatch(/^[0-9a-f]+[0-9a-v]{48}$/);
      }
    }
    for (const file of ["battle-back-sprite-rows.json", "battle-opponent-front-sprite-rows.json"]) {
      expect(readFileSync(new URL(`../src/assets/gen/${file}`, import.meta.url), "utf8")).not.toMatch(/\\|[^\x20-\x7e\n]/);
    }
  });

  it("a species is decoded on first read and cached; untouched species stay packed; keys keep the extraction order", () => {
    const table = lazyUnpackMonPicTable(frontRows);
    expect(Object.keys(table)).toEqual(Object.keys(frontRows));
    expect(Object.getOwnPropertyDescriptor(table, "ONIX")?.get).toBeTypeOf("function");
    const first = table.ONIX;
    expect(table.ONIX).toBe(first);
    expect(Object.getOwnPropertyDescriptor(table, "ONIX")?.get).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(table, "GOLBAT")?.get).toBeTypeOf("function");
    expect("NOT_A_SPECIES" in table).toBe(false);
    expect(table.NOT_A_SPECIES).toBeUndefined();
  });

  it("rejects a sheet that is not 64x64 tiles with 4-bit pixels and a 5-bit-expanded palette", () => {
    const sheet = decodeMonPicSheet(backRows.ONIX);
    expect(() => encodeMonPicSheet({ ...sheet, tileset: { ...sheet.tileset, rows: 4 } })).toThrow("8x8 tiles");
    expect(() => encodeMonPicSheet({ ...sheet, tileset: { ...sheet.tileset, tiles: sheet.tileset.tiles.map((t, i) => (i === 0 ? t.map(() => 16) : t)) } })).toThrow("4-bit");
    expect(() => encodeMonPicSheet({ ...sheet, palette: sheet.palette.map((c, i) => (i === 1 ? { ...c, r: 1 } : c)) })).toThrow("5-bit");
    expect(() => decodeMonPicSheet("00")).toThrow("unexpected length");
  });
});
