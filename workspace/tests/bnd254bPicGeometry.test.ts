// bnd254b: the tick path reads pic geometry and palettes from small generated tables, not from the sprite pixel JSON
// (docs/bnd254b-pic-geometry.md). Exhaustive old-read vs new-read equality over every species and side, plus the
// Substitute doll and the CASTFORM forms, and a static ratchet on the tick-path modules.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { backSprites, frontSprites } from "./helpers/battleSprites.ts";
import castformForms from "../src/assets/gen/castform-forms.json" with { type: "json" };
import picGeometry from "../src/assets/gen/battle-pic-geometry.json" with { type: "json" };
import substituteDoll from "../src/animation/assets/substitute.json" with { type: "json" };
import speciesAsset from "../src/data/gen/species-stats.json" with { type: "json" };
import { createBattleCommandFieldArtView, type BattleCommandMonPicTileset } from "../src/engine/battleCommandFieldArt.ts";
import { liveFieldArtTopLine } from "../src/engine/liveMoveAnimation.ts";
import { extractBattlePicGeometry } from "../tools/extract/extract-battle-pic-geometry.ts";

type Sheet = { tileset: BattleCommandMonPicTileset; palette: { r: number; g: number; b: number }[] };
const back = backSprites as unknown as Record<string, Sheet>;
const front = frontSprites as unknown as Record<string, Sheet>;
const species = (speciesAsset as { species: { id: number; name: string }[] }).species.map((s) => ({ id: s.id, symbol: s.name.replace(/^SPECIES_/, "") }));

// The pre-bnd254b reads, copied verbatim from liveFieldArtTopLine (liveMoveAnimation.ts) and the faint-timing rows read.
function oldTopLine(tileset: BattleCommandMonPicTileset, originY: number): number {
  const { columns, rows, tiles } = tileset;
  for (let y = 0; y < rows * 8; y++) {
    for (let x = 0; x < columns * 8; x++) if (tiles[(y >> 3) * columns + (x >> 3)]![(y & 7) * 8 + (x & 7)] !== 0) return originY + y;
  }
  return Number.POSITIVE_INFINITY;
}

describe("bnd254b pic geometry table", () => {
  it("battle-pic-geometry.json is exactly what the extractor derives from the pixel sources", () => {
    expect(picGeometry).toEqual(extractBattlePicGeometry(
      back as never, front as never, castformForms as never, substituteDoll as never));
    expect(Object.keys(picGeometry.back)).toHaveLength(376);
    expect(Object.keys(picGeometry.front)).toHaveLength(376);
    expect(picGeometry.castform).toHaveLength(4);
  });

  it("every species, both sides: the tick-path reads equal the old pixel-table reads", () => {
    let checked = 0;
    for (const { id, symbol } of species) {
      if (back[symbol] === undefined) continue;
      const view = createBattleCommandFieldArtView({ player: { species: id }, opponent: { species: id } } as never);
      for (const [side, sheet] of [["player", back[symbol]!], ["opponent", front[symbol]!]] as const) {
        const battler = view[side];
        expect(battler.picGeometry.rows, `${side} ${symbol} rows`).toBe(sheet.tileset.rows);
        expect(battler.picGeometry.columns, `${side} ${symbol} columns`).toBe(sheet.tileset.columns);
        expect(liveFieldArtTopLine(battler), `${side} ${symbol} top line`).toBe(oldTopLine(sheet.tileset, battler.origin.y));
        expect(battler.pic.palette, `${side} ${symbol} palette`).toEqual(sheet.palette);
        expect(battler.pic.tileset, `${side} ${symbol} tileset (render input)`).toBe(sheet.tileset);
        checked++;
      }
    }
    expect(checked).toBe(752);
  });

  it("Substitute doll and every CASTFORM form: same geometry as the sheet the battler actually draws", () => {
    const doll = createBattleCommandFieldArtView({ player: { species: 1, substituteDoll: true }, opponent: { species: 1, substituteDoll: true } } as never);
    expect(doll.player.picGeometry.rows).toBe(substituteDoll.back.rows);
    expect(liveFieldArtTopLine(doll.player)).toBe(oldTopLine(doll.player.pic.tileset, doll.player.origin.y));
    expect(liveFieldArtTopLine(doll.opponent)).toBe(oldTopLine(doll.opponent.pic.tileset, doll.opponent.origin.y));
    const castform = species.find((s) => s.symbol === "CASTFORM")!.id;
    for (const form of [1, 2, 3]) {
      const view = createBattleCommandFieldArtView({ player: { species: castform, castformForm: form }, opponent: { species: castform, castformForm: form } } as never);
      for (const side of ["player", "opponent"] as const) {
        expect(view[side].castformForm).toBe(form);
        expect(view[side].picGeometry.rows).toBe(view[side].pic.tileset.rows);
        expect(liveFieldArtTopLine(view[side]), `${side} form ${form}`).toBe(oldTopLine(view[side].pic.tileset, view[side].origin.y));
      }
    }
  });

  it("a transformed battler carries the copied species' geometry and a palette from the table", () => {
    const [src, dst] = [species.find((s) => s.symbol === "GROVYLE")!, species.find((s) => s.symbol === "SHUCKLE")!];
    const view = createBattleCommandFieldArtView({
      player: { species: src.id }, opponent: { species: src.id, transform: { species: dst.id, personality: 0 } } } as never);
    expect(view.opponent.picGeometry).toEqual(picGeometry.front.SHUCKLE);
    expect(liveFieldArtTopLine(view.opponent)).toBe(oldTopLine(front.SHUCKLE!.tileset, view.opponent.origin.y));
  });

  it("static ratchet: the tick-path modules do not name pic.tileset (pixels) at all", () => {
    for (const file of ["battleResolutionPresentation.ts", "liveMoveAnimation.ts", "liveMovePaletteComposite.ts", "battleResolutionPresentationRender.ts"]) {
      const text = readFileSync(`src/engine/${file}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(text, file).not.toMatch(/pic\.tileset|\.pic\s*\)?\.tileset|tileset\.tiles|battle-(back|opponent-front)-sprites/);
    }
  });
});
