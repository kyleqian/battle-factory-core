// aud137 (docs/aud137-live-audit-28.md): every aud137 dense ROM window (aud137Probe.py, direct mGBA, Scene ON, r1 == r2) compared
// THROUGH THE PRODUCTION RENDER PATH (aud137Windows.ts), sar131 / sad133 / sae135ProductionCompare.ts's transplant verbatim:
// C(a) = ROM(rel -1) except where production's P(a) != its reference R(a), where it is P(a); C == ROM(a) needs every pixel production
// changes to equal the ROM's AND every ROM change on the row to be one production makes. Full screen, rows a = -1 .. minimumFrames + 1
// (activation - 1 .. release + 2) where the ROM window has them; on the next command's rows (a >= minimumFrames) the message box band
// (y >= 112: the next instruction's print) is reported apart. Also per window: ROM E + 1 vs STATUS_ANIMATION_ADDED_ROWS (the table rows;
// FRZ inflicted: E 115 + the status command's row, sad133's accounting) and the battler / opponent x2 on rel -1 and E + 3.
// `--forms=<forms.json>` (aud137Forms.py): the CASTFORM weather form per window key. `--diag=ordinary-rest` (sae135's mechanism check of
// the pre-existing next-command-row residual, sar131 §6): the next command's rows drawn with the opponent at its tracked rest.
//   node --experimental-strip-types --no-warnings tools/integration/aud137Compare.ts <rom-windows.json> <raw-dir> <out.json>
//     [--scenarios=<dir>] [--forms=<forms.json>] [--diag=ordinary-rest]
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { aud137Window, type Aud137RomWindow } from "./aud137Windows.ts";
import { statusAnimationRenderView } from "../../src/engine/battleScene.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";

const args = process.argv.slice(2);
const opt = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [romPath, rawDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string, string];
const scenariosDir = opt("scenarios");
const forms: Record<string, number> = opt("forms") ? JSON.parse(readFileSync(opt("forms")!, "utf8")) : {};
const diag = opt("diag");
const rom = JSON.parse(readFileSync(romPath, "utf8")) as { windows: Record<string, Aud137RomWindow> };
const FRAME = 240 * 160 * 3;
const BOX_Y = 112;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const result: Record<string, unknown> = {};
let windows = 0, clean = 0;
const digest = createHash("sha256");
for (const [key, w] of Object.entries(rom.windows)) {
  windows++;
  const win = aud137Window(w, scenariosDir, { castformForm: forms[key] });
  /** --diag=ordinary-rest: a next-command row with the opponent at its tracked rest (sae135ProductionCompare.ts drawOrdinaryRest). */
  const drawOrdinaryRest = (a: number) => {
    const view = win.viewAt(a);
    const rest = liveBattlerAnchors("opponent", view.fieldArt, win.x2Input).frontIdleRest;
    const opp = view.fieldArt.opponent;
    return win.draw({ ...view, fieldArt: { ...view.fieldArt, opponent: { ...opp, origin: { x: opp.origin.x + rest.x2, y: opp.origin.y + rest.y2 } } } });
  };
  const raw = readFileSync(`${rawDir}/${key}.rgb`);
  const frameAt = (a: number) => raw.subarray((a + 2) * FRAME, (a + 3) * FRAME); // frame 0 = rel -2
  const lastRel = w.rows[w.rows.length - 1]!.rel;
  const refRom = frameAt(-1);
  const perRow: [number, number, number][] = [];
  const productionSha: string[] = [];
  let fullPx = 0, commandPx = 0, firstBad: number | null = null, compared = 0, drawnRows = 0;
  const nextRows: { a: number; fullPx: number; boxPx: number }[] = [];
  const last = Math.min(win.rows + 1, lastRel);
  for (let a = -1; a <= last; a++) {
    const view = win.viewAt(a);
    const fb = diag === "ordinary-rest" && a >= win.rows ? drawOrdinaryRest(a) : win.draw(view);
    if ((statusAnimationRenderView(view)?.sprites.length ?? 0) > 0) drawnRows++;
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
  const rowAt = (rel: number) => w.rows.find((r) => r.rel === rel);
  const tableRows = win.rows, romRows = w.E + 1 + (win.inflicted ? 1 : 0);
  result[key] = {
    animation: w.animation, side: w.side, scenario: w.scenario, rise: w.rise, romE: w.E, inflicted: win.inflicted, castformForm: forms[key] ?? null,
    timing: { tableRows, romRows, delta: romRows - tableRows },
    x2: { romOpponentX2: win.romOpponentX2, idle: win.idle, x2Input: win.x2Input, unexplained: win.x2Unexplained,
      battlerBefore: rowAt(-1)?.bat[2] ?? null, battlerAfter: rowAt(w.E + 3)?.bat[2] ?? null,
      otherBefore: rowAt(-1)?.other[2] ?? null, otherAfter: rowAt(w.E + 3)?.other[2] ?? null },
    rows: { compared, first: -1, last, firstBad, withSprites: drawnRows }, fullScreen: { px: fullPx }, commandRows: { px: commandPx },
    zeroPx: zero, nextCommandRows: nextRows, productionFrameSha: productionSha, perRowMismatches: perRow.filter((r) => r[1]).slice(0, 24),
  };
  console.log(key, w.animation, w.side, `E ${w.E} table ${tableRows} rows ${compared} (sprites ${drawnRows}): full ${fullPx} px cmd ${commandPx} firstBad ${firstBad}; x2 ${win.romOpponentX2}/${win.idle}; next ${JSON.stringify(nextRows.filter((r) => r.fullPx))}`);
}
result.summary = { diag: diag ?? null, windows, zeroPxWindows: clean, perRowDigest: digest.digest("hex").slice(0, 16) };
console.log(`production path, full screen 0 px windows (rows activation-1 .. release+2): ${clean} / ${windows}`);
writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");
