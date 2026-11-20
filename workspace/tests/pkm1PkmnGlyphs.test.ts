// pkm1 (docs/pkm1-pkmn-glyphs.md): the trainer classes `_("{PKMN} BREEDER")`, RANGER and TRAINER (trainer_class_names.h:6, :54,
// :2) print the font's small two-glyph PK MN symbol (charmap.txt:51 `PKMN = 53 54`). The engine drew the brace code letter by letter
// (" PKMN  BREEDER": "{" and "}" have no glyph and advanced a space each) and printed it in six frames instead of two. Expected
// values come from the ROM: glyph codes and the named-glyph table from charmap.txt, positions and pixels from the frame catcher's
// ROM frame 49874 of seed 13 Scene ON, battle 4 ("PKMN BREEDER RAFAEL sent / out WAILMER!", fcs1 finding 3).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import charmapData from "../src/data/gen/charmap.json" with { type: "json" };
import fontNormalData from "../src/data/gen/font-normal.json" with { type: "json" };
import frontierTrainersData from "../src/data/gen/battle-frontier-trainers.json" with { type: "json" };
import facilityClassLookupsData from "../src/data/gen/facility-class-lookups.json" with { type: "json" };
import {
  codeForChar,
  expandRomGlyphCodes,
  measureText,
  ROM_NAMED_GLYPH_CODES,
  romGlyphChar,
  type FontData,
} from "../src/engine/font.ts";
import { getFactoryTrainerPresentation, getFactoryTrainerPresentationByName } from "../src/engine/factoryTrainerPresentation.ts";
import { battleStringPrintableLength, resolveBattleStringLines } from "../src/engine/battleStringResolver.ts";
import { drawBattleMessageTextLines, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS } from "../src/engine/battleScene.ts";
import { createFramebuffer, SCREEN_WIDTH } from "../src/engine/framebuffer.ts";

const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
const font = fontNormalData as unknown as FontData;
const codes = (text: string) => [...text].map((ch) => codeForChar(charmap, ch));

/** charmap.txt's Latin glyph section (up to `@ Hiragana`): every bare-name entry whose bytes are all glyph codes (< 0xF7). */
function charmapNamedGlyphs(): Record<string, number[]> {
  const text = readFileSync("reference/pokeemerald/charmap.txt", "utf8");
  const latin = text.slice(0, text.indexOf("@ Hiragana"));
  const out: Record<string, number[]> = {};
  for (const line of latin.split(/\r?\n/)) {
    const m = /^([A-Z_][A-Z_0-9]*)\s*=\s*([0-9A-F]{2}(?:\s+[0-9A-F]{2})*)\s*$/.exec(line);
    if (!m) continue;
    const bytes = m[2]!.split(/\s+/).map((b) => Number.parseInt(b, 16));
    if (bytes.every((b) => b < 0xf7)) out[m[1]!] = bytes;
  }
  return out;
}

// ROM frame 49874, rows 121-135 (line 1's 15 glyph rows), x 16-34: the PK and MN glyphs and the space after them.
// w = text colour, s = shadow, . = window background.
const ROM_PKMN_SPACE_PIXELS = [
  "...................",
  "wwws....ws.ws......",
  "wsws....wwwws......",
  "wsws....wssws......",
  "wwws....ws.ws......",
  "wsss....ws.ws......",
  "ws..w.wsws.ws.ws...",
  "ws..wswsws.ws.ws...",
  "ws..wswsws.wwsws...",
  "ss..wws.ss.wwsws...",
  "....wsws...wswws...",
  "....wsws...wswws...",
  "....wsws...wssws...",
  "....wsws...ws.ws...",
  "....s.ss...ss.ss...",
];

describe("pkm1: {PKMN} draws the ROM's PK MN glyph pair", () => {
  it("names the same glyph runs as charmap.txt", () => {
    expect(ROM_NAMED_GLYPH_CODES).toEqual(charmapNamedGlyphs());
    expect(ROM_NAMED_GLYPH_CODES.PKMN).toEqual([0x53, 0x54]);
  });

  it("expands only named glyph codes, one character per glyph, that every charmap resolves", () => {
    expect(expandRomGlyphCodes("{PKMN} BREEDER")).toBe("\uE053\uE054 BREEDER");
    expect(expandRomGlyphCodes("{B_TRAINER1_CLASS} {PKMN}{PAUSE_UNTIL_PRESS}")).toBe("{B_TRAINER1_CLASS} \uE053\uE054{PAUSE_UNTIL_PRESS}");
    expect(romGlyphChar(0x53)).toBe("\uE053");
    expect(() => romGlyphChar(0xf7)).toThrow();
    expect(codeForChar(charmap, "\uE0F7")).toBeUndefined();
    expect(codeForChar(new Map(), "\uE054")).toBe(0x54);
  });

  it("measures and encodes \"{PKMN} BREEDER\" as the ROM's glyphs", () => {
    const text = expandRomGlyphCodes("{PKMN} BREEDER");
    expect(codes(text)).toEqual([0x53, 0x54, 0x00, 0xbc, 0xcc, 0xbf, 0xbf, 0xbe, 0xbf, 0xcc]);
    // gFontNormalLatinGlyphWidths: PK 8, MN 8, space 3. On the ROM frame "B" starts at x 35 = 16 + 19 (it was 49 = 16 + 33).
    expect(measureText(font, charmap, expandRomGlyphCodes("{PKMN} "))).toBe(19);
    expect(measureText(font, charmap, text)).toBe(61);
    expect(text.length).toBe(10);
  });

  it("gives every {PKMN} trainer class its glyph pair (24 Factory trainers: 12 PKMN BREEDER, 12 PKMN RANGER)", () => {
    const classes = (facilityClassLookupsData as unknown as {
      entries: { facilityClass: { id: number }; trainerClass: { displayName: string } }[];
    }).entries;
    const pkmnClassIds = new Set(classes.filter((c) => c.trainerClass.displayName.includes("{PKMN}")).map((c) => c.facilityClass.id));
    const trainers = (frontierTrainersData as unknown as { entries: { id: number; facilityClass: { id: number } }[] }).entries;
    const names = new Set<string>();
    let count = 0;
    for (const trainer of trainers.filter((t) => pkmnClassIds.has(t.facilityClass.id))) {
      const className = getFactoryTrainerPresentation(trainer.id).className;
      expect(className).not.toMatch(/[{}]/);
      expect(className.startsWith("\uE053\uE054 ")).toBe(true);
      names.add(className);
      count += 1;
    }
    // {PKMN} TRAINER (Brendan, May, Wally, ...) has no row in the Factory's 300 trainers.
    expect(count).toBe(24);
    expect([...names].sort()).toEqual(["\uE053\uE054 BREEDER", "\uE053\uE054 RANGER"]);
    expect(expandRomGlyphCodes("{PKMN} TRAINER")).toBe("\uE053\uE054 TRAINER");
  });

  it("expands a battle string's named glyph control ({POKEBLOCK}, STRINGID_THREWPOKEBLOCKATPKMN) like any other source string", () => {
    const lines = resolveBattleStringLines("STRINGID_THREWPOKEBLOCKATPKMN", { B_PLAYER_NAME: () => "BRENDAN", B_OPPONENT_MON1_NAME: () => "ODDISH" });
    expect(lines).toEqual(["BRENDAN threw a \uE055\uE056\uE057\uE058\uE059", "at the ODDISH!"]);
  });

  it("prints \"PKMN BREEDER RAFAEL sent / out WAILMER!\" like ROM frame 49874", () => {
    const rafael = getFactoryTrainerPresentationByName("RAFAEL");
    const line1 = `${rafael.className} ${rafael.name} sent`;
    const line2 = "out WAILMER!";
    // One glyph per printed frame: 22 + 12 (the brace code made it 26 + 12).
    expect(battleStringPrintableLength([line1, line2])).toBe(34);
    expect(codes(line1).slice(0, 3)).toEqual([0x53, 0x54, 0x00]);

    const fb = createFramebuffer();
    drawBattleMessageTextLines(fb, line1, line2, 34);
    const color = (i: number) => MESSAGE_PALETTE[i]!;
    const role = (x: number, y: number) => {
      const o = (y * SCREEN_WIDTH + x) * 4;
      const [r, g, b, a] = [fb[o]!, fb[o + 1]!, fb[o + 2]!, fb[o + 3]!];
      const is = (c: { r: number; g: number; b: number }) => a !== 0 && c.r === r && c.g === g && c.b === b;
      if (a === 0 || is(color(MESSAGE_TEXT_COLORS.bg))) return ".";
      if (is(color(MESSAGE_TEXT_COLORS.fg))) return "w";
      if (is(color(MESSAGE_TEXT_COLORS.shadow))) return "s";
      return "?";
    };
    const rows = ROM_PKMN_SPACE_PIXELS.map((_, i) => Array.from({ length: 19 }, (_, dx) => role(16 + dx, 121 + i)).join(""));
    expect(rows).toEqual(ROM_PKMN_SPACE_PIXELS);

    // Ink extents on the ROM frame: line 1 x 16-142, line 2 x 16-81.
    const inkColumns = (y0: number) => {
      const xs: number[] = [];
      for (let x = 0; x < SCREEN_WIDTH; x += 1) {
        for (let y = y0; y < y0 + 15; y += 1) if (role(x, y) !== ".") { xs.push(x); break; }
      }
      return [Math.min(...xs), Math.max(...xs)];
    };
    expect(inkColumns(121)).toEqual([16, 142]);
    expect(inkColumns(137)).toEqual([16, 81]);
  });
});
