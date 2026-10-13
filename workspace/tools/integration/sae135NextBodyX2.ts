// sae135 (docs/sae135-status-animation-render-3.md step 3): SLP / BRN / INFATUATION keep the battler's x2 (liveBattlerX2History.ts
// LIVE_BATTLER_X2_STATUS_ANIMATION, sar131's rows). sar131NextBodyX2.ts over sar131Rom.py's receipt of 4 stq132 scenarios
// (fixtures/sae135/next-body-index.json; stat101Probe.py, direct mGBA, Scene ON, r1 == r2):
//   (1) every window: the battler's gSprites x2 on the instruction row X and on the row after its last active row (F) — kept;
//   (2) every window with a next live body: the battler's x2 on the row before the body's rise == the production tracker's prediction
//       (sar131History.ts over the ROM's events), and 0 px in the battler's 64x64 rect of that row (ROM vs production's ordinary field
//       at the predicted x2); `base` = the pre-sar131 rule (status animation -> unknown -> the species rest).
//   node --experimental-strip-types --no-warnings tools/integration/sae135NextBodyX2.ts <rom.json> <raw-dir> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { battleCommandFieldSpriteOrigin } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { sae135Window } from "./sae135Windows.ts";
import { sar131HistoryBefore } from "./sar131History.ts";

const [romPath, rawDir, outPath] = process.argv.slice(2) as [string, string, string];
const rom = JSON.parse(readFileSync(romPath, "utf8"));
const FRAME = 240 * 160 * 3;
const out: Record<string, unknown> = {};
let windows = 0, kept = 0, n = 0, ok = 0, baseDiffers = 0;
for (const [stem, scen] of Object.entries<any>(rom)) {
  for (const w of scen.windows) {
    windows++;
    const side = w.battler === 0 ? "player" as const : "opponent" as const;
    const romKept = w.battlerX2AfterF === w.battlerX2BeforeX[w.battler];
    if (romKept) kept++;
    const entry: Record<string, unknown> = { animation: w.animation, side, path: w.label, X: w.X, F: w.F,
      battlerX2BeforeX: w.battlerX2BeforeX[w.battler], battlerX2AfterF: w.battlerX2AfterF, kept: romKept, nextBody: null };
    out[`${stem}-${w.R}`] = entry;
    const nb = w.nextBody;
    if (!nb) {
      console.log(stem, w.R, w.animation, side, `x2 ${w.battlerX2BeforeX[w.battler]} -> ${w.battlerX2AfterF}; no next body in the trace`);
      continue;
    }
    n++;
    const predict = (base: boolean) => {
      const h = sar131HistoryBefore(scen, nb.R, base);
      const zeroed = (["player", "opponent"] as const).filter((s) => h[s] === "zeroed");
      const win = sae135Window({ scenario: `${stem}.json`, animation: w.animation, side, battler: w.battler, E: w.activeRows, rows: [] }, { zeroed });
      const view = win.viewAt(win.rows + 5); // the next command (ordinary field)
      const rest = side === "opponent" ? liveBattlerAnchors("opponent", view.fieldArt, { zeroed }).frontIdleRest : { x2: 0, y2: 0 };
      const art = view.fieldArt[side];
      const fieldArt = { ...view.fieldArt, [side]: { ...art, origin: { x: art.origin.x + rest.x2, y: art.origin.y + rest.y2 } } };
      const fb = win.draw({ ...view, fieldArt, message: null, postBodyShadowHidden: false } as never);
      return { history: h, x2: rest.x2, fb, corner: battleCommandFieldSpriteOrigin(fieldArt[side] as never, side) };
    };
    const raw = readFileSync(`${rawDir}/${nb.dump.replace(/\.npz$/, ".rgb")}`);
    const romRow = raw.subarray(0, FRAME); // row R - 1
    const px = (p: ReturnType<typeof predict>) => {
      let c = 0;
      const { x: cx, y: cy } = p.corner;
      for (let y = Math.max(0, cy); y < Math.min(112, cy + 64); y++) for (let x = Math.max(0, cx - 2); x < Math.min(240, cx + 66); x++) {
        const o = y * 240 + x;
        if (p.fb[o * 4] !== romRow[o * 3] || p.fb[o * 4 + 1] !== romRow[o * 3 + 1] || p.fb[o * 4 + 2] !== romRow[o * 3 + 2]) c++;
      }
      return c;
    };
    const fin = predict(false), base = predict(true);
    const finalPx = px(fin), basePx = px(base);
    if (finalPx === 0 && nb.x2[w.battler] === fin.x2) ok++;
    if (basePx !== 0) baseDiffers++;
    entry.nextBody = { R: nb.R, move: nb.mv, attacker: nb.atk === 0 ? "player" : "opponent", romX2: nb.x2[w.battler], romY2: nb.y2[w.battler],
      predicted: { history: fin.history, x2: fin.x2, rectPx: finalPx }, base: { history: base.history, x2: base.x2, rectPx: basePx } };
    console.log(stem, w.R, w.animation, side, `x2 ${w.battlerX2BeforeX[w.battler]} -> ${w.battlerX2AfterF}; next body ${nb.mv}@${nb.R}: ROM x2 ${nb.x2[w.battler]}, predicted ${fin.x2} (${finalPx} px), base ${base.x2} (${basePx} px)`);
  }
}
out.summary = { windows, keptAfterWindow: kept, windowsWithNextBody: n, predictedExact: ok, baseRectDiffers: baseDiffers };
console.log(`x2 kept through the window: ${kept} / ${windows}; next body at the predicted x2, 0 px in the battler rect: ${ok} / ${n}; base differs on ${baseDiffers}`);
writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n");
