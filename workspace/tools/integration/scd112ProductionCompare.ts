// scd112 (S10A, ISSUES #166 slice d, docs/scd112-stats-change-render.md): stat102's dense ROM comparator run THROUGH THE PRODUCTION
// RENDER PATH. Per window (10 stat101 scenarios x Scene ON / OFF) the constructed resolution segment of scd112Windows.ts is rendered
// at every ROM row with production's createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView (Scene ON, the
// app's drawScene) or renderBattleResolutionSceneOffView (Scene OFF). Frame mapping (stat102 s4 / the brief): command age a == ROM
// rel a + 1. Scene ON carries the probe's x2 history through the production tracker (applyLiveBattlerX2Event over the bodies before
// the window; the Roar switch-in resets the opponent), Scene OFF none.
//
// The constructed field is not the ROM's whole screen (HP, text): the production frame P(rel) is transplanted onto the ROM's own
// ordinary row A-1 wherever it differs from production's ORDINARY frame P_ord (the same state with the effect dropped = what the
// base tree drew for the command): C(rel) = ROM(A-1) except where P(rel) != P_ord, where it is P(rel). C == ROM(rel) needs every
// pixel production changes (banner blend over its own under-pixels, shadow hide, the opponent's rest shift) to equal the ROM's, so
// a wrong mask / corner / rest / EVA / BG1 Y / palette or shadow row shows up as px. Compared on the full screen and in the 64x64
// OBJ-window rect at the production corner (with the rest), rows A-1 .. E+2; E+3 reported apart. On the next command's rows the
// message-box band (y >= 112) is reported apart (the print path's next message prints its first glyph on its first frame).
// Also reported: the raw production rect (no transplant) on the banner rows, and every row's production frame sha256 (the tier-1
// test's pins).
//   node --experimental-strip-types --no-warnings tools/integration/scd112ProductionCompare.ts <run-dir> <out.json>
//     [--neg=age+1|no-rest|no-shadow]   (negative controls; must fail)
//     [--tracker-growl-zeroed]          (experiment: the x2 tracker's missing Growl target row replaced by the source class)
// <run-dir> = a stat102Run.sh output dir (raw/ = stat101NpzToRaw.py frames, probes/r1 = the probe rows for the x2 history).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { statsChangeRenderView } from "../../src/engine/battleScene.ts";
import { applyLiveBattlerX2Event, LIVE_BATTLER_X2_IDLE, type LiveBattlerX2History } from "../../src/engine/liveBattlerX2History.ts";
import { statsChangeRow } from "../../src/animation/statsChange.ts";
import { scd112Window, SCD112_STAT101 } from "./scd112Windows.ts";

const args = process.argv.slice(2);
const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const growlExperiment = args.includes("--tracker-growl-zeroed");
const [runDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string];
const receipts = JSON.parse(readFileSync(`${SCD112_STAT101}/receipts/stat-anim.json`, "utf8"));
const FRAME = 240 * 160 * 3;
const BOX_Y = 112;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);

const result: Record<string, unknown> = {};
let windows = 0, clean = 0;
const digest = createHash("sha256");
for (const scen of Object.keys(receipts)) {
  if (receipts[scen].index.expectedAnimArg === null) continue;
  for (const scene of ["on", "off"] as const) {
    const w0 = receipts[scen][scene].windows[0];
    if (!w0) continue;
    windows++;
    // Scene ON: the production x2 tracker over the probe's bodies before the window (rises before A; mv 0 = a general animation).
    let history: LiveBattlerX2History = LIVE_BATTLER_X2_IDLE;
    const bodies: [number, number, number][] = [];
    if (scene === "on") {
      const probe = JSON.parse(readFileSync(`${runDir}/probes/r1/${scen}-${scene}.json`, "utf8"));
      let prev = 0;
      for (const r of probe.rows) {
        if (r.f >= w0.A) break;
        if (r.act && !prev && r.mv !== 0) bodies.push([r.f, r.mv, r.atk]);
        prev = r.act;
      }
      for (const [, mv, atk] of bodies) {
        history = applyLiveBattlerX2Event(history, { kind: "move-body", moveId: mv, attackerSide: atk === 0 ? "player" : "opponent" });
        // Roar (46) forces the opponent's switch: the Intimidate switch-in is a send-in (side := idle).
        if (mv === 46) history = applyLiveBattlerX2Event(history, { kind: "send-in", side: "opponent" });
        // EXPERIMENT ONLY: Move_GROWL ends with AnimTask_ShakeMon2 on ANIM_TARGET (absolute reset, x2 0), but
        // LIVE_BATTLER_X2_MOVE_TABLE has no row for 45 and the 0-power fallback keeps the target's rest.
        if (mv === 45 && growlExperiment) history = { ...history, [atk === 0 ? "opponent" : "player"]: "zeroed" };
      }
    }
    const zeroed = (["player", "opponent"] as const).filter((s) => history[s] === "zeroed");
    const win = scd112Window(scen, scene, receipts, scene === "on" && neg !== "no-rest" ? zeroed : null, neg === "age+1" ? 1 : 0);
    const { w, E, params, span, psca } = win;
    if (span.endRel !== E) throw new Error(`${scen} ${scene}: reducer E ${span.endRel} != ROM ${E}`);
    const raw = readFileSync(`${runDir}/raw/${scen}-${scene}.rgb`);
    const frames = raw.length / FRAME;
    const frameAt = (rel: number) => raw.subarray((rel + 1) * FRAME, (rel + 2) * FRAME); // frame 0 = A - 1
    const pOrd = win.ordinary();
    const refRom = frameAt(-1);
    const corner = statsChangeRenderView(win.viewOf(1, 10))?.banner?.corner ?? null;
    if (corner === null) throw new Error(`${scen} ${scene}: no banner at age 10`);
    const [rx, ry] = w.maskRect as [number, number, number, number];
    const perRow: [number, number, number, number, number][] = []; // [rel, rectPx, fullPx, boxPx, rawRectPx]
    const productionSha: string[] = [];
    let rectPx = 0, fullPx = 0, compared = 0, firstBad: number | null = null, rawRectBannerPx = 0;
    const nextCommandRows: { rel: number; fullPx: number; boxPx: number; outsideBoxPx: number }[] = [];
    const tail: { rel: number; fullPx: number; boxPx: number }[] = [];
    const lastRel = Math.min(E + 3, frames - 2);
    for (let rel = -1; rel <= lastRel; rel++) {
      const view = win.viewAtRel(rel);
      // no-shadow control: the command's non-banner rows drawn with the shadow shown (the rest kept).
      const fb = neg === "no-shadow" && view.effect?.type === "stats-change"
        ? (() => {
            const sc = statsChangeRenderView(view)!;
            return sc.banner ? win.draw(view) : win.draw({ ...view, effect: null, fieldArt: sc.view.fieldArt });
          })()
        : win.draw(view);
      productionSha.push(sha(fb));
      const rom = frameAt(rel);
      let rp = 0, fp = 0, bp = 0, rawRect = 0;
      for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
        const o = y * 240 + x;
        const changed = fb[o * 4] !== pOrd[o * 4] || fb[o * 4 + 1] !== pOrd[o * 4 + 1] || fb[o * 4 + 2] !== pOrd[o * 4 + 2];
        const c0 = changed ? fb[o * 4]! : refRom[o * 3]!, c1 = changed ? fb[o * 4 + 1]! : refRom[o * 3 + 1]!, c2 = changed ? fb[o * 4 + 2]! : refRom[o * 3 + 2]!;
        const inRect = x >= corner.x && x < corner.x + 64 && y >= corner.y && y < corner.y + 64;
        if (inRect && (fb[o * 4] !== rom[o * 3] || fb[o * 4 + 1] !== rom[o * 3 + 1] || fb[o * 4 + 2] !== rom[o * 3 + 2])) rawRect++;
        if (c0 === rom[o * 3] && c1 === rom[o * 3 + 1] && c2 === rom[o * 3 + 2]) continue;
        fp++;
        if (y >= BOX_Y) bp++;
        if (inRect) rp++;
      }
      const age = win.commandAge(rel);
      const onNext = age >= span.addedRows;
      if (age >= 0 && age < span.addedRows && statsChangeRow(params, age + 1).bannerVisible) rawRectBannerPx += rawRect;
      perRow.push([rel, rp, fp, bp, rawRect]);
      if (rel <= E + 2) {
        compared++;
        if (onNext) nextCommandRows.push({ rel, fullPx: fp, boxPx: bp, outsideBoxPx: fp - bp });
        // Acceptance: every pixel on the command's rows and the previous command's rows; on the next command's rows every pixel
        // outside the message-box band (its own first glyph belongs to the following message, reported in nextCommandRows).
        const counted = onNext ? fp - bp : fp;
        rectPx += onNext ? Math.max(0, rp - bp) : rp; fullPx += counted;
        if (counted && firstBad === null) firstBad = rel;
      } else tail.push({ rel, fullPx: fp, boxPx: bp });
    }
    const zero = rectPx === 0 && fullPx === 0 && compared === E + 4;
    if (zero) clean++;
    digest.update(`${scen}-${scene}:${JSON.stringify(perRow)}\n`);
    result[`${scen}-${scene}`] = {
      arg: w.arg, side: win.ix.animatedSide, path: psca ? "playstatchangeanimation" : "print",
      reducer: { direction: params.direction, palette: params.palette, sharply: params.sharply, ...span },
      x2History: scene === "on" ? { bodies: bodies.map(([f, mv, atk]) => ({ f, mv, atk })), zeroed } : null,
      productionCorner: corner, romMaskRect: w.maskRect, cornerEqualsRomRect: corner.x === rx && corner.y === ry,
      compared: { rows: compared, firstRel: -1, lastRel: E + 2, firstBad },
      rect: { px: rectPx }, fullScreen: { px: fullPx }, zeroPx: zero,
      nextCommandRows, afterWindow: tail, rawRectBannerRowsPx: rawRectBannerPx,
      productionFrameSha: productionSha,
      perRowMismatches: perRow.filter((r) => r[1] || r[2]),
    };
    console.log(scen, scene, w.arg, psca ? "psca" : "print", `corner ${corner.x},${corner.y} rom ${rx},${ry} rows ${compared}: rect ${rectPx} px, full ${fullPx} px; next rows ${JSON.stringify(nextCommandRows)}; raw rect (banner rows) ${rawRectBannerPx}`);
  }
}
result.summary = { neg: neg ?? null, trackerGrowlZeroedExperiment: growlExperiment, windows, zeroPxWindows: clean,
  perRowDigest: digest.digest("hex").slice(0, 16) };
console.log(`production path, rect + full screen 0 px windows (rows A-1 .. E+2): ${clean} / ${windows}`);
writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");
