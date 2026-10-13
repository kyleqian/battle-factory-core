// sae135 (S10A, ISSUES #168 slice SA5, docs/sae135-status-animation-render-3.md): stq132's 37 dense SLP / BRN / INFATUATION ROM windows
// (direct mGBA, Scene ON, r1 == r2; raw frames from stq132NpzToRaw.py, rows rel -2 .. E + 3) compared THROUGH THE PRODUCTION RENDER PATH
// (sae135Windows.ts: createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView). Frame mapping: status-animation
// command age a == ROM rel a (rel 0 = the first gAnimScriptActive row = sar131's row X + 1).
//
// sar131ProductionCompare.ts's transplant: C(a) = ROM(rel -1) except where P(a) != R(a) (R = production's frame without the effect,
// sae135Windows.ts `reference`), where it is P(a). Full screen, rows a = -1 .. minimumFrames + 1 (activation - 1 .. release + 2); on the
// next command's rows (a >= minimumFrames) the message box band (y >= 112: the next instruction's print) is reported apart.
//   node --experimental-strip-types --no-warnings tools/integration/sae135ProductionCompare.ts <raw-dir> <out.json>
//     [--neg=age+1|wrong-side|drop-one|rest-y|redraw] [--diag=ordinary-rest] [--only=<key substring>]   (controls; must fail)
// The next command's rows are ordinary message rows; production draws the opponent there without its idle rest (sar131 §6: Onix +1),
// while SLP / BRN / INFATUATION keep the ROM's +1: `--diag=ordinary-rest` draws those rows with the opponent at its tracked rest (the
// mechanism check; production files untouched). `redraw` = the drop-one / rest-y harness with no modification (must equal production).
// drop-one / rest-y redraw the production row's sprites (one dropped: the reducer's sprite index 1; Move_REST's player-side
// screenCenterYOffset 16 added to every letter Z) over production's frame without them, under the healthbox / message-window
// opaque footprint (drawOpponentHealthboxWobble + drawComposedPlayerHealthbox, y >= 112); the harness first proves the unmodified redraw == production's frame on every row (`redrawExact`).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { sae135RomWindows, sae135Window } from "./sae135Windows.ts";
import {
  drawComposedPlayerHealthbox, drawOpponentHealthboxWobble, drawSpriteSheet, drawSpriteSheetAffineRotate, onixPlayerHealthboxContent,
  statusAnimationRenderView,
} from "../../src/engine/battleScene.ts";
import { battleCommandFieldSpriteOrigin } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import type { LiveStatusAnimationSprite } from "../../src/animation/statusAnimation.ts";
import { statusConditionTarget, statusParticleDisplayRow } from "../../src/animation/statusConditionAnimations.ts";

const args = process.argv.slice(2);
const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const [rawDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string];
const FRAME = 240 * 160 * 3;
const BOX_Y = 112;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const redraw = neg === "drop-one" || neg === "rest-y" || neg === "redraw";
const diag = args.find((a) => a.startsWith("--diag="))?.slice(7);

/** --diag=ordinary-rest: a next-command row with the opponent at its tracked rest (what the ROM keeps after a `keep` animation). */
function drawOrdinaryRest(win: ReturnType<typeof sae135Window>, a: number): Uint8Array {
  const view = win.viewAt(a);
  const rest = liveBattlerAnchors("opponent", view.fieldArt, win.x2Input).frontIdleRest;
  const opp = view.fieldArt.opponent;
  return win.draw({ ...view, fieldArt: { ...view.fieldArt, opponent: { ...opp, origin: { x: opp.origin.x + rest.x2, y: opp.origin.y + rest.y2 } } } });
}

function drawSprite(fb: Uint8Array, s: LiveStatusAnimationSprite): void {
  const ts = s.tileset as never as { columns: number; rows: number; tiles: number[][] };
  if (s.affine === undefined) drawSpriteSheet(fb, ts as never, s.palette, s.x, s.y);
  else drawSpriteSheetAffineRotate(fb, ts as never, s.palette, s.x + ts.columns * 4, s.y + ts.rows * 4, s.affine.a, s.affine.b, s.affine.c, s.affine.d, undefined, false);
}

/** The opaque footprint of the two healthboxes (stq132Compare.ts's occluders; the message window = y >= 112). */
const OCCLUDERS = new Uint8Array(240 * 160 * 4);
drawOpponentHealthboxWobble(OCCLUDERS, 0);
drawComposedPlayerHealthbox(OCCLUDERS, onixPlayerHealthboxContent);

/** The production row redrawn with its sprites modified (`neg`), under the occluders (healthboxes, message window). */
function drawControl(win: ReturnType<typeof sae135Window>, a: number): Uint8Array {
  const view = win.viewAt(a);
  const sa = statusAnimationRenderView(view);
  if (sa === null || sa.sprites.length === 0) return win.draw(view);
  const plain = { ...sa.view, effect: null };
  const base = win.draw(plain);
  let sprites = sa.sprites;
  const side = win.battler === 0 ? "player" as const : "opponent" as const;
  if (neg === "drop-one") {
    const corner = battleCommandFieldSpriteOrigin(view.fieldArt[side], side);
    const row = statusParticleDisplayRow(win.animation, a, statusConditionTarget(side, corner.x + 32, corner.y + 32));
    const dropped = row.sprites.find((s) => s.index === 1);
    if (dropped) sprites = sprites.filter((s) => s.x !== dropped.left || s.y !== dropped.top);
  }
  if (neg === "rest-y" && side === "player") sprites = sprites.map((s) => (s.affine ? { ...s, y: s.y + 16 } : s));
  const layer = new Uint8Array(240 * 160 * 4);
  for (const s of sprites) drawSprite(layer, s);
  const fb = new Uint8Array(base);
  for (let p = 0; p < 240 * 160; p++) {
    if (layer[p * 4 + 3] === 0) continue;
    if (OCCLUDERS[p * 4 + 3] !== 0 || p / 240 >= BOX_Y) continue;
    fb[p * 4] = layer[p * 4]!; fb[p * 4 + 1] = layer[p * 4 + 1]!; fb[p * 4 + 2] = layer[p * 4 + 2]!;
  }
  return fb;
}

const windows = sae135RomWindows();
const result: Record<string, unknown> = {};
let total = 0, clean = 0, redrawExact = 0, redrawRows = 0;
const digest = createHash("sha256");
for (const [key, w] of Object.entries(windows)) {
  if (only && !key.includes(only)) continue;
  total++;
  const win = sae135Window(w, {
    ageShift: neg === "age+1" ? 1 : 0, battlerOverride: neg === "wrong-side" ? (w.battler === 0 ? 1 : 0) : undefined,
  });
  const raw = readFileSync(`${rawDir}/${key}.rgb`);
  const frameAt = (rel: number) => raw.subarray((rel + 2) * FRAME, (rel + 3) * FRAME); // frame 0 = rel -2
  const refRom = frameAt(-1);
  const perRow: [number, number, number][] = []; // [a, fullPx, boxPx]
  const productionSha: string[] = [];
  let fullPx = 0, firstBad: number | null = null, compared = 0, drawnRows = 0;
  const nextRows: { a: number; fullPx: number; boxPx: number }[] = [];
  for (let a = -1; a <= win.rows + 1; a++) {
    const fb = redraw ? drawControl(win, a) : diag === "ordinary-rest" && a >= win.rows ? drawOrdinaryRest(win, a) : win.draw(win.viewAt(a));
    if (neg === "redraw") { redrawRows++; if (sha(fb) === sha(win.draw(win.viewAt(a)))) redrawExact++; }
    if ((statusAnimationRenderView(win.viewAt(a))?.sprites.length ?? 0) > 0) drawnRows++;
    const ref = win.reference(a);
    productionSha.push(sha(fb));
    const romRow = frameAt(a);
    let fp = 0, bp = 0;
    for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
      const o = y * 240 + x;
      const changed = fb[o * 4] !== ref[o * 4] || fb[o * 4 + 1] !== ref[o * 4 + 1] || fb[o * 4 + 2] !== ref[o * 4 + 2];
      const c0 = changed ? fb[o * 4]! : refRom[o * 3]!, c1 = changed ? fb[o * 4 + 1]! : refRom[o * 3 + 1]!, c2 = changed ? fb[o * 4 + 2]! : refRom[o * 3 + 2]!;
      if (c0 === romRow[o * 3] && c1 === romRow[o * 3 + 1] && c2 === romRow[o * 3 + 2]) continue;
      fp++;
      if (y >= BOX_Y) bp++;
    }
    compared++;
    const onNext = a >= win.rows;
    perRow.push([a, fp, bp]);
    if (onNext) nextRows.push({ a, fullPx: fp, boxPx: bp });
    const counted = onNext ? fp - bp : fp;
    fullPx += counted;
    if (counted && firstBad === null) firstBad = a;
  }
  const zero = fullPx === 0;
  if (zero) clean++;
  digest.update(`${key}:${JSON.stringify(perRow)}\n`);
  result[key] = {
    animation: w.animation, side: w.side, scenario: w.scenario, x2Input: win.x2Input, romOpponentX2: win.romOpponentX2,
    rows: { compared, first: -1, last: win.rows + 1, firstBad, withSprites: drawnRows }, fullScreen: { px: fullPx }, zeroPx: zero,
    nextCommandRows: nextRows, productionFrameSha: productionSha, perRowMismatches: perRow.filter((r) => r[1]).slice(0, 24),
  };
  console.log(key, w.animation, w.side, `rows ${compared} (sprites on ${drawnRows}): full ${fullPx} px firstBad ${firstBad}; next ${JSON.stringify(nextRows)}`);
}
result.summary = { neg: neg ?? null, diag: diag ?? null, windows: total, zeroPxWindows: clean, perRowDigest: digest.digest("hex").slice(0, 16),
  ...(neg === "redraw" ? { redrawExact, redrawRows } : {}) };
console.log(`production path, full screen 0 px windows (rows activation-1 .. release+2): ${clean} / ${total}`
  + (neg === "redraw" ? `; redraw == production ${redrawExact} / ${redrawRows} rows` : ""));
writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");
