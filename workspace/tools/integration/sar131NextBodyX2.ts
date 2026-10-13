// sar131 (docs/sar131-status-animation-render.md §x2): the NEXT live body after each PSN / PRZ ROM window starts at the x2 the
// production tracker predicts (liveBattlerX2History.ts LIVE_BATTLER_X2_STATUS_ANIMATION; base tree: the side unknown -> the species
// rest). Per window with a next body (sar131Rom.py `nextBody`): (1) RAM: the animated battler's gSprites x2 / y2 on the row before
// the body's gAnimScriptActive rise; (2) pixels: the ROM's row R - 1 (the body's pre-activation row, dump frame 0) vs production's
// ordinary field (renderBattleResolutionLiveView, the constructed sar131Windows.ts field) with that battler at the predicted x2 /
// the base prediction, inside the battler's 64x64 picture rect at its displayed corner (elevation included; the HP / text bands
// differ by construction and are outside the rect).
//   node --experimental-strip-types --no-warnings tools/integration/sar131NextBodyX2.ts <raw-dir> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { battleCommandFieldSpriteOrigin } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { sar131Window, SAR131 } from "./sar131Windows.ts";
import { sar131HistoryBefore } from "./sar131History.ts";

const [rawDir, outPath] = process.argv.slice(2) as [string, string];
const rom = JSON.parse(readFileSync(`${SAR131}/receipts/rom-r1.json`, "utf8"));
const FRAME = 240 * 160 * 3;
const out: Record<string, unknown> = {};
let n = 0, ok = 0, baseDiffers = 0;
for (const [stem, scen] of Object.entries<any>(rom)) {
  for (const w of scen.windows) {
    const nb = w.nextBody;
    if (!nb) continue;
    n++;
    const side = w.battler === 0 ? "player" as const : "opponent" as const;
    const predict = (base: boolean) => {
      const h = sar131HistoryBefore(scen, nb.R, base);
      const zeroed = (["player", "opponent"] as const).filter((s) => h[s] === "zeroed");
      const win = sar131Window(stem, w, zeroed);
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
    out[`${stem}-${w.R}`] = { side, path: w.label, nextBody: { R: nb.R, move: nb.mv, attacker: nb.atk === 0 ? "player" : "opponent" },
      romX2: nb.x2[w.battler], romY2: nb.y2[w.battler], predicted: { history: fin.history, x2: fin.x2, rectPx: finalPx },
      base: { history: base.history, x2: base.x2, rectPx: basePx } };
    console.log(stem, w.R, side, `next body ${nb.mv}@${nb.R}: ROM x2 ${nb.x2[w.battler]}, predicted ${fin.x2} (${finalPx} px), base ${base.x2} (${basePx} px)`);
  }
}
out.summary = { windowsWithNextBody: n, predictedExact: ok, baseRectDiffers: baseDiffers };
console.log(`next body at the predicted x2, 0 px in the battler rect: ${ok} / ${n}; base prediction differs on ${baseDiffers}`);
writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n");
