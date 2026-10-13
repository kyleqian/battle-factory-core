// stq132 (docs/stq132-status-condition-render-prep.md): the prototype comparator, stp128Compare.ts's transplant for the single-template
// particle animations. Per committed ROM window (rom-windows.json; raw frames from stq132NpzToRaw.py, rows rel -2 .. E + 3) the reducer's
// DISPLAY row (src/animation/statusConditionAnimations.ts statusAnimationDisplayRow) is composed with EXISTING production drawing helpers /
// assets:
//   - field: battleScene.ts drawTileBg(battleBg.static) + battleCommandFieldArt.ts createBattleCommandFieldArtView /
//     battleCommandFieldSpriteOrigin (both leads at their idle x2 / y2, drawSpriteSheet), the elevated-opponent shadow
//     (src/assets/gen/battle-enemy-shadow.json at the source singles placement (176, 40 + 29)) unless `enemyShadowHidden`;
//   - sprites (all priority 2, in front of the battlers, behind the healthboxes / message window):
//       letter Z: src/animation/assets/rest.json letterZ through drawSpriteSheetAffineRotate (Move_REST's helper; centre = left / top + 16,
//         the reducer's matrix, no double-size box);
//       burn flame: src/assets/gen/battle-anim-small-ember.json, the 32x32 frame at the reducer's tileOffset, drawSpriteSheet (Fire Punch);
//       heart: src/animation/assets/charm.json magentaHeart, drawSpriteSheet (Move_CHARM).
// Transplant (stp128 / scd112): C(rel) = ROM(rel -1) except where P(rel) != P_ord (the same field with no effect: shadow shown, no sprites),
// where it is P(rel). Rows rel -1 .. E + 2 (release + 1) are scored; E + 3 is reported apart. Full screen and the affected rect.
//   node --experimental-strip-types --no-warnings tools/integration/stq132Compare.ts <raw-dir> <out.json> [--neg=age+1|wrong-side|drop-one|no-affine|tie-swap|index-order] [--no-healthbox] [--only=<key substring>]
import { readFileSync, writeFileSync } from "node:fs";
import {
  battleBg, battleWindow, drawComposedPlayerHealthbox, drawOpponentHealthboxWobble, drawSpriteSheet, drawSpriteSheetAffineRotate, drawTileBg,
  onixPlayerHealthboxContent, setPixel,
} from "../../src/engine/battleScene.ts";
import { battleCommandFieldSpriteOrigin, createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import {
  statusAnimationDisplayRow, statusAnimationSpan, statusConditionTarget, type StatusConditionDisplaySprite, type StatusParticleAnimation,
} from "../../src/animation/statusConditionAnimations.ts";

const args = process.argv.slice(2);
const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const noHealthbox = args.includes("--no-healthbox");
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const [rawDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string];
const F = "tools/integration/fixtures/stq132";
const rom = JSON.parse(readFileSync(`${F}/rom-windows.json`, "utf8")) as { windows: Record<string, any> };
const shadow = JSON.parse(readFileSync("src/assets/gen/battle-enemy-shadow.json", "utf8")) as {
  width: number; height: number; mask: number[]; color: { r: number; g: number; b: number }; elevatedSpecies: string[];
};
const rest = JSON.parse(readFileSync("src/animation/assets/rest.json", "utf8"));
const charm = JSON.parse(readFileSync("src/animation/assets/charm.json", "utf8"));
const ember = JSON.parse(readFileSync("src/assets/gen/battle-anim-small-ember.json", "utf8"));
type Tileset = { columns: number; rows: number; tiles: number[][] };
const FRAME = 240 * 160 * 3;
const sub = (ts: Tileset, first: number, columns: number, rows: number): Tileset => ({ columns, rows, tiles: ts.tiles.slice(first, first + columns * rows) });

function drawSprite(fb: Uint8Array, s: StatusConditionDisplaySprite): void {
  if (s.template === "gSleepLetterZSpriteTemplate") {
    const m = neg === "no-affine" ? { a: 256, b: 0, c: 0, d: 256 } : s.affine!;
    drawSpriteSheetAffineRotate(fb, rest.letterZ.tileset, rest.letterZ.palette, s.left + 16, s.top + 16, m.a, m.b, m.c, m.d, undefined, false);
  } else if (s.template === "gBurnFlameSpriteTemplate") {
    drawSpriteSheet(fb, sub(ember.tileset, s.tileOffset, 4, 4) as any, ember.palette, s.left, s.top);
  } else if (s.template === "gMagentaHeartSpriteTemplate") {
    drawSpriteSheet(fb, charm.magentaHeart.tileset, charm.magentaHeart.palette, s.left, s.top);
  } else {
    throw new Error(`stq132Compare: unexpected template ${s.template}`);
  }
}

const result: Record<string, unknown> = {};
let total = 0, clean = 0;
for (const [key, w] of Object.entries(rom.windows)) {
  if (only && !key.includes(only)) continue;
  const animation = w.animation as StatusParticleAnimation;
  const scenario = JSON.parse(readFileSync(`${F}/scenarios/${w.scenario}`, "utf8"));
  const species = { player: scenario.overrides.parties.player[0].species, opponent: scenario.overrides.parties.opponent[0].species };
  const view = createBattleCommandFieldArtView({ player: { species: species.player }, opponent: { species: species.opponent } } as any) as any;
  const side = w.side as "player" | "opponent";
  const other = side === "player" ? "opponent" : "player";
  const before = w.rows[0];
  // geometry from the battler sprite alone (the reducer test's rule)
  const target = statusConditionTarget(side, before.bat[0], before.bat[1], before.bat[2]);
  const motionTarget = neg === "wrong-side" ? statusConditionTarget(other, before.bat[0], before.bat[1], before.bat[2]) : target;
  const originT = battleCommandFieldSpriteOrigin(view[side], side), originO = battleCommandFieldSpriteOrigin(view[other], other);
  const elevated = shadow.elevatedSpecies.includes(`SPECIES_${view.opponent.speciesSymbol}`);
  const raw = readFileSync(`${rawDir}/${key}.rgb`);
  const frameAt = (rel: number) => raw.subarray((rel + 2) * FRAME, (rel + 3) * FRAME);
  const base = frameAt(-1);
  const E = statusAnimationSpan(animation).activeRows;
  const paint = (offset: { x: number; y: number }, sprites: readonly StatusConditionDisplaySprite[], shadowShown: boolean) => {
    const fb = new Uint8Array(240 * 160 * 4);
    drawTileBg(fb, battleBg.static.tileset, battleBg.static.tilemap, battleBg.palette);
    if (shadowShown) {
      const sx = 176 - shadow.width / 2, sy = 40 + 29 - shadow.height / 2;
      for (const p of shadow.mask) setPixel(fb, sx + (p % shadow.width), sy + Math.floor(p / shadow.width), shadow.color);
    }
    for (const s of sprites) if (s.priority === 3) drawSprite(fb, s);
    drawSpriteSheet(fb, view[other].pic.tileset, view[other].pic.palette, originO.x + before.other[2], originO.y + before.other[3]);
    drawSpriteSheet(fb, view[side].pic.tileset, view[side].pic.palette, originT.x + offset.x, originT.y + offset.y);
    for (const s of sprites) if (s.priority !== 3) drawSprite(fb, s);
    // occluders in front of every status sprite (opaque footprint only: C keeps the ROM's own pixels there): the healthbox OBJs
    // (priority 1) and the battle message window (BG0, priority 0, y 112..159)
    if (!noHealthbox) {
      drawOpponentHealthboxWobble(fb, 0);
      drawComposedPlayerHealthbox(fb, onixPlayerHealthboxContent);
      drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
    }
    return fb;
  };
  const ord = paint({ x: target.idleX2 ?? 0, y: 0 }, [], elevated);
  const perRow: number[][] = [];
  const composed: Uint8Array[] = [];
  const mask = new Uint8Array(240 * 160);
  for (const r of w.rows) {
    if (r.rel < -1) continue;
    const d = statusAnimationDisplayRow(animation, neg === "age+1" ? r.rel + 1 : r.rel, motionTarget);
    let sprites = d.sprites;
    if (neg === "drop-one") sprites = sprites.filter((s) => s.index !== 1);
    if (neg === "tie-swap") sprites = sprites.slice().reverse();
    // creation order only (no SortSprites y rule): the later sprite in front
    if (neg === "index-order") sprites = sprites.slice().sort((a, b) => a.index - b.index);
    const p = paint(d.battlerOffset, sprites, elevated && !d.enemyShadowHidden);
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
    perRow.push([r.rel, full, rect, ...(full ? [bx0, by0, bx1, by1] : [])]);
    if (full) { badRows++; bad.push(r.rel); }
  });
  total++;
  if (fullPx === 0) clean++;
  result[key] = { animation, side, species, elevatedOpponentShadow: elevated, target, rect: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], rows, fullPx, rectPx,
    badRows, badRels: bad.slice(0, 12), afterWindow, perRowBad: perRow.filter((p) => p[1]).slice(0, 12),
    productionCorner: originT, romCorner: { x: target.spriteX - 32, y: target.spriteY - 32 } };
  console.log(key, animation, side, `rows ${rows} fullPx ${fullPx} rectPx ${rectPx} badRows ${badRows}`, bad.slice(0, 8).join(","));
}
writeFileSync(outPath, JSON.stringify({ schema: "stq132-compare/v1", neg: neg ?? null, windows: total, cleanWindows: clean, result }, null, 1) + "\n");
console.log(`windows ${total}, 0 px ${clean}`);
