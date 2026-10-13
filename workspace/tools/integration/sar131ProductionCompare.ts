// sar131 (S10A, ISSUES #168 slice SA4, docs/sar131-status-animation-render.md): the PSN / PRZ dense ROM windows (sar131Probes.sh,
// direct mGBA, Scene ON, r1 == r2) compared THROUGH THE PRODUCTION RENDER PATH (sar131Windows.ts: createBattleResolutionPresentationRenderView
// + renderBattleResolutionLiveView). Frame mapping: status-animation command age a == ROM row X + 1 + a (a = 0 = the first
// gAnimScriptActive row). Scene ON carries the probe's x2 history through the production tracker (applyLiveBattlerX2Event over the
// ROM's earlier bodies and status animations, in row order).
//
// The constructed field is not the ROM's whole screen (HP, text), so production's frame P(a) is transplanted onto the ROM's own row X
// (the row before activation) wherever it differs from production's reference frame R(a) (sar131Windows.ts `reference`: the effect
// dropped, the opponent at its tracked rest on the command's rows): C(a) = ROM(X) except where P(a) != R(a), where it is P(a).
// C == ROM(X + 1 + a) needs every pixel production changes (the battler's shake, its blended palette, the sparks, the elevated
// shadow's hide) to equal the ROM's AND every ROM change on the row to be one production makes. Compared on the full screen, rows
// a = -1 .. minimumFrames + 1 (activation - 1 .. release + 2); on the next command's rows (a >= minimumFrames) the message box band
// (y >= 112: the next instruction's print) is reported apart.
//   node --experimental-strip-types --no-warnings tools/integration/sar131ProductionCompare.ts <raw-dir> <out.json>
//     [--neg=age+1|no-shake|no-blend|no-sparks|wrong-side|base-x2]   (controls; must fail)
// <raw-dir> = sar131NpzToRaw.py output (<stem>-on-<R>.rgb = rows X, X+1, ...).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { sar131HistoryBefore } from "./sar131History.ts";
import { sar131Window, SAR131 } from "./sar131Windows.ts";
import { drawSpriteSheet, renderBattleResolutionLiveView, statusAnimationRenderView } from "../../src/engine/battleScene.ts";

const args = process.argv.slice(2);
const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const [rawDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string];
const rom = JSON.parse(readFileSync(`${SAR131}/receipts/rom-r1.json`, "utf8"));
const FRAME = 240 * 160 * 3;
const BOX_Y = 112;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);

// Controls that drop one component of the production row: the production view of statusAnimationRenderView with that component
// undone, drawn by the same renderer with the effect cleared (+ the row's sprites unless no-sparks). Production files untouched.
function drawControl(win: ReturnType<typeof sar131Window>, a: number): Uint8Array {
  const view = win.viewAt(a);
  const sa = statusAnimationRenderView(view);
  if (sa === null) return win.draw(view);
  const side = view.effect!.type === "status-animation" && (view.effect as any).battler === 0 ? "player" as const : "opponent" as const;
  let fieldArt = sa.view.fieldArt;
  if (neg === "no-shake") {
    const plain = statusAnimationRenderView({ ...view, effect: { ...(view.effect as any), age: 0 } })!.view.fieldArt[side];
    fieldArt = { ...fieldArt, [side]: { ...fieldArt[side], origin: plain.origin } };
  }
  if (neg === "no-blend") fieldArt = { ...fieldArt, [side]: { ...fieldArt[side], pic: view.fieldArt[side].pic } };
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, { ...sa.view, fieldArt, effect: null });
  if (neg !== "no-sparks") for (const sp of sa.sprites) drawSpriteSheet(fb, sp.tileset as never, sp.palette, sp.x, sp.y);
  return fb;
}

const result: Record<string, unknown> = {};
let windows = 0, clean = 0;
const digest = createHash("sha256");
for (const [stem, scen] of Object.entries<any>(rom)) {
  for (const w of scen.windows) {
    windows++;
    const history = sar131HistoryBefore(scen, w.R, neg === "base-x2");
    const zeroed = (["player", "opponent"] as const).filter((s) => history[s] === "zeroed");
    const win = sar131Window(stem, w, zeroed, {
      ageShift: neg === "age+1" ? 1 : 0, battlerOverride: neg === "wrong-side" ? (w.battler === 0 ? 1 : 0) : undefined,
    });
    const raw = readFileSync(`${rawDir}/${w.dump.replace(/\.npz$/, ".rgb")}`);
    const frameAt = (a: number) => raw.subarray((a + 1) * FRAME, (a + 2) * FRAME); // frame 0 = row X
    const refRom = frameAt(-1);
    const perRow: [number, number, number][] = []; // [a, fullPx, boxPx]
    const productionSha: string[] = [];
    let fullPx = 0, firstBad: number | null = null, compared = 0;
    const nextRows: { a: number; fullPx: number; boxPx: number }[] = [];
    for (let a = -1; a <= win.rows + 1; a++) {
      const fb = neg === "no-shake" || neg === "no-blend" || neg === "no-sparks" ? drawControl(win, a) : win.draw(win.viewAt(a));
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
    digest.update(`${stem}-${w.R}:${JSON.stringify(perRow)}\n`);
    const key = `${stem}-${w.R}`;
    result[key] = {
      animation: w.animation, side: w.battler === 0 ? "player" : "opponent", path: w.label, X: w.X,
      x2History: history, zeroed, rows: { compared, first: -1, last: win.rows + 1, firstBad },
      fullScreen: { px: fullPx }, zeroPx: zero, nextCommandRows: nextRows, productionFrameSha: productionSha,
      perRowMismatches: perRow.filter((r) => r[1]),
    };
    console.log(key, w.animation, w.battler === 0 ? "player" : "opponent", w.label, `history ${JSON.stringify(history)} rows ${compared}: full ${fullPx} px firstBad ${firstBad}; next ${JSON.stringify(nextRows)}`);
  }
}
result.summary = { neg: neg ?? null, windows, zeroPxWindows: clean, perRowDigest: digest.digest("hex").slice(0, 16) };
console.log(`production path, full screen 0 px windows (rows activation-1 .. release+2): ${clean} / ${windows}`);
writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");
