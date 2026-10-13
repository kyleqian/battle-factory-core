// fps147 (docs/fps147-focus-punch-setup.md): the General_FocusPunchSetUp comparator. Per committed ROM window (fixtures/fps147/rom-windows.json;
// raw frames <raw-dir>/<stem>.rgb from fps147Probes.sh, window rows in order) two production-side frames per row:
//   reducer arm    src/animation/focusPunchSetUp.ts focusPunchSetUpDisplayRow composed with EXISTING production helpers / assets:
//                  battleScene.ts drawTileBg(battleBg.static) + battleCommandFieldArt.ts createBattleCommandFieldArtView /
//                  battleCommandFieldSpriteOrigin (both battlers, drawSpriteSheet), the attacker palette through paletteFade.ts
//                  blendComponentToward (RGB_RED), the Endure particles from src/animation/assets/focus-energy.json (frame * 4 tile rows,
//                  corner x - 8 / y - 16, drawn 9, 7, 5, 4, 3 in front of both battlers: the production Endure branch's order).
//   production arm the production Endure live body itself: liveMoveAnimationPresentation({ moveId ENDURE, attacker }, field, age = rel)
//                  + renderSceneOnMovePresentation(fb, state, liveField = true), i.e. what the landing gets by reusing that branch.
// Both draw the occluders the live view draws after the field (healthbox OBJs, the message window). Transplant (stp128 / scd112):
// C(rel) = ROM(rel -1) except where P(rel) != P_ord (the same arm with no effect: reducer = idle battler, Y 0, no sprites; production
// arm = its age 0), where it is P(rel). C == ROM(rel) needs every pixel the animation changes to be right. Scored rows: rel -4 (the
// empty box) .. 122 (the row before the focus message's first glyph), full screen; rows 123 .. 128 are scored with the message band
// (y >= 112, the print) reported apart.
//   node --experimental-strip-types --no-warnings tools/integration/fps147Compare.ts <raw-dir> <out.json> [--neg=age+1|wrong-side|no-shake|no-blend]
//     [--fixtures=<dir>]   (controls apply to the reducer arm; each must fail. --fixtures: a rebuilt fixture dir, fps147Run.sh)
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  battleBg, battleWindow, drawComposedPlayerHealthbox, drawOpponentHealthboxWobble, drawSpriteSheet, drawTileBg, onixPlayerHealthboxContent,
  renderSceneOnMovePresentation,
} from "../../src/engine/battleScene.ts";
import { battleCommandFieldSpriteOrigin, createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { blendComponentToward } from "../../src/engine/paletteFade.ts";
import { liveBattlerAnchors, liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { focusPunchSetUpDisplayRow, type FocusPunchSetUpDisplayRow } from "../../src/animation/focusPunchSetUp.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };

const args = process.argv.slice(2);
const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const [rawDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string];
const F = args.find((a) => a.startsWith("--fixtures="))?.slice(11) ?? "tools/integration/fixtures/fps147";
const FRAME = 240 * 160 * 3;
const BOX_Y = 112;
const FIRST_SCORED = -4, LAST_SCORED = 122;
const MOVE_ENDURE = 203;
const rom = JSON.parse(readFileSync(`${F}/rom-windows.json`, "utf8")) as { windows: Record<string, any> };
const focusEnergy = (JSON.parse(readFileSync("src/animation/assets/focus-energy.json", "utf8")) as any).focusEnergy as {
  tileset: { columns: number; rows: number; tiles: number[][] }; palette: { r: number; g: number; b: number }[];
};
type Side = "player" | "opponent";
const RED = { r: 255, g: 0, b: 0 };
const frameTiles = (frame: number) => ({ columns: focusEnergy.tileset.columns, rows: 4,
  tiles: focusEnergy.tileset.tiles.slice(frame * 4 * focusEnergy.tileset.columns, (frame + 1) * 4 * focusEnergy.tileset.columns) });
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const occlude = (fb: Uint8Array) => {
  drawOpponentHealthboxWobble(fb, 0);
  drawComposedPlayerHealthbox(fb, onixPlayerHealthboxContent);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
};

const result: Record<string, unknown> = {};
let total = 0, clean = 0, prodClean = 0;
const digest = createHash("sha256");
for (const [key, w] of Object.entries(rom.windows)) {
  const scenario = JSON.parse(readFileSync(`${F}/scenarios/${w.scenario}`, "utf8"));
  const parties = scenario.overrides.parties;
  const side = w.side as Side;
  const other: Side = side === "player" ? "opponent" : "player";
  const battler = w.battler as 0 | 1;
  const species = { player: parties.player[0].species as number, opponent: parties.opponent[0].species as number };
  const make = (b: 0 | 1, mon: any) => Object.freeze({
    species: mon.species as number, name: speciesName(mon.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender: mon.gender, status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, parties.player[0]), opponent: make(1, parties.opponent[0]) }) as any;
  const art = createBattleCommandFieldArtView(field) as any;
  const corner = { player: battleCommandFieldSpriteOrigin(art.player, "player"), opponent: battleCommandFieldSpriteOrigin(art.opponent, "opponent") };
  const rest = { player: liveBattlerAnchors("player", art).frontIdleRest.x2, opponent: liveBattlerAnchors("opponent", art).frontIdleRest.x2 };
  const coordOf = (s: Side) => liveBattlerAnchors(s, art).battlePositionCenter;
  const raw = readFileSync(`${rawDir}/${key}.rgb`);
  const firstRel = w.rows[0].rel as number;
  const frameAt = (rel: number) => raw.subarray((rel - firstRel) * FRAME, (rel - firstRel + 1) * FRAME);
  const base = frameAt(-1);

  // reducer arm
  const paint = (d: FocusPunchSetUpDisplayRow | null, animated: Side) => {
    const fb = new Uint8Array(240 * 160 * 4);
    drawTileBg(fb, battleBg.static.tileset, battleBg.static.tilemap, battleBg.palette);
    const drawBattler = (s: Side) => {
      const pic = art[s].pic;
      const on = d !== null && s === animated;
      const palette = on && d.attackerPaletteY > 0
        ? pic.palette.map((c: any) => ({ r: blendComponentToward(c.r, RED.r, d.attackerPaletteY),
          g: blendComponentToward(c.g, RED.g, d.attackerPaletteY), b: blendComponentToward(c.b, RED.b, d.attackerPaletteY) }))
        : pic.palette;
      drawSpriteSheet(fb, pic.tileset, palette, corner[s].x + rest[s] + (on ? d.attackerX2 : 0), corner[s].y);
    };
    // production's Endure branch: the opponent-side attacker first, then the player-side battler
    drawBattler("opponent");
    drawBattler("player");
    if (d !== null) {
      for (const slot of [9, 7, 5, 4, 3]) {
        const s = d.sprites.find((x) => x.oamSlot === slot);
        if (s) drawSpriteSheet(fb, frameTiles(s.frame) as any, focusEnergy.palette as any, s.x - 8, s.y - 16);
      }
    }
    occlude(fb);
    return fb;
  };
  const motionSide: Side = neg === "wrong-side" ? other : side;
  const displayAt = (rel: number) => {
    const d = focusPunchSetUpDisplayRow(neg === "age+1" ? rel + 1 : rel, motionSide, coordOf(motionSide));
    return neg === "no-shake" ? { ...d, attackerX2: 0 } : neg === "no-blend" ? { ...d, attackerPaletteY: 0 } : d;
  };
  const ord = paint(null, side);

  // production arm
  const request = { moveId: MOVE_ENDURE, attacker: battler, target: (1 - battler) as 0 | 1, turn: 1, power: 0, damage: 0, friendship: 70, multihit: 0 };
  const prodAt = (age: number) => {
    const fb = new Uint8Array(240 * 160 * 4);
    const state = liveMoveAnimationPresentation(request, field, age);
    if (state === null) throw new Error(`${key}: production declines ENDURE at age ${age}`);
    renderSceneOnMovePresentation(fb, state, true);
    occlude(fb);
    return fb;
  };
  const prodOrd = prodAt(0);

  const compose = (p: Uint8Array, o: Uint8Array) => {
    const c = new Uint8Array(base);
    for (let i = 0; i < 240 * 160; i++) {
      if (p[i * 4] !== o[i * 4] || p[i * 4 + 1] !== o[i * 4 + 1] || p[i * 4 + 2] !== o[i * 4 + 2]) {
        c[i * 3] = p[i * 4]!; c[i * 3 + 1] = p[i * 4 + 1]!; c[i * 3 + 2] = p[i * 4 + 2]!;
      }
    }
    return c;
  };
  const score = (c: Uint8Array, f: Uint8Array) => {
    let full = 0, band = 0;
    for (let k = 0; k < 240 * 160; k++) {
      if (c[k * 3] !== f[k * 3] || c[k * 3 + 1] !== f[k * 3 + 1] || c[k * 3 + 2] !== f[k * 3 + 2]) {
        full++;
        if (Math.floor(k / 240) >= BOX_Y) band++;
      }
    }
    return { full, band };
  };
  let px = 0, prodPx = 0, animPx = 0, rows = 0, tailPx = 0, tailBand = 0, prodTailPx = 0;
  const perRow: [number, number, number][] = [];
  const reducerSha: string[] = [];
  for (const r of w.rows) {
    if (r.rel < FIRST_SCORED) continue;
    const f = frameAt(r.rel);
    const p = paint(displayAt(r.rel), motionSide);
    reducerSha.push(sha(p));
    const a = score(compose(p, ord), f);
    const b = neg ? { full: 0, band: 0 } : score(compose(prodAt(r.rel), prodOrd), f);
    if (r.rel <= LAST_SCORED) {
      rows++; px += a.full; prodPx += b.full;
      if (r.rel >= 0 && r.rel < 120) animPx += a.full;
      perRow.push([r.rel, a.full, b.full]);
    } else {
      tailPx += a.full - a.band; tailBand += a.band; prodTailPx += b.full - b.band;
    }
  }
  total++;
  if (px === 0 && tailPx === 0) clean++;
  if (prodPx === 0 && prodTailPx === 0) prodClean++;
  digest.update(`${key}:${JSON.stringify(perRow)}\n`);
  result[key] = {
    side, species: { player: speciesName(species.player), opponent: speciesName(species.opponent) }, R: w.R,
    attackerCoord: coordOf(side), productionCorner: corner[side], idleRest: rest,
    scoredRows: { first: FIRST_SCORED, last: LAST_SCORED, count: rows }, reducerPx: px, animationRowsPx: animPx,
    productionEndurePx: neg ? null : prodPx, afterRows: { rels: [LAST_SCORED + 1, w.rows.at(-1).rel], px: tailPx, messageBandPx: tailBand,
      productionPx: neg ? null : prodTailPx },
    badRows: perRow.filter((x) => x[1] || x[2]).slice(0, 12), reducerFrameDigest: sha(new TextEncoder().encode(reducerSha.join(""))),
  };
  console.log(key, side, `rows ${rows}: reducer ${px} px (animation rows ${animPx}), production Endure ${neg ? "-" : prodPx} px; after ${tailPx} px (+ band ${tailBand})`);
}
const summary = { neg: neg ?? null, windows: total, reducerZeroPxWindows: clean, productionEndureZeroPxWindows: neg ? null : prodClean,
  perRowDigest: digest.digest("hex").slice(0, 16) };
writeFileSync(outPath, JSON.stringify({ schema: "fps147-compare/v1", summary, result }, null, 1) + "\n");
console.log(JSON.stringify(summary));
