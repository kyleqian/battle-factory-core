// sad133 (S10A, ISSUES #168 slices SA6 / SA7 / SA8, docs/sad133-status-animation-render-2.md): every stp128 dense ROM window
// (tools/integration/fixtures/stp128/rom-windows.json: CURSED / NIGHTMARE / CONFUSION / FRZ, both sides, direct mGBA, Scene ON,
// r1 == r2) compared THROUGH THE PRODUCTION RENDER PATH (sad133Windows.ts: createBattleResolutionPresentationRenderView +
// renderBattleResolutionLiveView). Frame mapping: status-animation command age a == ROM row rel a (rel 0 = the gAnimScriptActive rise).
// sar131's transplant: C(a) = ROM(rel -1) except where production's P(a) != its reference R(a) (sad133Windows.ts `reference`), where
// it is P(a); C == ROM(a) needs every pixel production changes to equal the ROM's AND every ROM change on the row to be one production
// makes. Full screen, rows a = -1 .. minimumFrames + 1 (activation - 1 .. release + 2) where the ROM window has them; on the next
// command's rows (a >= minimumFrames) the message box band (y >= 112: the next instruction's print) is reported apart.
//   node --experimental-strip-types --no-warnings tools/integration/sad133ProductionCompare.ts <raw-dir> <out.json>
//     [--neg=age+1|wrong-side|no-shake|no-ghost|no-ducks|no-cube|lag-swap]   (controls; must fail)
// <raw-dir> = stp128NpzToRaw.py output (<window key>.rgb = rows rel -2, -1, 0, ...).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { sad133FreezeInflicted, sad133Window, sad133X2Zeroed, STP128, type Sad133RomWindow } from "./sad133Windows.ts";
import { renderBattleResolutionLiveView, statusAnimationRenderView } from "../../src/engine/battleScene.ts";

const args = process.argv.slice(2);
const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const [rawDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string];
const rom = JSON.parse(readFileSync(`${STP128}/rom-windows.json`, "utf8")) as { windows: Record<string, Sad133RomWindow> };
const FRAME = 240 * 160 * 3;
const BOX_Y = 112;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);
/** The sprite-family controls: each drops its family's sprites (the other windows draw as production does). */
const SPRITE_CONTROLS: Record<string, readonly string[]> = { "no-ghost": ["CURSED", "NIGHTMARE"], "no-ducks": ["CONFUSION"], "no-cube": ["FRZ"] };

// Controls that undo one component of the production row (sar131ProductionCompare.ts drawControl), production files untouched. A
// sprite-family control draws statusAnimationRenderView's view with the effect cleared (its battler placement kept, none of the
// family's sprites). no-shake keeps production's own sprite pixels and puts the battler back at its age-0 place: the frame with the
// effect cleared and the battler at rest, overlaid with every pixel where production's frame differs from its sprite-less frame.
function drawControl(win: ReturnType<typeof sad133Window>, a: number): Uint8Array {
  const view = win.viewAt(a);
  const sa = statusAnimationRenderView(view);
  if (sa === null) return win.draw(view);
  const cleared = (fieldArt: typeof sa.view.fieldArt) => {
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, { ...sa.view, fieldArt, effect: null });
    return fb;
  };
  if (neg !== "no-shake") return SPRITE_CONTROLS[neg!]!.includes(win.animation) ? cleared(sa.view.fieldArt) : win.draw(view);
  const side = (view.effect as any).battler === 0 ? "player" as const : "opponent" as const;
  const plain = statusAnimationRenderView({ ...view, effect: { ...(view.effect as any), age: 0 } })!.view.fieldArt[side];
  const atRest = cleared({ ...sa.view.fieldArt, [side]: { ...sa.view.fieldArt[side], origin: plain.origin } });
  const production = win.draw(view), noSprites = cleared(sa.view.fieldArt);
  for (let i = 0; i < production.length; i += 4) {
    if (production[i] !== noSprites[i] || production[i + 1] !== noSprites[i + 1] || production[i + 2] !== noSprites[i + 2]) {
      atRest[i] = production[i]!; atRest[i + 1] = production[i + 1]!; atRest[i + 2] = production[i + 2]!;
    }
  }
  return atRest;
}

const result: Record<string, unknown> = {};
let windows = 0, clean = 0, commandClean = 0;
const digest = createHash("sha256");
const perAnimationSide: Record<string, {
  windows: number; zeroPx: number; rows: number; px: number; commandRowsZeroPx: number; commandRows: number; commandPx: number;
}> = {};
for (const [key, w] of Object.entries(rom.windows)) {
  windows++;
  const zeroed = sad133X2Zeroed(w);
  const win = sad133Window(w, zeroed, {
    ageShift: neg === "age+1" ? 1 : 0, battlerOverride: neg === "wrong-side" ? (w.battler === 0 ? 1 : 0) : undefined,
    inflicted: neg === "lag-swap" ? !sad133FreezeInflicted(w) : undefined,
  });
  const raw = readFileSync(`${rawDir}/${key}.rgb`);
  const frameAt = (a: number) => raw.subarray((a + 2) * FRAME, (a + 3) * FRAME); // frame 0 = rel -2
  const lastRel = w.rows[w.rows.length - 1]!.rel;
  const refRom = frameAt(-1);
  const perRow: [number, number, number][] = []; // [a, fullPx, boxPx]
  const productionSha: string[] = [];
  let fullPx = 0, commandPx = 0, firstBad: number | null = null, compared = 0;
  const nextRows: { a: number; fullPx: number; boxPx: number }[] = [];
  const last = Math.min(win.rows + 1, lastRel);
  for (let a = -1; a <= last; a++) {
    const fb = drawRow(win, a);
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
    if (!onNext) commandPx += fp;
    if (counted && firstBad === null) firstBad = a;
  }
  const zero = fullPx === 0;
  if (zero) clean++;
  digest.update(`${key}:${JSON.stringify(perRow)}\n`);
  const group = `${w.animation} ${w.side}`;
  const g = perAnimationSide[group] ??= { windows: 0, zeroPx: 0, rows: 0, px: 0, commandRowsZeroPx: 0, commandRows: 0, commandPx: 0 };
  g.windows++; g.rows += compared; g.px += fullPx; if (zero) g.zeroPx++;
  g.commandRows += compared - nextRows.length; g.commandPx += commandPx; if (commandPx === 0) { g.commandRowsZeroPx++; commandClean++; }
  result[key] = {
    animation: w.animation, side: w.side, romE: w.E, freezePath: w.animation === "FRZ" ? (sad133FreezeInflicted(w) ? "inflicted" : "frozen-turn") : null,
    zeroed, rows: { compared, first: -1, last, firstBad }, fullScreen: { px: fullPx }, zeroPx: zero, commandRows: { px: commandPx },
    nextCommandRows: nextRows,
    productionFrameSha: productionSha, perRowMismatches: perRow.filter((r) => r[1]),
  };
  console.log(key, w.animation, w.side, `zeroed ${JSON.stringify(zeroed)} rows ${compared}: full ${fullPx} px firstBad ${firstBad}; next ${JSON.stringify(nextRows.filter((r) => r.fullPx))}`);
}
result.summary = { neg: neg ?? null, windows, zeroPxWindows: clean, zeroPxCommandRowWindows: commandClean, perAnimationSide, perRowDigest: digest.digest("hex").slice(0, 16) };
console.log(`production path, full screen 0 px windows (rows activation-1 .. release+2): ${clean} / ${windows}; command rows (activation-1 .. release) 0 px: ${commandClean} / ${windows}`);
writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");

function drawRow(win: ReturnType<typeof sad133Window>, a: number): Uint8Array {
  return neg === "no-shake" || (neg !== undefined && neg in SPRITE_CONTROLS) ? drawControl(win, a) : win.draw(win.viewAt(a));
}
