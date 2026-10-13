// stp128 (docs/stp128-status-condition-render-prep.md): the prototype comparator. Per committed ROM window (rom-windows.json; raw frames
// from stp128NpzToRaw.py, rows rel -2 .. E + 3) the reducer's DISPLAY row (src/animation/statusConditionAnimations.ts
// statusConditionDisplayRow) is composed with EXISTING production drawing helpers / assets:
//   - field: battleScene.ts drawTileBg(battleBg.static) + battleCommandFieldArt.ts createBattleCommandFieldArtView /
//     battleCommandFieldSpriteOrigin (both leads, drawSpriteSheet), the elevated-opponent shadow from src/assets/gen/battle-enemy-shadow.json
//     at the source singles placement (176, 40 + 29) as stat102 / battleScene.ts drawSourceOpponentEnemyShadow;
//   - sprites: ghost (src/animation/assets/curse.json ghost), devil (lovely-kiss.json devil, frame 0), duck (dizzyPunch.json duck, the
//     reducer's tile frame + hFlip); priority 3 behind the battlers, 1 / 2 in front; blended OBJ with the reducer's EVA / EVB through
//     production's drawSpriteSheetBlendedOverFb ("helper") and the hardware 5-bit blend ("gba").
// Transplant (scd112): C(rel) = ROM(rel -1) except where P(rel) != P_ord (the same field with no effect: battler at its idle offset,
// shadow shown, no sprites), where it is P(rel). C == ROM(rel) needs every pixel the animation changes to be right. Rows rel -1 .. E + 2
// (release + 1) are scored; E + 3 (release + 2) is reported apart (the next instruction may print there). Full screen and the affected
// rect (the union of the production change mask and the ROM's own change bbox over the window).
//   node --experimental-strip-types --no-warnings tools/integration/stp128Compare.ts <raw-dir> <out.json> [--neg=age+1|no-shake|wrong-side|no-rotation|lag-swap] [--blend=helper|gba] [--no-healthbox] [--only=<key substring>]   (--no-healthbox drops all three occluders)
import { readFileSync, writeFileSync } from "node:fs";
import {
  battleBg, battleWindow, drawComposedPlayerHealthbox, drawOpponentHealthboxWobble, drawSpriteSheet, drawSpriteSheetBlendedOverFb, drawTileBg,
  onixPlayerHealthboxContent, setPixel,
} from "../../src/engine/battleScene.ts";
import { battleCommandFieldSpriteOrigin, createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import {
  statusConditionDisplayRow, statusConditionSpan, type StatusConditionAnimation, type StatusConditionDisplaySprite, type StatusConditionOptions,
  type StatusConditionTarget,
} from "../../src/animation/statusConditionAnimations.ts";

const args = process.argv.slice(2);
const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const blendMode = args.find((a) => a.startsWith("--blend="))?.slice(8) ?? "helper";
const noHealthbox = args.includes("--no-healthbox");
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const [rawDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string];
const F = "tools/integration/fixtures/stp128";
const rom = JSON.parse(readFileSync(`${F}/rom-windows.json`, "utf8")) as { windows: Record<string, any> };
const shadow = JSON.parse(readFileSync("src/assets/gen/battle-enemy-shadow.json", "utf8")) as {
  width: number; height: number; mask: number[]; color: { r: number; g: number; b: number }; elevatedSpecies: string[];
};
const curse = JSON.parse(readFileSync("src/animation/assets/curse.json", "utf8"));
const lovelyKiss = JSON.parse(readFileSync("src/animation/assets/lovely-kiss.json", "utf8"));
const dizzy = JSON.parse(readFileSync("src/animation/assets/dizzyPunch.json", "utf8"));
// production's ice cube (battleScene.ts battleAnimIceCube, Move_SHEER_COLD): the four sFrozenIceCubeSubsprites pieces + palette
const iceCube = JSON.parse(readFileSync("src/assets/gen/battle-anim-ice-cube.json", "utf8")) as {
  palette: { r: number; g: number; b: number }[]; pieces: { x: number; y: number; tileset: any }[];
};
type Tileset = { columns: number; rows: number; tiles: number[][] };
type Rgb = { r: number; g: number; b: number };
const FRAME = 240 * 160 * 3;
const exp5 = (c: number) => (c << 3) | (c >> 2);
const sub = (ts: Tileset, first: number, columns: number, rows: number): Tileset => ({ columns, rows, tiles: ts.tiles.slice(first, first + columns * rows) });
const hflip = (ts: Tileset): Tileset => {
  const tiles: number[][] = [];
  for (let ty = 0; ty < ts.rows; ty++) for (let tx = 0; tx < ts.columns; tx++) {
    const t = ts.tiles[ty * ts.columns + (ts.columns - 1 - tx)]!;
    tiles.push(Array.from({ length: 64 }, (_, i) => t[(i >> 3) * 8 + (7 - (i & 7))]!));
  }
  return { columns: ts.columns, rows: ts.rows, tiles };
};
const ART: Record<Exclude<StatusConditionDisplaySprite["template"], "sFrozenIceCubeSpriteTemplate">, { tileset: Tileset; palette: Rgb[] }> = {
  gCurseGhostSpriteTemplate: { tileset: curse.ghost.tileset, palette: curse.ghost.palette },
  gNightmareDevilSpriteTemplate: { tileset: sub(lovelyKiss.devil.tileset, 0, 4, 4), palette: lovelyKiss.devil.palette },
  gConfusionDuckSpriteTemplate: { tileset: dizzy.duck.tileset, palette: dizzy.duck.palette },
};

function drawSprite(fb: Uint8Array, s: StatusConditionDisplaySprite, paletteRotation: number): void {
  if (s.template === "sFrozenIceCubeSpriteTemplate") {
    // as battleScene.ts's SHEER_COLD body: entries 13..15 rotated left `paletteRotation` times, each piece blended (helper)
    if (!s.blend || s.blend.eva === 0) return;
    const palette = iceCube.palette.slice();
    for (let i = 0; i < 3; i++) palette[13 + i] = iceCube.palette[13 + ((i + paletteRotation) % 3)]!;
    for (const piece of iceCube.pieces) {
      drawSpriteSheetBlendedOverFb(fb, piece.tileset, palette as any, s.left + piece.x, s.top + piece.y, s.blend.eva, s.blend.evb);
    }
    return;
  }
  const art = ART[s.template];
  let ts = s.size === 16 ? sub(art.tileset, s.tileOffset, 2, 2) : art.tileset;
  if (s.hFlip) ts = hflip(ts);
  if (!s.blend) return drawSpriteSheet(fb, ts as any, art.palette as any, s.left, s.top);
  if (blendMode === "helper") return drawSpriteSheetBlendedOverFb(fb, ts as any, art.palette as any, s.left, s.top, s.blend.eva, s.blend.evb);
  const eva = Math.min(16, s.blend.eva), evb = Math.min(16, s.blend.evb);
  for (let ty = 0; ty < ts.rows; ty++) for (let tx = 0; tx < ts.columns; tx++) {
    const t = ts.tiles[ty * ts.columns + tx]!;
    for (let p = 0; p < 64; p++) {
      if (!t[p]) continue;
      const x = s.left + tx * 8 + (p & 7), y = s.top + ty * 8 + (p >> 3);
      if (x < 0 || x >= 240 || y < 0 || y >= 160) continue;
      const c = art.palette[t[p]!]!, o = (y * 240 + x) * 4;
      fb[o] = exp5(Math.min(31, ((c.r >> 3) * eva + (fb[o]! >> 3) * evb) >> 4));
      fb[o + 1] = exp5(Math.min(31, ((c.g >> 3) * eva + (fb[o + 1]! >> 3) * evb) >> 4));
      fb[o + 2] = exp5(Math.min(31, ((c.b >> 3) * eva + (fb[o + 2]! >> 3) * evb) >> 4));
    }
  }
}

const result: Record<string, unknown> = {};
let total = 0, clean = 0;
for (const [key, w] of Object.entries(rom.windows)) {
  if (only && !key.includes(only)) continue;
  const animation = w.animation as StatusConditionAnimation;
  // FRZ: the frozen-turn windows lose one row in loadspritegfx (E 116); after Ice Beam they do not (E 115)
  const romLag = w.E === 116 ? 1 : 0;
  const options: StatusConditionOptions = animation === "FRZ" ? { freezeLoadLagRows: (neg === "lag-swap" ? 1 - romLag : romLag) as 0 | 1 } : {};
  const scenario = JSON.parse(readFileSync(`${F}/scenarios/${w.scenario}`, "utf8"));
  const species = { player: scenario.overrides.parties.player[0].species, opponent: scenario.overrides.parties.opponent[0].species };
  const view = createBattleCommandFieldArtView({ player: { species: species.player }, opponent: { species: species.opponent } } as any) as any;
  const side = w.side as "player" | "opponent";
  const other = side === "player" ? "opponent" : "player";
  const first = w.rows.find((r: any) => r.sprites.length).sprites[0];
  const before = w.rows[0];
  const target: StatusConditionTarget = { side, spriteX: before.bat[0], spriteY: before.bat[1], animX: first[0] + (animation === "FRZ" ? 32 : 0),
    animY: first[1] + (animation === "CONFUSION" ? 15 : animation === "FRZ" ? 36 : 0), idleX2: before.bat[2] };
  const motionTarget: StatusConditionTarget = neg === "wrong-side" ? { ...target, side: other } : target;
  const originT = battleCommandFieldSpriteOrigin(view[side], side), originO = battleCommandFieldSpriteOrigin(view[other], other);
  const elevated = shadow.elevatedSpecies.includes(`SPECIES_${view.opponent.speciesSymbol}`);
  const raw = readFileSync(`${rawDir}/${key}.rgb`);
  const frameAt = (rel: number) => raw.subarray((rel + 2) * FRAME, (rel + 3) * FRAME);
  const base = frameAt(-1);
  const E = statusConditionSpan(animation, options).activeRows;
  const paint = (offset: { x: number; y: number }, sprites: readonly StatusConditionDisplaySprite[], shadowShown: boolean, rotation = 0) => {
    const fb = new Uint8Array(240 * 160 * 4);
    drawTileBg(fb, battleBg.static.tileset, battleBg.static.tilemap, battleBg.palette);
    if (shadowShown) {
      const sx = 176 - shadow.width / 2, sy = 40 + 29 - shadow.height / 2;
      for (const p of shadow.mask) setPixel(fb, sx + (p % shadow.width), sy + Math.floor(p / shadow.width), shadow.color);
    }
    for (const s of sprites) if (s.priority === 3) drawSprite(fb, s, rotation);
    drawSpriteSheet(fb, view[other].pic.tileset, view[other].pic.palette, originO.x + w.rows[0].other[2], originO.y + w.rows[0].other[3]);
    drawSpriteSheet(fb, view[side].pic.tileset, view[side].pic.palette, originT.x + offset.x, originT.y + offset.y);
    for (const s of sprites) if (s.priority !== 3) drawSprite(fb, s, rotation);
    // occluders in front of every status sprite, drawn in P and P_ord alike (only their opaque footprint matters: C keeps the ROM's
    // own pixels there): the healthbox OBJs (priority 1) and the battle message window (BG0, priority 0, y 112..159)
    if (!noHealthbox) {
      drawOpponentHealthboxWobble(fb, 0);
      drawComposedPlayerHealthbox(fb, onixPlayerHealthboxContent);
      drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
    }
    return fb;
  };
  const ord = paint({ x: target.idleX2 ?? 0, y: 0 }, [], elevated);
  const perRow: [number, number, number][] = [];
  const composed: Uint8Array[] = [];
  const mask = new Uint8Array(240 * 160);
  for (const r of w.rows) {
    if (r.rel < -1) continue;
    const d = statusConditionDisplayRow(animation, neg === "age+1" ? r.rel + 1 : r.rel, motionTarget, options);
    const offset = neg === "no-shake" ? { x: target.idleX2 ?? 0, y: 0 } : d.battlerOffset;
    const p = paint(offset, d.sprites, elevated && !d.enemyShadowHidden, neg === "no-rotation" ? 0 : d.objPaletteRotation);
    const c = new Uint8Array(base);
    for (let i = 0; i < 240 * 160; i++) {
      if (p[i * 4] !== ord[i * 4] || p[i * 4 + 1] !== ord[i * 4 + 1] || p[i * 4 + 2] !== ord[i * 4 + 2]) {
        c[i * 3] = p[i * 4]!; c[i * 3 + 1] = p[i * 4 + 1]!; c[i * 3 + 2] = p[i * 4 + 2]!; mask[i] = 1;
      }
    }
    composed.push(c);
    if (r.d && r.d[0]) for (let y = r.d[2]; y <= r.d[4]; y++) for (let x = r.d[1]; x <= r.d[3]; x++) mask[y * 240 + x] = 1;
  }
  let x0 = 240, y0 = 160, x1 = -1, y1 = -1;
  for (let i = 0; i < 240 * 160; i++) if (mask[i]) { const x = i % 240, y = Math.floor(i / 240); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  let fullPx = 0, rectPx = 0, badRows = 0, rows = 0;
  const bad: number[] = [];
  let afterWindow: { rel: number; fullPx: number; rectPx: number } | null = null;
  w.rows.filter((r: any) => r.rel >= -1).forEach((r: any, i: number) => {
    const c = composed[i]!, f = frameAt(r.rel);
    let full = 0, rect = 0, bx0 = 240, by0 = 160, bx1 = -1, by1 = -1;
    for (let k = 0; k < 240 * 160; k++) {
      if (c[k * 3] !== f[k * 3] || c[k * 3 + 1] !== f[k * 3 + 1] || c[k * 3 + 2] !== f[k * 3 + 2]) {
        full++;
        const x = k % 240, y = Math.floor(k / 240);
        bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y);
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) rect++;
      }
    }
    if (r.rel > E + 2) { afterWindow = { rel: r.rel, fullPx: full, rectPx: rect }; return; }
    rows++; fullPx += full; rectPx += rect;
    perRow.push([r.rel, full, rect, ...(full ? [bx0, by0, bx1, by1] : [])] as any);
    if (full) { badRows++; bad.push(r.rel); }
  });
  total++;
  if (fullPx === 0) clean++;
  result[key] = { animation, side, species, elevatedOpponentShadow: elevated, target, rect: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], rows, fullPx, rectPx,
    badRows, badRels: bad.slice(0, 12), afterWindow, perRowBad: perRow.filter((p) => p[1]).slice(0, 12),
    productionCorner: originT, romCorner: { x: target.spriteX - 32, y: target.spriteY - 32 } };
  console.log(key, animation, side, `rows ${rows} fullPx ${fullPx} rectPx ${rectPx} badRows ${badRows}`, bad.slice(0, 8).join(","));
}
writeFileSync(outPath, JSON.stringify({ schema: "stp128-compare/v1", neg: neg ?? null, blend: blendMode, windows: total, cleanWindows: clean, result }, null, 1) + "\n");
console.log(`windows ${total}, 0 px ${clean}`);
